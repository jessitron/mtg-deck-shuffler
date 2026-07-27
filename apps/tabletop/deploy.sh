#!/bin/bash
set -e

# Deploy the Tabletop to EKS. Mirrors apps/shuffler/deploy.sh.
AWS_REGION="us-west-2"

# Load local config (ECR_REPO lives here). Source .be first for the key.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ../..)"
if [ -f "$REPO_ROOT/.be" ]; then
    source "$REPO_ROOT/.be"
fi
if [ -f .env ]; then
    source .env
fi

if [ -z "$ECR_REPO" ]; then
    echo "ECR_REPO not set. Add 'export ECR_REPO=<your-ecr-repo>/mtg-tabletop' to .env"
    exit 1
fi

# Fail loudly on a missing tldraw license key. tldraw >= 4 blanks the canvas 5s
# after load on any HTTPS non-loopback host, so deploying without a key ships a
# silently-broken table that looks fine locally. Don't let that happen quietly.
if [ -z "$TLDRAW_LICENSE_KEY" ]; then
    echo "❌ TLDRAW_LICENSE_KEY not set."
    echo "   tldraw >= 4 hides the editor 5s after load on any HTTPS non-loopback"
    echo "   host, so this deploy would serve a BLANK table. (localhost is exempt,"
    echo "   which is why verify.sh can never catch this.)"
    echo ""
    echo "   Add 'export TLDRAW_LICENSE_KEY=...' to the repo-root .be — not to"
    echo "   apps/tabletop/.env, which is committed to a public repo."
    echo "   Free hobby license: https://tldraw.dev/get-a-license/hobby"
    echo ""
    echo "   To deploy anyway, knowing the table will be blank:"
    echo "     TLDRAW_LICENSE_KEY=none ./deploy.sh"
    exit 1
fi
if [ "$TLDRAW_LICENSE_KEY" = "none" ]; then
    echo "⚠️  TLDRAW_LICENSE_KEY=none — deploying a table that will go BLANK 5s after load."
    TLDRAW_LICENSE_KEY=""
fi

IMAGE_TAG="$(git rev-parse --short HEAD)"
FULL_IMAGE_NAME="${ECR_REPO}:${IMAGE_TAG}"
LATEST_IMAGE_NAME="${ECR_REPO}:latest"

echo "🚀 Deploying MTG Tabletop to EKS"
echo "   Image: ${FULL_IMAGE_NAME}"
echo ""

echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl not installed"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI not installed"; exit 1; }
kubectl cluster-info >/dev/null 2>&1 || { echo "❌ kubectl not connected to cluster"; exit 1; }
echo "✅ Prerequisites check passed"

echo ""
echo "🐳 Building Docker image..."
# Build context is the repo root — the npm-workspaces lockfile lives there. See Dockerfile.
# TLDRAW_LICENSE_KEY is baked into the client bundle by vite at build time.
docker build --platform=linux/arm64 \
    --build-arg TLDRAW_LICENSE_KEY="${TLDRAW_LICENSE_KEY}" \
    -t mtg-tabletop:${IMAGE_TAG} -f Dockerfile ../..
docker tag mtg-tabletop:${IMAGE_TAG} ${FULL_IMAGE_NAME}
docker tag mtg-tabletop:${IMAGE_TAG} ${LATEST_IMAGE_NAME}

echo "📤 Pushing to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO%/*}
docker push ${FULL_IMAGE_NAME}
docker push ${LATEST_IMAGE_NAME}

echo ""
echo "☸️  Deploying to Kubernetes..."
# Uses the existing mtg-deck-shuffler-secret (HONEYCOMB_API_KEY) — no new secret.
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/collector.yaml
sed "s|<your-ecr-repo>/mtg-tabletop:latest|${FULL_IMAGE_NAME}|g" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

echo ""
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/mtg-tabletop --timeout=300s
kubectl rollout status deployment/mtg-tabletop-collector --timeout=300s

echo ""
echo "🎉 Deployment complete!"
kubectl get pods -l app=mtg-tabletop
kubectl get pods -l app=mtg-tabletop-collector
echo ""
echo "🌐 App: https://table.jessitron.honeydemo.io (DNS/ALB may take a few minutes)"

# The one check that can catch the tldraw license gate: it only fires on an
# HTTPS non-loopback host, so no local test can see it. Non-fatal — the deploy
# already happened — but loud, because the symptom is a silent blank page.
echo ""
echo "🎨 Checking the deployed canvas survives the tldraw license gate..."
if ! node test/verification/check-deployed-canvas.mjs https://table.jessitron.honeydemo.io; then
    echo "⚠️  Deploy succeeded but the table renders BLANK. See above."
fi

echo ""
echo "🏷️  Creating git tag..."
DEPLOY_TAG="deploy-tabletop-$(date +%Y%m%d-%H%M%S)"
git tag "$DEPLOY_TAG"
echo "   Tagged as: $DEPLOY_TAG"
