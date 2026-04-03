export interface AppFeature {
  icon: string
  iconBg: string
  iconColor: string
  title: string
  desc: string
}

export interface AppHardware {
  icon: string
  name: string
  detail: string
}

export interface AppData {
  slug: string
  name: string
  version: string
  category: string
  categoryColor: string
  icon: string
  iconBg: string
  iconColor: string
  heroBg: string
  tagline: string
  description: string[]
  features: AppFeature[]
  hardware: AppHardware[]
  price: string
  license: string
  updated: string
  size: string
  uptime: string
  users: string
  gallery: string[]
}

/*
 * MOCK product catalog (commented out). Restore by uncommenting this block and removing the empty `appsData` export below.
export const appsData: Record<string, AppData> = {
  "ecotrack-pro": {
    slug:          "ecotrack-pro",
    name:          "EcoTrack Pro",
    version:       "v2.0",
    category:      "Écologie",
    categoryColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    icon:          "eco",
    iconBg:        "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor:     "text-emerald-600 dark:text-emerald-400",
    heroBg:        "from-emerald-900 to-slate-900",
    tagline:       "Suivi écologique complet pour entreprises responsables.",
    description: [
      "EcoTrack Pro est une solution SaaS dédiée au suivi de l'empreinte carbone et à la gestion environnementale des entreprises. Elle centralise toutes vos données ESG en un seul tableau de bord.",
      "Grâce à des intégrations directes avec vos systèmes existants (ERP, IoT, capteurs), EcoTrack Pro automatise la collecte de données et génère vos rapports réglementaires (CSRD, Bilan Carbone) en quelques clics.",
    ],
    features: [
      { icon: "eco",              iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600", title: "Bilan Carbone Auto",    desc: "Calcul automatique de vos émissions Scope 1, 2 et 3 selon les référentiels GHG Protocol." },
      { icon: "monitoring",       iconBg: "bg-blue-100 dark:bg-blue-900/30",       iconColor: "text-blue-600",    title: "Tableau de bord ESG",   desc: "Vue consolidée de tous vos indicateurs environnementaux, sociaux et de gouvernance." },
      { icon: "description",      iconBg: "bg-amber-100 dark:bg-amber-900/30",     iconColor: "text-amber-600",   title: "Rapports CSRD",         desc: "Génération automatique des rapports conformes à la directive européenne CSRD." },
      { icon: "notifications_active", iconBg: "bg-rose-100 dark:bg-rose-900/30",   iconColor: "text-rose-600",    title: "Alertes de seuil",      desc: "Notifications en temps réel dès qu'un indicateur dépasse les objectifs fixés." },
    ],
    hardware: [
      { icon: "sensors",        name: "Capteurs CO₂",       detail: "Protocole MQTT/LoRa" },
      { icon: "energy_savings_leaf", name: "Compteurs énergie", detail: "Modbus / M-Bus"   },
      { icon: "cloud_upload",   name: "API ERP",             detail: "REST / Webhook"       },
    ],
    price:    "à partir de 299 DA/mois",
    license:  "SaaS Pro",
    updated:  "15 Jan 2025",
    size:     "38.5 MB",
    uptime:   "99.8%",
    users:    "+350 entreprises",
    gallery:  [],
  },

  "devmonitor-x": {
    slug:          "devmonitor-x",
    name:          "DevMonitor X",
    version:       "v1.5",
    category:      "DevOps",
    categoryColor: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    icon:          "monitoring",
    iconBg:        "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor:     "text-indigo-600 dark:text-indigo-400",
    heroBg:        "from-indigo-900 to-slate-900",
    tagline:       "Monitoring de serveurs en temps réel avec alertes instantanées.",
    description: [
      "DevMonitor X est la plateforme de monitoring tout-en-un pour équipes DevOps. Surveillez l'ensemble de votre infrastructure — serveurs, containers, bases de données, APIs — depuis une interface unifiée.",
      "Avec ses intégrations natives (Kubernetes, Docker, AWS, GCP) et ses alertes intelligentes basées sur le machine learning, DevMonitor X réduit le MTTR de 40% en moyenne.",
    ],
    features: [
      { icon: "speed",         iconBg: "bg-indigo-100 dark:bg-indigo-900/30",  iconColor: "text-indigo-600",  title: "Métriques temps réel", desc: "CPU, RAM, réseau, disque — collecte toutes les 10 secondes avec rétention 13 mois." },
      { icon: "bug_report",    iconBg: "bg-rose-100 dark:bg-rose-900/30",      iconColor: "text-rose-600",    title: "APM intégré",          desc: "Traces distribuées et profiling applicatif pour identifier les goulets d'étranglement." },
      { icon: "warning",       iconBg: "bg-amber-100 dark:bg-amber-900/30",    iconColor: "text-amber-600",   title: "Alertes intelligentes",desc: "Détection d'anomalies par ML — moins de faux positifs, plus de réactivité." },
      { icon: "integration_instructions", iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600", title: "200+ intégrations", desc: "Slack, PagerDuty, Jira, GitHub Actions, Kubernetes, Prometheus et bien plus." },
    ],
    hardware: [
      { icon: "dns",           name: "Serveurs Linux/Windows", detail: "Agent léger 12 MB"     },
      { icon: "deployed_code", name: "Containers Docker/K8s",  detail: "DaemonSet officiel"    },
      { icon: "cloud",         name: "AWS / GCP / Azure",       detail: "Intégration native"    },
    ],
    price:    "à partir de 49 DA/mois",
    license:  "Team / Enterprise",
    updated:  "02 Mar 2025",
    size:     "52.1 MB",
    uptime:   "99.95%",
    users:    "+1 200 équipes",
    gallery:  [],
  },

  "dataviz-suite": {
    slug:          "dataviz-suite",
    name:          "DataViz Suite",
    version:       "v1.2",
    category:      "Analytics",
    categoryColor: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    icon:          "bar_chart_4_bars",
    iconBg:        "bg-blue-100 dark:bg-blue-900/30",
    iconColor:     "text-blue-600 dark:text-blue-400",
    heroBg:        "from-blue-900 to-slate-900",
    tagline:       "Transformez vos données brutes en insights décisionnels visuels.",
    description: [
      "DataViz Suite est un outil de BI et de visualisation de données conçu pour les équipes data. Connectez vos sources de données en quelques clics et construisez des tableaux de bord interactifs sans écrire de code.",
      "Avec plus de 50 types de graphiques, des filtres dynamiques et un moteur de requêtes SQL intégré, DataViz Suite répond aux besoins des data analysts comme des décideurs métier.",
    ],
    features: [
      { icon: "bar_chart",     iconBg: "bg-blue-100 dark:bg-blue-900/30",      iconColor: "text-blue-600",   title: "50+ types de graphiques", desc: "Barres, courbes, cartes géo, heatmaps, sankey — tous personnalisables." },
      { icon: "database",      iconBg: "bg-indigo-100 dark:bg-indigo-900/30",  iconColor: "text-indigo-600", title: "Connecteurs universels", desc: "PostgreSQL, MySQL, BigQuery, Snowflake, Google Sheets, CSV, API REST." },
      { icon: "groups",        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",iconColor: "text-emerald-600",title: "Collaboration temps réel", desc: "Partagez et co-éditez vos tableaux de bord avec toute l'équipe." },
      { icon: "schedule",      iconBg: "bg-amber-100 dark:bg-amber-900/30",    iconColor: "text-amber-600",  title: "Rapports planifiés",      desc: "Envoi automatique de PDF ou emails à vos stakeholders selon planning." },
    ],
    hardware: [
      { icon: "storage",       name: "PostgreSQL / MySQL",  detail: "Connexion directe"     },
      { icon: "cloud",         name: "BigQuery / Snowflake", detail: "Data warehouse cloud"  },
      { icon: "table_chart",   name: "Google Sheets / CSV", detail: "Import en 1 clic"      },
    ],
    price:    "à partir de 79 DA/mois",
    license:  "Business",
    updated:  "18 Fév 2025",
    size:     "61.8 MB",
    uptime:   "99.7%",
    users:    "+800 équipes data",
    gallery:  [],
  },

  "securegate": {
    slug:          "securegate",
    name:          "SecureGate",
    version:       "v0.9 Beta",
    category:      "Sécurité",
    categoryColor: "text-slate-600 bg-slate-100 dark:bg-slate-800",
    icon:          "security",
    iconBg:        "bg-slate-100 dark:bg-slate-800",
    iconColor:     "text-slate-600 dark:text-slate-300",
    heroBg:        "from-slate-800 to-slate-950",
    tagline:       "Authentification centralisée et sécurité renforcée pour vos applications.",
    description: [
      "SecureGate est un module d'Identity & Access Management (IAM) conçu pour les applications web modernes. Il fournit une couche d'authentification robuste : SSO, MFA, OAuth2, SAML 2.0.",
      "En phase beta, SecureGate est déjà utilisé par des entreprises exigeantes souhaitant centraliser la gestion des identités sans dépendre d'un fournisseur externe propriétaire.",
    ],
    features: [
      { icon: "key",           iconBg: "bg-slate-100 dark:bg-slate-800",   iconColor: "text-slate-700 dark:text-slate-300", title: "SSO / OAuth2",          desc: "Connexion unique sur toutes vos applications internes avec standards ouverts." },
      { icon: "phonelink_lock",iconBg: "bg-blue-100 dark:bg-blue-900/30",  iconColor: "text-blue-600",                      title: "MFA adaptatif",          desc: "TOTP, SMS, passkey et biométrie selon le niveau de risque détecté." },
      { icon: "manage_accounts",iconBg:"bg-indigo-100 dark:bg-indigo-900/30",iconColor:"text-indigo-600",                    title: "Directory as a Service", desc: "Gestion centralisée des utilisateurs, rôles et permissions via interface admin." },
      { icon: "shield",        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",iconColor:"text-emerald-600",                title: "Audit & conformité",     desc: "Logs d'accès complets, rapports LPD, export SIEM." },
    ],
    hardware: [
      { icon: "lock",          name: "LDAP / Active Directory", detail: "Synchro bidirectionnelle" },
      { icon: "fingerprint",   name: "Passkeys FIDO2",          detail: "WebAuthn standard"        },
      { icon: "vpn_key",       name: "HSM / Vault",             detail: "Gestion des secrets"      },
    ],
    price:    "Beta — Accès gratuit",
    license:  "Open Beta",
    updated:  "10 Mar 2025",
    size:     "28.3 MB",
    uptime:   "98.5%",
    users:    "+120 testeurs",
    gallery:  [],
  },
}
*/

export const appsData: Record<string, AppData> = {}

export const appsList = Object.values(appsData)
