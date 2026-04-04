/**
 * Firebase Admin bootstrap for server-side / CLI scripts only.
 *
 * Credentials (first match wins):
 *   1. FIREBASE_SERVICE_ACCOUNT_PATH or admin/serviceAccountKey.json → service account JSON
 *   2. Otherwise Application Default Credentials (ADC), e.g. after:
 *        gcloud auth application-default login
 *        gcloud auth application-default set-quota-project roudi-monitor-app
 *
 * ADC needs a quota project for Identity Toolkit / Firebase Auth. We set
 * GOOGLE_CLOUD_QUOTA_PROJECT automatically when using ADC (see resolveProjectId()).
 *
 * If you still get 403 on Auth, add your user to the GCP project with a role that
 * includes serviceusage.services.use (e.g. Editor), or use a service account JSON key.
 *
 * Never commit serviceAccountKey.json. Never import this file from src/ (browser).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_PROJECT_ID = "roudi-monitor-app"

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.join(__dirname, "serviceAccountKey.json")

function resolveProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    DEFAULT_PROJECT_ID
  )
}

const useServiceAccountFile = fs.existsSync(keyPath)

if (!useServiceAccountFile && !process.env.GOOGLE_CLOUD_QUOTA_PROJECT) {
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = resolveProjectId()
}

const admin = (await import("firebase-admin")).default

if (admin.apps.length === 0) {
  if (useServiceAccountFile) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"))
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: resolveProjectId(),
      })
    } catch (err) {
      console.error(
        "No service account file and Application Default Credentials failed.\n\n" +
          "Either:\n" +
          `  • Save a JSON key as ${keyPath} (or set FIREBASE_SERVICE_ACCOUNT_PATH), or\n` +
          "  • Run:\n" +
          "      gcloud auth application-default login\n" +
          "      gcloud auth application-default set-quota-project " +
          resolveProjectId() +
          "\n" +
          "    (same Google account as Firebase / GCP)\n",
      )
      console.error(err)
      process.exit(1)
    }
  }
}

if (process.env.FIREBASE_ADMIN_QUIET !== "1") {
  if (useServiceAccountFile) {
    const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"))
    console.log(`Firebase Admin OK — project: ${sa.project_id ?? resolveProjectId()} (service account file)`)
  } else {
    console.log(
      `Firebase Admin OK — project: ${resolveProjectId()} (ADC, quota project: ${process.env.GOOGLE_CLOUD_QUOTA_PROJECT})`,
    )
  }
}

export default admin
