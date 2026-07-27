# Multi-stage build for efficiency
FROM node:24-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/
COPY decks/ ./decks/
COPY run-in-docker ./run-in-docker

RUN npm run build

FROM node:24-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/decks ./decks
COPY --from=builder /app/run-in-docker ./run-in-docker

EXPOSE 3333
CMD ["sh", "-c", "./run-in-docker"]