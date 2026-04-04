import { isFirebaseConfigured } from "@/config/firebase"
import { getFirebaseConfigDeveloperHint, getFirebaseConfigUserMessage } from "@/lib/firebase-config-messages"

export default function FirebaseConfigBanner() {
  if (isFirebaseConfigured) return null

  const isDev = import.meta.env.DEV

  return (
    <div
      role="alert"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <p className="font-semibold">Configuration Firebase incomplète</p>
        <p className="text-amber-900/90 dark:text-amber-100/90">{getFirebaseConfigUserMessage()}</p>
        {isDev ? (
          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90">
            {getFirebaseConfigDeveloperHint()}
          </p>
        ) : null}
      </div>
    </div>
  )
}
