# Anime SaaS Platform

A comprehensive SaaS platform for anime content generation using open-source AI models.

## Features

- **AI-Powered Generation**: Creates anime images and videos using Stable Diffusion with anime LoRA
- **Interactive Studio**: Image editing with layers, color adjustments, and text overlays
- **Video Pipeline**: Automated video generation with optional background music
- **User Management**: Complete authentication and user session handling
- **Real-time Processing**: Asynchronous job queue for generation tasks
- **Responsive UI**: Modern React frontend with TypeScript

## Quick Start

### Windows Development Setup

```powershell
# Run the automated setup script
npm run setup:windows

# Or manual setup:
npm run setup:dependencies
npm run dev
```

### Docker Deployment

```bash
# Build and start all services
npm run docker:build
npm run docker:up
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Service**: Python + FastAPI + Stable Diffusion
- **Queue**: BullMQ with Redis
- **Deployment**: Docker + Kubernetes

## Project Structure

```
anime-saas-platform/
├── frontend/          # React TypeScript frontend
├── backend/           # Node.js Express API
├── ai-service/        # Python AI model service
├── database/          # Database schemas and migrations
├── docker/            # Docker configurations
├── scripts/           # Deployment and setup scripts
├── k8s/              # Kubernetes manifests
└── docs/             # API documentation
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- Database connection strings
- JWT secrets
- Model API keys
- Storage configurations

## License

MIT License - see LICENSE file for details.

## Model Licensing

This project uses open-source models. Please review individual model licenses:
- Stable Diffusion: CreativeML Open RAIL++-M License
- Additional models: Check respective repositories