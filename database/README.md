# Smart Hospital Management System (SHMS) - Database Migration Guide

This directory contains the core database schema and phase-by-phase migration scripts for PostgreSQL.

## Migration Order & Details

To initialize a new database, execute the SQL files in the exact order listed below:

| # | File Name | Description | Idempotent / Safe to Re-run |
|---|---|---|---|
| 1 | `schema.sql` | Core schema defining `users`, `patients`, `doctors`, `departments`, `appointments`, `schedules`, `medical_records`, `prescriptions`, `medicines`, `reports`, `bills`, `payments`, `notifications`, `audit_logs`, and system settings with indexes and triggers. | ⚠️ Contains `CREATE TABLE` and `CREATE TYPE`. Drop existing schema or run on a clean database. |
| 2 | `migration_phase2_schedules_and_unique_indexes.sql` | Doctor availability schedule enhancements, working hours, break times, and slot duration settings. | ✅ Uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. |
| 3 | `migration_phase3_doctor_reviews.sql` | `doctor_reviews` table for patient ratings, feedback text, and verified booking constraints. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 4 | `migration_phase3_5_doctor_leaves_reschedule.sql` | `doctor_leaves` table for vacation/sick days, auto-rescheduling flags, and leave approval status. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 5 | `migration_phase3_6_notifications_and_reminders.sql` | Notification templates, scheduled reminders, and `reminder_logs`. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 6 | `migration_phase5_medical_records.sql` | `medical_record_files` table for attached diagnostic scans, lab documents, and Cloudinary/local file metadata. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 7 | `migration_phase6_prescriptions.sql` | Enhanced `prescription_items` table (replaces basic medicines schema) with instructions, frequency, and PDF tracking. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 8 | `migration_phase7_lab_tests_and_reports.sql` | `lab_tests`, `lab_orders`, and `lab_order_results` tables for hospital diagnostic lab module. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 9 | `migration_phase8_invoices_and_payments.sql` | `invoices`, `invoice_items`, and enhanced `payments` tables with itemized billing, taxes, discounts, and payment locking. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |
| 10 | `optional_indexes_phase9_analytics.sql` | Operational performance indexes for admin analytics dashboards, appointment trend queries, and revenue aggregation. | ✅ Uses `CREATE INDEX IF NOT EXISTS`. |
| 11 | `migration_phase11_security_and_audit.sql` | `failed_login_attempts` table, login history tracking, and security audit log extensions. | ✅ Uses `CREATE TABLE IF NOT EXISTS`. |

## Automated Setup Script

For unit and integration testing, run the automated setup script which executes all 11 steps in sequential order against a dedicated test database:

```bash
node backend/scripts/setupTestDb.js
```

> **Note:** The automated script enforces that the target database name MUST contain `"test"` (e.g., `shms_test`). It will refuse to run on development or production databases.
