#!/bin/bash
set -e

echo "Building for Vercel..."
cd client
npm install
npm run build
echo "Build complete!"
