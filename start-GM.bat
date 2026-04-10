@echo off
chcp 65001 >nul
echo ============================================
echo   TableTopeke - Session GM
echo ============================================
echo.

echo [1/5] Liberation des ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :2567 2^>nul') do (
  taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 2^>nul') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo [2/5] Configuration GM...
copy /Y "client\public\player-config.GM.json" "client\public\player-config.json" >nul
echo Config GM activee.

echo [3/5] Lancement du serveur Colyseus...
start "TableTopeke - Serveur" cmd /k "cd /d %~dp0server && npm start"

echo Attente demarrage serveur (3s)...
timeout /t 3 /nobreak >nul

echo [4/5] Lancement du client Vite (mode GM)...
start "TableTopeke - Client GM" cmd /k "cd /d %~dp0client && npm run dev"

echo Attente demarrage Vite (3s)...
timeout /t 3 /nobreak >nul

echo [5/5] Ouverture du navigateur...
start http://localhost:5173

echo.
echo ============================================
echo   Serveur et client GM lances !
echo   Ferme les deux fenetres cmd pour stopper.
echo ============================================
echo.
pause
