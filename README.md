# STUDIO DESIRE — ARCHITECTURAL & INTERIOR DESIGN PLATFORM
## Laravel PHP & React/TypeScript Modernization

A minimal, editorial architectural portfolio and owner management system for **Studio Desire**, showcasing spatial daylight, material honesty, and client project management.

This application is built on **Laravel 11/12** and **PHP 8.2+ / 8.3** with **MySQL/MariaDB**, engineered specifically for seamless deployment on standard PHP shared/cPanel/Cloud hosting (such as Hostinger) without requiring persistent Python daemons or long-running Node.js servers in production.

---

## 1. System Architecture

```
[ FRONTEND CLIENT (React 18 + TypeScript + Vite) ]
          │ (Single production build in public/)
          ▼ REST API JSON Requests (/api/*)
[ BACKEND (PHP 8.2+ / 8.3 + Laravel 11/12 Framework) ]
          │ Eloquent ORM + Parameterized PDO
          ▼
[ DATABASE (MySQL 8.0+ / MariaDB / SQLite for testing) ]
```

### Key Highlights:
- **Zero Daemon Overhead**: No Python ASGI or Node.js background processes needed in production.
- **Architectural Aesthetic Preservation**: Reuses the bespoke vanilla CSS design system, typography, and interactive dossier modals.
- **Streamlined Owner Publishing**: Simplified, focused CMS for Projects, Products, 3D Spatial Renders, Blueprints, Categories, and Client Inquiries.
- **Security by Design**: CSRF double-defense, HttpOnly cookie authentication, strict role-based authorization, rate limiting on contact forms, and automated sanitization.

---

## 2. Prerequisites

- **PHP**: `^8.2` or `^8.3` with extensions: `bcmath`, `curl`, `fileinfo`, `gd`, `intl`, `mbstring`, `openssl`, `pdo_mysql`, `pdo_sqlite`, `zip`.
- **Database**: MySQL 8.0+ / MariaDB 10.11+ (or SQLite 3 for local development).
- **Composer**: `v2.2+`.
- **Node.js**: `v18+` or `v20+` and `npm` (for frontend building).

---

## 3. Local Development Quick Start

### Step 1: Environment Setup
```bash
# Clone or navigate to the project directory
cd Studio-Desire-Laravel

# Copy environment template
cp .env.example .env

# Generate application key
php artisan key:generate
```

### Step 2: Database Configuration
Update `.env` with your database credentials:
```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=studio_desire
DB_USERNAME=root
DB_PASSWORD=
```
*(For instant local testing without MySQL, use `DB_CONNECTION=sqlite` with an empty `database/database.sqlite` file).*

### Step 3: Run Migrations & Seed Baseline Data
```bash
# Run authoritative database migrations
php artisan migrate

# Seed initial categories and owner account (safe placeholder credentials)
php artisan db:seed
```

### Step 4: Storage Link
```bash
php artisan storage:link
```

### Step 5: Start Local Development Servers
In Terminal 1 (Backend API):
```bash
php artisan serve --port=8000
```

In Terminal 2 (Frontend with Vite HMR):
```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and communicate with Laravel at `http://localhost:8000/api`.

---

## 4. Building Frontend for Production

When ready to bundle the React/TypeScript frontend for production:
```bash
cd frontend
npm run build
```
Vite compiles the production bundle directly into `public/`, allowing the Laravel web server to serve the entire application as a unified single-origin website with zero Node.js daemon required.

---

## 5. Automated Testing

Run the automated PHPUnit / Pest test suites:
```bash
php artisan test
```

To run tests with code coverage:
```bash
php artisan test --coverage
```

---

## 6. Shared Hosting Deployment Guide (Hostinger / cPanel)

### Directory Mapping
1. Upload the non-public Laravel files (`app`, `bootstrap`, `config`, `database`, `routes`, `storage`, `vendor`, `.env`) to a private directory outside `public_html` (e.g., `/home/username/studio-desire-app/`).
2. Point your website root or copy contents of `public/` into `public_html/`.
3. In `public_html/index.php`, ensure paths resolve correctly:
   ```php
   require __DIR__.'/../studio-desire-app/vendor/autoload.php';
   $app = require_once __DIR__.'/../studio-desire-app/bootstrap/app.php';
   ```

### Server Checklist:
1. **PHP Version**: Select PHP 8.2 or 8.3 in your hosting control panel (e.g., Hostinger hPanel).
2. **File Permissions**:
   ```bash
   chmod -R 775 storage bootstrap/cache public/uploads
   ```
3. **Database Migration on Server**:
   ```bash
   php artisan migrate --force
   ```
4. **Production Caching**:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

---

## 7. Security Policy

- **Never Commit Secrets**: Live `.env` files, production database snapshots, and private client attachments are strictly ignored in `.gitignore`.
- **Credential Rotation**: If admin credentials or application keys are ever suspected of exposure, immediately run `php artisan key:generate` and update `INITIAL_ADMIN_PASSWORD` or change passwords via the owner dashboard.

