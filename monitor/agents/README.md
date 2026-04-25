# Roudi VPS Monitoring Agent

This agent runs on the VPS and pushes real host metrics into Firebase through
the `ingestDeploymentMetrics` Cloud Function. Do not expose SSH credentials in
the browser; keep the collector token only on the VPS.

## Required environment

```bash
export ROUDI_INGEST_URL="https://REGION-PROJECT.cloudfunctions.net/ingestDeploymentMetrics"
export ROUDI_INGEST_TOKEN="replace-with-secret-token"
export ROUDI_DEPLOYMENT_ID="firestore-deployment-document-id"
export ROUDI_AGENT_INTERVAL_SECONDS="30"
```

## Run once

```bash
node agents/vps-monitor-collector.mjs --once
```

## Run continuously

```bash
node agents/vps-monitor-collector.mjs
```

The payload includes CPU, RAM, disk usage, load average, uptime, hostname, and
current running projects detected from Docker and PM2 when those tools exist on
the server.
