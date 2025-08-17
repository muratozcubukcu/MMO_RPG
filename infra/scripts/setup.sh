#!/bin/bash

# AI MMO Setup Script
# This script sets up the development environment for the AI MMO project

set -e

echo "🚀 Setting up AI MMO development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi
print_status "Node.js $(node --version) is installed"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi
print_status "pnpm $(pnpm --version) is installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi
print_status "Docker $(docker --version | cut -d' ' -f3 | sed 's/,//') is installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose"
    exit 1
fi
print_status "Docker Compose is installed"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
print_status "Dependencies installed"

# Set up environment file
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment file..."
    cp .env.example .env
    print_status "Environment file created (.env)"
    print_warning "Please review and update the .env file with your configuration"
else
    print_status "Environment file already exists"
fi

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d
print_status "Infrastructure services started"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U ai_mmo -d ai_mmo &> /dev/null; then
    print_status "PostgreSQL is ready"
else
    print_warning "PostgreSQL is not ready yet, continuing anyway..."
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping &> /dev/null; then
    print_status "Redis is ready"
else
    print_warning "Redis is not ready yet, continuing anyway..."
fi

# Generate Prisma client
echo "🗄️  Setting up database..."
pnpm db:generate
print_status "Prisma client generated"

# Push database schema
pnpm db:push
print_status "Database schema pushed"

# Seed database
pnpm db:seed
print_status "Database seeded with initial data"

# Download AI models (optional)
echo "🤖 Downloading AI models (this may take a while)..."
print_warning "This step is optional but recommended for local AI functionality"
read -p "Do you want to download AI models now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Downloading Llama 3 8B model..."
    docker exec -it ai-mmo-ollama ollama pull llama3:8b-instruct-q4_0 || print_warning "Failed to download llama3:8b-instruct-q4_0"
    
    echo "Downloading Mixtral 8x7B model..."
    docker exec -it ai-mmo-ollama ollama pull mixtral:8x7b-instruct-v0.1-q4_0 || print_warning "Failed to download mixtral:8x7b-instruct-v0.1-q4_0"
    
    print_status "AI models downloaded"
else
    print_warning "Skipping AI model download. You can download them later with:"
    echo "  docker exec -it ai-mmo-ollama ollama pull llama3:8b-instruct-q4_0"
    echo "  docker exec -it ai-mmo-ollama ollama pull mixtral:8x7b-instruct-v0.1-q4_0"
fi

# Final status
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Review and update your .env file if needed"
echo "  2. Run 'pnpm dev' to start the development servers"
echo "  3. Visit http://localhost:3000 to access the application"
echo ""
echo "📚 Useful commands:"
echo "  pnpm dev              # Start all development servers"
echo "  pnpm db:studio        # Open Prisma Studio (database GUI)"
echo "  docker-compose logs   # View infrastructure logs"
echo ""
echo "🔗 Access points:"
echo "  Frontend:        http://localhost:3000"
echo "  Database Admin:  http://localhost:8080"
echo "  MinIO Console:   http://localhost:9001"
echo "  Grafana:         http://localhost:3001"
echo "  Prometheus:      http://localhost:9090"
echo "  Jaeger:          http://localhost:16686"
echo ""
print_status "Happy coding! 🚀"