# Studio Desire — Supabase Database Setup & Operations Guide

This guide provides the complete, step-by-step procedure to connect, initialize, and verify the **Studio Desire Laravel** backend with **Supabase PostgreSQL**.

---

## 1. Architecture & Security Overview

- **Native Laravel Integration**: Connects using Laravel's native PDO PostgreSQL driver (`pdo_pgsql`) and Eloquent ORM.
- **Frontend Isolation**: The React frontend does **not** connect to Supabase via JavaScript; all requests flow securely through the authenticated Laravel API.
- **Data Protection & RLS**: All application tables have Row-Level Security (RLS) enabled, and access is revoked from the `anon` role so sensitive customer enquiries, floorplans, and owner accounts are never exposed via Supabase's public HTTP Data API.
- **Connection Strategy**: Uses Supabase's **Session Connection Pooler** (Port `6543`), which is built specifically for stateless PHP application requests.

---

## 2. Table Inventory (Application Schema)

Derived strictly from the 21 audited Laravel migrations:

| Table Name | Purpose / Entity | Primary Key | Key Relationships / Foreign Keys |
|---|---|---|---|
| `users` | Owner & Admin accounts | `id` (bigint) | `role` (`OWNER`), `username` |
| `password_reset_tokens` | Authentication recovery | `email` | Unique per user |
| `sessions` | Web panel session storage | `id` (varchar) | `user_id` index |
| `cache` & `cache_locks` | Framework cache & atomicity | `key` | Expiration indexes |
| `jobs`, `job_batches`, `failed_jobs` | Background queues | `id` | Queue & batch indexes |
| `personal_access_tokens` | Sanctum API Bearer tokens | `id` (bigint) | `tokenable_type`, `tokenable_id` |
| `portfolio_categories` | Main portfolio taxonomies | `id` (bigint) | `name`, `slug` (unique) |
| `portfolio_subcategories` | Secondary classifications | `id` (bigint) | `category_id` -> `portfolio_categories` (CASCADE) |
| `clients` | Client directory | `id` (bigint) | `email`, `status` |
| `media` | Central media & image library | `id` (bigint) | `created_by` -> `users` (SET NULL) |
| `projects` | Portfolio projects | `id` (bigint) | `category_id` (RESTRICT), `cover_media_id` (SET NULL) |
| `project_media` | Project galleries & renders | `id` (bigint) | `project_id` (CASCADE), `media_id` (SET NULL) |
| `featured_items` | Homepage slider & highlights | `id` (bigint) | `project_id` (CASCADE) |
| `project_enquiries` | Customer contact & RFQs | `id` (bigint) | `originating_project_id`, `client_id` (SET NULL) |
| `enquiry_attachments` | Private architectural PDFs/plans | `id` (bigint) | `enquiry_id` (CASCADE) |
| `contact_inquiries` | Legacy contact submissions | `id` (bigint) | Synced to `project_enquiries` |
| `products` | Bespoke furniture & products | `id` (bigint) | `slug` (unique), `category` |
| `product_media` | Product imagery | `id` (bigint) | `product_id` (CASCADE), `media_id` (SET NULL) |
| `visualization_spaces` | 3D & VR project spaces | `id` (bigint) | `project_id` (SET NULL) |
| `visualization_media` | 3D renders & panorama URLs | `id` (bigint) | `space_id` (CASCADE) |
| `blueprint_drawings` | CAD & architectural drawings | `id` (bigint) | `project_id` (SET NULL) |
| `website_settings` | Dynamic CMS content | `id` (bigint) | `key` (unique) |
| `migrations` | Laravel migration tracking | `id` (int) | Tracks executed batches |

---

## 3. Selecting the Initialization Method

You have two choices for initializing the Supabase database. **Choose ONLY ONE.**

### Method A — Laravel Migrations (Canonical & Recommended)
> **Why Recommended?**
> Laravel migrations are the authoritative source of truth for the codebase. Running migrations ensures Laravel handles the tracking table, batches, and future updates natively.

**Steps:**
1. Configure your `.env` with Supabase PostgreSQL connection details (see Section 4).
2. Run migrations from your terminal:
   ```bash
   & "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan migrate --force
   ```
3. Verify migration status:
   ```bash
   & "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan migrate:status
   ```

---

### Method B — Supabase SQL Editor (`supabase/setup.sql`)
> **When to Use?**
> Use this method if outbound PostgreSQL connections from your local terminal are blocked by a firewall, or if you prefer creating the schema visually through the Supabase Dashboard before launching Laravel.

**Steps:**
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open [`supabase/setup.sql`](file:///c:/Users/Jiniyas%20Suthar/OneDrive/Desktop/Studio%20Desire/Studio-Desire-Laravel/supabase/setup.sql) and paste its entire contents into the SQL Editor.
5. Click **Run** (or `Ctrl + Enter`).
6. The script will:
   - Run a safety check to ensure no existing tables are overwritten.
   - Create all 20 application tables with proper types, indexes, and foreign keys.
   - Enable Row-Level Security (RLS) on all tables and revoke `anon` access.
   - Populate Laravel's `migrations` table so Laravel knows the schema is already initialized.

---

## 4. Connecting Laravel to Supabase (`.env`)

In Supabase, navigate to **Project Settings -> Database -> Connection string**.

### Connection Settings:
- **Type**: Choose **Connection Pooler** (Session Mode).
- **Port**: `6543` (Crucial for PHP / Hostinger / Apache / FPM environments).
- **SSL**: `require`.

Update your local or production `.env` (never commit real credentials to Git):

```env
DB_CONNECTION=pgsql
DB_HOST=aws-0-[your-region].pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USERNAME=postgres.[your-project-ref]
DB_PASSWORD="YourActualSupabasePassword"
DB_SSLMODE=require
DB_SCHEMA=public
```

*Or using the single URL format:*
```env
DB_CONNECTION=pgsql
DATABASE_URL="postgresql://postgres.[your-project-ref]:YourActualSupabasePassword@aws-0-[your-region].pooler.supabase.com:6543/postgres?sslmode=require"
```

---

## 5. Verification Commands

Run these commands using your Laragon PHP CLI to verify connectivity:

### A. Test Database Connection
```powershell
& "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan db:show
```
*Expected Output: Connection successful, displaying PostgreSQL version, database size, and table counts.*

### B. Verify Migration Status
```powershell
& "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan migrate:status
```
*Expected Output: All 21 migrations marked as `[Ran]`.*

### C. Seed Initial Owner Account (Safe & Idempotent)
```powershell
& "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan db:seed --class=UserSeeder --force
```
*(Creates an initial Owner account only if no owner already exists; will not overwrite existing users).*

---

## 6. Legacy Portfolio Data Migration Checklist

When transitioning from the legacy SQLite database to Supabase PostgreSQL, follow this safe sequence:

1. **Verify Source Database**:
   - Ensure `database/data/studio_desire_original.sqlite` is present.
2. **Execute Dry Run**:
   ```powershell
   & "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan studio:import-legacy --dry-run
   ```
   - Confirms project count, category mappings, and image associations without modifying the database.
3. **Run Live Data Import**:
   ```powershell
   & "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan studio:import-legacy
   ```
4. **Physical Media Transfer**:
   - Copy original image uploads to `storage/app/public/media/` (or upload to your Supabase public storage bucket).
   - Create symbolic link if deploying to standard hosting:
     ```powershell
     & "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan storage:link
     ```

---

## 7. Status Summary

### Completed by Agent:
- [x] Audited all 21 Laravel migrations for PostgreSQL compatibility.
- [x] Configured native PostgreSQL driver in `config/database.php` supporting `DATABASE_URL`, pooler ports, and `sslmode=require`.
- [x] Configured filesystem disk abstraction in `config/filesystems.php` for Supabase S3 storage.
- [x] Generated non-destructive `supabase/setup.sql` with pre-execution safety, RLS, and migration reconciliation.
- [x] Fortified `.gitignore` against accidental credential or backup leaks.
- [x] Verified 114 test cases passing (628 assertions, 0 failures).

### Remaining Manual Steps for User:
1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Obtain your database password and pooler connection parameters from **Project Settings -> Database**.
3. Set your credentials in `.env` (or run `supabase/setup.sql` in the SQL Editor).
4. Run `artisan migrate:status` to verify tables.
5. If pushing to GitHub, grant write collaborator access to `JiniyasSuthar-2001` or push via personal access token.
