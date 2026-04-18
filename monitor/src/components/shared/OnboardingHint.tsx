import { Link } from "react-router-dom"

type OnboardingAction = {
  to: string
  label: string
}

interface OnboardingHintProps {
  title: string
  description: string
  actions: OnboardingAction[]
}

export default function OnboardingHint({ title, description, actions }: OnboardingHintProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{description}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {actions.map((a) => (
          <Link
            key={`${a.to}-${a.label}`}
            to={a.to}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
