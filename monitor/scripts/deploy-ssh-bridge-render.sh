#!/usr/bin/env bash
# Create the roudi-ssh-bridge web service on Render via API.
# Usage: RENDER_API_KEY=rnd_... ./scripts/deploy-ssh-bridge-render.sh
set -euo pipefail

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "Set RENDER_API_KEY (https://dashboard.render.com/u/*/settings#api-keys)" >&2
  exit 1
fi

OWNER_ID="${RENDER_OWNER_ID:-}"
if [[ -z "$OWNER_ID" ]]; then
  echo "Fetching Render owner ID..."
  OWNER_ID="$(curl -sS -H "Authorization: Bearer $RENDER_API_KEY" \
    https://api.render.com/v1/owners | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['owner']['id'] if d else '')")"
fi
if [[ -z "$OWNER_ID" ]]; then
  echo "Could not resolve RENDER_OWNER_ID" >&2
  exit 1
fi

echo "Creating service roudi-ssh-bridge for owner $OWNER_ID..."

RESP="$(curl -sS -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"roudi-ssh-bridge\",
    \"ownerId\": \"$OWNER_ID\",
    \"repo\": \"https://github.com/rehza97/monitor_roudi\",
    \"branch\": \"main\",
    \"rootDir\": \"monitor\",
    \"runtime\": \"node\",
    \"plan\": \"free\",
    \"region\": \"frankfurt\",
    \"autoDeploy\": \"yes\",
    \"buildCommand\": \"npm install\",
    \"startCommand\": \"npm run ssh-bridge\",
    \"healthCheckPath\": \"/health\"
  }")"

echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"

SERVICE_URL="$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('service',{}).get('serviceDetails',{}).get('url','') or d.get('service',{}).get('url',''))" 2>/dev/null || true)"

if [[ -n "$SERVICE_URL" ]]; then
  echo ""
  echo "Service URL: $SERVICE_URL"
  echo "Set in production build: VITE_REMOTE_SSH_WEBSOCKET_URL=wss://${SERVICE_URL#https://}"
  echo "Health check: ${SERVICE_URL}/health"
else
  echo "If the service already exists, open https://dashboard.render.com and deploy roudi-ssh-bridge"
  echo "Or use Blueprint: https://render.com/deploy?repo=https://github.com/rehza97/monitor_roudi"
fi
