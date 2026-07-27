# The Spine: Ruby on Rails + SQLite.
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
    build-essential libyaml-dev libsqlite3-dev git && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /rails
ENV BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT="development test" BUNDLE_PATH=/usr/local/bundle
COPY services/spine/Gemfile services/spine/Gemfile.lock ./
RUN bundle install && rm -rf /usr/local/bundle/cache

FROM ruby:3.4.9-slim
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libsqlite3-0 libyaml-0-2 curl && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /rails
ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT="development test" BUNDLE_PATH=/usr/local/bundle \
    CONTRACTS_DIR=/contracts \
    PORT=4600

COPY --from=builder /usr/local/bundle /usr/local/bundle

# The published language rides along in the image, pinned at build time.
COPY contracts/ /contracts/

# Explicit COPYs keep dev droppings (storage/, log/, tmp/, local .env) out.
COPY services/spine/Gemfile services/spine/Gemfile.lock services/spine/Rakefile services/spine/config.ru ./
COPY services/spine/bin/ ./bin/
COPY services/spine/config/ ./config/
COPY services/spine/app/ ./app/
COPY services/spine/db/ ./db/
COPY services/spine/lib/ ./lib/
COPY services/spine/public/ ./public/
RUN mkdir -p log tmp storage

# Propshaft needs digested assets + a manifest in production, or the admin
# screen's stylesheet_link_tag raises.
RUN bin/rails assets:precompile

EXPOSE 4600

# db:prepare creates/migrates the SQLite db on the PVC (SQLITE_DB_PATH) at boot.
CMD ["bash", "-c", "bin/rails db:prepare && exec bin/rails server -b 0.0.0.0 -p ${PORT:-4600}"]
