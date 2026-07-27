#!/bin/bash
set -e

echo "🧹 Cleaning up MTG Deck Shuffler deployment from cluster..."
echo ""
echo "Current cluster context: $(kubectl config current-context)"
echo ""

# Show what will be deleted
echo "Resources to be deleted:"
kubectl get all,configmap,secret,pvc,ingress -l app=mtg-deck-shuffler 2>/dev/null || echo "No resources found"
echo ""

read -p "⚠️  Delete these resources? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🗑️  Deleting resources..."
kubectl delete deployment,service,configmap,secret,pvc,ingress -l app=mtg-deck-shuffler

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Verify deletion:"
kubectl get all,configmap,secret,pvc,ingress -l app=mtg-deck-shuffler 2>/dev/null || echo "No resources found (expected)"
