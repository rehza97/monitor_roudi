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
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 mt-1">{description}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {actions.map((a) => (
          <Link
            key={`${a.to}-${a.label}`}
            to={a.to}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
