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

  return `${vars} Dans le dossier monitor/, créez un fichier .env (voir .env.example) ou copiez firebase.client.example.json vers firebase.client.json avec la configuration Web copiée depuis Firebase Console → Paramètres du projet → Vos applications. Puis redémarrez le serveur de développement (npm run dev).`
}

/** Message shown in forms when Firebase env is wrong (banner carries full dev instructions). */
export function getFirebaseConfigFormError(): string {
  if (import.meta.env.DEV) {
    return "Connexion indisponible : la configuration Firebase locale est incomplète. Consultez le bandeau en haut de la page ou monitor/.env.example."
  }
  return getFirebaseConfigUserMessage()
}
