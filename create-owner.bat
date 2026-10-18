@echo off
setlocal EnableDelayedExpansion

:: -----------------------------------------------------------------------------
:: Studio Desire - Architectural Interior Archive
:: Owner Account Provisioning Tool (Windows)
:: -----------------------------------------------------------------------------

title Studio Desire - Owner Account Provisioning

cd /d "%~dp0"

echo ===============================================================================
echo                STUDIO DESIRE - OWNER ACCOUNT PROVISIONING
echo ===============================================================================
echo.

:: 1. Detect PHP binary
set "PHP_BIN="
set "PHP_DIR="

if exist "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" (
    set "PHP_BIN=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe"
    set "PHP_DIR=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64"
    goto php_detected
)

where php >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%I in ('where php 2^>nul') do (
        if not defined PHP_BIN (
            set "PHP_BIN=%%I"
            set "PHP_DIR=%%~dpI"
        )
    )
    if defined PHP_BIN goto php_detected
)

for /d %%D in ("C:\laragon\bin\php\php-8*") do (
    if not defined PHP_BIN (
        if exist "%%D\php.exe" (
            set "PHP_BIN=%%D\php.exe"
            set "PHP_DIR=%%D"
            goto php_detected
        )
    )
)

if exist "C:\xampp\php\php.exe" (
    set "PHP_BIN=C:\xampp\php\php.exe"
    set "PHP_DIR=C:\xampp\php"
    goto php_detected
)

if exist "C:\php\php.exe" (
    set "PHP_BIN=C:\php\php.exe"
    set "PHP_DIR=C:\php"
    goto php_detected
)

echo  [ERROR] PHP binary was not detected in Laragon or system PATH.
echo.
pause
exit /b 1

:php_detected
:: Ensure PHP extensions and dependencies are on PATH
if defined PHP_DIR (
    set "PATH=!PHP_DIR!;!PATH!"
)

:: Run artisan make:owner
echo  Launching account creator...
echo.
"%PHP_BIN%" artisan make:owner %*
set "OWNER_EXIT=%ERRORLEVEL%"
echo.

pause
exit /b %OWNER_EXIT%
