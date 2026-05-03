/**
 * Firebase Admin bootstrap for server-side / CLI scripts only.
 *
 * Credentials:
 *   • admin/serviceAccountKey.json → service account JSON (preferred for scripts)
 *   • Otherwise Application Default Credentials (ADC), e.g. after:
 *        gcloud auth application-default login
 *        gcloud auth application-default set-quota-project roudi-monitor-app
 *
 * ADC needs a quota project for Identity Toolkit / Firebase Auth. We set
 * GOOGLE_CLOUD_QUOTA_PROJECT when using ADC (see below).
 *
 * Never commit serviceAccountKey.json. Never import this file from src/ (browser).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Flip to false to print Firebase Admin bootstrap logs on stderr. */
const QUIET = true

const PROJECT_ID = "roudi-monitor-app"
const keyPath = path.join(__dirname, "serviceAccountKey.json")

const useServiceAccountFile = fs.existsSync(keyPath)

if (!useServiceAccountFile) {
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = PROJECT_ID
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
        projectId: PROJECT_ID,
      })
    } catch (err) {
      console.error(
        "No service account file and Application Default Credentials failed.\n\n" +
          `Either:\n` +
          `  • Save a JSON key as ${keyPath}, or\n` +
          "  • Run:\n" +
          "      gcloud auth application-default login\n" +
          "      gcloud auth application-default set-quota-project " +
          PROJECT_ID +
          "\n" +
          "    (same Google account as Firebase / GCP)\n",
      )
      console.error(err)
      process.exit(1)
    }
  }
}

if (!QUIET) {
  if (useServiceAccountFile) {
    const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"))
    console.log(`Firebase Admin OK — project: ${sa.project_id ?? PROJECT_ID} (service account file)`)
  } else {
    console.log(`Firebase Admin OK — project: ${PROJECT_ID} (ADC, quota project: ${PROJECT_ID})`)
  }
}

export default admin
