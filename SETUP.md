# Anime SaaS Platform - Setup Guide

This guide will help you set up and deploy the Anime SaaS Platform on Windows and Linux systems.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Python 3.10+** - [Download](https://python.org/)
- **PostgreSQL 15+** - [Download](https://postgresql.org/)
- **Redis 6+** - [Download](https://redis.io/) or use Docker
- **Docker & Docker Compose** (optional but recommended)
- **Git** - [Download](https://git-scm.com/)

### Windows Quick Setup

```powershell
# Clone the repository
git clone <your-repo-url>
cd anime-saas-platform

# Run the automated setup script
npm run setup:windows

# Start the development environment
npm run dev
```

### Linux/Docker Quick Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd anime-saas-platform

# Copy environment file
cp .env.example .env

# Edit configuration (see Configuration section below)
nano .env

# Start with Docker Compose
docker-compose up -d

# Or install dependencies manually
npm run setup:dependencies
npm run dev
```

## 📋 Detailed Setup Instructions

### 1. Environment Configuration

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/anime_saas"
REDIS_URL="redis://localhost:6379"

# JWT Configuration  
JWT_SECRET="your-super-secure-jwt-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# API Configuration
PORT=3001
FRONTEND_URL="http://localhost:3000"
AI_SERVICE_URL="http://localhost:8000"

# AI Model Configuration
HUGGINGFACE_TOKEN="your-huggingface-token-for-model-downloads"
MODEL_CACHE_DIR="./models"
DEFAULT_MODEL="runwayml/stable-diffusion-v1-5"

# Optional: Email (for user verification)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 2. Database Setup

#### Option A: Docker (Recommended)
```bash
# Start PostgreSQL and Redis with Docker
docker-compose up postgres redis -d
```

#### Option B: Local Installation

**PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Windows (using chocolatey)
choco install postgresql

# Create database
sudo -u postgres createdb anime_saas
```

**Redis:**
```bash
# Ubuntu/Debian
sudo apt install redis-server

# Windows (using chocolatey) 
choco install redis-64

# Start Redis
redis-server
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with sample data
npx prisma db seed

# Start development server
npm run dev
```

### 4. AI Service Setup

```bash
cd ai-service

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Download base models (this may take some time)
python -c "
from diffusers import StableDiffusionPipeline
import torch
model = StableDiffusionPipeline.from_pretrained('runwayml/stable-diffusion-v1-5', torch_dtype=torch.float16)
model.save_pretrained('./models/stable-diffusion-v1-5')
print('Model downloaded successfully!')
"

# Start AI service
python main.py
```

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🐳 Docker Deployment

### Development with Docker

```bash
# Build and start all services
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

1. **Update environment variables for production:**
```bash
# Update .env file
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@your-db-host:5432/anime_saas"
FRONTEND_URL="https://yourdomain.com"
JWT_SECRET="your-super-secure-production-secret"
```

2. **Deploy with Docker Compose:**
```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d
```

3. **Or deploy to Kubernetes:**
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (local with minikube or cloud provider)
- kubectl configured
- Docker images built and pushed to registry

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/postgres.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy backend
kubectl apply -f k8s/backend.yaml

# Deploy AI service  
kubectl apply -f k8s/ai-service.yaml

# Deploy frontend
kubectl apply -f k8s/frontend.yaml

# Deploy ingress (nginx)
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n anime-saas
```

## 🔧 Configuration Options

### Model Configuration

The platform supports various anime models:

1. **Base Models:**
   - `runwayml/stable-diffusion-v1-5` (default)
   - `stabilityai/stable-diffusion-2-1`
   - `hakurei/waifu-diffusion`

2. **LoRA Models (for anime style):**
   - Place `.safetensors` files in `ai-service/models/`
   - Update model paths in environment variables

### Performance Tuning

#### GPU Configuration
```env
# Enable GPU acceleration (requires NVIDIA GPU + CUDA)
CUDA_VISIBLE_DEVICES=0
```

#### Memory Management
```env
# Adjust based on available RAM/VRAM
MODEL_OFFLOAD=true
XFORMERS_ENABLED=true
```

#### Queue Configuration
```env
# Adjust worker counts based on hardware
IMAGE_WORKERS=2
VIDEO_WORKERS=1
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:e2e
```

### AI Service Tests
```bash
cd ai-service
python -m pytest tests/
```

## 📊 Monitoring

### Health Checks
- Backend: `http://localhost:3001/api/health`
- AI Service: `http://localhost:8000/health/`
- Frontend: `http://localhost:3000`

### Logging
- Backend logs: `backend/logs/`
- AI service logs: Console output
- Container logs: `docker-compose logs [service]`

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3000
lsof -i :3000  # macOS/Linux
```

2. **Database connection issues:**
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d anime_saas
```

3. **Model download failures:**
```bash
# Check Hugging Face token
export HUGGINGFACE_TOKEN="your-token"
# Clear model cache
rm -rf ai-service/models/*
```

4. **GPU/CUDA issues:**
```bash
# Check NVIDIA driver
nvidia-smi
# Check CUDA installation
python -c "import torch; print(torch.cuda.is_available())"
```

### Performance Issues

1. **Slow generation times:**
   - Enable GPU acceleration
   - Use xformers for memory efficiency
   - Reduce image resolution or steps

2. **High memory usage:**
   - Enable model CPU offloading
   - Reduce batch sizes
   - Use lower precision (float16)

3. **Database performance:**
   - Add indexes for frequently queried fields
   - Use connection pooling
   - Consider read replicas for high load

## 📚 API Documentation

Once running, access the API documentation at:
- Backend API: `http://localhost:3001/api/docs`
- AI Service: `http://localhost:8000/docs`

## 🔒 Security Considerations

### Production Checklist

- [ ] Change all default passwords and secrets
- [ ] Enable HTTPS/TLS encryption
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable request/response logging
- [ ] Configure CORS properly
- [ ] Use secure session storage
- [ ] Implement input validation
- [ ] Set up monitoring and alerting
- [ ] Regular security updates

## 📈 Scaling

### Horizontal Scaling
- Use load balancers for multiple backend instances
- Deploy AI service on multiple GPU nodes
- Use Redis Cluster for high availability
- Implement database read replicas

### Vertical Scaling
- Increase server resources (CPU/RAM/GPU)
- Optimize database queries
- Use CDN for static assets
- Implement caching strategies

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Search existing issues on GitHub
4. Create a new issue with detailed information

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Stability AI for Stable Diffusion
- Hugging Face for model hosting
- Open source community for various libraries and tools