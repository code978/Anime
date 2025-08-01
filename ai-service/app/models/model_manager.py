import torch
import asyncio
import logging
from typing import Optional, Dict, Any
from pathlib import Path
import gc

from diffusers import (
    StableDiffusionPipeline,
    StableDiffusionImg2ImgPipeline,
    DiffusionPipeline,
    DPMSolverMultistepScheduler,
    EulerAncestralDiscreteScheduler
)
from transformers import CLIPTextModel, CLIPTokenizer
import safetensors.torch as safetensors

from ..utils.config import settings
from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class ModelManager:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        self.text2img_pipeline: Optional[StableDiffusionPipeline] = None
        self.img2img_pipeline: Optional[StableDiffusionImg2ImgPipeline] = None
        
        self.models_cache = {}
        self.lora_cache = {}
        
        logger.info(f"Initialized ModelManager with device: {self.device}")

    async def initialize(self):
        """Initialize the AI models"""
        logger.info("🔄 Initializing AI models...")
        
        try:
            # Load base Stable Diffusion model
            await self._load_base_model()
            
            # Load anime-specific LoRA weights
            await self._load_anime_lora()
            
            # Optimize models
            await self._optimize_models()
            
            logger.info("✅ AI models initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize models: {e}")
            raise

    async def _load_base_model(self):
        """Load the base Stable Diffusion model"""
        logger.info("Loading base Stable Diffusion model...")
        
        model_id = settings.BASE_MODEL_ID
        cache_dir = Path(settings.MODEL_CACHE_DIR)
        
        # Text-to-Image Pipeline
        self.text2img_pipeline = StableDiffusionPipeline.from_pretrained(
            model_id,
            torch_dtype=self.dtype,
            cache_dir=cache_dir,
            safety_checker=None,
            requires_safety_checker=False,
        )
        
        # Image-to-Image Pipeline
        self.img2img_pipeline = StableDiffusionImg2ImgPipeline.from_pretrained(
            model_id,
            torch_dtype=self.dtype,
            cache_dir=cache_dir,
            safety_checker=None,
            requires_safety_checker=False,
        )
        
        # Move to device
        self.text2img_pipeline = self.text2img_pipeline.to(self.device)
        self.img2img_pipeline = self.img2img_pipeline.to(self.device)
        
        # Set scheduler
        self.text2img_pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            self.text2img_pipeline.scheduler.config
        )
        self.img2img_pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            self.img2img_pipeline.scheduler.config
        )

    async def _load_anime_lora(self):
        """Load anime-specific LoRA weights"""
        logger.info("Loading anime LoRA weights...")
        
        try:
            # Popular anime LoRA models
            anime_loras = [
                {
                    "name": "anime_style",
                    "path": "models/anime_style_lora.safetensors",
                    "weight": 0.8
                },
                {
                    "name": "character_design",
                    "path": "models/character_design_lora.safetensors", 
                    "weight": 0.6
                }
            ]
            
            for lora_config in anime_loras:
                lora_path = Path(lora_config["path"])
                if lora_path.exists():
                    # Load LoRA weights
                    lora_weights = safetensors.load_file(lora_path)
                    self.lora_cache[lora_config["name"]] = {
                        "weights": lora_weights,
                        "weight": lora_config["weight"]
                    }
                    logger.info(f"Loaded LoRA: {lora_config['name']}")
                else:
                    logger.warning(f"LoRA file not found: {lora_path}")
                    
        except Exception as e:
            logger.warning(f"Failed to load LoRA weights: {e}")

    async def _optimize_models(self):
        """Optimize models for better performance"""
        logger.info("Optimizing models...")
        
        if self.device == "cuda":
            # Enable memory efficient attention
            try:
                self.text2img_pipeline.enable_xformers_memory_efficient_attention()
                self.img2img_pipeline.enable_xformers_memory_efficient_attention()
                logger.info("✅ Enabled xformers memory efficient attention")
            except Exception as e:
                logger.warning(f"Failed to enable xformers: {e}")
            
            # Enable model CPU offload for large models
            try:
                self.text2img_pipeline.enable_model_cpu_offload()
                self.img2img_pipeline.enable_model_cpu_offload()
                logger.info("✅ Enabled model CPU offload")
            except Exception as e:
                logger.warning(f"Failed to enable CPU offload: {e}")

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        num_inference_steps: int = 20,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
        style_settings: Optional[Dict[str, Any]] = None
    ) -> torch.Tensor:
        """Generate an anime-style image from text prompt"""
        
        try:
            # Apply anime style enhancements
            enhanced_prompt = self._enhance_anime_prompt(prompt, style_settings)
            enhanced_negative = self._get_anime_negative_prompt(negative_prompt)
            
            # Set random seed if provided
            if seed is not None:
                torch.manual_seed(seed)
            
            # Generate image
            with torch.no_grad():
                result = self.text2img_pipeline(
                    prompt=enhanced_prompt,
                    negative_prompt=enhanced_negative,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=torch.Generator(device=self.device).manual_seed(seed) if seed else None
                )
            
            return result.images[0]
            
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            raise

    def _enhance_anime_prompt(self, prompt: str, style_settings: Optional[Dict[str, Any]] = None) -> str:
        """Enhance prompt with anime-specific terms"""
        
        anime_enhancers = [
            "anime style",
            "high quality",
            "detailed",
            "masterpiece",
            "best quality"
        ]
        
        if style_settings:
            # Add style-specific enhancements
            if style_settings.get("art_style") == "kawaii":
                anime_enhancers.extend(["cute", "kawaii", "adorable"])
            elif style_settings.get("art_style") == "realistic":
                anime_enhancers.extend(["realistic", "photorealistic", "detailed"])
            elif style_settings.get("art_style") == "chibi":
                anime_enhancers.extend(["chibi", "cute", "small"])
            
            # Add color palette
            if style_settings.get("color_palette") == "vibrant":
                anime_enhancers.extend(["vibrant colors", "colorful"])
            elif style_settings.get("color_palette") == "pastel":
                anime_enhancers.extend(["pastel colors", "soft colors"])
            elif style_settings.get("color_palette") == "monochrome":
                anime_enhancers.extend(["monochrome", "black and white"])
        
        enhanced_prompt = f"{prompt}, {', '.join(anime_enhancers)}"
        return enhanced_prompt

    def _get_anime_negative_prompt(self, negative_prompt: str = "") -> str:
        """Get anime-optimized negative prompt"""
        
        anime_negatives = [
            "lowres",
            "bad anatomy",
            "bad hands",
            "text",
            "error",
            "missing fingers",
            "extra digit",
            "fewer digits",
            "cropped",
            "worst quality",
            "low quality",
            "normal quality",
            "jpeg artifacts",
            "signature",
            "watermark",
            "username",
            "blurry",
            "extra limbs",
            "malformed limbs"
        ]
        
        if negative_prompt:
            return f"{negative_prompt}, {', '.join(anime_negatives)}"
        else:
            return ', '.join(anime_negatives)

    async def generate_video_frames(
        self,
        prompt: str,
        num_frames: int = 24,
        width: int = 512,
        height: int = 512,
        **kwargs
    ) -> list:
        """Generate multiple frames for video creation"""
        
        frames = []
        
        try:
            for i in range(num_frames):
                # Add slight variation to each frame
                frame_prompt = f"{prompt}, frame {i+1}"
                seed = kwargs.get('seed', 42) + i
                
                frame = await self.generate_image(
                    prompt=frame_prompt,
                    width=width,
                    height=height,
                    seed=seed,
                    **{k: v for k, v in kwargs.items() if k != 'seed'}
                )
                
                frames.append(frame)
                
                # Clear cache periodically
                if i % 5 == 0:
                    torch.cuda.empty_cache() if self.device == "cuda" else None
            
            return frames
            
        except Exception as e:
            logger.error(f"Video frame generation failed: {e}")
            raise

    async def cleanup(self):
        """Clean up models and free memory"""
        logger.info("🧹 Cleaning up AI models...")
        
        try:
            if self.text2img_pipeline:
                del self.text2img_pipeline
            if self.img2img_pipeline:
                del self.img2img_pipeline
            
            self.models_cache.clear()
            self.lora_cache.clear()
            
            # Force garbage collection
            gc.collect()
            
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            logger.info("✅ Model cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Model cleanup failed: {e}")

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        return {
            "device": self.device,
            "dtype": str(self.dtype),
            "text2img_loaded": self.text2img_pipeline is not None,
            "img2img_loaded": self.img2img_pipeline is not None,
            "lora_models": list(self.lora_cache.keys()),
            "memory_usage": self._get_memory_usage()
        }

    def _get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage"""
        if self.device == "cuda":
            allocated = torch.cuda.memory_allocated() / 1024**3  # GB
            cached = torch.cuda.memory_reserved() / 1024**3  # GB
            return {
                "allocated_gb": round(allocated, 2),
                "cached_gb": round(cached, 2)
            }
        return {"allocated_gb": 0, "cached_gb": 0}