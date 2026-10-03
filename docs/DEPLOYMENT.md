# Smart Hospital Management System (SHMS) - Deployment Guide

This guide provides step-by-step instructions for deploying the Smart Hospital Management System to production cloud platforms (e.g., Neon / Supabase for Managed PostgreSQL, Render / Railway for Node.js Backend, and Vercel / Netlify for React/Vite Frontend).

---

## 1. Database Deployment (Neon / Supabase PostgreSQL)

1. **Provision Managed PostgreSQL Instance**:
   - Create a PostgreSQL database instance on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - Obtain the Connection String (`DATABASE_URL`) or host, port, database name, user, and password credentials.

2. **Run Migrations in Sequential Order**:
   Execute the 15 SQL files from `database/` in exact sequence (as detailed in `database/README.md`):
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
   12. `migration_phase14_1_prescription_enhancements.sql`
   13. `migration_phase14_2_emergency_card.sql`
   14. `migration_phase14_3_opd_queue.sql`
   15. `migration_phase14_4_family_guardians.sql`

3. **Verify Schema Tables**:
   Run the verification query in pgAdmin / psql:
   ```sql
   SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
   ```
   Confirm all 27 tables are created successfully.

4. **Bootstrap Admin Account**:
   Run the admin creation script locally configured with host DB credentials:
   ```bash
   node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword123!"
   ```

> [!CAUTION]
> **PRODUCTION WARNING**: Do NOT run `database/seed.sql` on a public or production database as it creates a demo admin account with a known default password! Always use `node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword"` to bootstrap an admin user safely.

---

## 2. Cryptographic Secrets Generation

Before deploying the backend service, generate cryptographically random secrets for JWT token signing:

```bash
node backend/scripts/generateSecrets.js
```
Copy the generated keys into your environment variables for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

---

## 3. Backend Deployment (Render / Railway)

1. **Service Configuration**:
   - Set **Root Directory**: `backend`
   - Set **Environment**: `Node`
   - Set **Build Command**: `npm install`
   - Set **Start Command**: `npm start`

2. **Backend Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5001` (or host-assigned port)
   - `DB_HOST`: `<hosted-db-host>`
   - `DB_PORT`: `5432`
   - `DB_NAME`: `<hosted-db-name>`
   - `DB_USER`: `<hosted-db-user>`
   - `DB_PASSWORD`: `<hosted-db-password>`
   - `DB_SSL`: `true`
   - `JWT_ACCESS_SECRET`: `<generated-access-secret>`
   - `JWT_REFRESH_SECRET`: `<generated-refresh-secret>`
   - `JWT_ACCESS_EXPIRES`: `15m`
   - `JWT_REFRESH_EXPIRES`: `7d`
   - `FRONTEND_URL`: `https://your-frontend-app.vercel.app`
   - `ENABLE_CRON`: `true`
   - `CLOUDINARY_CLOUD_NAME`: `<optional-cloudinary-cloud-name>`
   - `CLOUDINARY_API_KEY`: `<optional-cloudinary-api-key>`
   - `CLOUDINARY_API_SECRET`: `<optional-cloudinary-api-secret>`

---

## 4. Frontend Deployment (Vercel / Netlify)

1. **Project Configuration**:
   - Import repository on Vercel.
   - Set **Framework Preset**: `Vite`
   - Set **Root Directory**: `frontend`
   - Set **Build Command**: `npm run build`
   - Set **Output Directory**: `dist`

2. **Frontend Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com/api/v1` (**Important**: `VITE_API_URL` MUST end with `/api/v1`)
   - `VITE_SHOW_DEMO`: `false`

---

## 5. File Storage & Cloudinary Recommendation

> [!WARNING]
> **Ephemeral Storage Limitation on Free Serverless Hosts**:
> Medical record files and diagnostic lab reports uploaded locally are stored in `backend/uploads/`.
> Free serverless tiers (e.g. Render Free Tier) wipe local disks upon sleep or restart.
> 
> **Production Best Practice**:
> Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment to automatically route uploaded files to persistent Cloudinary cloud storage.

---

## 6. Post-Deployment Checklist

- [ ] Confirm `GET /api/health` returns status `200 OK` with `{ status: "ok" }`.
- [ ] Confirm CORS restricts requests strictly to `FRONTEND_URL`.
- [ ] Log in with the bootstrapped Admin account.
- [ ] Verify the "Demo Credentials" box is hidden on the login page in production (`VITE_SHOW_DEMO=false`).
- [ ] Test patient family dependent registration and profile context switching.
- [ ] Verify patient check-in and live OPD queue token generation.
- [ ] Test prescription PDF download with QR code verification link.
- [ ] Test emergency card generation, QR code, and public token access.
- [ ] Confirm rate limiting returns `429 Too Many Requests` on repeated invalid login attempts.
