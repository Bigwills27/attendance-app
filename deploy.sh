#!/bin/bash

echo "🚀 Setting up Smart Attendance System for Render deployment..."

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Please run this script from the project root directory."
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
else
    echo "✅ Git repository already exists"
fi

# Add all files
echo "📁 Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "Ready for Render deployment: Smart Attendance System

- Complete attendance system with GPS geofencing
- Mobile-optimized UI with location detection
- Anti-cheat measures (IP, GPS, time validation)
- PDF export functionality
- Real-time attendance management
- HTTPS-ready for mobile location services"
fi

echo "
🎉 Ready for deployment!

Next steps:
1. Create a GitHub repository
2. Push code: git remote add origin <your-repo-url>
3. Push code: git push -u origin main
4. Deploy to Render using the GitHub repository

Files ready for deployment:
✅ .gitignore - Excludes unnecessary files
✅ render.yaml - Render configuration
✅ package.json - Updated with Node.js version
✅ server.js - Environment variable support
✅ All frontend files optimized

Your app will be available at: https://your-app-name.onrender.com
"
