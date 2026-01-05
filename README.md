# Flowly — Premium Task Manager

Premium-styled, self-hostable tasks app with beautiful UI:
- ✨ Modern UI with Tailwind + dark mode (next-themes)
- 🎨 **Framer Motion** animations
- 📱 Responsive design with sidebar navigation
- ✅ Task management with priorities, due dates, and lists
- 🔍 Search and filter functionality
- 📊 Dashboard with statistics
- 🎯 Task creation, completion, and organization
- Next.js App Router + Prisma + NextAuth (Credentials)
- Postgres + Redis + BullMQ worker scaffold

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 2. Set Up Environment
If you don't have a `.env` file, copy the example:
```bash
cp .env.example .env
```

Make sure your `.env` has:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowly?schema=public"
AUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Start Docker Services
```bash
docker compose up -d
```

### 4. Set Up Database
```bash
pnpm prisma migrate dev
pnpm seed
```

### 5. Start Development Server
```bash
pnpm dev
```

### 6. Access the App
Open your browser and go to: **http://localhost:3000**

**Login Credentials:**
- Email: `demo@example.com`
- Password: `demo123`

## 📱 App Pages

- **Dashboard** (`/dashboard`) - Overview and statistics
- **Today** (`/today`) - Tasks due today
- **All Tasks** (`/`) - All your tasks
- **Sign In** (`/signin`) - Login page

## 🎨 Features

✅ Beautiful task cards with animations  
✅ Priority indicators (Low, Medium, High, Urgent)  
✅ Due date tracking with overdue highlighting  
✅ Search and filter tasks  
✅ Task completion with smooth transitions  
✅ Dark mode support  
✅ Responsive sidebar navigation  
✅ Dashboard with productivity metrics  

## 📖 More Information

See [ACCESS.md](./ACCESS.md) for detailed setup instructions and troubleshooting.
