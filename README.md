# AI-Powered Text-Based MMO RPG

A server-authoritative text-based MMO RPG where players create unique AI-generated worlds, play through text adventures, and trade items on a global marketplace.

## 🎯 Key Features

- **AI-Generated Worlds**: Each player can create unique worlds using natural language prompts
- **Server-Authoritative**: All game logic runs on the server to prevent cheating
- **Deterministic Gameplay**: Same actions always yield same results using seeded RNG
- **Global Marketplace**: Trade items across different worlds with escrow system
- **Free-Form Actions**: Natural language input interpreted by AI into game actions
- **Real-Time Updates**: WebSocket connections for live game state updates

## 🏗️ Architecture

### Microservices

- **Gateway Service** (Port 3000): API gateway and authentication
- **Game Service** (Port 3002): Core game logic and state management
- **WorldGen Service** (Port 3003): AI-powered world generation using Ollama
- **Market Service** (Port 3004): Global marketplace and trading
- **Social Service** (Port 3005): Chat and social features
- **Interpreter Service** (Port 3006): AI action interpretation
- **Narrator Service** (Port 3007): AI story narration
- **Notifier Service** (Port 3008): WebSocket hub for real-time updates

### Infrastructure

- **PostgreSQL**: Primary database for game data
- **Redis**: Caching and session storage
- **MinIO**: S3-compatible object storage for world content
- **Ollama**: Local AI model runtime for content generation

## 📁 Project Structure

```
ai_mmo/
├── apps/                          # Microservices
│   ├── gateway/                   # API Gateway
│   ├── game-service/              # Game logic
│   ├── worldgen-service/          # World generation
│   ├── market-service/            # Marketplace
│   ├── social-service/            # Chat & social
│   ├── interpreter-service/       # AI action parsing
│   ├── narrator-service/          # AI narration
│   └── notifier/                  # WebSocket hub
├── packages/                      # Shared packages
│   ├── shared-types/              # TypeScript types & Zod schemas
│   ├── rules-engine/              # Deterministic game rules
│   ├── database/                  # Prisma schema & client
│   └── sdk-js/                    # Client SDK
├── infra/                         # Infrastructure
│   └── helm/                      # Kubernetes charts
├── docker-compose.yml             # Local development
└── pnpm-workspace.yaml           # Monorepo config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- 8GB+ RAM (for Ollama models)

### 1. Clone and Install

```bash
git clone <repository-url>
cd ai_mmo
pnpm install
```

### 2. Start Infrastructure

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

### 3. Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Seed with sample data
pnpm db:seed
```

### 4. Download AI Models

```bash
# Connect to Ollama container
docker exec -it ai-mmo-ollama ollama pull llama3:8b-instruct

# Verify model is available
docker exec -it ai-mmo-ollama ollama list
```

### 5. Access Services

- **API Gateway**: http://localhost:3000
- **Game Service**: http://localhost:3002
- **WorldGen Service**: http://localhost:3003
- **Market Service**: http://localhost:3004
- **MinIO Console**: http://localhost:9001 (admin/admin123)
- **Prisma Studio**: `pnpm db:studio`

## 🎮 Game Mechanics

### World Generation

1. Player submits a world prompt (e.g., "A dark fantasy realm with undead creatures")
2. WorldGen service uses Ollama to generate structured world data
3. Content is validated against strict schemas
4. World is compiled with deterministic seeds for reproducible gameplay
5. Final world is stored and marked as active

### Gameplay Loop

1. Player sends natural language commands
2. Interpreter service converts text to structured actions
3. Game service validates and processes actions using deterministic rules
4. Narrator service generates flavor text for outcomes
5. Events are broadcast to connected clients via WebSocket

### Item System

- **Archetypes**: Global item templates (e.g., "Iron Sword")
- **Instances**: Specific item copies with unique stats and provenance
- **Cross-World Trading**: Items can be used across different worlds with balance modifiers

### Marketplace

- **Order Book**: Buy/sell orders with price-time priority matching
- **Escrow System**: Secure item transfers with atomic transactions
- **Fee Structure**: Trading fees help control inflation

## 🛠️ Development

### Package Scripts

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm build           # Build all packages
pnpm test            # Run all tests
pnpm lint            # Lint all packages

# Database
pnpm db:generate     # Generate Prisma client
pnpm db:migrate      # Run migrations
pnpm db:studio       # Open Prisma Studio
pnpm db:reset        # Reset database

# Docker
pnpm docker:up       # Start Docker services
pnpm docker:down     # Stop Docker services
```

### Adding a New Service

1. Create service directory: `apps/my-service/`
2. Add package.json with dependencies
3. Implement NestJS modules and controllers
4. Add Dockerfile
5. Update docker-compose.yml
6. Add service URL to environment variables

### Database Changes

1. Modify `packages/database/prisma/schema.prisma`
2. Generate migration: `pnpm db:migrate`
3. Update TypeScript types as needed

## 📊 Data Models

### Core Entities

- **Users**: Player accounts and authentication
- **Worlds**: AI-generated game worlds with versions
- **Locations**: Areas within worlds with connections
- **Mobs**: Creatures with stats and drop tables
- **Quests**: Multi-step objectives with rewards
- **Items**: Archetypes and instances with stats
- **Orders**: Marketplace buy/sell orders
- **PlayerStates**: Per-world player progress

### Key Relationships

- Users can own multiple Worlds
- Items have global Archetypes but world-specific Instances
- PlayerStates track progress per User per World
- Orders reference either Archetypes (fungible) or Instances (unique)

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_mmo

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AI Services
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL_INTERPRETER=llama3:8b-instruct
OLLAMA_MODEL_NARRATOR=llama3:8b-instruct

# Object Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=world-content

# Service URLs
GAME_SERVICE_URL=http://localhost:3002
WORLDGEN_SERVICE_URL=http://localhost:3003
# ... etc
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Test specific package
cd packages/rules-engine && pnpm test

# Test with coverage
pnpm test --coverage
```

### Integration Tests

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pnpm test:integration
```

### Load Testing

```bash
# Install k6
# Run load tests
k6 run tests/load/game-actions.js
```

## 📈 Monitoring & Observability

### Metrics

- Request latency and throughput
- Database query performance
- AI model response times
- WebSocket connection counts
- Marketplace trade volumes

### Logging

- Structured JSON logs
- Request/response tracing
- Error tracking and alerting
- Audit trail for all game actions

### Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:3002/health
```

## 🔒 Security

### Authentication

- JWT-based authentication
- Refresh token rotation
- Session management in Redis

### Authorization

- Role-based access control (RBAC)
- Per-endpoint permission checks
- Rate limiting on sensitive operations

### Input Validation

- Zod schema validation on all inputs
- SQL injection prevention via Prisma
- XSS protection for user content

### Content Moderation

- Profanity filtering on prompts and chat
- AI content safety checks
- User reporting system

## 🚀 Deployment

### Local Development

Use Docker Compose as shown in Quick Start.

### Production (Kubernetes)

```bash
# Build and push images
docker build -t ai-mmo/gateway apps/gateway/
docker push ai-mmo/gateway

# Deploy with Helm
helm install ai-mmo infra/helm/ai-mmo/

# Check status
kubectl get pods -n ai-mmo
```

### Environment-Specific Configs

- **Development**: All services in Docker Compose
- **Staging**: Kubernetes with external database
- **Production**: Kubernetes with HA database and Redis cluster

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- TypeScript strict mode
- ESLint + Prettier formatting
- Comprehensive test coverage
- Documentation for public APIs

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bugs and feature requests
- **Discussions**: GitHub Discussions for questions
- **Documentation**: See `/docs` directory for detailed guides

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- [x] Core architecture and database schema
- [x] Basic world generation with AI
- [x] Simple game actions and state management
- [x] Item system with archetypes/instances
- [x] Basic marketplace functionality

### Phase 2: Enhanced Gameplay
- [ ] Advanced combat system
- [ ] Quest system implementation
- [ ] Guild and social features
- [ ] Mobile-responsive web client
- [ ] Admin dashboard

### Phase 3: Scale & Polish
- [ ] Performance optimization
- [ ] Advanced AI features
- [ ] Seasonal events and content
- [ ] Analytics and reporting
- [ ] Mobile app (React Native)

---

Built with ❤️ using TypeScript, NestJS, Prisma, and Ollama.
