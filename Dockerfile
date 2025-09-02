# Multi-stage build for efficiency
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY decks/ ./decks/
COPY run-in-docker ./run-in-docker

RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/decks ./decks

EXPOSE 3000
CMD ["ls"]