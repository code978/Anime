from fastapi import APIRouter, Request
from datetime import datetime
import psutil
import torch
from typing import Dict, Any

from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "anime-ai-service"
    }

@router.get("/detailed")
async def detailed_health_check(request: Request):
    """Detailed health check with system information"""
    
    try:
        # Get model manager from app state
        model_manager = getattr(request.app.state, 'model_manager', None)
        
        # System information
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # GPU information
        gpu_info = {}
        if torch.cuda.is_available():
            gpu_info = {
                "available": True,
                "device_count": torch.cuda.device_count(),
                "current_device": torch.cuda.current_device(),
                "device_name": torch.cuda.get_device_name(),
                "memory_allocated": torch.cuda.memory_allocated() / 1024**3,  # GB
                "memory_reserved": torch.cuda.memory_reserved() / 1024**3,   # GB
                "memory_total": torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
            }
        else:
            gpu_info = {"available": False}
        
        # Model information
        model_info = {}
        if model_manager:
            model_info = model_manager.get_model_info()
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "anime-ai-service",
            "system": {
                "cpu_percent": cpu_percent,
                "memory": {
                    "total": memory.total / 1024**3,  # GB
                    "available": memory.available / 1024**3,  # GB
                    "percent": memory.percent
                },
                "disk": {
                    "total": disk.total / 1024**3,  # GB
                    "free": disk.free / 1024**3,  # GB
                    "percent": (disk.used / disk.total) * 100
                }
            },
            "gpu": gpu_info,
            "models": model_info
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.get("/ready")
async def readiness_check(request: Request):
    """Readiness check for Kubernetes"""
    
    try:
        model_manager = getattr(request.app.state, 'model_manager', None)
        
        if not model_manager:
            return {
                "status": "not_ready",
                "reason": "Model manager not initialized"
            }, 503
        
        model_info = model_manager.get_model_info()
        
        if not model_info.get("text2img_loaded", False):
            return {
                "status": "not_ready",
                "reason": "Text-to-image model not loaded"
            }, 503
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "status": "not_ready",
            "error": str(e)
        }, 503

@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes"""
    
    try:
        # Simple check that the service is responding
        return {
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        return {
            "status": "dead",
            "error": str(e)
        }, 503