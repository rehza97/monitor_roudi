import { IS_VITE_DEV } from "@/config/devMode"
import { missingFirebaseEnvLabels } from "@/config/firebase"

/** Short message for end users (e.g. login form, production). */
export function getFirebaseConfigUserMessage(): string {
  return "La connexion n’est pas disponible pour le moment : l’application n’est pas correctement configurée côté serveur. Contactez l’administrateur ou réessayez plus tard."
}

/** Extra detail for developers running the app locally. */
export function getFirebaseConfigDeveloperHint(): string {
  const missing = missingFirebaseEnvLabels()
  const vars =
    missing.length > 0
      ? `Variables manquantes ou invalides : ${missing.join(", ")}.`
      : "Les identifiants Firebase ne sont pas valides."

  return `${vars} Dans monitor/, éditez src/config/firebase.ts (ou ajoutez firebase.client.json d’après firebase.client.example.json) avec la configuration Web depuis Firebase Console → Paramètres du projet → Vos applications. Puis redémarrez le serveur de développement (npm run dev).`
}

/** Message shown in forms when Firebase env is wrong (banner carries full dev instructions). */
export function getFirebaseConfigFormError(): string {
  if (IS_VITE_DEV) {
    return "Connexion indisponible : la configuration Firebase locale est incomplète. Consultez le bandeau en haut de la page ou src/config/firebase.ts."
  }
  return getFirebaseConfigUserMessage()
}
