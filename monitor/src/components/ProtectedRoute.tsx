import { Navigate, useLocation } from "react-router-dom"
import type { ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import type { Role } from "@/components/layouts/DashboardLayout"
import { getDashboardPathForRole } from "@/lib/auth-routing"

interface Props {
  children: ReactNode
  role: Role
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role !== role) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return <>{children}</>
}
