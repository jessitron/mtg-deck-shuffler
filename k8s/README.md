# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the MTG Deck Shuffler application.

## Files

- `configmap.yaml` - Environment variables for the application
- `deployment.yaml` - Main application deployment with health checks
- `service.yaml` - Service for external access
- `pvc.yaml` - PersistentVolumeClaim for SQLite database storage
- `ingress.yaml` - Ingress configuration for load balancing

## Initial Setup

### 1. Create the Honeycomb API Key Secret

**This is a one-time setup step.** The application requires a Kubernetes secret containing your Honeycomb API key:

```bash
kubectl create secret generic mtg-deck-shuffler-secret \
    --from-literal=HONEYCOMB_API_KEY="your-honeycomb-api-key-here"
```

### 2. Deploy the Application

Use the `../deploy.sh` script for automated deployment, or apply manifests manually:

```bash
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

## Updating the Honeycomb API Key

To update the API key in an existing deployment:

```bash
# Delete the existing secret
kubectl delete secret mtg-deck-shuffler-secret

# Create a new secret with the updated key
kubectl create secret generic mtg-deck-shuffler-secret \
    --from-literal=HONEYCOMB_API_KEY="your-new-api-key-here"

# Restart the deployment to pick up the new secret
kubectl rollout restart deployment/mtg-deck-shuffler
```

## Useful Commands

```bash
# View application logs
kubectl logs -f deployment/mtg-deck-shuffler

# Check pod status
kubectl get pods -l app=mtg-deck-shuffler

# Scale the application
kubectl scale deployment/mtg-deck-shuffler --replicas=2

# Check ingress status
kubectl get ingress mtg-deck-shuffler-ingress

# Delete everything
kubectl delete deployment,service,configmap,secret,pvc,ingress -l app=mtg-deck-shuffler
```

## Notes

- The application uses SQLite with a PersistentVolume for data storage
- Only single replica is supported due to SQLite file locking
- The secret must be created before deploying the application
- The deployment references `<your-ecr-repo>/mtg-deck-shuffler:latest` - update this in deployment.yaml or use the deploy.sh script