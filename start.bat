@echo off
echo ============================================
echo   TableTopeke - Demarrage du serveur
echo ============================================
echo.

if not exist "client\dist" (
    echo [1/2] Premier lancement - Build du client...
    cd client
    call npm install
    call npm run build
    cd ..
    echo.
)

echo [2/2] Demarrage du serveur...
cd server
call npm install --silent
call npm start
pause
