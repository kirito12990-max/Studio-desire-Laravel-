@echo off
setlocal EnableDelayedExpansion

:: -----------------------------------------------------------------------------
:: Studio Desire - Architectural Interior Archive
:: Local Development Server Launcher (Windows)
:: -----------------------------------------------------------------------------

title Studio Desire - Architectural Archive [Local Server]

:: 1. Change to the directory containing start.bat regardless of launch origin
cd /d "%~dp0"

cls
echo ===============================================================================
echo                STUDIO DESIRE - ARCHITECTURAL INTERIOR ARCHIVE
echo                           Local Development Server
echo ===============================================================================
echo.

:: 2. Detect PHP executable (Priority 1: Laragon 8.3 CLI; Priority 2: System PATH; Fallbacks)
set "PHP_BIN="
set "PHP_DIR="

:: Priority 1: Verified Laragon PHP 8.3 CLI
if exist "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" (
    set "PHP_BIN=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe"
    set "PHP_DIR=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64"
    echo  [INFO] Detected Laragon PHP 8.3 CLI: !PHP_BIN!
    goto php_detected
)

:: Priority 2: System PATH
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
        goto php_detected
    )
)

:: Priority 3: Other Laragon PHP 8.x installations
for /d %%D in ("C:\laragon\bin\php\php-8*") do (
    if not defined PHP_BIN (
        if exist "%%D\php.exe" (
            set "PHP_BIN=%%D\php.exe"
            set "PHP_DIR=%%D"
            echo  [INFO] Detected Laragon PHP CLI at !PHP_BIN!
            goto php_detected
        )
    )
)

:: Priority 4: XAMPP PHP
if exist "C:\xampp\php\php.exe" (
    set "PHP_BIN=C:\xampp\php\php.exe"
    set "PHP_DIR=C:\xampp\php"
    echo  [INFO] Detected XAMPP PHP CLI at !PHP_BIN!
    goto php_detected
)

:: Priority 5: Standalone C:\php
if exist "C:\php\php.exe" (
    set "PHP_BIN=C:\php\php.exe"
    set "PHP_DIR=C:\php"
    echo  [INFO] Detected PHP CLI at C:\php: !PHP_BIN!
    goto php_detected
)

:php_detected
if not defined PHP_BIN goto php_missing

if defined PHP_DIR (
    set "PATH=!PHP_DIR!;!PATH!"
)

:: 3. Verify PHP works by executing php -v directly
echo.
echo  [INFO] Verifying PHP runtime...
"%PHP_BIN%" -v
if errorlevel 1 goto php_exec_error
echo  [OK] PHP runtime verified successfully.
goto check_artisan

:php_missing
echo.
echo  [ERROR] PHP was not found in your system PATH or local installations.
echo.
echo  Action required:
echo   - If using Laragon, ensure Laragon is installed at C:\laragon.
echo   - If using standard PHP, add your PHP 8.2+ folder to Windows System PATH.
echo   - Or run setup.bat to check environment prerequisites.
echo.
pause
exit /b 1

:php_exec_error
echo.
echo  [ERROR] PHP executable failed to run: "%PHP_BIN%"
echo  Exit Code: %ERRORLEVEL%
echo  Please check your PHP installation and extensions.
echo.
pause
exit /b 1

:check_artisan
:: 4. Verify artisan exists in root directory
if exist "artisan" goto check_vendor
echo.
echo  [ERROR] 'artisan' not found in current directory: "%CD%"
echo  Please ensure start.bat is run from the root of Studio-Desire-Laravel.
echo.
pause
exit /b 1

:check_vendor
:: 5. Verify Laravel dependencies in vendor
if exist "vendor\autoload.php" goto check_env
echo.
echo  [ERROR] Laravel dependencies not found in vendor\autoload.php
echo.
echo  Action required:
echo   Run 'setup.bat' or execute 'composer install' to install dependencies.
echo.
pause
exit /b 1

:check_env
:: 6. Check whether .env exists (never overwrites or regenerates keys automatically)
if exist ".env" goto check_database
echo.
echo  [WARNING] Environment file .env is missing.
echo.
echo  Action required:
echo   - Copy the example configuration: copy .env.example .env
echo   - Generate an application key:    "%PHP_BIN%" artisan key:generate
echo   Or run 'setup.bat' to initialize safely.
echo.
pause
exit /b 1

:check_database
:: 7. Check database file if SQLite is configured (ensure file exists without erasing data)
findstr /i /c:"DB_CONNECTION=sqlite" ".env" >nul 2>&1
if not errorlevel 1 (
    if not exist "database" mkdir "database"
    if not exist "database\database.sqlite" (
        echo  [INFO] Creating missing database\database.sqlite file...
        type nul > "database\database.sqlite"
    )
)

:: 8. Check frontend static assets (SPA compiled into public/)
if exist "public\index.html" (
    echo  [OK] Compiled React SPA detected in public folder - Zero Node.js runtime required.
) else (
    echo  [NOTICE] public\index.html not found.
    echo         If the public site renders blank, compile frontend assets via:
    echo         cd frontend ^&^& npm run build
    echo         or run 'setup.bat'.
)

:: 9. Verify dedicated port 8080 availability
set "APP_PORT=8080"
set "PORT_PID="
set "PORT_PROC="

for /f "tokens=5" %%P in ('netstat -ano -p tcp 2^>nul ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    set "PORT_PID=%%P"
)

if not defined PORT_PID goto port_ready

for /f "tokens=1 delims=," %%N in ('tasklist /fi "PID eq !PORT_PID!" /fo csv /nh 2^>nul') do (
    set "PORT_PROC=%%~N"
)

echo.
echo ===============================================================================
echo  [PORT CONFLICT] Dedicated Port 8080 is currently occupied!
if defined PORT_PROC (
    echo   Occupying Process : !PORT_PROC! (PID: !PORT_PID!)
) else (
    echo   Occupying Process PID: !PORT_PID!
)
echo.
echo  Studio Desire is configured to run exclusively on port 8080.
echo  To safely free port 8080, run in a separate terminal:
echo    taskkill /PID !PORT_PID! /F
echo.
echo  Please terminate the conflicting process and run start.bat again.
echo ===============================================================================
echo.
pause
exit /b 1


:port_ready
echo.
echo ===============================================================================
echo  Studio Desire Development Server is launching:
echo   - Local URL:      http://127.0.0.1:!APP_PORT!/
echo   - Owner Access:   http://127.0.0.1:!APP_PORT!/#owner/login
echo   - Port:           !APP_PORT!
echo   - PHP Executable: !PHP_BIN!
echo   - Architecture:   Laravel 11 API + React 18 Production SPA
echo ===============================================================================
echo.
echo  Starting local server... Press [Ctrl + C] in this window to stop.
echo.

:: 10. Launch browser only after server confirms listening state
start "" cmd /c "(for /l %%k in (1,1,20) do (netstat -ano -p tcp 2^>nul | findstr \":!APP_PORT! \" | findstr \"LISTENING\" >nul 2>&1 && (start http://127.0.0.1:!APP_PORT!/ & exit /b 0) || (timeout /t 1 /nobreak >nul 2>&1 || ping -n 2 127.0.0.1 >nul)))"

:: 11. Start Laravel development server using the exact detected PHP binary
"%PHP_BIN%" artisan serve --host=127.0.0.1 --port=!APP_PORT!
set "SERVE_EXIT=%ERRORLEVEL%"

echo.
if not "%SERVE_EXIT%"=="0" (
    echo ===============================================================================
    echo  [ERROR] Laravel artisan serve exited with failure code: %SERVE_EXIT%
    echo  The server failed to bind to port !APP_PORT! or encountered a fatal error.
    echo.
    echo  Troubleshooting:
    echo   1. Verify port !APP_PORT! is not blocked by Windows Firewall or another app.
    echo   2. Test manually: "%PHP_BIN%" artisan serve --host=127.0.0.1 --port=!APP_PORT!
    echo   3. Inspect storage\logs\laravel.log for backend exceptions.
    echo ===============================================================================
    echo.
    pause
    exit /b %SERVE_EXIT%
) else (
    echo  [INFO] Studio Desire development server was stopped by user.
    echo.
    pause
    exit /b 0
)
