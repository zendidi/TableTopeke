@echo off
echo Libération du port 2567...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :2567 2^>nul') do (
  taskkill /PID %%a /F >nul 2^>&1
)
echo Lancement du serveur Colyseus...
npm start
