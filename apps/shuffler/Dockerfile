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
# Every workspace named by the root package.json's `workspaces` glob must have its
# package.json present before `npm ci`, or the install fails outright. That's why
# this line exists and why it sits above the install.
COPY packages/design-tokens/package.json ./packages/design-tokens/
RUN npm ci

# The shared palette itself. Served at /fleet by app.ts, so unlike the Tabletop
# (which bundles it through Vite) this ship needs the real file at RUNTIME too.
COPY packages/design-tokens/ ./packages/design-tokens/

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
# MUST accompany the node_modules copy above. npm links the workspace as a
# RELATIVE symlink (node_modules/@fleet/design-tokens -> ../../packages/design-tokens),
# so flattening /repo/apps/shuffler to /app leaves it pointing at /app/packages.
# Without this line the symlink dangles, /fleet/tokens.css 404s, and every page
# loses its colours — in the container only, never in dev.
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/shuffler/dist ./dist
COPY --from=builder /repo/apps/shuffler/views ./views
COPY --from=builder /repo/apps/shuffler/public ./public
COPY --from=builder /repo/apps/shuffler/package.json ./
COPY --from=builder /repo/apps/shuffler/decks ./decks
COPY --from=builder /repo/apps/shuffler/run-in-docker ./run-in-docker

EXPOSE 3333
CMD ["sh", "-c", "./run-in-docker"]
