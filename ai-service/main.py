import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os

from app.models.model_manager import ModelManager
from app.routers import generation, health
from app.utils.config import settings
from app.utils.logger import setup_logger

app = FastAPI(
    title="Anime AI Generation Service",
    description="FastAPI service for anime content generation using Stable Diffusion",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

logger = setup_logger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.on_event("startup")
async def startup_event():
    """Initialize models and services on startup"""
    logger.info("🚀 Starting Anime AI Generation Service...")
    
    try:
        # Initialize model manager
        model_manager = ModelManager()
        await model_manager.initialize()
        
        # Store in app state for access in routes
        app.state.model_manager = model_manager
        
        logger.info("✅ AI service startup completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to start AI service: {e}")
        sys.exit(1)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down Anime AI Generation Service...")
    
    if hasattr(app.state, 'model_manager'):
        await app.state.model_manager.cleanup()

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(generation.router, prefix="/generate", tags=["generation"])

@app.get("/")
async def root():
    return {
        "service": "Anime AI Generation Service",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False,
        log_level="info"
    )