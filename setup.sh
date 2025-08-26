#!/bin/bash

# TBS WhatsApp Learning System - Quick Setup Script
# Run this script to set up your development environment

set -e

echo "🚀 TBS WhatsApp Learning System Setup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if ! node -pe "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION'))" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to 18.0.0 or later."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Setup environment file
if [ ! -f ".env" ]; then
    echo "⚙️ Setting up environment file..."
    cp .env.template .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your credentials before running the app"
    echo ""
else
    echo "✅ Environment file already exists"
    echo ""
fi

# Create logs directory
mkdir -p logs
echo "✅ Created logs directory"
echo ""

# Setup git hooks (optional)
if [ -d ".git" ]; then
    echo "📝 Setting up git hooks..."
    echo "#!/bin/bash" > .git/hooks/pre-commit
    echo "npm run test --if-present" >> .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Git hooks configured"
    echo ""
fi

# Display next steps
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials:"
echo "   - WATI API credentials (URL, API token)"
echo "   - Airtable credentials (base ID, table IDs, PAT)"
echo "   - Other configuration settings"
echo ""
echo "2. Set up your Airtable database:"
echo "   - Create Students table with required fields"
echo "   - Create Course Content table with modules"
echo "   - See DEPLOYMENT_GUIDE.md for detailed schema"
echo ""
echo "3. Configure WATI webhook:"
echo "   - Set webhook URL to your server endpoint"
echo "   - Enable message received events"
echo ""
echo "4. Test locally:"
echo "   npm run dev"
echo ""
echo "5. Check endpoints:"
echo "   http://localhost:3000/ping (health check)"
echo "   http://localhost:3000/status (system status)"
echo "   http://localhost:3000/trigger-daily (manual test)"
echo ""
echo "📚 Full documentation: README.md and DEPLOYMENT_GUIDE.md"
echo "🆘 Need help? Check the troubleshooting section in DEPLOYMENT_GUIDE.md"
echo ""
echo "Happy learning! 🎓"