#!/bin/bash
set -e

echo "⬇️  Pulling latest changes..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "📦 Installing client dependencies..."
cd client
npm install
echo "🏗️  Building React app..."
npm run build
cd ..

echo "🔄 Restarting claudecron..."
pm2 restart claudecron

echo ""
echo "✅ Update complete!"
echo "🌐 claudecron is running at http://localhost:3000"
