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

# No tldraw license key needed: prod serves plain http://, and tldraw's license
# gate only fires on HTTPS non-loopback origins (see README → Licensing and
# k8s/ingress.yaml — the ALB deliberately has no 443 listener). A key in .be is
# still baked into the bundle if present, and chooseLicenseKey withholds it at
# runtime wherever the gate can't fire, so its state can't blank the table.

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

# Credentials first — see scripts/preflight-aws.sh for why this precedes the kubectl check.
source "$REPO_ROOT/scripts/preflight-aws.sh"
check_aws_credentials "$ECR_REPO" || exit 1

kubectl cluster-info >/dev/null 2>&1 || { echo "❌ kubectl not connected to cluster"; exit 1; }
echo "✅ Prerequisites check passed (AWS account ${AWS_ACCOUNT}, cluster $(kubectl config current-context))"

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
echo "🌐 App: http://table.jessitron.honeydemo.io (http on purpose — tldraw license gate; DNS/ALB may take a few minutes)"

# Proves the http exemption from the tldraw license gate actually holds on the
# deployed host — no local test can see the gate (it never fires on loopback).
# Non-fatal — the deploy already happened — but loud, because the symptom is a
# silent blank page.
echo ""
echo "🎨 Checking the deployed canvas survives the tldraw license gate..."
if ! node test/verification/check-deployed-canvas.mjs http://table.jessitron.honeydemo.io; then
    echo "⚠️  Deploy succeeded but the table renders BLANK. See above."
fi

# Marker AFTER a successful rollout, so a graph line means a deploy that actually landed.
# Non-fatal: the deploy is already done, and a missing marker must not report as failure.
# Still posted when the canvas check above warns — the deploy landed; that's what's marked.
echo ""
"$REPO_ROOT/scripts/deploy-marker.sh" tabletop || true

echo ""
echo "🏷️  Creating git tag..."
DEPLOY_TAG="deploy-tabletop-$(date +%Y%m%d-%H%M%S)"
git tag "$DEPLOY_TAG"
echo "   Tagged as: $DEPLOY_TAG"
