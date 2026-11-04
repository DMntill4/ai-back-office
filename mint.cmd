@echo off
setlocal
where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
  docker compose up -d postgres >nul 2>nul
)
node "%~dp0packages\cli\bin\mint.js" %*
