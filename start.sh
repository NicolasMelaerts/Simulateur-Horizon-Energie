f#!/bin/bash

# Horizon Energie - Simulateur Photovoltaïque
# Script de lancement du serveur de développement

cleanup() {
  echo ""
  echo "Arrêt du serveur..."
  kill "$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null
  echo "Serveur arrêté."
  exit 0
}

trap cleanup SIGINT SIGTERM

cd "$(dirname "$0")" || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installation des dépendances..."
  npm install
fi

echo "Démarrage du simulateur Horizon Energie..."
npx vite --host &
SERVER_PID=$!

wait "$SERVER_PID"
