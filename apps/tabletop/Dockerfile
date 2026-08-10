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
# Every workspace named by the root package.json's `workspaces` glob must have its
# package.json present before `npm ci`, or the install fails outright.
COPY packages/design-tokens/package.json ./packages/design-tokens/
RUN npm ci

# The shared palette. Vite bakes it into the client bundle at build time, so this
# ship needs it in the BUILDER only — but see the runtime copy below.
COPY packages/design-tokens/ ./packages/design-tokens/

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
# Not needed to serve the app — Vite already inlined the tokens into the client
# bundle. Copied anyway so the workspace symlink in /repo/node_modules resolves
# instead of dangling; a dangling link is a trap for the next thing that reaches
# for the package at runtime, and it would only show up in the container.
COPY --from=builder /repo/packages /repo/packages
COPY --from=builder /repo/apps/tabletop/node_modules ./node_modules
COPY --from=builder /repo/apps/tabletop/dist ./dist
COPY --from=builder /repo/apps/tabletop/package.json ./
# contractValidation.ts reads these at runtime, relative to its own compiled
# location (../../../../contracts from dist/server/) — copied straight from
# the build context (never used at build time, so the builder stage never
# needed it). Not a workspace symlink, so no dangling-link failure mode, but
# a missed copy fails the same way: build succeeds, boot succeeds, only the
# first real request 500s.
COPY contracts /repo/contracts

EXPOSE 5180
CMD ["node", "--import", "./dist/server/tracing.js", "dist/server/server.js"]
