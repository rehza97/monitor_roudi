import { Routes, Route, Navigate } from "react-router-dom"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicOnlyRoute from "./components/PublicOnlyRoute"

// Public
import LandingPage         from "./pages/LandingPage"
import LoginPage           from "./pages/LoginPage"
import RegisterPage        from "./pages/RegisterPage"

// Apps
import AppDetailsPage      from "./pages/apps/AppDetailsPage"

// Company
import About               from "./pages/company/About"
import Careers             from "./pages/company/Careers"
import Blog                from "./pages/company/Blog"
import Contact             from "./pages/company/Contact"

// Legal
import Privacy             from "./pages/legal/Privacy"
import Terms               from "./pages/legal/Terms"
import LegalNotice         from "./pages/legal/LegalNotice"
import Cookies             from "./pages/legal/Cookies"

// Client
import ClientDashboard     from "./pages/client/ClientDashboard"
import ClientRequests      from "./pages/client/ClientRequests"
import ClientRequestNew    from "./pages/client/ClientRequestNew"
import ClientRequestDetail from "./pages/client/ClientRequestDetail"
import ClientApps          from "./pages/client/ClientApps"
import ClientSoftwareStore from "./pages/client/ClientSoftwareStore"
import ClientMaterialStore from "./pages/client/ClientMaterialStore"
import ClientMonitoring    from "./pages/client/ClientMonitoring"
import ClientMessages      from "./pages/client/ClientMessages"
import ClientNotifications from "./pages/client/ClientNotifications"
import ClientProfile       from "./pages/client/ClientProfile"
import ClientPayments      from "./pages/client/ClientPayments"
import ClientSupport       from "./pages/client/ClientSupport"

// Admin
import AdminDashboard        from "./pages/admin/AdminDashboard"
import AdminCatalogApps      from "./pages/admin/AdminCatalogApps"
import AdminEngineers        from "./pages/admin/AdminEngineers"
import AdminEngineerDetail   from "./pages/admin/AdminEngineerDetail"
import AdminRequests         from "./pages/admin/AdminRequests"
import AdminRequestValidate  from "./pages/admin/AdminRequestValidate"
import AdminMaterials        from "./pages/admin/AdminMaterials"
import AdminMaterialsOrder   from "./pages/admin/AdminMaterialsOrder"
import AdminClientsLocation  from "./pages/admin/AdminClientsLocation"
import AdminClientDetail     from "./pages/admin/AdminClientDetail"
import AdminMessages         from "./pages/admin/AdminMessages"
import AdminMonitoring       from "./pages/admin/AdminMonitoring"
import AdminInvoices         from "./pages/admin/AdminInvoices"
import AdminReports          from "./pages/admin/AdminReports"
import AdminRoles            from "./pages/admin/AdminRoles"
import AdminHistory          from "./pages/admin/AdminHistory"
import AdminSettings         from "./pages/admin/AdminSettings"
import AdminUsersRolePage    from "./pages/admin/AdminUsersRolePage"
import AdminUserProfile      from "./pages/admin/AdminUserProfile"

// Engineer
import EngineerDashboard       from "./pages/engineer/EngineerDashboard"
import EngineerProjects        from "./pages/engineer/EngineerProjects"
import EngineerRequests        from "./pages/engineer/EngineerRequests"
import EngineerRequestDetail   from "./pages/engineer/EngineerRequestDetail"
import EngineerProjectProgress from "./pages/engineer/EngineerProjectProgress"
import EngineerMonitoring      from "./pages/engineer/EngineerMonitoring"
import EngineerRemoteControl   from "./pages/engineer/EngineerRemoteControl"
import EngineerMessages        from "./pages/engineer/EngineerMessages"
import EngineerNotifications   from "./pages/engineer/EngineerNotifications"
import EngineerSettings        from "./pages/engineer/EngineerSettings"

// Technician
import TechnicianDashboard      from "./pages/technician/TechnicianDashboard"
import TechnicianTickets        from "./pages/technician/TechnicianTickets"
import TechnicianTicketDetail   from "./pages/technician/TechnicianTicketDetail"
import TechnicianTicketValidate from "./pages/technician/TechnicianTicketValidate"
import TechnicianCalendar       from "./pages/technician/TechnicianCalendar"
import TechnicianClients        from "./pages/technician/TechnicianClients"
import TechnicianInventory      from "./pages/technician/TechnicianInventory"
import TechnicianRemoteControl  from "./pages/technician/TechnicianRemoteControl"
import TechnicianNotifications  from "./pages/technician/TechnicianNotifications"
import TechnicianSettings       from "./pages/technician/TechnicianSettings"

export default function App() {
  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────── */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      {/* ── Apps ────────────────────────────────────────── */}
      <Route path="/apps/:slug" element={<AppDetailsPage />} />

      {/* ── Company ─────────────────────────────────────── */}
      <Route path="/about"   element={<About />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog"    element={<Blog />} />
      <Route path="/contact" element={<Contact />} />

      {/* ── Legal ───────────────────────────────────────── */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms"   element={<Terms />} />
      <Route path="/legal"   element={<LegalNotice />} />
      <Route path="/cookies" element={<Cookies />} />

      {/* ── Client ──────────────────────────────────────── */}
      <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
      <Route path="/client/dashboard"        element={<ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>} />
      <Route path="/client/apps"             element={<ProtectedRoute role="client"><ClientApps /></ProtectedRoute>} />
      <Route path="/client/software-store"   element={<ProtectedRoute role="client"><ClientSoftwareStore /></ProtectedRoute>} />
      <Route path="/client/material-store"   element={<ProtectedRoute role="client"><ClientMaterialStore /></ProtectedRoute>} />
      <Route path="/client/requests"         element={<ProtectedRoute role="client"><ClientRequests /></ProtectedRoute>} />
      <Route path="/client/requests/new"     element={<ProtectedRoute role="client"><ClientRequestNew /></ProtectedRoute>} />
      <Route path="/client/requests/:id"     element={<ProtectedRoute role="client"><ClientRequestDetail /></ProtectedRoute>} />
      <Route path="/client/monitoring"       element={<ProtectedRoute role="client"><ClientMonitoring /></ProtectedRoute>} />
      <Route path="/client/messages"         element={<ProtectedRoute role="client"><ClientMessages /></ProtectedRoute>} />
      <Route path="/client/notifications"    element={<ProtectedRoute role="client"><ClientNotifications /></ProtectedRoute>} />
      <Route path="/client/payments"         element={<ProtectedRoute role="client"><ClientPayments /></ProtectedRoute>} />
      <Route path="/client/support"          element={<ProtectedRoute role="client"><ClientSupport /></ProtectedRoute>} />
      <Route path="/client/profile"          element={<ProtectedRoute role="client"><ClientProfile /></ProtectedRoute>} />

      {/* ── Admin ───────────────────────────────────────── */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard"         element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/catalog-apps"      element={<ProtectedRoute role="admin"><AdminCatalogApps /></ProtectedRoute>} />
      <Route path="/admin/engineers"         element={<ProtectedRoute role="admin"><AdminEngineers /></ProtectedRoute>} />
      <Route path="/admin/engineers/:id"     element={<ProtectedRoute role="admin"><AdminEngineerDetail /></ProtectedRoute>} />
      <Route path="/admin/requests"          element={<ProtectedRoute role="admin"><AdminRequests /></ProtectedRoute>} />
      <Route path="/admin/requests/:id"      element={<ProtectedRoute role="admin"><AdminRequestValidate /></ProtectedRoute>} />
      <Route path="/admin/materials"         element={<ProtectedRoute role="admin"><AdminMaterials /></ProtectedRoute>} />
      <Route path="/admin/materials/order"   element={<ProtectedRoute role="admin"><AdminMaterialsOrder /></ProtectedRoute>} />
      <Route path="/admin/location"          element={<ProtectedRoute role="admin"><AdminClientsLocation /></ProtectedRoute>} />
      <Route path="/admin/clients/:id"       element={<ProtectedRoute role="admin"><AdminClientDetail /></ProtectedRoute>} />
      <Route path="/admin/messages"          element={<ProtectedRoute role="admin"><AdminMessages /></ProtectedRoute>} />
      <Route path="/admin/monitoring"        element={<ProtectedRoute role="admin"><AdminMonitoring /></ProtectedRoute>} />
      <Route path="/admin/invoices"          element={<ProtectedRoute role="admin"><AdminInvoices /></ProtectedRoute>} />
      <Route path="/admin/reports"           element={<ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/roles"             element={<ProtectedRoute role="admin"><AdminRoles /></ProtectedRoute>} />
      <Route path="/admin/history"           element={<ProtectedRoute role="admin"><AdminHistory /></ProtectedRoute>} />
      <Route path="/admin/settings"          element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/users/admins"      element={<ProtectedRoute role="admin"><AdminUsersRolePage role="admin" pageTitle="CRUD Admins" /></ProtectedRoute>} />
      <Route path="/admin/users/clients"     element={<ProtectedRoute role="admin"><AdminUsersRolePage role="client" pageTitle="CRUD Clients" /></ProtectedRoute>} />
      <Route path="/admin/users/engineers"   element={<ProtectedRoute role="admin"><AdminUsersRolePage role="engineer" pageTitle="CRUD Ingénieurs" /></ProtectedRoute>} />
      <Route path="/admin/users/technicians" element={<ProtectedRoute role="admin"><AdminUsersRolePage role="technician" pageTitle="CRUD Techniciens" /></ProtectedRoute>} />
      <Route path="/admin/users/:role/:id"   element={<ProtectedRoute role="admin"><AdminUserProfile /></ProtectedRoute>} />

      {/* ── Engineer ────────────────────────────────────── */}
      <Route path="/engineer" element={<Navigate to="/engineer/dashboard" replace />} />
      <Route path="/engineer/dashboard"             element={<ProtectedRoute role="engineer"><EngineerDashboard /></ProtectedRoute>} />
      <Route path="/engineer/projects"             element={<ProtectedRoute role="engineer"><EngineerProjects /></ProtectedRoute>} />
      <Route path="/engineer/projects/:id/progress" element={<ProtectedRoute role="engineer"><EngineerProjectProgress /></ProtectedRoute>} />
      <Route path="/engineer/requests"             element={<ProtectedRoute role="engineer"><EngineerRequests /></ProtectedRoute>} />
      <Route path="/engineer/requests/:id"         element={<ProtectedRoute role="engineer"><EngineerRequestDetail /></ProtectedRoute>} />
      <Route path="/engineer/monitoring"           element={<ProtectedRoute role="engineer"><EngineerMonitoring /></ProtectedRoute>} />
      <Route path="/engineer/remote"               element={<ProtectedRoute role="engineer"><EngineerRemoteControl /></ProtectedRoute>} />
      <Route path="/engineer/messages"             element={<ProtectedRoute role="engineer"><EngineerMessages /></ProtectedRoute>} />
      <Route path="/engineer/notifications"        element={<ProtectedRoute role="engineer"><EngineerNotifications /></ProtectedRoute>} />
      <Route path="/engineer/settings"             element={<ProtectedRoute role="engineer"><EngineerSettings /></ProtectedRoute>} />

      {/* ── Technician ──────────────────────────────────── */}
      <Route path="/technician" element={<Navigate to="/technician/dashboard" replace />} />
      <Route path="/technician/dashboard"        element={<ProtectedRoute role="technician"><TechnicianDashboard /></ProtectedRoute>} />
      <Route path="/technician/tickets"          element={<ProtectedRoute role="technician"><TechnicianTickets /></ProtectedRoute>} />
      <Route path="/technician/tickets/:id"      element={<ProtectedRoute role="technician"><TechnicianTicketDetail /></ProtectedRoute>} />
      <Route path="/technician/tickets/:id/validate" element={<ProtectedRoute role="technician"><TechnicianTicketValidate /></ProtectedRoute>} />
      <Route path="/technician/calendar"         element={<ProtectedRoute role="technician"><TechnicianCalendar /></ProtectedRoute>} />
      <Route path="/technician/clients"          element={<ProtectedRoute role="technician"><TechnicianClients /></ProtectedRoute>} />
      <Route path="/technician/inventory"        element={<ProtectedRoute role="technician"><TechnicianInventory /></ProtectedRoute>} />
      <Route path="/technician/remote"           element={<ProtectedRoute role="technician"><TechnicianRemoteControl /></ProtectedRoute>} />
      <Route path="/technician/notifications"    element={<ProtectedRoute role="technician"><TechnicianNotifications /></ProtectedRoute>} />
      <Route path="/technician/settings"         element={<ProtectedRoute role="technician"><TechnicianSettings /></ProtectedRoute>} />

      {/* ── Fallback ────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
