# AI MMO RPG - Text-Based Multiplayer Game

A server-authoritative text-based MMO RPG where players create AI-generated worlds, explore through natural language commands, and trade items on a global marketplace.

## 🎮 Features

- **AI-Generated Worlds**: Create unique worlds with custom prompts using Ollama LLMs
- **Natural Language Interface**: Type commands naturally - AI interprets your intent
- **Server-Authoritative Gameplay**: All game logic runs on the server for fairness
- **Deterministic Rules Engine**: Same actions always yield same results (seeded RNG)
- **Global Item Marketplace**: Trade items between different worlds
- **Real-time Updates**: WebSocket-powered live game events
- **Cross-World Items**: Items maintain provenance and can be used across worlds

## 🏗️ Architecture

### Services
- **Gateway**: Authentication, rate limiting, API proxy, GraphQL federation
- **Game Service**: Core gameplay, combat, quests, world state management
- **WorldGen Service**: AI world generation using Ollama, content compilation
- **Interpreter Service**: Natural language → structured commands via AI
- **Narrator Service**: Game events → narrative text via AI
- **Inventory Service**: Item management, equipment, crafting
- **Market Service**: Trading, order matching, escrow system
- **WS Notifier**: Real-time WebSocket event distribution
- **Web Frontend**: Next.js React application

### Infrastructure
- **PostgreSQL**: Primary database with Prisma ORM
- **Redis**: Caching, job queues, session storage
- **MinIO**: Object storage for world data and assets
- **Ollama**: Local LLM inference for AI features

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- pnpm (package manager)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ai_mmo
cp .env.example .env  # Edit as needed
```

### 2. Start Infrastructure
```bash
# Start all services
docker compose up -d

# Check service health
docker compose ps
```

### 3. Initialize Database
```bash
# Run migrations and seed data
docker compose logs db-migrate
docker compose logs db-seed
```

### 4. Access the Application
- **Web Interface**: http://localhost:3008
- **API Gateway**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (minio/minio123)
- **Ollama**: http://localhost:11434

### 5. Test Account
```
Email: test@example.com
Password: password123
```

## 🎯 Getting Started (Player Guide)

### 1. Create Account & Login
Visit http://localhost:3008 and register a new account or use the test credentials.

### 2. Create Your World
Click "Create World" and describe your ideal fantasy setting:
```
"A mystical forest realm where ancient trees hold magical secrets and friendly woodland creatures help travelers on their quests."
```

### 3. Start Playing
Once your world generates, you can:
- **Move**: "go north", "enter the cave", "climb the mountain"
- **Examine**: "look around", "examine the crystal", "check my inventory"
- **Interact**: "talk to the elder", "use my sword", "cast fireball"
- **Combat**: "attack the orc", "defend", "flee from battle"

### 4. Natural Language
The AI interpreter understands natural language:
- "tie my rope to the tree and climb down the cliff"
- "search the room for hidden passages"
- "convince the guard to let me pass"

## 🔧 Development

### Local Development
```bash
# Install dependencies
pnpm install

# Start infrastructure only
docker compose up postgres redis minio ollama -d

# Run database migrations
cd infra && pnpm prisma migrate dev

# Start services in development mode
pnpm dev
```

### Project Structure
```
ai_mmo/
├── apps/
│   ├── gateway/              # API Gateway & Auth
│   ├── game-service/         # Core gameplay
│   ├── worldgen-service/     # AI world generation
│   ├── interpreter-service/  # Natural language processing
│   ├── narrator-service/     # AI narrative generation
│   ├── inventory-service/    # Item management
│   ├── market-service/       # Trading system
│   ├── ws-notifier/         # WebSocket hub
│   └── web/                 # Next.js frontend
├── packages/
│   ├── shared-types/        # Zod schemas & types
│   ├── rules-engine/        # Game rules & logic
│   └── sdk-js/             # Client SDK
├── infra/
│   ├── prisma/             # Database schema
│   └── seed.ts             # Sample data
└── docker-compose.yml
```

### API Endpoints

#### Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"player@example.com","username":"player","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"player@example.com","password":"password123"}'
```

#### Gameplay (requires auth token)
```bash
# Create world
curl -X POST http://localhost:3000/api/worlds \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A dark fantasy realm with ancient ruins"}'

# Send command
curl -X POST http://localhost:3000/api/worlds/{worldId}/freeform \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"explore the mysterious tower","idempotencyKey":"unique-key"}'
```

## 🎨 Game Design

### AI Integration
- **Content Generation**: Worlds, quests, items, and NPCs created by AI
- **Natural Language**: Players interact using everyday language
- **Smart Interpretation**: AI understands intent and context
- **Narrative Enhancement**: AI generates immersive descriptions

### Deterministic Gameplay
- **Seeded RNG**: All randomness is reproducible
- **Server Authority**: No client-side manipulation possible
- **Audit Trail**: Every action is logged and verifiable
- **Consistent Rules**: Same inputs always produce same outputs

### Cross-World Economy
- **Item Archetypes**: Global item templates ensure compatibility
- **Provenance Tracking**: Items remember their origin world
- **Balance Modifiers**: Worlds can adjust foreign item power
- **Global Marketplace**: Trade items between any worlds

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:e2e

# Coverage report
pnpm test:cov
```

### Acceptance Tests
```bash
# Start services
docker compose up -d

# Wait for health checks
./scripts/wait-for-health.sh

# Run acceptance tests
./scripts/acceptance-tests.sh
```

## 📊 Monitoring

### Health Checks
```bash
# Check all services
curl http://localhost:3000/healthz
curl http://localhost:3001/healthz
curl http://localhost:3002/healthz
# ... etc
```

### Logs
```bash
# View all logs
docker compose logs -f

# Specific service
docker compose logs -f gateway

# Database logs
docker compose logs postgres
```

## 🔒 Security

- **JWT Authentication** with refresh tokens
- **Rate Limiting** on all endpoints
- **Content Moderation** for AI-generated content
- **Input Validation** using Zod schemas
- **CORS Protection** for web clients
- **SQL Injection Protection** via Prisma ORM

## 🚀 Deployment

### Production Environment
1. **Update Environment Variables**
   - Set strong JWT secrets
   - Configure production database URLs
   - Set up proper CORS origins

2. **Scale Services**
   ```bash
   docker compose up -d --scale game-service=3 --scale interpreter-service=2
   ```

3. **Load Balancer**
   - Configure nginx or cloud load balancer
   - Enable sticky sessions for WebSockets
   - Set up SSL certificates

4. **Database**
   - Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
   - Set up read replicas for scaling
   - Configure automated backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Guidelines
- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments for public APIs
- Write tests for business logic
- Update documentation for user-facing changes

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Core architecture and services
- [x] Basic AI world generation
- [x] Natural language interpretation
- [x] Simple combat and inventory
- [ ] Market MVP
- [ ] WebSocket real-time updates

### Phase 2
- [ ] Advanced AI features (better narrative)
- [ ] Guild system and social features
- [ ] Crafting and recipes
- [ ] Auction house
- [ ] Mobile-responsive UI

### Phase 3
- [ ] PvP combat system
- [ ] Seasonal events and leaderboards
- [ ] Advanced world modifiers
- [ ] Plugin system for custom content
- [ ] Mobile app (React Native)

## 🆘 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker resources
docker system df
docker system prune

# Check logs
docker compose logs <service-name>
```

**Database connection errors:**
```bash
# Reset database
docker compose down postgres
docker volume rm ai_mmo_postgres_data
docker compose up -d postgres
# Wait for startup, then run migrations
```

**Ollama model not found:**
```bash
# Pull models manually
docker compose exec ollama ollama pull llama3:8b-instruct
```

**Port conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :3000
# Kill processes or change ports in docker-compose.yml
```

### Performance Tuning

**Slow AI responses:**
- Increase Ollama memory allocation
- Use smaller/quantized models
- Enable response caching
- Scale interpreter services

**Database performance:**
- Add indexes for common queries
- Use connection pooling
- Consider read replicas
- Monitor slow queries

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: See `/docs` directory
- **API Reference**: Available at http://localhost:3000/graphql (when running)

---

**Happy adventuring! 🗡️✨**
