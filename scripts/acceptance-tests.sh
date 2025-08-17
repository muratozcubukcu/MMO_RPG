#!/bin/bash

# Acceptance tests for AI MMO RPG
echo "🧪 Running acceptance tests..."

API_BASE="http://localhost:3000/api"
WEB_BASE="http://localhost:3008"

# Test 1: Health checks
echo "📋 Test 1: Health checks"
curl -f "$API_BASE/../healthz" || exit 1
curl -f "$WEB_BASE/api/health" || exit 1
echo "✅ Health checks passed"

# Test 2: User registration
echo "📋 Test 2: User registration"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "username": "testuser'$(date +%s)'",
    "password": "password123"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
  echo "✅ User registration passed"
  ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo "❌ User registration failed"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

# Test 3: Login with test user
echo "📋 Test 3: Login with existing user"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
  echo "✅ Login passed"
  TEST_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

# Test 4: Create world (if worldgen service is available)
echo "📋 Test 4: World creation"
WORLD_RESPONSE=$(curl -s -X POST "$API_BASE/worlds" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A small peaceful village for testing",
    "title": "Test World"
  }')

if echo "$WORLD_RESPONSE" | grep -q '"id"'; then
  echo "✅ World creation initiated"
  WORLD_ID=$(echo "$WORLD_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
  echo "⚠️  World creation may not be available (requires all services)"
  echo "$WORLD_RESPONSE"
fi

# Test 5: Web interface
echo "📋 Test 5: Web interface"
if curl -f -s "$WEB_BASE" > /dev/null; then
  echo "✅ Web interface accessible"
else
  echo "❌ Web interface not accessible"
  exit 1
fi

echo "🎉 All acceptance tests passed!"
echo ""
echo "📊 Test Summary:"
echo "✅ Health checks working"
echo "✅ User registration working"
echo "✅ Authentication working"
echo "✅ Web interface accessible"
if [ ! -z "$WORLD_ID" ]; then
  echo "✅ World creation working"
fi
echo ""
echo "🚀 System is ready for use!"
echo "🌐 Web interface: $WEB_BASE"
echo "🔑 Test account: test@example.com / password123"
