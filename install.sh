#!/bin/bash
set -e

echo "📦 Installing claudecron dependencies..."
npm install

echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo "🏗️  Building server..."
npm run build:server

echo "🏗️  Building client..."
npm run build:client

echo "🚀 Setting up pm2..."
npm install -g pm2 || true

echo "⚙️  Starting claudecron with pm2..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ Installation complete!"
echo "🌐 claudecron is running at http://localhost:3000"
echo ""
echo "To enable auto-start on system boot, run:"
echo "  pm2 startup"
echo ""
echo "To view logs, run:"
echo "  pm2 logs claudecron"
echo ""
echo "To stop, run:"
echo "  pm2 stop claudecron"
