#!/bin/bash

# Put the Trainer Agent bearer token into the prod Kubernetes secret.
#
# Prod talks to the REAL Trainer front door (k8s/configmap.yaml sets the URL); this
# script supplies the matching bearer token as TRAINER_AGENT_TOKEN inside the
# existing `mtg-deck-shuffler-secret`. The token is fetched fresh from the
# trainer-agent sandbox Secrets Manager and merged into the secret (preserving
# HONEYCOMB_API_KEY) — it is never printed, never written to a tracked file.
#
# Re-run after the front-door bearer is rotated, then restart the deployment:
#   kubectl rollout restart deployment/mtg-deck-shuffler

set -euo pipefail

SECRET_NAME="mtg-deck-shuffler-secret"
SM_SECRET_ID="trainer-agent/frontdoor-bearer"
AWS_PROFILE_NAME="sandbox"
AWS_REGION_NAME="us-west-2"

command -v aws >/dev/null     || { echo "aws CLI not installed"; exit 1; }
command -v kubectl >/dev/null || { echo "kubectl not installed"; exit 1; }
kubectl cluster-info >/dev/null 2>&1 || { echo "kubectl not connected to a cluster"; exit 1; }

echo "Cluster context: $(kubectl config current-context)"
echo "Secret keys before:"
kubectl get secret "$SECRET_NAME" -o go-template='{{range $k,$v := .data}}  - {{$k}}{{"\n"}}{{end}}'

echo "Fetching bearer token from Secrets Manager ($SM_SECRET_ID)..."
TOKEN=$(aws secretsmanager get-secret-value \
  --profile "$AWS_PROFILE_NAME" --region "$AWS_REGION_NAME" \
  --secret-id "$SM_SECRET_ID" --query SecretString --output text)

# Merge via a temp patch file so the token never lands in argv or shell history.
PATCH_FILE=$(mktemp)
trap 'rm -f "$PATCH_FILE"' EXIT
printf '{"stringData":{"TRAINER_AGENT_TOKEN":"%s"}}' "$TOKEN" > "$PATCH_FILE"
kubectl patch secret "$SECRET_NAME" --type merge --patch-file "$PATCH_FILE"

echo "Secret keys after:"
kubectl get secret "$SECRET_NAME" -o go-template='{{range $k,$v := .data}}  - {{$k}}{{"\n"}}{{end}}'

echo "Done. Restart to pick it up:  kubectl rollout restart deployment/mtg-deck-shuffler"
