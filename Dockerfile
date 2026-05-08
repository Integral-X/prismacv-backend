# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Prune devDependencies after build (prisma CLI is in dependencies, stays available)
RUN npm prune --omit=dev

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

# Install Chromium for Puppeteer PDF export
RUN apk add --no-cache chromium
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY start-docker.sh ./
RUN chmod +x start-docker.sh

RUN mkdir -p uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://localhost:3000/api/health/ready" >/dev/null 2>&1 || exit 1

CMD ["./start-docker.sh"]
