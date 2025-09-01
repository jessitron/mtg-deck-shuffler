#!/bin/bash
set -e

# Configuration - EDIT THESE VALUES
AWS_REGION="us-west-2"  # Change to your region
ECR_REPO="your-account-id.dkr.ecr.us-west-2.amazonaws.com/mtg-deck-shuffler"  # Change to your ECR repo
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

# Test kubectl connection
kubectl cluster-info >/dev/null 2>&1 || { echo "❌ kubectl not connected to cluster"; exit 1; }
echo "✅ Prerequisites check passed"

# Build application
echo ""
echo "🔨 Building application..."
npm run clean
npm run build

# Build and push Docker image
echo ""
echo "🐳 Building Docker image..."
docker build -t mtg-deck-shuffler:${IMAGE_TAG} .
docker tag mtg-deck-shuffler:${IMAGE_TAG} ${FULL_IMAGE_NAME}
docker tag mtg-deck-shuffler:${IMAGE_TAG} ${LATEST_IMAGE_NAME}

echo "📤 Pushing to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO%/*}
docker push ${FULL_IMAGE_NAME}
docker push ${LATEST_IMAGE_NAME}

# Create Kubernetes secret with Honeycomb API key
echo ""
echo "🔑 Creating Kubernetes secret..."
if [ -z "$HONEYCOMB_API_KEY" ]; then
    echo "❌ HONEYCOMB_API_KEY not set in script. Please add your API key."
    exit 1
fi

# Apply Kubernetes manifests
echo ""
echo "☸️  Deploying to Kubernetes..."

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secret (replace placeholder with actual key)
kubectl create secret generic mtg-deck-shuffler-secret \
    --namespace=mtg-deck-shuffler \
    --from-literal=HONEYCOMB_API_KEY="$HONEYCOMB_API_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -

# Apply other manifests
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/pvc.yaml

# Update deployment with new image
sed "s|<your-ecr-repo>/mtg-deck-shuffler:latest|${LATEST_IMAGE_NAME}|g" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml

# Wait for rollout
echo ""
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/mtg-deck-shuffler -n mtg-deck-shuffler --timeout=300s

# Get service URL
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Service status:"
kubectl get pods -n mtg-deck-shuffler
echo ""
kubectl get services -n mtg-deck-shuffler

# Get LoadBalancer URL
LB_URL=$(kubectl get service mtg-deck-shuffler-service -n mtg-deck-shuffler -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending...")
echo ""
echo "🌐 App will be available at: http://${LB_URL}"
echo "   (LoadBalancer may take a few minutes to provision)"

echo ""
echo "🔍 Useful commands:"
echo "   View logs: kubectl logs -f deployment/mtg-deck-shuffler -n mtg-deck-shuffler"
echo "   Scale app: kubectl scale deployment/mtg-deck-shuffler --replicas=2 -n mtg-deck-shuffler"
echo "   Delete app: kubectl delete namespace mtg-deck-shuffler"