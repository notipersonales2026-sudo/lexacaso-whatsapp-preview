import { useAuth } from './context/AuthContext'
import { useState } from 'react'
import AuthPage from './components/auth/AuthPage'
import ClientDashboard from './components/client/ClientDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import ClientCaseTracking from './components/client/ClientCaseTracking'
import ClientProfile from './components/client/ClientProfile'
import DocumentosRecibidos from './components/client/DocumentosRecibidos'
import AdminExpedientes from './components/admin/AdminExpedientes'
import AdminUsuarios from './components/admin/AdminUsuarios'
import AdminConfig from './components/admin/AdminConfig'
import AdminBitacora from './components/admin/AdminBitacora'

type View =
  | 'client_dashboard'
  | 'client_tracking'
  | 'client_profile'
  | 'client_documentos'
  | 'admin_dashboard'
  | 'admin_expedientes'
  | 'admin_usuarios'
  | 'admin_config'
  | 'admin_bitacora'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  const [view, setView] = useState<View>('client_dashboard')

  if (loading) {
    return (
      <div className="loading-screen">
        <img src="/lexacaso.jpeg" alt="LEXACASO" style={{ width: 64, height: 64, borderRadius: 8 }} />
        <div className="spinner" />
      </div>
    )
  }

  if (!session || !profile) {
    return <AuthPage />
  }

  const isAdmin = profile.rol === 'admin'

  const navItems = isAdmin
    ? [
        { id: 'admin_dashboard' as View, label: 'Panel' },
        { id: 'admin_expedientes' as View, label: 'Expedientes' },
        { id: 'admin_usuarios' as View, label: 'Usuarios' },
        { id: 'admin_bitacora' as View, label: 'Auditoría' },
        { id: 'admin_config' as View, label: 'Configuración' },
      ]
    : [
        { id: 'client_dashboard' as View, label: 'Mis Casos' },
        { id: 'client_documentos' as View, label: 'Documentos recibidos' },
        { id: 'client_tracking' as View, label: 'Seguimiento' },
        { id: 'client_profile' as View, label: 'Mi Perfil' },
      ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <img src="/lexacaso.jpeg" alt="LEXACASO" />
          <h1>LEXACASO</h1>
        </div>
        <nav className="app-header-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'nav-active' : ''}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-header-user">
          <div className="user-info">
            <strong>{profile.nombre_completo}</strong>
            <div className="user-role">{isAdmin ? 'Administrador' : 'Cliente'}</div>
          </div>
          <button onClick={() => signOut()} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            Salir
          </button>
        </div>
      </header>

      <main className="app-main">
        {isAdmin ? (
          <>
            {view === 'admin_dashboard' && <AdminDashboard onNavigate={(v) => setView(v as View)} />}
            {view === 'admin_expedientes' && <AdminExpedientes />}
            {view === 'admin_usuarios' && <AdminUsuarios />}
            {view === 'admin_bitacora' && <AdminBitacora />}
            {view === 'admin_config' && <AdminConfig />}
          </>
        ) : (
          <>
            {view === 'client_dashboard' && <ClientDashboard />}
            {view === 'client_documentos' && <DocumentosRecibidos />}
            {view === 'client_tracking' && <ClientCaseTracking />}
            {view === 'client_profile' && <ClientProfile />}
          </>
        )}
      </main>

      <footer className="app-footer">
        LEXACASO &middot; Plataforma de gestión jurídica &middot; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
