import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { getPostLoginRedirectPath, type AuthRedirectState } from "@/lib/auth-routing"

interface Props {
  children: ReactNode
}

export default function PublicOnlyRoute({ children }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />
  }

  if (user) {
    const from = (location.state as AuthRedirectState | null)?.from?.pathname
    return <Navigate to={getPostLoginRedirectPath(user.role, from)} replace />
  }

  return <>{children}</>
}
