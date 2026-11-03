@echo off
title Mint Studio - Centro de Operaciones Autonomo
echo ====================================================================
echo   Iniciando Mint Studio: Base de Datos PostgreSQL 16 y Servidor API
echo ====================================================================
echo.
echo Levantando contenedores en Docker...
docker compose up -d
echo.
echo [1/2] Base de datos PostgreSQL 16 activa en localhost:5432
echo [2/2] Servidor API Fastify activo en http://localhost:3001
echo.
echo Conectando con la consola de escritorio...
if exist "Mint Studio.exe" (
    start "" "Mint Studio.exe"
) else (
    echo [AVISO] Ejecutable Mint Studio.exe no encontrado en la raiz.
)
echo.
echo Todo listo. Puedes cerrar esta ventana.
timeout /t 3 >nul
exit
