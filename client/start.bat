@echo off
echo Libération du port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 2^>nul') do (
  taskkill /PID %%a /F >nul 2^>&1
)
echo Lancement du client Vite...
npm run dev
