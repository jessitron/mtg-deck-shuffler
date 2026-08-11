#!/bin/bash
set -e

# Deploy the Spine to EKS. Modeled on apps/shuffler/deploy.sh: build for
# arm64, push to ECR, apply k8s manifests, wait for rollout.
# Reuses the shared mtg-deck-shuffler-secret for HONEYCOMB_API_KEY.

AWS_REGION="${AWS_REGION:-us-west-2}"

cd "$(dirname "$0")"

# .be before .env, the fleet's standing rule (root CLAUDE.md → Observability).
# .be holds ECR_REPO/AWS_PROFILE and HONEYCOMB_MARKER_KEY (for the deploy
# marker below); this ship has no .env needed at deploy time.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ../..)"
if [ -f "$REPO_ROOT/.be" ]; then
    source "$REPO_ROOT/.be"
fi

if [ -z "$ECR_REPO" ]; then
    echo "ECR_REPO not set. Export it (the Shuffler's repo URL; the registry half is reused) in .be"
    exit 1
fi

# Same registry as the Shuffler, its own repository: <registry>/spine
ECR_REGISTRY="${ECR_REPO%/*}"
SPINE_REPO="${ECR_REGISTRY}/spine"

IMAGE_TAG="$(git rev-parse --short HEAD)"
FULL_IMAGE_NAME="${SPINE_REPO}:${IMAGE_TAG}"
LATEST_IMAGE_NAME="${SPINE_REPO}:latest"

echo "🚀 Deploying the Spine to EKS"
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
echo "📦 Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names spine --region "${AWS_REGION}" >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name spine --region "${AWS_REGION}" >/dev/null

echo ""
echo "🐳 Building Docker image..."
# Build context is the repo root — the image needs contracts/. See Dockerfile.
docker build --platform=linux/arm64 -t spine:${IMAGE_TAG} -f Dockerfile ../..
docker tag spine:${IMAGE_TAG} ${FULL_IMAGE_NAME}
docker tag spine:${IMAGE_TAG} ${LATEST_IMAGE_NAME}

echo "📤 Pushing to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
docker push ${FULL_IMAGE_NAME}
docker push ${LATEST_IMAGE_NAME}

echo ""
echo "☸️  Deploying to Kubernetes..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/pvc.yaml
sed "s|<your-ecr-repo>/spine:latest|${FULL_IMAGE_NAME}|g" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

echo ""
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/spine --timeout=300s

echo ""
echo "🎉 Deployment complete!"
kubectl get pods -l app=spine
echo ""
echo "🌐 Admin screen: https://mtg.jessitron.honeydemo.io/spine/admin/tables"

# Marker AFTER a successful rollout, so a graph line means a deploy that actually landed.
# Non-fatal: the deploy is already done, and a missing marker must not report as failure.
echo ""
"$REPO_ROOT/scripts/deploy-marker.sh" spine || true

echo ""
echo "🏷️  Creating git tag..."
DEPLOY_TAG="deploy-spine-$(date +%Y%m%d-%H%M%S)"
git tag "$DEPLOY_TAG"
echo "   Tagged as: $DEPLOY_TAG"

echo ""
echo "🔍 Useful commands:"
echo "   View logs: kubectl logs -f deployment/spine"
echo "   Check ingress: kubectl get ingress spine-ingress"
echo "   Delete app: kubectl delete deployment,service,configmap,pvc,ingress -l app=spine"
