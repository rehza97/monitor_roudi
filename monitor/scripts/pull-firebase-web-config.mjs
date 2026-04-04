#!/usr/bin/env node
/**
 * Writes monitor/firebase.client.json from the Firebase Management API.
 * Requires: gcloud auth login (same Google account as Firebase), and
 * x-goog-user-project (set via header using PROJECT_ID below).
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MONITOR_ROOT = path.resolve(__dirname, "..")

const PROJECT_ID = "roudi-monitor-app"
/** From: firebase apps:list WEB --project roudi-monitor-app */
const WEB_APP_ID =
  process.env.FIREBASE_WEB_APP_ID || "1:21109967331:web:a4847dff474ae548f8f8d6"

function main() {
  let token
  try {
    token = execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim()
  } catch {
    console.error("gcloud auth print-access-token failed. Run: gcloud auth login")
    process.exit(1)
  }

  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${encodeURIComponent(WEB_APP_ID)}/config`
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-goog-user-project": PROJECT_ID,
    },
  })
    .then(async (res) => {
      const text = await res.text()
      if (!res.ok) {
        console.error(text)
        process.exit(1)
      }
      const body = JSON.parse(text)
      const out = {
        projectId: body.projectId,
        appId: body.appId,
        storageBucket: body.storageBucket,
        apiKey: body.apiKey,
        authDomain: body.authDomain,
        messagingSenderId: body.messagingSenderId,
      }
      const dest = path.join(MONITOR_ROOT, "firebase.client.json")
      fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, "utf8")
      console.log(`Wrote ${dest}`)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}

main()
