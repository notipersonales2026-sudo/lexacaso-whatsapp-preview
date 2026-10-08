import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type Tab = 'login' | 'register' | 'forgot'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<Tab>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [cedula, setCedula] = useState('')
  const [celular, setCelular] = useState('')
  const [direccion, setDireccion] = useState('')
  const [autorizacion, setAutorizacion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setError(null)
    setSuccess(null)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    resetForm()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    resetForm()
    setLoading(true)
    const { error } = await signUp({
      email,
      password,
      nombre_completo: nombreCompleto,
      cedula,
      celular,
      direccion,
      autorizacion,
    })
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      setSuccess('Cuenta creada correctamente. Se ha enviado una confirmación a su correo.')
      setTab('login')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    resetForm()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Se ha enviado un enlace de recuperación a su correo. El enlace vence en un tiempo limitado.')
    }
  }

  return (
    <div className="auth-page">
      <div className={`auth-card ${tab === 'register' ? 'auth-card-wide' : ''}`}>
        <div className="auth-logo">
          <img src="/lexacaso.jpeg" alt="LEXACASO" />
          <h1>LEXACASO</h1>
          <p>Expón tu caso — Empieza por poner tu caso en orden</p>
        </div>

        {tab !== 'forgot' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); resetForm() }}>
              Iniciar sesión
            </button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); resetForm() }}>
              Registrarse
            </button>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <h2>Bienvenido</h2>
            <p className="auth-subtitle">Ingrese sus credenciales para acceder</p>
            <div className="form-group">
              <label>Correo electrónico <span className="required">*</span></label>
              <input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-group">
              <label>Contraseña <span className="required">*</span></label>
              <input className="form-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
            <div className="text-center mt-2">
              <button type="button" className="btn btn-sm" style={{ color: 'var(--color-text-muted)' }} onClick={() => { setTab('forgot'); resetForm() }}>
                Olvidé mi contraseña
              </button>
            </div>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <h2>Crear cuenta</h2>
            <p className="auth-subtitle">Registre sus datos para comenzar</p>
            <div className="form-group">
              <label>Nombre completo <span className="required">*</span></label>
              <input className="form-input" type="text" required value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Cédula <span className="required">*</span></label>
                <input className="form-input" type="text" required value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="12345678" />
              </div>
              <div className="form-group">
                <label>Celular <span className="required">*</span></label>
                <input className="form-input" type="tel" required value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="3001234567" />
              </div>
            </div>
            <div className="form-group">
              <label>Dirección <span className="required">*</span></label>
              <input className="form-input" type="text" required value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle 123 #45-67" />
            </div>
            <div className="form-group">
              <label>Correo electrónico <span className="required">*</span></label>
              <input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="form-group">
              <label>Contraseña <span className="required">*</span></label>
              <input className="form-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-check">
              <input type="checkbox" id="auth-check" checked={autorizacion} onChange={(e) => setAutorizacion(e.target.checked)} />
              <label htmlFor="auth-check">
                Autorizo el tratamiento de mis datos personales conforme a la política de privacidad de LEXACASO.
                Acepto la versión v1.0 de dicha política. Entiendo que esta autorización se registra con fecha y hora.
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
            <p className="text-center text-muted mt-2" style={{ fontSize: 13 }}>
              Al registrarse se crea su cuenta, su perfil y el registro de autorización de datos.
            </p>
          </form>
        )}

        {tab === 'forgot' && (
          <form onSubmit={handleForgot}>
            <h2>Recuperar contraseña</h2>
            <p className="auth-subtitle">Se enviará un enlace seguro a su correo para restablecer su contraseña</p>
            <div className="form-group">
              <label>Correo electrónico <span className="required">*</span></label>
              <input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
            <div className="text-center mt-2">
              <button type="button" className="btn btn-sm" style={{ color: 'var(--color-text-muted)' }} onClick={() => { setTab('login'); resetForm() }}>
                Volver a iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
