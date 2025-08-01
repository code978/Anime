import os
import shutil
import hashlib
from pathlib import Path
from typing import List, Optional
import aiofiles
from PIL import Image
import logging

from .config import settings
from .logger import setup_logger

logger = setup_logger(__name__)

async def save_image(image: Image.Image, filename: str, output_dir: Optional[str] = None) -> str:
    """Save PIL Image to file"""
    
    try:
        if output_dir is None:
            output_dir = settings.OUTPUT_DIR
        
        output_path = Path(output_dir) / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save image
        image.save(output_path, format='PNG', optimize=True)
        
        logger.info(f"Image saved: {output_path}")
        return str(output_path)
        
    except Exception as e:
        logger.error(f"Failed to save image {filename}: {e}")
        raise

async def save_video(video_data: bytes, filename: str, output_dir: Optional[str] = None) -> str:
    """Save video data to file"""
    
    try:
        if output_dir is None:
            output_dir = settings.OUTPUT_DIR
        
        output_path = Path(output_dir) / filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(output_path, 'wb') as f:
            await f.write(video_data)
        
        logger.info(f"Video saved: {output_path}")
        return str(output_path)
        
    except Exception as e:
        logger.error(f"Failed to save video {filename}: {e}")
        raise

def get_file_hash(file_path: str) -> str:
    """Get MD5 hash of file"""
    
    try:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
        
    except Exception as e:
        logger.error(f"Failed to get hash for {file_path}: {e}")
        return ""

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    
    try:
        return os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Failed to get size for {file_path}: {e}")
        return 0

def ensure_directory(directory: str) -> None:
    """Ensure directory exists"""
    
    try:
        Path(directory).mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create directory {directory}: {e}")
        raise

async def cleanup_temp_files(files_to_keep: List[str] = None) -> None:
    """Clean up temporary files"""
    
    try:
        temp_dir = Path(settings.TEMP_DIR)
        if not temp_dir.exists():
            return
        
        files_to_keep = files_to_keep or []
        
        for file_path in temp_dir.iterdir():
            if file_path.is_file() and str(file_path) not in files_to_keep:
                try:
                    file_path.unlink()
                    logger.debug(f"Cleaned up temp file: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup {file_path}: {e}")
        
        logger.info("Temporary files cleanup completed")
        
    except Exception as e:
        logger.error(f"Failed to cleanup temp files: {e}")

def validate_file_type(file_path: str, allowed_extensions: List[str]) -> bool:
    """Validate file type by extension"""
    
    try:
        file_ext = Path(file_path).suffix.lower()
        return file_ext in [ext.lower() for ext in allowed_extensions]
        
    except Exception as e:
        logger.error(f"Failed to validate file type for {file_path}: {e}")
        return False

def get_safe_filename(filename: str) -> str:
    """Get safe filename by removing/replacing unsafe characters"""
    
    import re
    
    # Remove or replace unsafe characters
    safe_filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove multiple underscores
    safe_filename = re.sub(r'_+', '_', safe_filename)
    
    # Remove leading/trailing underscores and dots
    safe_filename = safe_filename.strip('_.')
    
    # Ensure filename is not empty
    if not safe_filename:
        safe_filename = "unnamed_file"
    
    return safe_filename[:255]  # Limit length

async def create_thumbnail(
    image_path: str, 
    thumbnail_path: str, 
    size: tuple = (256, 256)
) -> str:
    """Create thumbnail from image"""
    
    try:
        with Image.open(image_path) as img:
            # Create thumbnail maintaining aspect ratio
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save thumbnail
            img.save(thumbnail_path, format='JPEG', quality=85, optimize=True)
        
        logger.info(f"Thumbnail created: {thumbnail_path}")
        return thumbnail_path
        
    except Exception as e:
        logger.error(f"Failed to create thumbnail: {e}")
        raise

def compress_image(
    input_path: str, 
    output_path: str, 
    quality: int = 85,
    max_size: Optional[tuple] = None
) -> str:
    """Compress image for web delivery"""
    
    try:
        with Image.open(input_path) as img:
            # Resize if max_size specified
            if max_size:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            # Save compressed image
            img.save(output_path, format='JPEG', quality=quality, optimize=True)
        
        logger.info(f"Image compressed: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Failed to compress image: {e}")
        raise

def get_disk_usage(directory: str) -> dict:
    """Get disk usage information for directory"""
    
    try:
        usage = shutil.disk_usage(directory)
        return {
            'total': usage.total,
            'used': usage.used,
            'free': usage.free,
            'percent': (usage.used / usage.total) * 100
        }
        
    except Exception as e:
        logger.error(f"Failed to get disk usage for {directory}: {e}")
        return {'total': 0, 'used': 0, 'free': 0, 'percent': 0}

def cleanup_old_files(directory: str, max_age_days: int = 7) -> None:
    """Clean up files older than specified days"""
    
    try:
        import time
        
        current_time = time.time()
        cutoff_time = current_time - (max_age_days * 24 * 60 * 60)
        
        directory_path = Path(directory)
        if not directory_path.exists():
            return
        
        for file_path in directory_path.iterdir():
            if file_path.is_file():
                try:
                    file_mtime = file_path.stat().st_mtime
                    if file_mtime < cutoff_time:
                        file_path.unlink()
                        logger.debug(f"Cleaned up old file: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup old file {file_path}: {e}")
        
        logger.info(f"Old files cleanup completed for {directory}")
        
    except Exception as e:
        logger.error(f"Failed to cleanup old files in {directory}: {e}")