# Technova VPS Monitoring Agent

Configure **`CONFIG`** at the top of `vps-monitor-collector.mjs` (`ingestUrl`, `ingestToken`, `deploymentId`). The ingest HTTP handler uses the same hardcoded MVP token as `monitor/functions/index.js` (`MVP_INGEST_TOKEN`).

```bash
node agents/vps-monitor-collector.mjs --once
```
