# Multi-stage build for efficiency.
#
# BUILD CONTEXT IS THE REPO ROOT, not apps/shuffler/. With npm workspaces the
# authoritative package-lock.json lives at the root, and `npm ci` needs it there
# alongside the root package.json — so the context has to include both. Build with:
#
#   docker build -f apps/shuffler/Dockerfile <repo-root>     (from the repo root)
#   docker build -f Dockerfile ../..                         (from apps/shuffler)
#
# deploy.sh and verify-container-boot.sh do the latter.
#
# The runtime stage flattens the workspace back down: the app lands at /app with its
# node_modules beside it, exactly as before the monorepo restructure, so run-in-docker,
# the WORKDIR, and the k8s manifests are unaffected.
FROM node:24-slim AS builder
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/shuffler/package.json ./apps/shuffler/
RUN npm ci

WORKDIR /repo/apps/shuffler
COPY apps/shuffler/tsconfig.json ./
COPY apps/shuffler/src/ ./src/
COPY apps/shuffler/views/ ./views/
COPY apps/shuffler/public/ ./public/
COPY apps/shuffler/decks/ ./decks/
COPY apps/shuffler/run-in-docker ./run-in-docker

RUN npm run build

FROM node:24-slim
WORKDIR /app
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/shuffler/dist ./dist
COPY --from=builder /repo/apps/shuffler/views ./views
COPY --from=builder /repo/apps/shuffler/public ./public
COPY --from=builder /repo/apps/shuffler/package.json ./
COPY --from=builder /repo/apps/shuffler/decks ./decks
COPY --from=builder /repo/apps/shuffler/run-in-docker ./run-in-docker

EXPOSE 3333
CMD ["sh", "-c", "./run-in-docker"]
