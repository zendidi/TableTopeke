#!/bin/bash
echo "============================================"
echo "  TableTopeke - Démarrage du serveur"
echo "============================================"

if [ ! -d "client/dist" ]; then
    echo "[1/2] Premier lancement - Build du client..."
    cd client && npm install && npm run build && cd ..
fi

echo "[2/2] Démarrage du serveur..."
cd server && npm install --silent && npm start
