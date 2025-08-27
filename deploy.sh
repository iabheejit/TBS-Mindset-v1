#!/bin/bash

# ----------------------
# Azure Deployment Script
# ----------------------

echo "Starting deployment"

# Navigate to deployed directory
cd "$DEPLOYMENT_TARGET" || exit

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create logs directory if it doesn't exist
mkdir -p logs

echo "Finished deployment successfully."
