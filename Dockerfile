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

FROM gcr.io/distroless/nodejs22-debian12
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/run-in-docker ./run-in-docker
COPY --from=builder /app/decks ./decks

RUN echo "=== DEBUG INFO ===" && \
    pwd && \
    echo "Working directory contents:" && \
    ls -la && \
    echo "Dist directory contents:" && \
    ls -la dist/ && \
    echo "Package.json:" && \
    cat package.json

ENTRYPOINT []

EXPOSE 3000
CMD ["./run-in-docker"]