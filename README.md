# Smart Hospital Management System (SHMS)

A production-ready full-stack hospital management platform built with **React + Node.js + PostgreSQL**.

---

## 🏥 Features

### Patient Portal
- Register / Login / Forgot Password
- AI-powered Health Assistant (symptom checker)
- Multi-step appointment booking with calendar + slot picker
- View appointments, prescriptions, medical reports, billing

### Doctor Portal
- Dashboard with today's schedule
- Approve / Reject / Complete appointments
- Create prescriptions with medicine details (PDF download)
- Manage weekly availability schedule

### Admin Portal
- Full dashboard with analytics charts (appointments, revenue)
- Manage doctors, patients, departments
- Billing & invoice generation with payment tracking
- Activity / audit logs
- System settings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 (Vite), Tailwind CSS v4, React Query, Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT + Refresh Tokens (httpOnly cookies) |
| File Storage | Cloudinary |
| Email | Nodemailer |
| PDF | PDFKit |
| Security | Helmet, Rate Limiting, bcrypt, RBAC |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional, for local DB)

### 1. Database Setup
```bash
# Using Docker:
docker-compose up -d

# OR manually create a PostgreSQL database and run:
psql -U postgres -d shms_db -f database/schema.sql
psql -U postgres -d shms_db -f database/seed.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your values in .env

npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Update VITE_API_URL if needed

npm install
npm run dev
```

The app will be available at:
- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:5000**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shms.com | Admin@123456 |
| Doctor | dr.sharma@shms.com | Doctor@123456 |
| Patient | john.doe@example.com | Patient@123456 |

---

## 📁 Project Structure

```
SHMS Project/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, email, cloudinary, JWT configs
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, RBAC, rate limiter, upload
│   │   ├── models/          # Database query models
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Email, PDF, AI assistant, notifications
│   │   └── utils/           # Helpers, pagination, constants
│   ├── server.js            # Express app entry point
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth, Theme contexts
│   │   ├── layouts/         # Dashboard layout
│   │   ├── pages/           # Page components by role
│   │   └── services/        # Axios API service layer
│   └── .env.example
│
├── database/
│   ├── schema.sql           # Full PostgreSQL schema
│   └── seed.sql             # Sample data
│
└── docker-compose.yml       # Local PostgreSQL + pgAdmin
```

---

## 🔌 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new patient |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/doctors` | List all doctors (public) |
| GET | `/api/v1/appointments/slots` | Get available slots |
| POST | `/api/v1/appointments` | Book appointment |
| PATCH | `/api/v1/appointments/:id/approve` | Approve (Doctor/Admin) |
| POST | `/api/v1/prescriptions` | Create prescription (Doctor) |
| GET | `/api/v1/prescriptions/:id/download` | Download PDF |
| POST | `/api/v1/billing` | Create invoice (Admin) |
| GET | `/api/v1/admin/dashboard` | Admin analytics |
| POST | `/api/v1/ai/chat` | AI health assistant |

---

## 🌐 Deployment

### Frontend (Vercel)
```bash
# Set environment variable in Vercel:
VITE_API_URL=https://your-backend.railway.app/api/v1
```

### Backend (Railway/Render)
Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random secret
- `JWT_REFRESH_SECRET` - Another strong random secret
- `CLOUDINARY_*` - Cloudinary credentials
- `EMAIL_*` - SMTP credentials
- `FRONTEND_URL` - Your Vercel URL (for CORS)
