# Smart Hospital Management System (SHMS) - Deployment Guide

This guide provides step-by-step instructions for deploying the Smart Hospital Management System to production cloud platforms (e.g., Neon / Supabase for Database, Render for Node/Express Backend, and Vercel for React/Vite Frontend).

---

## 1. Database Deployment (Neon / Supabase PostgreSQL)

1. **Create a Managed PostgreSQL Instance**:
   - Provision a PostgreSQL database instance on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - Note down the Connection String (`DATABASE_URL`) or individual host, port, user, password, and database name.

2. **Run Migrations on Hosted Database**:
   - Execute the SQL files from the `database/` directory in sequence (as detailed in `database/README.md`):
     1. `schema.sql`
     2. `migration_phase2_schedules_and_unique_indexes.sql`
     3. `migration_phase3_doctor_reviews.sql`
     4. `migration_phase3_5_doctor_leaves_reschedule.sql`
     5. `migration_phase3_6_notifications_and_reminders.sql`
     6. `migration_phase5_medical_records.sql`
     7. `migration_phase6_prescriptions.sql`
     8. `migration_phase7_lab_tests_and_reports.sql`
     9. `migration_phase8_invoices_and_payments.sql`
     10. `optional_indexes_phase9_analytics.sql`
     11. `migration_phase11_security_and_audit.sql`

3. **Bootstrap Admin Account**:
   - Run the admin creation script locally connected to the hosted DB, or via remote shell:
     ```bash
     node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword123!"
     ```

---

## 2. Secrets Generation

Before deploying the backend, generate cryptographically strong secrets for JWT tokens using the project's helper script:

```bash
node backend/scripts/generateSecrets.js
```
Use the output values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in your environment variables.

---

## 3. Backend Deployment (Render)

1. **Create Web Service**:
   - Connect your GitHub repository to Render.
   - Set **Root Directory**: `backend`
   - Set **Environment**: `Node`
   - Set **Build Command**: `npm install`
   - Set **Start Command**: `npm start`

2. **Set Backend Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5001` (or assigned by host)
   - `DB_HOST`: `<hosted-db-host>`
   - `DB_PORT`: `5432`
   - `DB_NAME`: `<hosted-db-name>`
   - `DB_USER`: `<hosted-db-user>`
   - `DB_PASSWORD`: `<hosted-db-password>`
   - `DB_SSL`: `true`
   - `JWT_ACCESS_SECRET`: `<generated-access-secret>`
   - `JWT_REFRESH_SECRET`: `<generated-refresh-secret>`
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app`
   - `ENABLE_CRON`: `true`

---

## 4. Frontend Deployment (Vercel)

1. **Create New Project**:
   - Import repository on Vercel.
   - Set **Framework Preset**: `Vite`
   - Set **Root Directory**: `frontend`
   - Set **Build Command**: `npm run build`
   - Set **Output Directory**: `dist`

2. **Set Frontend Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com/api/v1`
   - `VITE_SHOW_DEMO`: `false`

---

## 5. File Storage Warning & Considerations

> [!WARNING]
> **Ephemeral Storage Limitation on Free Cloud Hosts**:
> Medical record files and lab reports are stored on the server's local disk (`backend/uploads/`).
> Free hosting tiers (such as Render Free Tier) use ephemeral file systems that wipe all local file uploads whenever the instance sleeps, restarts, or deploys new code.
> 
> **Recommendations**:
> - **Production / Demo Use**: Use non-sensitive, sample data for public web demonstrations.
> - **Persistent Cloud Storage**: Upgrade backend hosting to attach a persistent disk volume, or migrate upload handlers to private S3/GCS buckets as future architectural work.

---

## 6. Post-Deployment Checklist

- [ ] Verify database connection and schema initialization.
- [ ] Test `GET /api/health` returns status `200 OK` with `{ status: "ok" }`.
- [ ] Verify CORS allows requests only from `FRONTEND_URL`.
- [ ] Test login with the bootstrapped Admin account.
- [ ] Confirm the "Demo Credentials" box is hidden on the login page in production builds.
- [ ] Test appointment booking flow, prescription PDF generation, and invoice payments.
- [ ] Verify rate limiting produces `429` status on repeated failed logins.
