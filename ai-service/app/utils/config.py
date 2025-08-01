import os
from pathlib import Path
from typing import Optional

class Settings:
    # Model Configuration
    BASE_MODEL_ID: str = os.getenv("BASE_MODEL_ID", "runwayml/stable-diffusion-v1-5")
    ANIME_LORA_MODEL: str = os.getenv("ANIME_LORA_MODEL", "models/anime_lora.safetensors")
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "./models")
    
    # Generation Settings
    DEFAULT_WIDTH: int = int(os.getenv("DEFAULT_WIDTH", "512"))
    DEFAULT_HEIGHT: int = int(os.getenv("DEFAULT_HEIGHT", "512"))
    DEFAULT_STEPS: int = int(os.getenv("DEFAULT_STEPS", "20"))
    DEFAULT_GUIDANCE: float = float(os.getenv("DEFAULT_GUIDANCE", "7.5"))
    MAX_WIDTH: int = int(os.getenv("MAX_WIDTH", "1024"))
    MAX_HEIGHT: int = int(os.getenv("MAX_HEIGHT", "1024"))
    MAX_STEPS: int = int(os.getenv("MAX_STEPS", "50"))
    
    # Video Settings
    DEFAULT_FPS: int = int(os.getenv("DEFAULT_FPS", "24"))
    MAX_FRAMES: int = int(os.getenv("MAX_FRAMES", "120"))
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./outputs")
    TEMP_DIR: str = os.getenv("TEMP_DIR", "./temp")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "50")) * 1024 * 1024  # 50MB
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Service Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    WORKERS: int = int(os.getenv("WORKERS", "1"))
    
    # Security
    MAX_PROMPT_LENGTH: int = int(os.getenv("MAX_PROMPT_LENGTH", "1000"))
    ALLOWED_EXTENSIONS: list = [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # HuggingFace
    HUGGINGFACE_TOKEN: Optional[str] = os.getenv("HUGGINGFACE_TOKEN")
    
    def __init__(self):
        # Create directories
        for directory in [self.MODEL_CACHE_DIR, self.UPLOAD_DIR, self.OUTPUT_DIR, self.TEMP_DIR]:
            Path(directory).mkdir(parents=True, exist_ok=True)

settings = Settings()