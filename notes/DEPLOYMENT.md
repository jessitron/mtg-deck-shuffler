# DEPLOYMENT.md

## Overview

Dead-simple deployment to push the MTG deck shuffler app to your existing EKS cluster using the provided files.

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
- **Secret**: Honeycomb API key (created by script)
- **PersistentVolume**: For SQLite database persistence

### Database Strategy
- **Development**: SQLite with PersistentVolume (simple, works for single replica)

## Deployment Files

The following files are provided for deployment:

### 1. `Dockerfile`
Multi-stage Docker build that compiles TypeScript and creates a minimal runtime image.

### 2. `k8s/` Directory
Contains all Kubernetes manifests:
- `namespace.yaml` - Creates the mtg-deck-shuffler namespace
- `configmap.yaml` - Environment variables for the app
- `pvc.yaml` - PersistentVolumeClaim for SQLite database storage
- `deployment.yaml` - Main application deployment with health checks
- `service.yaml` - LoadBalancer service for external access

### 3. `deploy.sh`
Automated deployment script that handles the entire process.

## Usage Instructions

### 1. Initial Setup
```bash
# Create ECR repository (one-time setup)
aws ecr create-repository --repository-name mtg-deck-shuffler --region us-west-2

# The deploy.sh script is already executable
```

### 2. Configure the Script
Edit `deploy.sh` and update these variables at the top:
- `AWS_REGION`: Your AWS region (default: us-west-2)
- `ECR_REPO`: Your ECR repository URL (format: your-account-id.dkr.ecr.region.amazonaws.com/mtg-deck-shuffler)
- `HONEYCOMB_API_KEY`: Your Honeycomb API key

### 3. Deploy
```bash
./deploy.sh
```

The script will:
- Build the TypeScript application
- Create and push Docker image to ECR
- Apply all Kubernetes manifests
- Create the Honeycomb secret
- Wait for deployment to complete
- Show you the LoadBalancer URL

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