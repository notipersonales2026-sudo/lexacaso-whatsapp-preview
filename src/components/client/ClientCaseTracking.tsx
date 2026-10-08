import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime, getEstadoColor, downloadDocument } from '../../lib/helpers'
import type { Expediente, Seguimiento, Observacion, Documento } from '../../types'

export default function ClientCaseTracking() {
  const { profile } = useAuth()
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!profile) return
      const { data } = await supabase
        .from('expedientes')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      setExpedientes((data as Expediente[]) || [])
      setLoading(false)
    }
    load()
  }, [profile])

  useEffect(() => {
    if (!selectedId) return
    setDetailLoading(true)
    async function loadDetail() {
      const [segRes, obsRes, docRes] = await Promise.all([
        supabase.from('seguimientos').select('*').eq('expediente_id', selectedId).order('fecha_actuacion', { ascending: false }),
        supabase.from('observaciones').select('*').eq('expediente_id', selectedId).eq('visible_cliente', true).order('created_at', { ascending: false }),
        supabase.from('documentos').select('*').eq('expediente_id', selectedId).eq('visible_cliente', true).order('created_at', { ascending: false }),
      ])
      setSeguimientos((segRes.data as Seguimiento[]) || [])
      setObservaciones((obsRes.data as Observacion[]) || [])
      setDocumentos((docRes.data as Documento[]) || [])
      setDetailLoading(false)
    }
    loadDetail()
  }, [selectedId])

  const selectedExp = expedientes.find((e) => e.id === selectedId)

  async function handleDownload(doc: Documento) {
    const { error } = await downloadDocument(doc)
    if (error) alert('Error al descargar: ' + error)
  }

  if (loading) {
    return <div className="text-center mt-3"><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Seguimiento de mi caso</h2>
          <div className="page-subtitle">Consulte el estado, actuaciones y documentos de sus expedientes</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header"><h3 style={{ fontSize: 16 }}>Expedientes</h3></div>
          <div className="card-body-tight">
            {expedientes.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 12px' }}>
                <p>No tiene expedientes</p>
              </div>
            ) : (
              expedientes.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setSelectedId(exp.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '6px',
                    background: selectedId === exp.id ? 'var(--color-surface-alt)' : 'transparent',
                    border: selectedId === exp.id ? '1px solid var(--color-primary-light)' : '1px solid transparent',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{exp.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {exp.numero_expediente || 'Sin número'} · {formatDate(exp.created_at)}
                  </div>
                  <span className={`badge ${getEstadoColor(exp.estado)}`} style={{ marginTop: 6 }}>{exp.estado}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          {!selectedExp ? (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-icon">&#128269;</div>
                  <h3>Seleccione un expediente</h3>
                  <p>Elija un expediente de la lista para ver su seguimiento detallado</p>
                </div>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="text-center mt-3"><div className="spinner" /></div>
          ) : (
            <div>
              <div className="card mb-3">
                <div className="card-header">
                  <div>
                    <h3 style={{ fontSize: 18 }}>{selectedExp.titulo}</h3>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {selectedExp.numero_expediente} · {selectedExp.area_juridica || 'Sin área'}
                    </div>
                  </div>
                  <span className={`badge ${getEstadoColor(selectedExp.estado)}`}>{selectedExp.estado}</span>
                </div>
                {selectedExp.descripcion && (
                  <div className="card-body">
                    <p className="text-secondary" style={{ fontSize: 14 }}>{selectedExp.descripcion}</p>
                  </div>
                )}
              </div>

              <div className="card mb-3">
                <div className="card-header"><h3 style={{ fontSize: 16 }}>Actuaciones y seguimiento</h3></div>
                <div className="card-body">
                  {seguimientos.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: 16 }}>No hay actuaciones registradas</p>
                  ) : (
                    <div className="timeline">
                      {seguimientos.map((seg) => (
                        <div key={seg.id} className="timeline-item">
                          <div className="timeline-date">{formatDate(seg.fecha_actuacion)}</div>
                          <div className="timeline-content">
                            <div className="timeline-title">{seg.tipo_actuacion}</div>
                            {seg.descripcion && <div className="timeline-desc">{seg.descripcion}</div>}
                            <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                              <span className={`badge ${seg.estado === 'Completado' ? 'badge-success' : 'badge-warning'}`}>{seg.estado}</span>
                              {seg.fecha_vencimiento && (
                                <span className="badge badge-muted">Vence: {formatDate(seg.fecha_vencimiento)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card mb-3">
                <div className="card-header"><h3 style={{ fontSize: 16 }}>Observaciones</h3></div>
                <div className="card-body">
                  {observaciones.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: 16 }}>No hay observaciones visibles para usted</p>
                  ) : (
                    observaciones.map((obs) => (
                      <div key={obs.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>{formatDateTime(obs.created_at)}</div>
                        <p style={{ fontSize: 14 }}>{obs.contenido}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 style={{ fontSize: 16 }}>Documentos autorizados</h3></div>
                <div className="card-body">
                  {documentos.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: 16 }}>No hay documentos disponibles</p>
                  ) : (
                    documentos.map((doc) => (
                      <div key={doc.id} className="file-list-item">
                        <div className="file-info">
                          <div>
                            <div className="file-name">{doc.nombre}</div>
                            <div className="file-size">{formatDate(doc.created_at)}</div>
                          </div>
                        </div>
                        <div className="file-actions">
                          <button className="btn btn-sm btn-outline" onClick={() => handleDownload(doc)}>Descargar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
