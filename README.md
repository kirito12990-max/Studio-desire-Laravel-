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

## 3. One-Click Windows Development (Recommended)

Studio Desire includes one-click Windows batch scripts designed for rapid, friction-free local development without manually entering console commands.

### Starting the Application: `start.bat`
You can launch the server using either method:
- **One-Click (Explorer)**: Double-click `start.bat` directly in Windows File Explorer.
- **PowerShell Terminal**: Run `.\start.bat` (PowerShell requires the `.\` prefix for files in current directory).
- **Command Prompt (CMD)**: Run `start.bat`.

The script will:
- Switch to the project root directory automatically (`cd /d "%~dp0"`).
   - Detect PHP CLI (system PATH, or auto-discovery in Laragon `C:\laragon\bin\php\` and XAMPP `C:\xampp\php\`).
   - Verify `artisan`, Composer dependencies (`vendor\autoload.php`), and `.env`.
   - Check if the dedicated port `8080` is free.
   - Open your default web browser to `http://127.0.0.1:8080`.
   - Keep the command window open to display real-time HTTP requests, SQL queries, and error logs.

#### Local Browser URLs:
- **Public Architectural Portfolio**: `http://127.0.0.1:8080`
- **Owner Publishing CMS**: `http://127.0.0.1:8080/#owner/login`
- **REST API Endpoints**: `http://127.0.0.1:8080/api/projects`


#### Stopping the Server:
- Press `Ctrl + C` in the `start.bat` command window, or simply close the command window.

---

### First-Time Environment Setup: `setup.bat`
For a fresh repository clone or new computer setup, run `setup.bat` (via **double-click** in File Explorer, or `.\setup.bat` in PowerShell).

The setup wizard safely prepares your environment:
- Probes for PHP 8.3 and Composer.
- **Safely preserves existing configuration**: Checks `.env` and creates it from `.env.example` only if missing.
- **Protects secrets**: Only generates `APP_KEY` if missing or blank (never overwrites existing keys).
- Installs Composer packages if `vendor\` is missing.
- Initializes `database/database.sqlite` if SQLite is configured.
- Asks for confirmation before running migrations (`php artisan migrate`) or seeders (`php artisan db:seed`).
- Links storage directory (`public/storage`).
- Checks frontend static assets in `public/` and offers to build if needed.
- Optionally launches `start.bat` directly when setup finishes.

---

### Troubleshooting & Diagnostics

| Symptom | Root Cause | Actionable Solution |
| :--- | :--- | :--- |
| **`[ERROR] PHP was not found`** | PHP 8.2+ is not in PATH and not in standard Laragon/XAMPP paths. | If using Laragon, install in `C:\laragon`. If standalone PHP, add `C:\path\to\php` to your Windows System `PATH` environment variable and reopen the terminal. |
| **`[ERROR] Laravel dependencies not found`** | `vendor\autoload.php` is missing. | Run `setup.bat` or run `composer install` from the terminal. |
| **`[WARNING] Environment file (.env) is missing`** | No `.env` configuration file exists. | Copy `.env.example` to `.env` (`copy .env.example .env`) and run `php artisan key:generate`, or run `setup.bat`. |
| **`[PORT CONFLICT] Dedicated Port 8080 is occupied`** | Another service is using port 8080. | `start.bat` identifies the occupying PID and process name. Free port 8080 using `taskkill /PID <PID> /F` and relaunch. |
| **Blank white page in browser** | Frontend SPA assets missing in `public\`. | Run `npm run build` inside `frontend/` (or run `setup.bat` which will compile them). |
| **Database error / `no such table`** | Migrations have not been applied. | Run `php artisan migrate` or run `setup.bat` and select `Y` for database migrations. |

#### Distinguishing Startup Failures from Application Errors:
- **Startup Failures**: The server fails to launch, or `start.bat` halts with an `[ERROR]` banner and keeps the window open with `pause`. These are environment/configuration issues (e.g. missing PHP, missing `.env`, missing `vendor`).
- **Application Errors**: The server starts successfully (`Starting Laravel development server...`), but the browser displays an HTTP 500 error or exception. These are runtime errors; inspect the stack trace printed in the `start.bat` console window or view `storage/logs/laravel.log`.

---

## 4. Manual CLI Quick Start (Alternative)

If you prefer manual command-line execution:

### Step 1: Environment Setup
```bash
cd Studio-Desire-Laravel
cp .env.example .env
php artisan key:generate
```

### Step 2: Database Configuration
Update `.env` with your database credentials:
```ini
DB_CONNECTION=sqlite
```
*(Ensure `database/database.sqlite` exists for SQLite, or configure MySQL credentials).*

### Step 3: Run Migrations & Seed Baseline Data
```bash
php artisan migrate
php artisan db:seed
```

### Step 4: Storage Link
```bash
php artisan storage:link
```

### Step 5: Start Local Server
```powershell
php artisan serve --host=127.0.0.1 --port=8080
```
If PHP is not on your Windows PATH, run using the verified Laragon PHP path:
```powershell
& "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan serve --host=127.0.0.1 --port=8080
```
Open `http://127.0.0.1:8080` in your browser.


---

## 5. Building Frontend for Production

When ready to bundle the React/TypeScript frontend for production:
```bash
cd frontend
npm run build
```
Vite compiles the production bundle directly into `public/`, allowing the Laravel web server to serve the entire application as a unified single-origin website with zero Node.js daemon required.

---

## 6. Automated Testing

Run the automated PHPUnit / Pest test suites:
```bash
php artisan test
```

To run tests with code coverage:
```bash
php artisan test --coverage
```

---

## 7. Shared Hosting Deployment Guide (Hostinger / cPanel)

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

## 8. Security Policy

- **Never Commit Secrets**: Live `.env` files, production database snapshots, and private client attachments are strictly ignored in `.gitignore`.
- **Credential Rotation**: If admin credentials or application keys are ever suspected of exposure, immediately run `php artisan key:generate` and update `INITIAL_ADMIN_PASSWORD` or change passwords via the owner dashboard.

