import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDateTime, formatBytes, downloadDocument } from '../../lib/helpers'
import type { Documento, Expediente } from '../../types'

export default function DocumentosRecibidos() {
  const { profile } = useAuth()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [expedientes, setExpedientes] = useState<Map<string, Expediente>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filterExp, setFilterExp] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  async function load() {
    if (!profile) return
    setLoading(true)
    const [docRes, expRes] = await Promise.all([
      supabase
        .from('documentos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('visible_cliente', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('expedientes')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
    ])
    const docs = (docRes.data as Documento[]) || []
    const exps = (expRes.data as Expediente[]) || []
    const expMap = new Map<string, Expediente>()
    exps.forEach((e) => expMap.set(e.id, e))
    setDocumentos(docs)
    setExpedientes(expMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const filtered = documentos.filter((d) => {
    if (filterExp && d.expediente_id !== filterExp) return false
    if (filterEstado === 'nuevo' && d.consultado) return false
    if (filterEstado === 'consultado' && !d.consultado) return false
    return true
  })

  async function handleDownload(doc: Documento) {
    const { error } = await downloadDocument(doc)
    if (error) {
      alert('Error al descargar: ' + error)
      return
    }
    if (!doc.consultado) {
      await supabase.from('documentos').update({ consultado: true }).eq('id', doc.id)
      setDocumentos((prev) => prev.map((d) => d.id === doc.id ? { ...d, consultado: true } : d))
    }
  }

  if (loading) return <div className="text-center mt-3"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Documentos recibidos</h2>
          <div className="page-subtitle">Documentos enviados por el despacho</div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body-tight">
          <div className="form-row">
            <div className="form-group">
              <label>Filtrar por expediente</label>
              <select className="form-select" value={filterExp} onChange={(e) => setFilterExp(e.target.value)}>
                <option value="">Todos</option>
                {Array.from(expedientes.values()).map((exp) => (
                  <option key={exp.id} value={exp.id}>{exp.numero_expediente || exp.titulo}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Filtrar por estado</label>
              <select className="form-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="nuevo">Nuevo</option>
                <option value="consultado">Consultado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#128230;</div>
              <h3>Todavía no tienes documentos enviados por el despacho</h3>
              <p>Cuando el despacho envíe documentos relacionados con tu caso, aparecerán aquí.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Expediente</th>
                    <th>Mensaje</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => {
                    const exp = expedientes.get(doc.expediente_id)
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{doc.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {formatBytes(doc.tamano_bytes)}
                          </div>
                        </td>
                        <td>{exp?.numero_expediente || exp?.titulo || '—'}</td>
                        <td style={{ maxWidth: 200, fontSize: 13 }}>{doc.mensaje_admin || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(doc.created_at)}</td>
                        <td>
                          <span className={`badge ${doc.consultado ? 'badge-muted' : 'badge-success'}`}>
                            {doc.consultado ? 'Consultado' : 'Nuevo'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => handleDownload(doc)}>
                            Descargar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
