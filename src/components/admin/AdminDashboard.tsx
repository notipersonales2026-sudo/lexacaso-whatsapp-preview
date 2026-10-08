import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, getEstadoColor } from '../../lib/helpers'
import type { Expediente, Profile } from '../../types'

interface Props {
  onNavigate: (view: string) => void
}

export default function AdminDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState({ expedientes: 0, clientes: 0, documentos: 0, activos: 0 })
  const [recentExp, setRecentExp] = useState<Expediente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [expRes, profRes, docRes] = await Promise.all([
        supabase.from('expedientes').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('rol', 'cliente'),
        supabase.from('documentos').select('*'),
      ])
      const expedientes = (expRes.data as Expediente[]) || []
      const clientes = (profRes.data as Profile[]) || []
      const documentos = docRes.data || []
      const activos = expedientes.filter((e) => !['Finalizado', 'Archivado'].includes(e.estado)).length
      setStats({ expedientes: expedientes.length, clientes: clientes.length, documentos: documentos.length, activos })
      setRecentExp(expedientes.slice(0, 5))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center mt-3"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Panel de administración</h2>
          <div className="page-subtitle">Resumen general de la plataforma</div>
        </div>
      </div>

      <div className="dashboard-grid mb-3">
        <div className="stat-card">
          <div className="stat-label">Expedientes totales</div>
          <div className="stat-value">{stats.expedientes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Casos activos</div>
          <div className="stat-value">{stats.activos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Clientes registrados</div>
          <div className="stat-value">{stats.clientes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Documentos</div>
          <div className="stat-value">{stats.documentos}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: 18 }}>Expedientes recientes</h3>
          <button className="btn btn-sm btn-outline" onClick={() => onNavigate('admin_expedientes')}>Ver todos</button>
        </div>
        <div className="card-body">
          {recentExp.length === 0 ? (
            <div className="empty-state">
              <h3>No hay expedientes</h3>
              <p>Los expedientes creados aparecerán aquí</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExp.map((exp) => (
                    <tr key={exp.id}>
                      <td><strong>{exp.numero_expediente || '—'}</strong></td>
                      <td>{exp.titulo}</td>
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
