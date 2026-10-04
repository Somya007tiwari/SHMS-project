# Smart Hospital Management System (SHMS) - Deployment Guide

This guide provides step-by-step instructions for deploying the Smart Hospital Management System to production cloud platforms (e.g., Neon / Supabase for Managed PostgreSQL, Render / Railway for Node.js Backend, and Vercel / Netlify for React/Vite Frontend).

---

## 1. Database Deployment (Neon / Supabase PostgreSQL)

1. **Provision Managed PostgreSQL Instance**:
   - Create a PostgreSQL database instance on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - Obtain the Connection String (`DATABASE_URL`) or host, port, database name, user, and password credentials.

2. **Automated Migration Runner**:
   Execute all ordered migrations against your target PostgreSQL database using `npm run migrate -- --yes`.

   **PowerShell Example (Neon Production Database):**
   ```powershell
   $env:DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
   npm run migrate -- --yes
   ```

   The migration runner creates the `schema_migrations` table, applies all 17 ordered SQL migration scripts from `database/migration-order.json`, and verifies the schema.

3. **Verify Schema Tables**:
   Run the verification query in pgAdmin / psql:
   ```sql
   SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
   ```
   Confirm all 27 domain tables exist.

4. **Bootstrap Admin Account**:
   Run the admin creation script locally configured with host DB credentials:
   ```bash
   node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword123!"
   ```

> [!CAUTION]
> **PRODUCTION WARNING**: NEVER run `database/seed.sql` on a public or production database! It creates a demo admin account with a known default password and sample demo data. Always use `node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword"` to bootstrap an administrator account safely.

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
   - `DATABASE_URL`: `postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require` (or individual `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`)
   - `JWT_ACCESS_SECRET`: `<generated-access-secret>`
   - `JWT_REFRESH_SECRET`: `<generated-refresh-secret>`
   - `JWT_ACCESS_EXPIRES`: `15m`
   - `JWT_REFRESH_EXPIRES`: `7d`
   - `COOKIE_SAMESITE`: `none` (Use `none` for cross-site setups where frontend and backend are on different domains like Vercel and Render; use `strict` for a same-site setup)
   - `TRUST_PROXY`: `1` (Set to `1` when hosted behind a reverse proxy like Render or Heroku)
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
