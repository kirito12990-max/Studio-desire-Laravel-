# Studio Desire — Supabase PostgreSQL & GitHub Integration Guide

This guide details the integration architecture for **Studio Desire Laravel**, connecting to **Supabase PostgreSQL**, **Supabase Storage (S3-compatible)**, and deployment via the dedicated GitHub repository.

---

## 1. Architectural Principles

- **Native Laravel Driver**: Uses Laravel's native PDO PostgreSQL driver (`pdo_pgsql`) and Eloquent ORM.
- **Frontend Purity**: The React frontend does **not** load unnecessary Supabase JavaScript SDK clients for database interactions; all database operations go through the secure, authenticated Laravel API.
- **Dual-Mode Compatibility**:
  - **Local Development**: Fast, zero-configuration SQLite (`DB_CONNECTION=sqlite`).
  - **Staging / Cloud**: Supabase PostgreSQL with SSL encryption (`DB_CONNECTION=pgsql`, `DB_SSLMODE=require`).
  - **Shared Hosting**: Standard MySQL or remote Supabase PostgreSQL over SSL.
- **Zero Secrets in Version Control**: `.env`, credentials, local database files, customer uploads, and backup files are strictly excluded via `.gitignore`.

---

## 2. Supabase PostgreSQL Configuration

### A. Connection Pooling vs Direct Connection
Supabase provides two database endpoints in **Project Settings -> Database**:
1. **Connection Pooler (Session Mode - Port 6543)** — **RECOMMENDED FOR PHP**:
   - Ideal for traditional stateless PHP environments (e.g. Apache/FPM, Hostinger shared hosting) where persistent connections are not held.
   - Host format: `aws-0-[region].pooler.supabase.com`
   - Port: `6543`
   - User: `postgres.[your-project-ref]`
2. **Direct Connection (Port 5432)**:
   - Connects directly to the PostgreSQL instance without pooling (requires IPv6 support on the host network).
   - Host: `db.[your-project-ref].supabase.co`
   - Port: `5432`
   - User: `postgres`

### B. Configuring `.env` for Supabase
In your production or staging `.env`, configure the database connection using either individual parameters or `DATABASE_URL`:

#### Method 1: Discrete Variables (Recommended)
```env
DB_CONNECTION=pgsql
DB_HOST=aws-0-ap-south-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USERNAME=postgres.abcdefghijklmnop
DB_PASSWORD="YourSupabaseDatabasePassword"
DB_SSLMODE=require
DB_SCHEMA=public
```

#### Method 2: Unified Connection String
```env
DB_CONNECTION=pgsql
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:YourSupabaseDatabasePassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
```

---

## 3. Dedicated Schema Isolation (Security Best Practice)

By default, Supabase exposes all tables inside the `public` schema via its auto-generated PostgREST Data API (`https://[ref].supabase.co/rest/v1/`).

To keep Laravel's internal tables completely isolated and inaccessible from the public Data API, you can place all Laravel tables in a dedicated schema (e.g., `studio_desire`).

### Step 1: Create the Schema in Supabase SQL Editor
Run the following SQL snippet in your Supabase dashboard:
```sql
-- Create dedicated schema for Studio Desire Laravel
CREATE SCHEMA IF NOT EXISTS studio_desire;

-- Grant required permissions to Supabase roles
GRANT ALL ON SCHEMA studio_desire TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA studio_desire TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA studio_desire TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA studio_desire GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA studio_desire GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
```

### Step 2: Configure Laravel to use the Dedicated Schema
In `.env`:
```env
DB_SCHEMA=studio_desire
```
Laravel's `config/database.php` automatically configures `'search_path' => env('DB_SCHEMA', 'public')`, ensuring all migrations and queries target `studio_desire` seamlessly.

---

## 4. Running Migrations Safely

### Safety Rules:
- **NEVER** run `php artisan migrate:fresh` on production or staging databases.
- Run migrations using:
  ```bash
  php artisan migrate --force
  ```
- To verify migration status without modifying tables:
  ```bash
  php artisan migrate:status
  ```

### Database Seeding:
- Initial production admin account can be seeded safely without overwriting data:
  ```bash
  php artisan db:seed --class=AdminUserSeeder --force
  ```
  *(Uses `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` from `.env`)*

---

## 5. Supabase Storage (S3-Compatible) Configuration

Studio Desire separates public portfolio media from confidential customer enquiry attachments:
- **Public Media**: Portfolio project images, sliders, before/after comparisons, and thumbnails.
- **Private Attachments**: Architectural floor plans, client PDFs, and confidential project enquiry files.

### Configuration Options
In `config/filesystems.php`, the application supports independent disks:
```env
# Standard Local Hosting (Default):
FILESYSTEM_DISK=public
MEDIA_DISK=public
ATTACHMENTS_DISK=local

# Cloud / Supabase Storage:
FILESYSTEM_DISK=supabase
MEDIA_DISK=supabase
ATTACHMENTS_DISK=local
```

### Enabling Supabase S3 Storage:
1. **Install Flysystem S3 Adapter**:
   ```bash
   composer require league/flysystem-aws-s3-v3
   ```
2. **In Supabase Dashboard**:
   - Go to **Storage -> New Bucket**.
   - Create bucket: `studio-desire-public` (Set to **Public Bucket**).
   - Go to **Project Settings -> Storage -> S3 Credentials**.
   - Generate S3 Access Key ID and Secret Access Key.
3. **In `.env`**:
   ```env
   FILESYSTEM_DISK=supabase
   MEDIA_DISK=supabase
   SUPABASE_STORAGE_KEY=your_s3_access_key_id
   SUPABASE_STORAGE_SECRET=your_s3_secret_access_key
   SUPABASE_STORAGE_REGION=us-east-1
   SUPABASE_STORAGE_BUCKET=studio-desire-public
   SUPABASE_STORAGE_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
   SUPABASE_STORAGE_URL=https://[project-ref].supabase.co/storage/v1/object/public/studio-desire-public
   ```

---

## 6. Legacy Portfolio Import

To import existing projects and media into the Supabase database:
1. Ensure the legacy database file is present at `database/data/studio_desire_original.sqlite` or specify path via `--source`.
2. Perform a dry run first to verify mapping:
   ```bash
   php artisan studio:import-legacy --dry-run
   ```
3. Run the live import:
   ```bash
   php artisan studio:import-legacy
   ```

---

## 7. Dedicated GitHub Repository Setup

The official remote repository is:
`https://github.com/kirito12990-max/Studio-desire-Laravel-.git`

### Remote Inspection & Push:
```bash
# Add the remote repository
git remote add origin https://github.com/kirito12990-max/Studio-desire-Laravel-.git

# Verify remote configuration
git remote -v

# Push master branch
git push -u origin master
```
*(All `.env` files, credentials, customer files, and SQLite dumps are strictly excluded by `.gitignore`)*
