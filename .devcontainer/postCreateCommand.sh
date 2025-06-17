#!/bin/bash

echo "🌤️  Setting up Wrangler Weather for local development..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

echo "✅ Node.js is installed ($(node --version))"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file and add your OpenWeatherMap API key!"
    echo "   Get your API key from: https://openweathermap.org/api"
    echo ""
    echo "   Then run: npm start"
else
    echo "✅ .env file already exists"
    echo ""
    echo "🚀 Ready to start! Run: npm start"
fi

echo ""
echo "🏁 Setup complete!"
