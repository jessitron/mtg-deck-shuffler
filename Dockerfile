# Multi-stage build for efficiency
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY decks/ ./decks/
COPY run-in-docker ./run-in-docker

RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/run-in-docker ./run-in-docker
COPY --from=builder /app/decks ./decks

ENV NODE_OPTIONS="-r /app/dist/tracing.js"

EXPOSE 3000
CMD ["node", "/app/dist/server.js"]