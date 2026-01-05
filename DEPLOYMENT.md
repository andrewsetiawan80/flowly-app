# Flowly Deployment Guide

## 🖥️ Deploy to Proxmox (Self-Hosted)

### Prerequisites on your Proxmox VM/LXC:
- Docker & Docker Compose installed
- Git installed

### Quick Deploy

**1. SSH into your Proxmox server:**
```bash
ssh root@192.168.2.136
```

**2. Clone the repository:**
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/flowly-app.git
cd flowly-app
```

**3. Create environment file:**
```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@db:5432/flowly"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://192.168.2.136:3000"
REDIS_URL="redis://redis:6379"
EOF
```

**4. Deploy:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**5. Access your app:**
Open http://192.168.2.136:3000 in your browser!

---

### Manual Docker Commands

```bash
# Build and start
docker compose up -d --build

# Run database migrations
docker compose exec app npx prisma migrate deploy

# View logs
docker compose logs -f app

# Stop everything
docker compose down

# Restart
docker compose restart
```

---

### Update Deployment

```bash
cd /opt/flowly-app
git pull
docker compose down
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

---

## 🌐 Other Deployment Options

### Vercel (Recommended for ease)
```bash
npm i -g vercel
vercel
```

### Railway (includes PostgreSQL)
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add PostgreSQL service
4. Set environment variables
5. Deploy!

---

## 📋 Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `AUTH_SECRET` | Secret for auth (generate with `openssl rand -base64 32`) | Random string |
| `NEXTAUTH_URL` | Your app's URL | `http://192.168.2.136:3000` |
| `REDIS_URL` | Redis connection (optional) | `redis://localhost:6379` |

---

## 🔧 Troubleshooting

**Container won't start:**
```bash
docker compose logs app
```

**Database connection issues:**
```bash
docker compose exec db psql -U postgres -c "SELECT 1"
```

**Reset everything:**
```bash
docker compose down -v  # Warning: deletes all data!
docker compose up -d --build
```

**Check container status:**
```bash
docker compose ps
```
