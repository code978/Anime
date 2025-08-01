# Anime SaaS Platform - Windows Setup Script
# This script sets up the development environment on Windows

Write-Host "🎌 Setting up Anime SaaS Platform..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker not found. Docker is optional for local development." -ForegroundColor Yellow
}

# Check if PostgreSQL is running (optional for local dev)
try {
    $pgStatus = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
    if ($pgStatus) {
        Write-Host "✅ PostgreSQL service found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PostgreSQL not found. Using Docker container for database." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  PostgreSQL not found. Using Docker container for database." -ForegroundColor Yellow
}

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file from .env.example" -ForegroundColor Green
    Write-Host "📝 Please edit .env file with your configuration" -ForegroundColor Yellow
}

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Blue
npm install

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
Set-Location backend
npm install
Set-Location ..

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
Set-Location frontend
npm install
Set-Location ..

# Install AI service dependencies
Write-Host "📦 Installing AI service dependencies..." -ForegroundColor Blue
Set-Location ai-service
pip install -r requirements.txt
Set-Location ..

# Create uploads directory
if (!(Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads"
    Write-Host "✅ Created uploads directory" -ForegroundColor Green
}

# Create models directory
if (!(Test-Path "models")) {
    New-Item -ItemType Directory -Path "models"
    Write-Host "✅ Created models directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file with your configuration"
Write-Host "2. Start PostgreSQL and Redis (or use Docker: docker-compose up postgres redis)"
Write-Host "3. Run database migrations: npm run backend:migrate"
Write-Host "4. Start development servers: npm run dev"
Write-Host ""
Write-Host "🌐 Frontend will be available at: http://localhost:3000"
Write-Host "🔧 Backend API will be available at: http://localhost:3001"
Write-Host "🤖 AI Service will be available at: http://localhost:8000"