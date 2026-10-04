# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS web-build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_LAB_WS_URL=/lab-socket
RUN mkdir -p public \
    && for f in gateway/*.mjs; do node --check "$f"; done \
    && npx eslint . \
    && npm run build

FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=web-build --chown=node:node /app/.next/standalone ./
COPY --from=web-build --chown=node:node /app/.next/static ./.next/static
COPY --from=web-build --chown=node:node /app/public ./public
COPY --from=web-build --chown=node:node /app/scripts ./scripts
COPY --from=web-build --chown=node:node /app/migrations ./migrations

RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate-db.mjs --recover && exec node server.js"]

FROM node:24-bookworm-slim AS gateway
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY gateway ./gateway

USER node
EXPOSE 3001
CMD ["node", "gateway/server.mjs"]