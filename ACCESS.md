# How to Access Premium Tasks App

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- pnpm installed (or npm/yarn)

### Step-by-Step Setup

#### 1. **Install Dependencies**
```bash
pnpm install
# or
npm install
```

#### 2. **Set Up Environment Variables**
Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowly?schema=public"

# NextAuth (generate a random string)
AUTH_SECRET="your-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Redis (optional, for background jobs)
REDIS_URL="redis://localhost:6379"
```

**To generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### 3. **Start Docker Services (PostgreSQL & Redis)**
```bash
docker compose up -d
```

This will start:
- PostgreSQL on port `5432`
- Redis on port `6379`

#### 4. **Set Up Database**
```bash
# Run migrations
pnpm prisma migrate dev

# Seed the database with demo user
pnpm seed
```

#### 5. **Start the Development Server**
```bash
pnpm dev
```

The app will be available at: **http://localhost:3000**

---

## 🔐 Login Credentials

After seeding, use these credentials:

- **Email:** `demo@example.com`
- **Password:** `demo123`

---

## 📱 Accessing the App

### After Login:
1. **Dashboard** - `/dashboard` - Overview and statistics
2. **Today** - `/today` - Tasks due today
3. **All Tasks** - `/` - All your tasks

### Direct URLs:
- **Sign In:** http://localhost:3000/signin
- **Dashboard:** http://localhost:3000/dashboard
- **Today:** http://localhost:3000/today
- **All Tasks:** http://localhost:3000/

---

## 🛠️ Troubleshooting

### Port Already in Use
If port 3000 is taken:
```bash
# Use a different port
pnpm dev -- -p 3001
```

### Database Connection Issues
```bash
# Check if Docker containers are running
docker ps

# Restart Docker services
docker compose restart

# Check database connection
pnpm prisma studio
```

### Reset Database
```bash
# Reset and reseed
pnpm prisma migrate reset
pnpm seed
```

---

## 🎨 Features Available

✅ Beautiful UI with dark mode
✅ Task creation and management
✅ Priority levels (Low, Medium, High, Urgent)
✅ Due dates with overdue highlighting
✅ Search and filter tasks
✅ Task completion
✅ Dashboard with statistics
✅ Responsive design

---

## 📦 Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 🆘 Need Help?

- Check the console for errors
- Ensure Docker is running
- Verify `.env` file exists with correct values
- Make sure database migrations ran successfully



