#!/bin/bash
set -e

echo "Stopping PrismaCV Backend service..."

# Stop the development server if running
echo "Stopping development server..."
pkill -f "npm run start:dev" 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true

# Stop Docker containers
echo "Stopping database services..."
docker-compose down

echo "All services stopped successfully!"