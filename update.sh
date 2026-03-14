#!/bin/bash
set -e

echo "⬇️  Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo "🏗️  Building server..."
npm run build:server

echo "🏗️  Building client..."
npm run build:client

echo "🔄 Restarting claudecron..."
pm2 restart claudecron

echo ""
echo "✅ Update complete!"
echo "🌐 claudecron is running at http://localhost:3000"
