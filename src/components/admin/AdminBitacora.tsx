import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/helpers'
import type { BitacoraEntry } from '../../types'

export default function AdminBitacora() {
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bitacora_auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      setEntries((data as BitacoraEntry[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center mt-3"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Bitácora de auditoría</h2>
          <div className="page-subtitle">Registro de acciones administrativas</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {entries.length === 0 ? (
            <div className="empty-state">
              <h3>No hay registros</h3>
              <p>Las acciones administrativas se registrarán aquí automáticamente</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Detalle</th>
                    <th>Entidad</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(e.created_at)}</td>
                      <td><span className="badge badge-secondary">{e.accion}</span></td>
                      <td>{e.detalle || '—'}</td>
                      <td>{e.entidad || '—'}</td>
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
