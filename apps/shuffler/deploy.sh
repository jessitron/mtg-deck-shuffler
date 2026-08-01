#!/bin/bash
set -e

# Configuration - EDIT THESE VALUES
AWS_REGION="us-west-2"  # Change to your region

# Load local config (ECR_REPO lives here, alongside the app's OTEL settings)
if [ -f .env ]; then
    source .env
fi

if [ -z "$ECR_REPO" ]; then
    echo "ECR_REPO not set. Add 'export ECR_REPO=<your-ecr-repo>/mtg-deck-shuffler' to .env"
    exit 1
fi
HONEYCOMB_API_KEY=""  # Add your Honeycomb API key here

# Derived values
IMAGE_TAG="$(git rev-parse --short HEAD)"
FULL_IMAGE_NAME="${ECR_REPO}:${IMAGE_TAG}"
LATEST_IMAGE_NAME="${ECR_REPO}:latest"

echo "🚀 Deploying MTG Deck Shuffler to EKS"
echo "   Image: ${FULL_IMAGE_NAME}"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl not installed"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI not installed"; exit 1; }

# Credentials first — see scripts/preflight-aws.sh for why this precedes the kubectl check.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ../..)"
source "$REPO_ROOT/scripts/preflight-aws.sh"
check_aws_credentials "$ECR_REPO" || exit 1

# Test kubectl connection
kubectl cluster-info >/dev/null 2>&1 || { echo "❌ kubectl not connected to cluster"; exit 1; }

echo "✅ Prerequisites check passed (AWS account ${AWS_ACCOUNT}, cluster $(kubectl config current-context))"

# Build application
echo ""
echo "🔨 Building application..."
npm run clean
npm run build

# Build and push Docker image
echo ""
echo "🐳 Building Docker image..."
# Build context is the repo root — the npm-workspaces lockfile lives there. See Dockerfile.
docker build --platform=linux/arm64 -t mtg-deck-shuffler:${IMAGE_TAG} -f Dockerfile ../..
docker tag mtg-deck-shuffler:${IMAGE_TAG} ${FULL_IMAGE_NAME}
docker tag mtg-deck-shuffler:${IMAGE_TAG} ${LATEST_IMAGE_NAME}

echo "📤 Pushing to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO%/*}
echo "   Pushing ${FULL_IMAGE_NAME}..."
docker push ${FULL_IMAGE_NAME}
docker push ${LATEST_IMAGE_NAME}



# Apply Kubernetes manifests
echo ""
echo "☸️  Deploying to Kubernetes..."

# Create Kubernetes secret with Honeycomb API key
# once is enough
# echo ""
# echo "🔑 Creating Kubernetes secret..."
# if [ -z "$HONEYCOMB_API_KEY" ]; then
#     echo "❌ HONEYCOMB_API_KEY not set in script. Please add your API key."
#     exit 1
# fi
# kubectl create secret generic mtg-deck-shuffler-secret \
#     --from-literal=HONEYCOMB_API_KEY="$HONEYCOMB_API_KEY"

# Apply other manifests
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/pvc.yaml

# Update deployment with new image
sed "s|<your-ecr-repo>/mtg-deck-shuffler:latest|${FULL_IMAGE_NAME}|g" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for rollout
echo ""
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/mtg-deck-shuffler --timeout=300s

# Get service URL
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Service status:"
kubectl get pods -l app=mtg-deck-shuffler
echo ""
kubectl get services mtg-deck-shuffler-service

# Get ALB URL from Ingress
ALB_URL=$(kubectl get ingress mtg-deck-shuffler-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending...")
echo ""
echo "🌐 App will be available at: http://${ALB_URL}"
echo "   (ALB may take a few minutes to provision and configure)"

echo ""
echo "🏷️  Creating git tag..."
DEPLOY_TAG="deploy-$(date +%Y%m%d-%H%M%S)"
git tag "$DEPLOY_TAG"
echo "   Tagged as: $DEPLOY_TAG"

echo ""
echo "🔍 Useful commands:"
echo "   View logs: kubectl logs -f deployment/mtg-deck-shuffler"
echo "   Scale app: kubectl scale deployment/mtg-deck-shuffler --replicas=2"
echo "   Check ingress: kubectl get ingress mtg-deck-shuffler-ingress"
echo "   Delete app: kubectl delete deployment,service,configmap,secret,pvc,ingress -l app=mtg-deck-shuffler"