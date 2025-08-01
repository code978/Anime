import os
import cv2
import numpy as np
from typing import List, Optional, Tuple
from pathlib import Path
import asyncio
import logging
from PIL import Image
import moviepy.editor as mp
from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
import tempfile
import shutil

from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class VideoService:
    def __init__(self):
        self.temp_dir = Path(settings.TEMP_DIR)
        self.output_dir = Path(settings.OUTPUT_DIR)
        self.temp_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)

    async def create_video_from_frames(
        self,
        frames: List[Image.Image],
        output_path: Path,
        fps: int = 24,
        audio_track_id: Optional[str] = None,
    ) -> str:
        """Create video from a list of PIL Images with optional audio"""
        
        try:
            logger.info(f"Creating video with {len(frames)} frames at {fps} FPS")
            
            # Create temporary directory for this video
            with tempfile.TemporaryDirectory(dir=self.temp_dir) as temp_video_dir:
                temp_video_path = Path(temp_video_dir)
                
                # Save frames as temporary image files
                frame_paths = []
                for i, frame in enumerate(frames):
                    frame_path = temp_video_path / f"frame_{i:06d}.png"
                    frame.save(frame_path, "PNG")
                    frame_paths.append(str(frame_path))
                
                # Create video from image sequence
                video_clip = ImageSequenceClip(frame_paths, fps=fps)
                
                # Add audio if specified
                if audio_track_id:
                    audio_clip = await self._get_audio_clip(audio_track_id)
                    if audio_clip:
                        # Loop or trim audio to match video duration
                        video_duration = video_clip.duration
                        if audio_clip.duration < video_duration:
                            # Loop audio to match video length
                            loops_needed = int(np.ceil(video_duration / audio_clip.duration))
                            audio_clip = mp.concatenate_audioclips([audio_clip] * loops_needed)
                            audio_clip = audio_clip.subclip(0, video_duration)
                        else:
                            # Trim audio to match video length
                            audio_clip = audio_clip.subclip(0, video_duration)
                        
                        video_clip = video_clip.set_audio(audio_clip)
                
                # Write final video
                video_clip.write_videofile(
                    str(output_path),
                    fps=fps,
                    codec='libx264',
                    audio_codec='aac' if audio_track_id else None,
                    temp_audiofile=str(temp_video_path / 'temp_audio.m4a'),
                    remove_temp=True,
                    verbose=False,
                    logger=None  # Suppress moviepy logging
                )
                
                # Clean up
                video_clip.close()
                if audio_track_id and 'audio_clip' in locals():
                    audio_clip.close()
                
                logger.info(f"Video created successfully: {output_path}")
                return str(output_path)
                
        except Exception as e:
            logger.error(f"Failed to create video: {e}")
            raise

    async def create_interpolated_video(
        self,
        start_frame: Image.Image,
        end_frame: Image.Image,
        num_frames: int = 30,
        output_path: Path,
        fps: int = 24,
        interpolation_method: str = "linear"
    ) -> str:
        """Create smooth video transition between two images"""
        
        try:
            logger.info(f"Creating interpolated video with {num_frames} frames")
            
            # Convert PIL images to numpy arrays
            start_array = np.array(start_frame)
            end_array = np.array(end_frame)
            
            # Ensure both images have the same dimensions
            if start_array.shape != end_array.shape:
                # Resize end frame to match start frame
                end_frame_resized = end_frame.resize(start_frame.size, Image.Resampling.LANCZOS)
                end_array = np.array(end_frame_resized)
            
            # Generate interpolated frames
            frames = []
            for i in range(num_frames):
                t = i / (num_frames - 1)  # Interpolation factor (0 to 1)
                
                if interpolation_method == "linear":
                    # Linear interpolation
                    interpolated = (1 - t) * start_array + t * end_array
                elif interpolation_method == "ease_in_out":
                    # Ease in-out interpolation
                    t = self._ease_in_out(t)
                    interpolated = (1 - t) * start_array + t * end_array
                elif interpolation_method == "bounce":
                    # Bounce effect
                    t = self._bounce_easing(t)
                    interpolated = (1 - t) * start_array + t * end_array
                else:
                    # Default to linear
                    interpolated = (1 - t) * start_array + t * end_array
                
                # Convert back to PIL Image
                interpolated_frame = Image.fromarray(interpolated.astype(np.uint8))
                frames.append(interpolated_frame)
            
            # Create video from interpolated frames
            return await self.create_video_from_frames(frames, output_path, fps)
            
        except Exception as e:
            logger.error(f"Failed to create interpolated video: {e}")
            raise

    async def add_motion_effects(
        self,
        frames: List[Image.Image],
        effect_type: str = "zoom",
        intensity: float = 0.1
    ) -> List[Image.Image]:
        """Add motion effects to video frames"""
        
        try:
            logger.info(f"Adding {effect_type} motion effect with intensity {intensity}")
            
            processed_frames = []
            
            for i, frame in enumerate(frames):
                frame_array = np.array(frame)
                h, w = frame_array.shape[:2]
                
                if effect_type == "zoom":
                    # Gradual zoom effect
                    scale_factor = 1.0 + (intensity * i / len(frames))
                    new_h, new_w = int(h * scale_factor), int(w * scale_factor)
                    
                    # Resize and center crop
                    resized = cv2.resize(frame_array, (new_w, new_h))
                    
                    if scale_factor > 1.0:
                        # Crop from center
                        start_y = (new_h - h) // 2
                        start_x = (new_w - w) // 2
                        cropped = resized[start_y:start_y+h, start_x:start_x+w]
                    else:
                        cropped = resized
                    
                    processed_frame = Image.fromarray(cropped)
                
                elif effect_type == "pan":
                    # Pan effect (horizontal movement)
                    shift_x = int(intensity * w * i / len(frames))
                    
                    # Create transformation matrix
                    M = np.float32([[1, 0, shift_x], [0, 1, 0]])
                    shifted = cv2.warpAffine(frame_array, M, (w, h))
                    
                    processed_frame = Image.fromarray(shifted)
                
                elif effect_type == "rotate":
                    # Gradual rotation effect
                    angle = intensity * 360 * i / len(frames)
                    
                    # Get rotation matrix
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    rotated = cv2.warpAffine(frame_array, M, (w, h))
                    
                    processed_frame = Image.fromarray(rotated)
                
                elif effect_type == "fade":
                    # Fade effect
                    alpha = i / len(frames)
                    faded = frame_array * alpha
                    processed_frame = Image.fromarray(faded.astype(np.uint8))
                
                else:
                    # No effect, return original frame
                    processed_frame = frame
                
                processed_frames.append(processed_frame)
            
            return processed_frames
            
        except Exception as e:
            logger.error(f"Failed to add motion effects: {e}")
            return frames  # Return original frames on error

    async def create_slideshow_video(
        self,
        images: List[Image.Image],
        output_path: Path,
        duration_per_image: float = 3.0,
        transition_duration: float = 0.5,
        fps: int = 24,
        audio_track_id: Optional[str] = None
    ) -> str:
        """Create slideshow video from multiple images with transitions"""
        
        try:
            logger.info(f"Creating slideshow with {len(images)} images")
            
            all_frames = []
            frames_per_image = int(duration_per_image * fps)
            transition_frames = int(transition_duration * fps)
            
            for i, image in enumerate(images):
                # Add static frames for current image
                for _ in range(frames_per_image):
                    all_frames.append(image)
                
                # Add transition frames to next image
                if i < len(images) - 1:
                    next_image = images[i + 1]
                    transition_frames_list = await self._create_transition_frames(
                        image, next_image, transition_frames
                    )
                    all_frames.extend(transition_frames_list)
            
            return await self.create_video_from_frames(
                all_frames, output_path, fps, audio_track_id
            )
            
        except Exception as e:
            logger.error(f"Failed to create slideshow video: {e}")
            raise

    async def _create_transition_frames(
        self,
        from_image: Image.Image,
        to_image: Image.Image,
        num_frames: int,
        transition_type: str = "fade"
    ) -> List[Image.Image]:
        """Create transition frames between two images"""
        
        frames = []
        from_array = np.array(from_image)
        to_array = np.array(to_image)
        
        # Ensure both images have the same dimensions
        if from_array.shape != to_array.shape:
            to_image_resized = to_image.resize(from_image.size, Image.Resampling.LANCZOS)
            to_array = np.array(to_image_resized)
        
        for i in range(num_frames):
            t = i / (num_frames - 1)
            
            if transition_type == "fade":
                # Simple fade transition
                blended = (1 - t) * from_array + t * to_array
            elif transition_type == "slide":
                # Slide transition
                split_point = int(t * from_array.shape[1])
                blended = from_array.copy()
                blended[:, :split_point] = to_array[:, :split_point]
            else:
                # Default fade
                blended = (1 - t) * from_array + t * to_array
            
            frame = Image.fromarray(blended.astype(np.uint8))
            frames.append(frame)
        
        return frames

    async def _get_audio_clip(self, audio_track_id: str) -> Optional[mp.AudioFileClip]:
        """Get audio clip from audio track ID"""
        
        try:
            # This would typically fetch from database and load audio file
            # For now, return None to indicate no audio
            # In a real implementation, you would:
            # 1. Query database for audio track
            # 2. Load audio file using moviepy
            # 3. Return AudioFileClip
            
            # Example implementation:
            # audio_track = await get_audio_track_by_id(audio_track_id)
            # if audio_track and os.path.exists(audio_track.file_path):
            #     return mp.AudioFileClip(audio_track.file_path)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to load audio track {audio_track_id}: {e}")
            return None

    def _ease_in_out(self, t: float) -> float:
        """Ease in-out interpolation function"""
        if t < 0.5:
            return 2 * t * t
        else:
            return -1 + (4 - 2 * t) * t

    def _bounce_easing(self, t: float) -> float:
        """Bounce easing function"""
        if t < 0.5:
            return 2 * t * t
        else:
            return 1 - 2 * (1 - t) * (1 - t)

    async def optimize_video(
        self,
        input_path: Path,
        output_path: Path,
        target_size_mb: Optional[float] = None,
        target_quality: str = "medium"
    ) -> str:
        """Optimize video for web delivery"""
        
        try:
            logger.info(f"Optimizing video: {input_path}")
            
            video_clip = mp.VideoFileClip(str(input_path))
            
            # Set quality parameters
            if target_quality == "high":
                bitrate = "2000k"
            elif target_quality == "low":
                bitrate = "500k"  
            else:  # medium
                bitrate = "1000k"
            
            # Write optimized video
            video_clip.write_videofile(
                str(output_path),
                bitrate=bitrate,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(output_path.parent / 'temp_audio.m4a'),
                remove_temp=True,
                verbose=False,
                logger=None
            )
            
            video_clip.close()
            
            logger.info(f"Video optimized successfully: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to optimize video: {e}")
            raise

    async def extract_thumbnail(
        self,
        video_path: Path,
        output_path: Path,
        time_seconds: float = 1.0
    ) -> str:
        """Extract thumbnail from video at specified time"""
        
        try:
            video_clip = mp.VideoFileClip(str(video_path))
            
            # Extract frame at specified time
            frame = video_clip.get_frame(time_seconds)
            
            # Convert to PIL Image and save
            thumbnail = Image.fromarray(frame)
            thumbnail.save(output_path, "JPEG", quality=85)
            
            video_clip.close()
            
            logger.info(f"Thumbnail extracted: {output_path}")
            return str(output_path)
            
        except Exception as e:
            logger.error(f"Failed to extract thumbnail: {e}")
            raise