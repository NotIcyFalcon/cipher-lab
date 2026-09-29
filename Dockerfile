# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS web-build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_LAB_WS_URL=/lab-socket
RUN mkdir -p public \
    && node --check gateway/config.mjs \
    && node --check gateway/server.mjs \
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

USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:24-bookworm-slim AS gateway
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY gateway ./gateway

USER node
EXPOSE 3001
CMD ["node", "gateway/server.mjs"]