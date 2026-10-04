# Smart Hospital Management System (SHMS) - Database Migration Guide

This directory contains the core database schema and phase-by-phase migration scripts for PostgreSQL.

---

## 🛢️ Sequential Migration Order & Details

All database migrations are defined in order in [`database/migration-order.json`](file:///c:/Users/HP/Downloads/SHMS%20Project/database/migration-order.json). Executing `npm run migrate -- --yes` automatically runs all pending migrations in this exact order:

| # | File Name | Description | Idempotent / Safe to Re-run |
|---|---|---|---|
| 1 | `schema.sql` | Core schema defining `users`, `patients`, `doctors`, `departments`, `appointments`, `schedules`, `medical_records`, `prescriptions`, `medicines`, `reports`, `bills`, `payments`, `notifications`, `audit_logs`, and `system_settings` with indexes and triggers. | ⚠️ Contains `CREATE TABLE` and `CREATE TYPE`. Skipped automatically if database already exists. |
| 2 | `migration_phase1b_doctor_columns.sql` | Adds `room_number` column to `doctors` table. | ✅ Uses `ADD COLUMN IF NOT EXISTS`. |
| 3 | `migration_phase2_schedules_and_unique_indexes.sql` | Doctor availability schedule enhancements, working hours, break times, slot duration settings, and unique appointment index preventing double bookings. | ✅ Uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. |
| 4 | `migration_phase3_doctor_reviews.sql` | `doctor_reviews` table for patient ratings, feedback text, and verified booking constraints. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 5 | `migration_phase3_5_doctor_leaves_reschedule.sql` | `doctor_leaves` table for vacation/sick days, auto-rescheduling flags, and leave approval status. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 6 | `migration_phase3_5b_needs_reschedule_enum.sql` | Standalone enum value addition for `appointment_status` (`needs_reschedule`). | ✅ Uses `ALTER TYPE ... ADD VALUE IF NOT EXISTS`. |
| 7 | `migration_phase3_6_notifications_and_reminders.sql` | Notification templates, scheduled reminders, and `reminder_logs`. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 8 | `migration_phase5_medical_records.sql` | `medical_record_files` and `record_access_logs` tables for attached diagnostic scans, lab documents, and audit tracking. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 9 | `migration_phase6_prescriptions.sql` | Enhanced `prescription_items` table with instructions, frequency, and PDF tracking. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 10 | `migration_phase7_lab_tests_and_reports.sql` | `lab_tests`, `lab_orders`, and `lab_report_files` tables for hospital diagnostic lab module. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 11 | `migration_phase8_invoices_and_payments.sql` | `invoices`, `invoice_items`, and enhanced `payments` tables with itemized billing, taxes, discounts, and payment locking. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 12 | `optional_indexes_phase9_analytics.sql` | Operational performance indexes for admin analytics dashboards, appointment trend queries, and revenue aggregation. | ✅ Uses `CREATE INDEX IF NOT EXISTS`. |
| 13 | `migration_phase11_security_and_audit.sql` | `failed_login_attempts`, `patient_health_profiles`, login history tracking, and security audit log extensions. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 14 | `migration_phase14_1_prescription_enhancements.sql` | `prescription_shares` table, prescription digital signatures, verification codes, and QR share tokens. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 15 | `migration_phase14_2_emergency_card.sql` | `emergency_cards` table for patient emergency card public access tokens and QR codes. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 16 | `migration_phase14_3_opd_queue.sql` | `queue_tokens` table for live OPD token queue, patient check-in, doctor calling, and queue board status tracking. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 17 | `migration_phase14_4_family_guardians.sql` | `patient_guardians` table for linking primary guardian patients to dependent profiles, and `is_dependent` column on `patients`. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |

---

## ⚡ Automated Migration Command

To run all pending migrations against your target PostgreSQL database safely:

```bash
npm run migrate -- --yes
```

### PowerShell Example for Production (e.g. Neon PostgreSQL)
```powershell
$env:DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
npm run migrate -- --yes
```

---

## 📜 Helper Scripts & Seeders

The repository includes helper node scripts located in `backend/scripts/`:

1. **Automated Migration Runner**:
   ```bash
   npm run migrate -- --yes
   ```

2. **Test Database Setup**:
   Executes all migration steps in order against a dedicated test database (`shms_test`):
   ```bash
   node backend/scripts/setupTestDb.js
   ```
   > **Note:** Enforces that the target database name MUST contain `"test"` (e.g., `shms_test`). Will refuse to execute on development or production databases.

3. **Demo Data Seeder**:
   Seeds realistic sample data (departments, doctors, patients, appointments, prescriptions, lab orders, invoices, emergency cards, queue tokens, family dependents):
   ```bash
   node backend/scripts/seedDemo.js
   ```

4. **Admin Bootstrap Script**:
   Creates or updates the primary system administrator account:
   ```bash
   node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword123!"
   ```

> [!CAUTION]
> **PRODUCTION WARNING**: NEVER run `database/seed.sql` on a public or production database! It creates a demo admin account with a known default password and is NOT included in the migration order. For production deployments, use `node backend/scripts/createAdmin.js admin@yourdomain.com "YourStrongPassword"` to bootstrap an administrator user safely.

---

## 🔍 Read-Only Schema Verification Checklist

To verify that all 27 expected domain tables exist in your PostgreSQL database, run this read-only `SELECT` query in pgAdmin or psql:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Expected Output Checklist (27 Domain Tables + schema_migrations)
- [x] `appointments`
- [x] `audit_logs`
- [x] `bills`
- [x] `departments`
- [x] `doctor_leaves`
- [x] `doctor_reviews`
- [x] `doctors`
- [x] `emergency_cards`
- [x] `lab_orders`
- [x] `lab_report_files`
- [x] `lab_tests`
- [x] `medical_record_files`
- [x] `medical_records`
- [x] `medicines`
- [x] `notifications`
- [x] `patient_guardians`
- [x] `patient_health_profiles`
- [x] `patients`
- [x] `payments`
- [x] `prescription_items`
- [x] `prescriptions`
- [x] `queue_tokens`
- [x] `record_access_logs`
- [x] `reports`
- [x] `schedules`
- [x] `schema_migrations`
- [x] `system_settings`
- [x] `users`
