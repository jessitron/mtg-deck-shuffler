# Multi-stage build, mirroring apps/shuffler/Dockerfile.
#
# BUILD CONTEXT IS THE REPO ROOT, not apps/tabletop/. With npm workspaces the
# authoritative package-lock.json lives at the root. Build with:
#
#   docker build -f apps/tabletop/Dockerfile <repo-root>     (from the repo root)
#   docker build -f Dockerfile ../..                         (from apps/tabletop)
#
# deploy.sh does the latter.
FROM node:24-slim AS builder
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/tabletop/package.json ./apps/tabletop/
RUN npm ci

WORKDIR /repo/apps/tabletop
COPY apps/tabletop/tsconfig.json apps/tabletop/tsconfig.server.json apps/tabletop/vite.config.ts apps/tabletop/index.html ./
COPY apps/tabletop/src/ ./src/

# The tldraw license key must be present AT BUILD TIME: vite bakes it into the
# client bundle. Without it the deployed canvas blanks out 5s after load (see
# src/client/TablePage.tsx). Passed by deploy.sh via --build-arg. It is not a
# secret — domain-bound and shipped to browsers by design — so a build arg,
# rather than a mounted secret, is the right shape.
ARG TLDRAW_LICENSE_KEY=""
ENV TLDRAW_LICENSE_KEY=$TLDRAW_LICENSE_KEY

RUN npm run build
# Workspace-local node_modules holds packages whose versions differ from the
# hoisted root ones (e.g. this app's newer OTel line). Make sure it exists so
# the runtime COPY below never fails.
RUN mkdir -p node_modules

# Runtime keeps the workspace layout (root node_modules + workspace-local
# node_modules) so Node's resolution works exactly as in dev.
FROM node:24-slim
WORKDIR /repo/apps/tabletop
COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/package.json /repo/package.json
COPY --from=builder /repo/apps/tabletop/node_modules ./node_modules
COPY --from=builder /repo/apps/tabletop/dist ./dist
COPY --from=builder /repo/apps/tabletop/package.json ./

EXPOSE 5180
CMD ["node", "--import", "./dist/server/tracing.js", "dist/server/server.js"]
