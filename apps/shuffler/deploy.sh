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

# Check AWS credentials BEFORE building anything. An expired SSO token used to
# surface at the ECR push -- after a clean, a tsc build, and a full Docker build,
# several minutes in, as the cryptic "password is empty". This fails in under a second.
#
# This runs BEFORE the kubectl check on purpose: EKS auth goes through the aws CLI,
# so an expired token ALSO makes `kubectl cluster-info` fail, with the misleading
# "not connected to cluster". Diagnose the real cause first.
if ! AWS_ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null)"; then
    echo "❌ AWS credentials aren't valid${AWS_PROFILE:+ for profile '$AWS_PROFILE'}."
    echo "   Your SSO token has almost certainly expired."
    echo ""
    echo "   Refresh it (this opens a browser, so run it yourself):"
    echo "       aws sso login${AWS_PROFILE:+ --profile $AWS_PROFILE}"
    echo ""
    echo "   Then run ./deploy.sh again. Nothing has been built or deployed."
    exit 1
fi

# The ECR repo is account-qualified, so a valid login to the WRONG account would
# otherwise fail much later with an opaque permissions error on push.
ECR_ACCOUNT="${ECR_REPO%%.*}"
if [ "$AWS_ACCOUNT" != "$ECR_ACCOUNT" ]; then
    echo "❌ Logged into the wrong AWS account."
    echo "   You are:      ${AWS_ACCOUNT}${AWS_PROFILE:+ (profile '$AWS_PROFILE')}"
    echo "   ECR wants:    ${ECR_ACCOUNT}  (from ECR_REPO in .env)"
    echo ""
    echo "   Switch profiles with AWS_PROFILE=<profile> ./deploy.sh, or fix ECR_REPO in .env."
    echo "   Nothing has been built or deployed."
    exit 1
fi

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