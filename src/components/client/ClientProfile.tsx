import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, AUTH_VERSION } from '../../lib/supabase'
import { formatDateTime } from '../../lib/helpers'

export default function ClientProfile() {
  const { profile, refreshProfile } = useAuth()
  const [nombreCompleto, setNombreCompleto] = useState(profile?.nombre_completo || '')
  const [celular, setCelular] = useState(profile?.celular || '')
  const [direccion, setDireccion] = useState(profile?.direccion || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!profile) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { error } = await supabase
      .from('profiles')
      .update({ nombre_completo: nombreCompleto, celular, direccion })
      .eq('id', profile.id)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Perfil actualizado correctamente')
      await refreshProfile()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mi Perfil</h2>
          <div className="page-subtitle">Consulte y actualice sus datos personales</div>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="card mb-3">
          <div className="card-header"><h3 style={{ fontSize: 18 }}>Datos de la cuenta</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label>Correo electrónico</label>
              <input className="form-input" type="email" value={profile.email} disabled />
            </div>
            <div className="form-group">
              <label>Cédula</label>
              <input className="form-input" type="text" value={profile.cedula} disabled />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <input className="form-input" type="text" value={profile.rol === 'admin' ? 'Administrador' : 'Cliente'} disabled />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="card mb-3">
            <div className="card-header"><h3 style={{ fontSize: 18 }}>Datos editables</h3></div>
            <div className="card-body">
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}
              <div className="form-group">
                <label>Nombre completo</label>
                <input className="form-input" type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Celular</label>
                <input className="form-input" type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input className="form-input" type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>

        <div className="card">
          <div className="card-header"><h3 style={{ fontSize: 18 }}>Autorización de datos</h3></div>
          <div className="card-body">
            <div className="form-check" style={{ cursor: 'default' }}>
              <input type="checkbox" checked={profile.autorizacion_datos} disabled />
              <label>
                He autorizado el tratamiento de mis datos personales conforme a la política de privacidad de LEXACASO.
              </label>
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              <p><strong>Fecha de autorización:</strong> {formatDateTime(profile.autorizacion_fecha)}</p>
              <p><strong>Versión de la política:</strong> {profile.autorizacion_version || AUTH_VERSION}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
