# DEPLOYMENT.md

## Overview

Dead-simple deployment script to push the MTG deck shuffler app to your existing EKS cluster.

## Prerequisites

- EKS cluster is running and `kubectl` is configured to connect to it
- Docker installed locally
- AWS CLI configured (for ECR access)
- `kubectl` installed and configured

## Architecture Summary

**Current App Structure:**
- Node.js 22+ Express server (TypeScript → JavaScript)
- SQLite database for game state persistence (creates `data.db` file)
- Static files served from `public/` directory
- OpenTelemetry configured for Honeycomb observability
- Runs on port 3000 (configurable via `PORT` env var)

## Deployment Strategy

### Container Strategy
- **Build**: Multi-stage Docker build (TypeScript compilation → runtime image)
- **Registry**: AWS ECR (assumes you have ECR repo access)
- **Base Image**: Node 22-alpine for minimal size

### Kubernetes Resources
- **Deployment**: Single replica (can scale later)
- **Service**: ClusterIP with LoadBalancer for external access
- **ConfigMap**: Environment variables
- **Secret**: Honeycomb API key
- **PersistentVolume**: For SQLite database persistence

### Database Strategy
- **Development**: SQLite with PersistentVolume (simple, works for single replica)
- **Future**: Easy migration to external database by changing env var `PORT_PERSIST_STATE=in-memory` and adding DB service

## Files to Create

### 1. `Dockerfile`
```dockerfile
# Multi-stage build for efficiency
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --silent

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "-r", "./dist/tracing.js", "dist/server.js"]
```

### 2. `k8s/namespace.yaml`
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mtg-deck-shuffler
```

### 3. `k8s/configmap.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mtg-deck-shuffler-config
  namespace: mtg-deck-shuffler
data:
  PORT: "3000"
  OTEL_SERVICE_NAME: "mtg-deck-shuffler"
  OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf"
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://api.honeycomb.io:443"
  OTEL_METRICS_EXPORTER: "none"
  OTEL_LOG_LEVEL: "info"
```

### 4. `k8s/secret.yaml`
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mtg-deck-shuffler-secret
  namespace: mtg-deck-shuffler
type: Opaque
data:
  HONEYCOMB_API_KEY: <base64-encoded-api-key>
  # Get your key and encode it: echo -n "your-api-key" | base64
```

### 5. `k8s/pvc.yaml`
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mtg-deck-shuffler-data
  namespace: mtg-deck-shuffler
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: gp2  # AWS EBS default
```

### 6. `k8s/deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mtg-deck-shuffler
  namespace: mtg-deck-shuffler
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mtg-deck-shuffler
  template:
    metadata:
      labels:
        app: mtg-deck-shuffler
    spec:
      containers:
      - name: mtg-deck-shuffler
        image: <your-ecr-repo>/mtg-deck-shuffler:latest
        ports:
        - containerPort: 3000
        env:
        - name: OTEL_EXPORTER_OTLP_HEADERS
          value: "x-honeycomb-team=$(HONEYCOMB_API_KEY)"
        envFrom:
        - configMapRef:
            name: mtg-deck-shuffler-config
        - secretRef:
            name: mtg-deck-shuffler-secret
        volumeMounts:
        - name: data-volume
          mountPath: /app
          subPath: data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: mtg-deck-shuffler-data
```

### 7. `k8s/service.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mtg-deck-shuffler-service
  namespace: mtg-deck-shuffler
spec:
  selector:
    app: mtg-deck-shuffler
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer  # Creates AWS ELB
```

## Deployment Script: `deploy.sh`

```bash
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
```

## Usage Instructions

### 1. Initial Setup
```bash
# Create ECR repository (one-time setup)
aws ecr create-repository --repository-name mtg-deck-shuffler --region us-west-2

# Make deploy script executable
chmod +x deploy.sh
```

### 2. Configure the Script
Edit `deploy.sh` and update:
- `AWS_REGION`: Your AWS region
- `ECR_REPO`: Your ECR repository URL
- `HONEYCOMB_API_KEY`: Your Honeycomb API key

### 3. Deploy
```bash
./deploy.sh
```

### 4. Access the App
The script will output the LoadBalancer URL. It may take 5-10 minutes for AWS to provision the LoadBalancer.

## Scaling & Operations

### Scale the application
```bash
kubectl scale deployment/mtg-deck-shuffler --replicas=3 -n mtg-deck-shuffler
```

### View logs
```bash
kubectl logs -f deployment/mtg-deck-shuffler -n mtg-deck-shuffler
```

### Update the app
```bash
# Just run the deploy script again
./deploy.sh
```

### Delete everything
```bash
kubectl delete namespace mtg-deck-shuffler
```

## Database Considerations

**Current Setup**: SQLite with PersistentVolume
- ✅ Simple setup, works immediately
- ✅ Data persists across pod restarts
- ⚠️ Limited to single replica (SQLite file locking)

**Future Migration**: To support multiple replicas, consider:
- RDS PostgreSQL/MySQL
- DynamoDB
- Redis for session data

Change `PORT_PERSIST_STATE=in-memory` and add database connection configuration.

## Security Notes

- LoadBalancer creates public endpoint - consider adding ingress controller with SSL
- Secrets are base64 encoded (not encrypted) - consider AWS Secrets Manager integration
- Database is file-based - consider encryption at rest for sensitive data

## Cost Optimization

- **Development**: Use `t3.small` nodes, single replica
- **Production**: Use spot instances, horizontal pod autoscaler
- **Storage**: 1GB PVC should be sufficient for game state data