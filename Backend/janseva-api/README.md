# JanSeva AI — Backend Developer Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** v15+
- **Redis** (optional, for caching)
- A valid **Groq API Key**

### 1. Configure Environment

```bash
cd Backend/janseva-api
cp .env.example .env
```

Edit `.env` with your credentials (see Environment Variables below).

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client & Migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed the Database

```bash
npm run seed
```

This creates demo accounts:

| Role        | Email                        | Password              |
|-------------|------------------------------|-----------------------|
| Super Admin | admin@janseva.gov.in         | Admin@JanSeva2026!    |
| Dept Admin  | deptadmin@janseva.gov.in     | DeptAdmin@2026!       |
| Officer     | officer@janseva.gov.in       | Officer@2026!         |
| Citizen     | citizen@example.com          | Citizen@2026!         |

### 5. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:5000`  
API Docs at `http://localhost:5000/api/v1/docs`

---

## 🗂️ Architecture

```
src/
├── app.ts                    # Express app entry point
├── config/
│   ├── environment.ts        # Zod env validation (fail-fast)
│   ├── database.ts           # Prisma singleton
│   ├── redis.ts              # Redis client
│   ├── constants.ts          # App-wide constants
│   └── swagger.ts            # OpenAPI config
├── logger/
│   └── winston.ts            # Daily-rotating log files
├── middleware/
│   ├── auth.middleware.ts    # JWT verify + RBAC
│   ├── validate.ts           # Zod request validation
│   ├── errorHandler.ts       # Global error handler
│   ├── rateLimiter.ts        # IP-based rate limiting
│   ├── upload.ts             # Multer file uploads
│   ├── auditLog.ts           # Audit trail middleware
│   └── requestLogger.ts      # Morgan HTTP logs + requestId
├── modules/
│   ├── auth/                 # Register, login, email verify, JWT
│   ├── user/                 # Profile, settings, image upload
│   ├── complaint/            # Full grievance lifecycle
│   ├── ai/                   # Groq AI (swappable via interface)
│   │   └── providers/
│   │       ├── ai.interface.ts   # LLM contract
│   │       └── groq.provider.ts  # Groq implementation
│   ├── notification/         # In-app notifications
│   ├── file/                 # File upload/delete
│   ├── search/               # Full-text search
│   ├── dashboard/            # Citizen/officer/admin stats
│   └── admin/                # User management, reports
├── services/
│   └── email.service.ts      # Nodemailer + Gov-themed templates
├── types/
│   ├── express.d.ts          # req.user type augmentation
│   └── common.types.ts       # Shared response/pagination types
└── utils/
    ├── apiResponse.ts        # Consistent response builders
    ├── appError.ts           # Custom error classes
    ├── jwt.ts                # Sign/verify tokens
    ├── crypto.ts             # Secure tokens, complaint IDs
    └── pagination.ts         # Parse + build pagination
```

---

## 🔗 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Auth (`/auth`)
| Method | Path                         | Auth     | Description                  |
|--------|------------------------------|----------|------------------------------|
| POST   | `/auth/register`             | Public   | Create citizen account       |
| POST   | `/auth/verify-email`         | Public   | Verify email with token      |
| POST   | `/auth/resend-verification`  | Public   | Resend verification email    |
| POST   | `/auth/login`                | Public   | Login, get JWT tokens        |
| POST   | `/auth/refresh`              | Public   | Rotate refresh token         |
| POST   | `/auth/logout`               | JWT      | Revoke refresh token         |
| POST   | `/auth/forgot-password`      | Public   | Send reset email             |
| POST   | `/auth/reset-password`       | Public   | Reset with token             |
| POST   | `/auth/change-password`      | JWT      | Change own password          |
| GET    | `/auth/me`                   | JWT      | Get current user             |

### Complaints (`/complaints`)
| Method | Path                          | Auth       | Description                  |
|--------|-------------------------------|------------|------------------------------|
| GET    | `/complaints`                 | JWT        | List (scoped by role)        |
| POST   | `/complaints`                 | Citizen    | Submit complaint             |
| GET    | `/complaints/:id`             | JWT        | Get details + timeline       |
| PUT    | `/complaints/:id`             | Citizen    | Update draft                 |
| DELETE | `/complaints/:id`             | JWT        | Delete draft                 |
| GET    | `/complaints/:id/timeline`    | JWT        | Get timeline events          |
| POST   | `/complaints/:id/media`       | JWT        | Upload evidence file         |
| POST   | `/complaints/:id/verify`      | Citizen    | Verify resolution            |
| POST   | `/complaints/:id/reopen`      | Citizen    | Reopen complaint             |
| POST   | `/complaints/:id/rate`        | Citizen    | Rate 1-5 stars               |
| POST   | `/complaints/:id/assign`      | Admin      | Assign to officer            |
| PUT    | `/complaints/:id/status`      | Officer+   | Update status                |

### AI (`/ai`)
| Method | Path                    | Auth     | Description                  |
|--------|-------------------------|----------|------------------------------|
| POST   | `/ai/analyze`           | JWT      | Auto-classify complaint      |
| POST   | `/ai/translate`         | Optional | Translate text               |
| POST   | `/ai/chat`              | Optional | Chat with AI assistant       |
| POST   | `/ai/verify-evidence`   | JWT      | AI photo verification        |
| GET    | `/ai/suggestions`       | Optional | Complaint title autocomplete |
| POST   | `/ai/officer-response`  | JWT      | Generate officer reply       |

### Other Endpoints
- **Users**: `/users/profile`, `/users/settings`, `/users/profile/image`
- **Notifications**: `/notifications`, `/notifications/unread-count`, `/notifications/:id/read`
- **Dashboard**: `/dashboard/citizen`, `/dashboard/officer`, `/dashboard/admin`
- **Search**: `/search?q=...`, `/search/suggestions?q=...`
- **Files**: `/files/upload`, `/files/upload-multiple`, `/files/:filename`
- **Admin**: `/admin/users`, `/admin/departments`, `/admin/reports/analytics`, `/admin/audit-logs`

---

## 🔐 Security Features

- **JWT Access + Refresh Tokens** with rotation and reuse detection
- **HttpOnly cookies** for refresh tokens
- **bcrypt** password hashing (12 rounds)
- **Helmet** security headers
- **CORS** with allowlist
- **Rate Limiting**: Global (100/15min), Auth (10/15min), Sensitive (5/15min), AI (30/15min)
- **Zod validation** on every request
- **Audit trail** for every significant action
- **Timing-safe comparisons** for password and token checks
- **Path traversal prevention** for file operations
- **Email enumeration prevention** on forgot-password

---

## 🤖 Switching AI Providers

The AI is built on an **interface pattern** for easy swapping:

```typescript
// src/modules/ai/ai.service.ts
function createAIProvider(): IAIProvider {
  return new GroqProvider();          // Current: Groq
  // return new OpenAIProvider();     // Switch to OpenAI
  // return new GeminiProvider();     // Switch to Gemini
}
```

Any new provider just needs to implement `IAIProvider` from `ai.interface.ts`.

---

## 📋 npm Scripts

```bash
npm run dev          # Start dev server (tsx watch)
npm run build        # Compile TypeScript
npm start            # Run compiled output
npm run seed         # Seed database with demo data
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio GUI
npm test             # Run Jest tests
npm run lint         # ESLint check
```
