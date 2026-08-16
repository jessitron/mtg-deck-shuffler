# The Spine: plain Ruby (Roda + Sequel + SQLite)
#
# BUILD CONTEXT IS THE REPO ROOT, not services/spine/ — the image needs
# contracts/ (the published language) alongside the app. Build with:
#
#   docker build -f services/spine/Dockerfile <repo-root>   (from the repo root)
#   docker build -f Dockerfile ../..                        (from services/spine)
#
# deploy.sh does the latter, same pattern as the Shuffler.

FROM ruby:3.4.9-slim AS builder
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential libsqlite3-dev git && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT="test" BUNDLE_PATH=/usr/local/bundle
COPY services/spine/Gemfile services/spine/Gemfile.lock ./
RUN bundle install && rm -rf /usr/local/bundle/cache

FROM ruby:3.4.9-slim
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libsqlite3-0 curl && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT="test" BUNDLE_PATH=/usr/local/bundle \
    CONTRACTS_DIR=/contracts \
    RACK_ENV=production \
    PORT=4600

COPY --from=builder /usr/local/bundle /usr/local/bundle

# The published language rides along in the image, pinned at build time.
COPY contracts/ /contracts/

# Explicit COPYs keep dev droppings (spine.db, local .env) out of the image.
COPY services/spine/Gemfile services/spine/Gemfile.lock services/spine/Rakefile services/spine/config.ru ./
COPY services/spine/app.rb ./
COPY services/spine/config/ ./config/
COPY services/spine/models/ ./models/
COPY services/spine/lib/ ./lib/
COPY services/spine/views/ ./views/
COPY services/spine/public/ ./public/

EXPOSE 4600

# config/db.rb creates the SQLite schema (create_table?, idempotent) against
# SPINE_DB_PATH on the mounted PVC the first time it boots against an empty volume.
CMD ["bash", "-c", "bundle exec puma -p ${PORT:-4600}"]
