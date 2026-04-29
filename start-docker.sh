#!/bin/sh
set -e

echo "Starting database migrations..."
npx prisma migrate deploy

echo "Starting NestJS server..."
node dist/main.js