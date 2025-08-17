# AI MMO - Text-Based MMO RPG with AI-Generated Worlds

A comprehensive text-based MMO RPG where players create AI-generated worlds, engage in server-authoritative gameplay, and trade items on a global marketplace that works across all worlds.

## 🎮 Features

- **AI-Generated Worlds**: Create unique worlds using natural language prompts
- **Server-Authoritative Gameplay**: All game logic runs on the server to prevent cheating
- **Free-Form Actions**: Natural language input with AI interpretation
- **Cross-World Trading**: Global marketplace for items that work across all worlds
- **Real-Time Multiplayer**: WebSocket-based real-time updates
- **Deterministic Rules Engine**: Consistent gameplay with seeded randomness
- **Social Features**: Chat, guilds, friends, and moderation systems

## 🏗️ Architecture

### High-Level Overview

```
[Frontend (Next.js)] ⇄ [API Gateway]
   ↘ GraphQL (reads)           ↙ REST (commands)
     [Game Service]  [Inventory Service]  [Marketplace Service]
           │                   │               │
           ├── Redis Cache ────┼───────────────┤
           ├── Events ─────────┼──→ Job Queue ──┤
           │                   │               │
        [PostgreSQL]      [PostgreSQL]    [PostgreSQL]
           │                                   │
           └── Audit/Event Log ◀──────────────┘

     [WorldGen Service] ⇄ [Ollama] → validates → [MinIO + PostgreSQL]
     [Interpreter Service] ⇄ [Ollama] → ActionPlan
     [Narrator Service] ⇄ [Ollama] → Story Text
```

### Services

- **Gateway**: API Gateway with authentication and rate limiting
- **Game Service**: Core game logic, actions, and state management
- **WorldGen Service**: AI-powered world generation with Ollama
- **Inventory Service**: Item management and archetype system
- **Marketplace Service**: Order book, escrow, and trading
- **Social Service**: Chat, guilds, and social features
- **Interpreter Service**: AI-powered free-form action parsing
- **Narrator Service**: AI-generated story and flavor text
- **Notifier Service**: WebSocket events and notifications

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-mmo
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

5. **Set up the database**
   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

6. **Download AI models (optional - for local AI)**
   ```bash
   # Connect to Ollama container and pull models
   docker exec -it ai-mmo-ollama ollama pull llama3:8b-instruct-q4_0
   docker exec -it ai-mmo-ollama ollama pull mixtral:8x7b-instruct-v0.1-q4_0
   ```

7. **Start development services**
   ```bash
   pnpm dev
   ```

### Access Points

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3000/api
- **Database Admin**: http://localhost:8080 (Adminer)
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

## 📁 Project Structure

```
ai-mmo/
├── apps/
│   ├── frontend/           # Next.js web application
│   ├── gateway/            # API Gateway (NestJS)
│   ├── game-service/       # Core game logic (NestJS)
│   ├── worldgen-service/   # AI world generation (NestJS)
│   ├── market-service/     # Trading and marketplace (NestJS)
│   ├── social-service/     # Chat and social features (NestJS)
│   ├── interpreter-service/# AI action interpretation (NestJS)
│   ├── narrator-service/   # AI story generation (NestJS)
│   └── notifier/          # WebSocket notifications (NestJS)
├── packages/
│   ├── shared-types/      # Zod schemas and TypeScript types
│   ├── rules-engine/      # Deterministic game rules
│   ├── sdk-js/           # Client SDK
│   └── database/         # Prisma schema and client
├── infra/
│   ├── docker/           # Docker configurations
│   ├── helm/             # Kubernetes Helm charts
│   └── scripts/          # Deployment and utility scripts
├── docker-compose.yml    # Development infrastructure
└── README.md
```

## 🎯 Game Design

### World Generation Pipeline

1. **Prompt Intake**: User provides natural language description
2. **AI Generation**: Ollama generates structured JSON world data
3. **Validation**: Schema validation and content moderation
4. **Compilation**: Generate derived data and deterministic seeds
5. **Storage**: Store in MinIO with PostgreSQL references

### Gameplay Loop

1. **Player Input**: Free-form text or structured commands
2. **AI Interpretation**: Convert to standardized ActionPlan
3. **Rules Engine**: Deterministic outcome calculation
4. **State Update**: Update game state and emit events
5. **AI Narration**: Generate flavor text for the outcome
6. **Client Update**: Push updates via WebSocket

### Item System

- **Archetypes**: Global item templates (stats, rarity, slot)
- **Instances**: Individual items with unique rolls and provenance
- **Cross-World**: Items work across worlds with balance modifiers
- **Trading**: Global marketplace with escrow system

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all services in development mode
pnpm build            # Build all packages and services
pnpm test             # Run all tests
pnpm lint             # Lint all code

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Create and run migrations
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database with initial data

# Infrastructure
docker-compose up -d          # Start infrastructure services
docker-compose down           # Stop infrastructure services
docker-compose logs [service] # View service logs
```

### Adding New Services

1. Create service directory in `apps/`
2. Add to `pnpm-workspace.yaml`
3. Update `docker-compose.yml` if needed
4. Add to Prometheus configuration
5. Update API Gateway routes

### Database Changes

1. Modify `packages/database/prisma/schema.prisma`
2. Run `pnpm db:generate` to update client
3. Run `pnpm db:push` for development or `pnpm db:migrate` for production
4. Update seed script if needed

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `OLLAMA_BASE_URL`: Ollama API endpoint
- `JWT_SECRET`: JWT signing secret
- `MINIO_*`: MinIO/S3 configuration

### Feature Flags

- `ENABLE_REGISTRATION`: Allow new user registration
- `ENABLE_WORLD_CREATION`: Allow world creation
- `ENABLE_MARKETPLACE`: Enable trading features
- `ENABLE_AI_NARRATOR`: Use AI for story generation

## 🔒 Security

- **Server Authority**: All game logic runs server-side
- **JWT Authentication**: Secure session management
- **Rate Limiting**: Prevent abuse and spam
- **Input Validation**: Zod schema validation
- **Content Moderation**: AI-powered content filtering
- **Audit Logging**: Complete action history

## 📊 Monitoring

- **Metrics**: Prometheus + Grafana dashboards
- **Tracing**: Jaeger distributed tracing
- **Logging**: Structured JSON logs
- **Health Checks**: Service health monitoring
- **Alerts**: Configurable alert rules

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   - Set production environment variables
   - Configure external services (PostgreSQL, Redis, S3)
   - Set up SSL/TLS certificates

2. **Database Migration**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

3. **Build and Deploy**
   ```bash
   pnpm build
   # Deploy using your preferred method (Docker, Kubernetes, etc.)
   ```

### Kubernetes Deployment

Helm charts are provided in `infra/helm/`:

```bash
helm install ai-mmo ./infra/helm/ai-mmo \
  --set database.host=your-postgres-host \
  --set redis.host=your-redis-host
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- TypeScript for all code
- ESLint + Prettier for formatting
- Conventional commits
- Comprehensive JSDoc comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎮 Gameplay Examples

### Creating a World

```
Prompt: "A dark fantasy realm where ancient magic has corrupted the land. 
Undead roam crumbling cities while survivors hide in fortified settlements. 
The player must find artifacts to cleanse the corruption."
```

### Free-Form Actions

```
Player: "I carefully examine the rusty lock on the chest, looking for traps"
→ AI Interpreter: CUSTOM_SKILL_CHECK (perception, normal difficulty)
→ Rules Engine: Roll against player stats
→ AI Narrator: "Your keen eyes spot a thin wire connected to the lock..."
```

### Cross-World Trading

```
1. Player finds "Shadowbane Sword" in dark fantasy world
2. Lists it on global marketplace for 500 gold
3. Another player from sci-fi world buys it
4. Sword appears in sci-fi world with balanced stats
```

## 🔮 Future Features

- **Mobile App**: React Native companion app
- **Voice Commands**: Speech-to-text action input
- **Procedural Quests**: AI-generated dynamic quests
- **Player Housing**: Customizable player homes
- **Seasonal Events**: Time-limited global events
- **Modding Support**: User-created content system

---

**Happy Gaming! 🎮**
