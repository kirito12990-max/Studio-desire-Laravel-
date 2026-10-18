# STUDIO DESIRE — HOSTINGER DEPLOYMENT GUIDE

This guide provides step-by-step instructions for deploying **Studio Desire (Laravel + React SPA)** to standard Hostinger PHP shared or cloud hosting.

---

## 1. Hosting Architecture Overview

On Hostinger, web traffic is typically mapped to `public_html/`. Because Laravel places its public entry point in `public/`, deploying Laravel securely requires separating the application core from the public root so sensitive files (`.env`, `vendor/`, `storage/`) are never exposed via HTTP.

### Recommended Directory Layout on Hostinger

```text
/home/u123456789/
├── studio-desire-core/            <-- Entire Laravel project EXCEPT public contents
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── storage/
│   ├── vendor/
│   ├── .env                       <-- Production .env (securely isolated)
│   └── artisan
└── public_html/                   <-- Contents of Laravel's public/ directory
    ├── assets/                    <-- React compiled JS/CSS
    ├── index.html                 <-- React SPA root
    ├── index.php                  <-- Laravel entry point
    ├── .htaccess                  <-- Apache URL rewrite rules
    ├── uploads/                   <-- Uploaded project portfolios
    └── storage/                   <-- Symlink to studio-desire-core/storage/app/public
```

*Note: Alternatively, if your Hostinger plan allows custom document root configuration (in hPanel > Websites > Manage > Domains > Document Root), set the document root directly to `/home/u123456789/studio-desire/public`.*

---

## 2. Configuration Settings Matrix

### Required vs Environment-Dependent Settings

| Setting | Required Value / Recommendation | Category | Description |
|---|---|---|---|
| `APP_ENV` | `production` | **Required** | Enables production caching and disables development aids. |
| `APP_DEBUG` | `false` | **Required** | Prevents sensitive stack traces, DB credentials, and env secrets from leaking. |
| `APP_KEY` | *(Generated 32-char key)* | **Required** | Run `php artisan key:generate`. |
| `APP_URL` | `https://your-domain.com` | **Required** | Must use `https://` with real custom domain; no trailing slash. |
| `DB_CONNECTION` | `mysql` | **Required** | Production MySQL database engine. |
| `DB_HOST` | `127.0.0.1` or `localhost` | Dependent | Check Hostinger hPanel > Databases > MySQL Databases. |
| `DB_PORT` | `3306` | Default | Standard MySQL port. |
| `DB_DATABASE` | `u123456789_studiodesire` | Dependent | Created in Hostinger hPanel. |
| `DB_USERNAME` | `u123456789_user` | Dependent | Created in Hostinger hPanel. |
| `DB_PASSWORD` | *(Strong Password)* | **Required** | Assigned when creating the database user. |
| `SESSION_DRIVER` | `database` or `file` | **Recommended** | `database` ensures atomic session locking; `file` is also reliable on Hostinger. |
| `SESSION_SECURE_COOKIE` | `true` | **Required (HTTPS)** | Instructs browser to transmit session cookie over HTTPS only. |
| `SESSION_SAME_SITE` | `lax` | **Required** | Protects against CSRF while permitting top-level navigation. |
| `SANCTUM_STATEFUL_DOMAINS` | `your-domain.com,www.your-domain.com` | **Required** | Domain(s) that receive stateful cookie authentication. |
| `CORS_ALLOWED_ORIGINS` | `https://your-domain.com,https://www.your-domain.com` | **Required** | Allowed origins for API requests. |
| `FILESYSTEM_DISK` | `public` | **Required** | Stores media assets in public disk. |
| `MAIL_MAILER` | `smtp` | **Recommended** | Hostinger webmail or external SMTP. |
| `MAIL_HOST` | `smtp.hostinger.com` | Dependent | Standard Hostinger outgoing SMTP server. |
| `MAIL_PORT` | `465` (SSL) or `587` (TLS) | Dependent | Standard Hostinger email ports. |
| `MAIL_ENCRYPTION` | `ssl` (for 465) or `tls` (for 587) | Dependent | Encryption protocol. |

---

## 3. Hostinger Deployment Steps

### Step 1: Prepare Database & Email in hPanel
1. Navigate to **hPanel > Databases > MySQL Databases**.
2. Create a new database (e.g. `u123456789_studiodesire`) and user with a strong password. Note the database name, username, and password.
3. (Optional) Create an email account under **hPanel > Emails > Email Accounts** (e.g., `inquiries@your-domain.com`).

### Step 2: Build Frontend Assets Locally
Before uploading to shared hosting, ensure React assets are freshly compiled:
```powershell
cd frontend
npm install
npm run build
```
This writes the production bundle directly to Laravel's `public/` directory (`public/assets/`, `public/index.html`).

### Step 3: Upload Files to Hostinger
Using Git Deployment (hPanel > Advanced > Git) or SSH/SFTP:
1. Upload the project core into `/home/u123456789/studio-desire-core`.
2. Move contents of `public/` into `/home/u123456789/public_html/`.
3. In `/home/u123456789/public_html/index.php`, adjust paths to `autoload.php` and `bootstrap/app.php` if directories were separated:
   ```php
   require __DIR__.'/../studio-desire-core/vendor/autoload.php';
   $app = require_once __DIR__.'/../studio-desire-core/bootstrap/app.php';
   ```

### Step 4: Configure Production `.env`
Create `/home/u123456789/studio-desire-core/.env` with your real database credentials, `APP_ENV=production`, `APP_DEBUG=false`, and `https://your-domain.com`.

### Step 5: Run Migrations and Optimize
Connect via SSH or use Hostinger's terminal:
```bash
cd /home/u123456789/studio-desire-core

# 1. Run migrations to initialize production database
php artisan migrate --force

# 2. Create the symbolic link for uploaded media
php artisan storage:link

# 3. Create initial Owner credentials (or run seeder)
php artisan make:owner "Studio Desire" "owner@your-domain.com" "YourStrongPassword"

# 4. Cache production routes and configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 4. Apache URL Rewrite (`.htaccess`)

Ensure the `.htaccess` file in your public root (`public_html/`) contains standard rewrite directives:

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

---

## 5. Security Checklist Before Going Live

- [ ] `APP_DEBUG=false` in `.env`
- [ ] `APP_ENV=production` in `.env`
- [ ] HTTPS enforced via Hostinger Free SSL (hPanel > SSL > Force HTTPS)
- [ ] `SESSION_SECURE_COOKIE=true` in `.env`
- [ ] `.env` file is NOT accessible via web browser (test visiting `https://your-domain.com/.env` -> must return 403 or 404)
- [ ] Storage symlink active (`php artisan storage:link`)
- [ ] Real portfolio data verified in owner dashboard (`https://your-domain.com/owner/login`)
