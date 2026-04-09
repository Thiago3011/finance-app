@echo off
echo Iniciando Finance App...
echo.

REM Backend
start "Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload"

REM Aguarda 2 segundos para o backend subir
timeout /t 2 /nobreak > nul

REM Frontend
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ✅ Backend rodando em http://localhost:8000
echo ✅ Frontend rodando em http://localhost:5173
echo.
echo Feche as janelas para parar os servidores.