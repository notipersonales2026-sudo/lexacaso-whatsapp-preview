import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, getEstadoColor } from '../../lib/helpers'
import type { Expediente } from '../../types'

export default function ClientDashboard() {
  const { profile } = useAuth()
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile) return
      const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error(error)
      } else {
        setExpedientes(data as Expediente[])
      }
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) {
    return (
      <div className="text-center mt-3">
        <div className="spinner" />
      </div>
    )
  }

  const total = expedientes.length
  const activos = expedientes.filter((e) => !['Finalizado', 'Archivado'].includes(e.estado)).length
  const finalizados = expedientes.filter((e) => e.estado === 'Finalizado').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Mis Casos</h2>
          <div className="page-subtitle">Bienvenido, {profile?.nombre_completo}</div>
        </div>
      </div>

      <div className="dashboard-grid mb-3">
        <div className="stat-card">
          <div className="stat-label">Total de expedientes</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Casos activos</div>
          <div className="stat-value">{activos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Casos finalizados</div>
          <div className="stat-value">{finalizados}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Expedientes</h3>
        </div>
        <div className="card-body">
          {expedientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#9878;</div>
              <h3>No tiene expedientes registrados</h3>
              <p>Cuando el despacho cree un expediente a su nombre, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Área</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map((exp) => (
                    <tr key={exp.id}>
                      <td><strong>{exp.numero_expediente || '—'}</strong></td>
                      <td>{exp.titulo}</td>
                      <td>{exp.area_juridica || '—'}</td>
                      <td><span className={`badge ${getEstadoColor(exp.estado)}`}>{exp.estado}</span></td>
                      <td>{formatDate(exp.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
