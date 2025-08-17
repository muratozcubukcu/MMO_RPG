#!/bin/bash

# Wait for all services to be healthy
echo "🔍 Waiting for services to be healthy..."

SERVICES=(
  "http://localhost:3000/healthz"
  "http://localhost:3001/healthz"
  "http://localhost:3002/healthz"
  "http://localhost:3003/healthz"
  "http://localhost:3004/healthz"
  "http://localhost:3005/healthz"
  "http://localhost:3006/healthz"
  "http://localhost:3007/healthz"
  "http://localhost:3008/api/health"
)

MAX_ATTEMPTS=60
SLEEP_INTERVAL=5

for service in "${SERVICES[@]}"; do
  echo "⏳ Checking $service..."
  
  attempt=1
  while [ $attempt -le $MAX_ATTEMPTS ]; do
    if curl -f -s "$service" > /dev/null 2>&1; then
      echo "✅ $service is healthy"
      break
    fi
    
    if [ $attempt -eq $MAX_ATTEMPTS ]; then
      echo "❌ $service failed to become healthy after $((MAX_ATTEMPTS * SLEEP_INTERVAL)) seconds"
      exit 1
    fi
    
    echo "⏳ Attempt $attempt/$MAX_ATTEMPTS for $service..."
    sleep $SLEEP_INTERVAL
    ((attempt++))
  done
done

echo "🎉 All services are healthy!"
