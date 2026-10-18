@echo off
setlocal EnableDelayedExpansion

:: -----------------------------------------------------------------------------
:: Studio Desire - Architectural Interior Archive
:: First-Time Environment Setup Wizard (Windows)
:: -----------------------------------------------------------------------------

title Studio Desire - Initial Environment Setup

:: 1. Ensure current working directory is the folder where setup.bat resides
cd /d "%~dp0"

cls
echo ===============================================================================
echo             STUDIO DESIRE - FIRST-TIME ENVIRONMENT SETUP WIZARD
echo ===============================================================================
echo.
echo  This wizard prepares your local Windows environment for Studio Desire Laravel.
echo  It will verify prerequisites, configure your environment, and safely install
echo  dependencies without overwriting any existing configuration.
echo.

:: 2. Locate PHP executable (Priority 1: Laragon 8.3 CLI; Priority 2: System PATH; Fallbacks)
set "PHP_BIN="
set "PHP_DIR="

if exist "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" (
    set "PHP_BIN=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe"
    set "PHP_DIR=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64"
    echo  [INFO] Detected Laragon PHP 8.3 CLI: !PHP_BIN!
    goto php_located
)

where php >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%I in ('where php 2^>nul') do (
        if not defined PHP_BIN (
            set "PHP_BIN=%%I"
            set "PHP_DIR=%%~dpI"
        )
    )
    if defined PHP_BIN (
        echo  [INFO] Detected PHP CLI in system PATH: !PHP_BIN!
        goto php_located
    )
)

for /d %%D in ("C:\laragon\bin\php\php-8*") do (
    if not defined PHP_BIN (
        if exist "%%D\php.exe" (
            set "PHP_BIN=%%D\php.exe"
            set "PHP_DIR=%%D"
            echo  [INFO] Detected Laragon PHP CLI at !PHP_BIN!
            goto php_located
        )
    )
)

if exist "C:\xampp\php\php.exe" (
    set "PHP_BIN=C:\xampp\php\php.exe"
    set "PHP_DIR=C:\xampp\php"
    goto php_located
)

if exist "C:\php\php.exe" (
    set "PHP_BIN=C:\php\php.exe"
    set "PHP_DIR=C:\php"
    goto php_located
)

:php_located
if not defined PHP_BIN goto setup_php_missing

if defined PHP_DIR (
    set "PATH=!PHP_DIR!;!PATH!"
)

:: Verify PHP works by executing directly
echo.
echo  [INFO] Verifying PHP runtime...
"%PHP_BIN%" -v
if errorlevel 1 goto setup_php_error
echo  [OK] PHP CLI is verified and operational.
goto setup_find_composer

:setup_php_missing
echo.
echo  [ERROR] PHP 8.2+ was not found in your system PATH or local installations.
echo.
echo  Action required:
echo   - If you use Laragon, ensure Laragon is installed at C:\laragon.
echo   - Or install PHP 8.3 and add its folder to your Windows System PATH.
echo   - Restart this terminal or double-click setup.bat after installing PHP.
echo.
pause
exit /b 1

:setup_php_error
echo.
echo  [ERROR] PHP executable failed to run: "%PHP_BIN%"
echo  Exit Code: %ERRORLEVEL%
echo.
pause
exit /b 1

:setup_find_composer
:: 3. Locate Composer executable
set "COMPOSER_BIN="
if exist "C:\laragon\bin\composer\composer.bat" (
    set "COMPOSER_BIN=C:\laragon\bin\composer\composer.bat"
    set "PATH=C:\laragon\bin\composer;!PATH!"
    echo  [INFO] Detected Laragon Composer at C:\laragon\bin\composer
    goto composer_located
)

where composer >nul 2>&1
if not errorlevel 1 (
    set "COMPOSER_BIN=composer"
    goto composer_located
)

if exist "C:\ProgramData\ComposerSetup\bin\composer.bat" (
    set "COMPOSER_BIN=C:\ProgramData\ComposerSetup\bin\composer.bat"
    set "PATH=C:\ProgramData\ComposerSetup\bin;!PATH!"
    echo  [INFO] Detected Composer at C:\ProgramData\ComposerSetup\bin
    goto composer_located
)

:composer_located
if defined COMPOSER_BIN (
    echo  [OK] Composer package manager is available.
) else (
    echo  [NOTICE] Composer executable not found in PATH or standard directories.
    echo         If composer install is needed, install Composer from https://getcomposer.org
)

:: 4. Verify artisan file exists
if exist "artisan" goto setup_check_env
echo.
echo  [ERROR] artisan not found in current directory: "%CD%"
echo  Please run setup.bat from the root of Studio-Desire-Laravel.
echo.
pause
exit /b 1

:setup_check_env
:: 5. Configure .env file safely (PRESERVE existing configuration)
echo.
echo --- Step 1: Environment Configuration (.env) ---
if exist ".env" (
    echo  [OK] .env already exists. Preserving your existing configuration.
    echo       To reset configuration, remove .env manually before running setup.
    goto setup_check_key
)

if exist ".env.example" (
    echo  [ACTION] Creating .env from .env.example...
    copy ".env.example" ".env" >nul
    echo  [OK] Created .env with default local SQLite settings.
    goto setup_check_key
)

echo  [ERROR] .env.example not found! Cannot generate .env.
pause
exit /b 1

:setup_check_key
:: 6. Generate Application Encryption Key (ONLY if not already set)
echo.
echo --- Step 2: Application Key (APP_KEY) ---
findstr /R /C:"^APP_KEY=base64:" ".env" >nul 2>&1
if not errorlevel 1 (
    echo  [OK] APP_KEY is already set. Skipping key generation to protect existing secrets.
) else (
    echo  [ACTION] Generating application encryption key...
    "%PHP_BIN%" artisan key:generate
    echo  [OK] APP_KEY generated successfully.
)

:: 7. Install / Check Composer Dependencies
echo.
echo --- Step 3: PHP Dependencies (vendor) ---
if exist "vendor\autoload.php" (
    echo  [OK] Dependencies already installed in vendor folder.
    goto setup_storage_link
)

if defined COMPOSER_BIN (
    echo  [ACTION] Installing Laravel dependencies via Composer...
    call "%COMPOSER_BIN%" install --no-interaction --prefer-dist
    if errorlevel 1 (
        echo  [WARNING] composer install reported an issue. Please review output above.
    ) else (
        echo  [OK] Dependencies installed successfully.
    )
) else (
    echo  [WARNING] vendor\autoload.php is missing and Composer is not available in PATH.
    echo            Please install Composer or run composer install manually.
)

:setup_storage_link
:: 8. Storage Symlink
echo.
echo --- Step 4: Storage Symlink ---
if exist "public\storage" (
    echo  [OK] Storage symlink already exists at public\storage.
) else (
    echo  [ACTION] Creating storage symlink...
    "%PHP_BIN%" artisan storage:link >nul 2>&1
    if exist "public\storage" (
        echo  [OK] Storage symlink created successfully.
    ) else (
        echo  [NOTICE] Storage symlink creation skipped or requires elevated rights.
    )
)

:: 9. SQLite Database Setup & Migrations
echo.
echo --- Step 5: Database Setup ---
findstr /i /c:"DB_CONNECTION=sqlite" ".env" >nul 2>&1
if not errorlevel 1 (
    if not exist "database" mkdir "database"
    if not exist "database\database.sqlite" (
        echo  [ACTION] Creating database\database.sqlite file...
        type nul > "database\database.sqlite"
        echo  [OK] SQLite database file created.
    ) else (
        echo  [OK] SQLite database file exists at database\database.sqlite.
    )
    
    echo.
    set "RUN_MIGRATE=y"
    set /p RUN_MIGRATE="  Run database migrations now? [Y/n]: "
    if /i not "!RUN_MIGRATE!"=="n" (
        echo  [ACTION] Running migrations...
        "%PHP_BIN%" artisan migrate --force
        
        echo.
        set "RUN_SEED=n"
        set /p RUN_SEED="  Seed sample portfolio and owner credentials? [y/N]: "
        if /i "!RUN_SEED!"=="y" (
            echo  [ACTION] Seeding database...
            "%PHP_BIN%" artisan db:seed --force
        )
    )
) else (
    echo  [INFO] Non-SQLite database configured. Ensure your database server is running.
)

:: 10. Frontend Build Assets Check
echo.
echo --- Step 6: Frontend Static Assets ---
if exist "public\index.html" (
    echo  [OK] Frontend SPA already compiled in public folder - Zero Node.js runtime required.
) else (
    echo  [NOTICE] public\index.html not found.
    set "NPM_BIN="
    where npm >nul 2>&1
    if not errorlevel 1 set "NPM_BIN=npm"
    if not defined NPM_BIN (
        if exist "C:\Program Files\nodejs\npm.cmd" set "NPM_BIN=C:\Program Files\nodejs\npm.cmd"
    )
    if defined NPM_BIN (
        set "BUILD_FE=y"
        set /p BUILD_FE="  Build React frontend now using npm? [Y/n]: "
        if /i not "!BUILD_FE!"=="n" (
            echo  [ACTION] Compiling React frontend...
            if exist "frontend" (
                pushd frontend
                call "!NPM_BIN!" install
                call "!NPM_BIN!" run build
                popd
            ) else (
                call "!NPM_BIN!" install
                call "!NPM_BIN!" run build
            )
        )
    ) else (
        echo  [NOTICE] Node.js / npm was not detected. Pre-built assets will be used.
    )
)

:: 11. Setup Completion & Option to Launch
echo.
echo ===============================================================================
echo                       SETUP COMPLETED SUCCESSFULLY
echo ===============================================================================
echo.
echo  Studio Desire is ready for local development.
echo  You can start the application at any time by running start.bat.
echo.
set "LAUNCH_NOW=y"
set /p LAUNCH_NOW="  Start Studio Desire now? [Y/n]: "
if /i not "!LAUNCH_NOW!"=="n" (
    echo.
    echo  Launching start.bat...
    call start.bat
) else (
    echo.
    echo  You can launch the server later by running start.bat.
    pause
)
exit /b 0
