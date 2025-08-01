import asyncio
import uuid
from typing import Optional, Dict, Any
from pathlib import Path
import io
import base64

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from PIL import Image
import torch

from ..models.model_manager import ModelManager
from ..services.video_service import VideoService
from ..services.audio_service import AudioService
from ..utils.config import settings
from ..utils.logger import setup_logger
from ..utils.file_utils import save_image, save_video, cleanup_temp_files

logger = setup_logger(__name__)
router = APIRouter()

class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., max_length=settings.MAX_PROMPT_LENGTH)
    negative_prompt: str = Field("", max_length=settings.MAX_PROMPT_LENGTH)
    width: int = Field(settings.DEFAULT_WIDTH, ge=64, le=settings.MAX_WIDTH)
    height: int = Field(settings.DEFAULT_HEIGHT, ge=64, le=settings.MAX_HEIGHT)
    num_inference_steps: int = Field(settings.DEFAULT_STEPS, ge=1, le=settings.MAX_STEPS)
    guidance_scale: float = Field(settings.DEFAULT_GUIDANCE, ge=1.0, le=20.0)
    seed: Optional[int] = Field(None, ge=0, le=2**32-1)
    style: Optional[Dict[str, Any]] = Field(default_factory=dict)
    output_id: str = Field(..., description="Unique identifier for the output")

class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., max_length=settings.MAX_PROMPT_LENGTH)
    negative_prompt: str = Field("", max_length=settings.MAX_PROMPT_LENGTH)
    width: int = Field(settings.DEFAULT_WIDTH, ge=64, le=settings.MAX_WIDTH)
    height: int = Field(settings.DEFAULT_HEIGHT, ge=64, le=settings.MAX_HEIGHT)
    num_frames: int = Field(24, ge=1, le=settings.MAX_FRAMES)
    fps: int = Field(settings.DEFAULT_FPS, ge=1, le=60)
    duration: Optional[float] = Field(None, ge=0.1, le=10.0)
    num_inference_steps: int = Field(settings.DEFAULT_STEPS, ge=1, le=settings.MAX_STEPS)
    guidance_scale: float = Field(settings.DEFAULT_GUIDANCE, ge=1.0, le=20.0)
    seed: Optional[int] = Field(None, ge=0, le=2**32-1)
    style: Optional[Dict[str, Any]] = Field(default_factory=dict)
    audio_track_id: Optional[str] = Field(None)
    output_id: str = Field(..., description="Unique identifier for the output")

class GenerationResponse(BaseModel):
    output_id: str
    file_path: str
    thumbnail_path: Optional[str] = None
    metadata: Dict[str, Any]
    processing_time: float

def get_model_manager(request: Request) -> ModelManager:
    """Dependency to get the model manager from app state"""
    return request.app.state.model_manager

@router.post("/image", response_model=GenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    background_tasks: BackgroundTasks,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Generate an anime-style image from text prompt"""
    
    logger.info(f"Starting image generation for output_id: {request.output_id}")
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Generate image
        image = await model_manager.generate_image(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
            style_settings=request.style
        )
        
        # Save image
        output_path = Path(settings.OUTPUT_DIR) / f"{request.output_id}.png"
        thumbnail_path = Path(settings.OUTPUT_DIR) / f"{request.output_id}_thumb.jpg"
        
        # Save full resolution image
        image.save(output_path, "PNG", quality=95)
        
        # Create thumbnail
        thumbnail = image.copy()
        thumbnail.thumbnail((256, 256), Image.Resampling.LANCZOS)
        thumbnail.save(thumbnail_path, "JPEG", quality=85)
        
        end_time = asyncio.get_event_loop().time()
        processing_time = end_time - start_time
        
        # Metadata
        metadata = {
            "width": request.width,
            "height": request.height,
            "steps": request.num_inference_steps,
            "guidance_scale": request.guidance_scale,
            "seed": request.seed or "random",
            "model": "stable-diffusion-anime",
            "style": request.style,
            "file_size": output_path.stat().st_size,
            "format": "PNG"
        }
        
        logger.info(f"Image generation completed in {processing_time:.2f}s")
        
        # Schedule cleanup of temporary files
        background_tasks.add_task(cleanup_temp_files, [])
        
        return GenerationResponse(
            output_id=request.output_id,
            file_path=str(output_path),
            thumbnail_path=str(thumbnail_path),
            metadata=metadata,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Image generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@router.post("/video", response_model=GenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Generate an anime-style video from text prompt"""
    
    logger.info(f"Starting video generation for output_id: {request.output_id}")
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Calculate frame count based on duration if provided
        if request.duration:
            num_frames = int(request.duration * request.fps)
            num_frames = min(num_frames, settings.MAX_FRAMES)
        else:
            num_frames = request.num_frames
        
        # Generate video frames
        frames = await model_manager.generate_video_frames(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            num_frames=num_frames,
            width=request.width,
            height=request.height,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
            style_settings=request.style
        )
        
        # Create video from frames
        video_service = VideoService()
        
        output_path = Path(settings.OUTPUT_DIR) / f"{request.output_id}.mp4"
        thumbnail_path = Path(settings.OUTPUT_DIR) / f"{request.output_id}_thumb.jpg"
        
        # Create video
        await video_service.create_video_from_frames(
            frames=frames,
            output_path=output_path,
            fps=request.fps,
            audio_track_id=request.audio_track_id
        )
        
        # Create thumbnail from first frame
        first_frame = frames[0]
        thumbnail = first_frame.copy()
        thumbnail.thumbnail((256, 256), Image.Resampling.LANCZOS)
        thumbnail.save(thumbnail_path, "JPEG", quality=85)
        
        end_time = asyncio.get_event_loop().time()
        processing_time = end_time - start_time
        
        # Metadata
        metadata = {
            "width": request.width,
            "height": request.height,
            "frames": num_frames,
            "fps": request.fps,
            "duration": num_frames / request.fps,
            "steps": request.num_inference_steps,
            "guidance_scale": request.guidance_scale,
            "seed": request.seed or "random",
            "model": "stable-diffusion-anime",
            "style": request.style,
            "has_audio": request.audio_track_id is not None,
            "file_size": output_path.stat().st_size,
            "format": "MP4"
        }
        
        logger.info(f"Video generation completed in {processing_time:.2f}s")
        
        # Schedule cleanup of temporary files
        background_tasks.add_task(cleanup_temp_files, frames)
        
        return GenerationResponse(
            output_id=request.output_id,
            file_path=str(output_path),
            thumbnail_path=str(thumbnail_path),
            metadata=metadata,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Video generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")

@router.get("/styles")
async def get_available_styles():
    """Get available anime styles and presets"""
    
    styles = {
        "art_styles": [
            {"id": "anime", "name": "Classic Anime", "description": "Traditional anime art style"},
            {"id": "kawaii", "name": "Kawaii", "description": "Cute and adorable style"},
            {"id": "realistic", "name": "Semi-Realistic", "description": "More realistic anime style"},
            {"id": "chibi", "name": "Chibi", "description": "Small and cute character style"},
            {"id": "manga", "name": "Manga", "description": "Black and white manga style"},
        ],
        "color_palettes": [
            {"id": "vibrant", "name": "Vibrant", "description": "Bright and colorful"},
            {"id": "pastel", "name": "Pastel", "description": "Soft and muted colors"},
            {"id": "monochrome", "name": "Monochrome", "description": "Black and white"},
            {"id": "neon", "name": "Neon", "description": "Bright neon colors"},
            {"id": "earth", "name": "Earth Tones", "description": "Natural earth colors"},
        ],
        "moods": [
            {"id": "happy", "name": "Happy", "description": "Cheerful and uplifting"},
            {"id": "mysterious", "name": "Mysterious", "description": "Dark and enigmatic"},
            {"id": "romantic", "name": "Romantic", "description": "Soft and romantic"},
            {"id": "action", "name": "Action", "description": "Dynamic and energetic"},
            {"id": "peaceful", "name": "Peaceful", "description": "Calm and serene"},
        ]
    }
    
    return styles

@router.get("/models/info")
async def get_model_info(
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Get information about loaded models"""
    
    try:
        info = model_manager.get_model_info()
        return info
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get model information")

@router.get("/output/{output_id}")
async def get_output_file(output_id: str):
    """Serve generated output files"""
    
    try:
        # Try different file extensions
        for ext in [".png", ".jpg", ".mp4", ".gif"]:
            file_path = Path(settings.OUTPUT_DIR) / f"{output_id}{ext}"
            if file_path.exists():
                media_type = "image/png" if ext == ".png" else \
                           "image/jpeg" if ext in [".jpg", ".jpeg"] else \
                           "video/mp4" if ext == ".mp4" else \
                           "image/gif" if ext == ".gif" else "application/octet-stream"
                
                return FileResponse(file_path, media_type=media_type)
        
        raise HTTPException(status_code=404, detail="Output file not found")
        
    except Exception as e:
        logger.error(f"Failed to serve output file: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve file")

@router.get("/thumbnail/{output_id}")
async def get_thumbnail(output_id: str):
    """Serve thumbnail files"""
    
    try:
        thumbnail_path = Path(settings.OUTPUT_DIR) / f"{output_id}_thumb.jpg"
        
        if thumbnail_path.exists():
            return FileResponse(thumbnail_path, media_type="image/jpeg")
        
        raise HTTPException(status_code=404, detail="Thumbnail not found")
        
    except Exception as e:
        logger.error(f"Failed to serve thumbnail: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve thumbnail")