#!/bin/bash
set -e

echo "🚀 Flowly Deployment Script"
echo "==========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    cp .env.example .env
    
    # Generate AUTH_SECRET
    AUTH_SECRET=$(openssl rand -base64 32)
    sed -i "s|your-secret-key-here-generate-a-new-one|$AUTH_SECRET|g" .env
    
    echo -e "${YELLOW}⚠️  Please edit .env and set NEXTAUTH_URL to your server's IP/domain${NC}"
fi

# Build and start containers
echo -e "${GREEN}Building and starting containers...${NC}"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# Wait for database
echo -e "${GREEN}Waiting for database to be ready...${NC}"
sleep 5

# Run migrations
echo -e "${GREEN}Running database migrations...${NC}"
docker compose exec -T app npx prisma migrate deploy

# Run seed (optional - comment out if you don't want demo data)
# echo -e "${GREEN}Seeding database...${NC}"
# docker compose exec -T app npx prisma db seed

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Access your app at: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "📋 Useful commands:"
echo "  - View logs:     docker compose logs -f"
echo "  - Stop app:      docker compose down"
echo "  - Restart app:   docker compose restart"
echo "  - Update app:    git pull && ./deploy.sh"





