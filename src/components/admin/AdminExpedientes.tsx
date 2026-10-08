import { useEffect, useState } from 'react'
import { supabase, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '../../lib/supabase'
import {
  formatDate, formatDateTime, formatBytes, getEstadoColor, getPrioridadColor,
  uploadDocument, downloadDocument, logAuditoria, logHistorial, generateCaseNumber,
} from '../../lib/helpers'
import type { Expediente, Documento, Observacion, Seguimiento, HistorialEntry, Profile } from '../../types'
import Modal from '../ui/Modal'

const ESTADOS = ['Iniciado', 'En estudio', 'En proceso', 'Suspendido', 'Finalizado', 'Archivado']
const PRIORIDADES = ['Alta', 'Normal', 'Baja']
const AREAS = ['Civil', 'Penal', 'Laboral', 'Familia', 'Administrativo', 'Comercial']

export default function AdminExpedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedExp, setSelectedExp] = useState<Expediente | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [clientes, setClientes] = useState<Profile[]>([])

  const [formData, setFormData] = useState({
    user_id: '',
    titulo: '',
    descripcion: '',
    area_juridica: AREAS[0],
    estado: 'Iniciado',
    prioridad: 'Normal',
  })

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [detailTab, setDetailTab] = useState<'info' | 'docs' | 'obs' | 'seg' | 'hist'>('info')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newObs, setNewObs] = useState('')
  const [obsVisible, setObsVisible] = useState(false)
  const [newSeg, setNewSeg] = useState({ tipo_actuacion: 'Notificación', descripcion: '', fecha_actuacion: new Date().toISOString().slice(0, 10), fecha_vencimiento: '' })

  async function loadExpedientes() {
    setLoading(true)
    const { data } = await supabase
      .from('expedientes')
      .select('*, profiles:profiles!expedientes_user_id_fkey(nombre_completo, email, cedula)')
      .order('created_at', { ascending: false })
    setExpedientes((data as Expediente[]) || [])
    setLoading(false)
  }

  async function loadClientes() {
    const { data } = await supabase.from('profiles').select('*').eq('rol', 'cliente').order('nombre_completo')
    setClientes((data as Profile[]) || [])
  }

  useEffect(() => {
    loadExpedientes()
  }, [])

  useEffect(() => {
    if (!selectedExp) return
    async function loadDetail() {
      const expId = selectedExp!.id
      const [docRes, obsRes, segRes, histRes] = await Promise.all([
        supabase.from('documentos').select('*').eq('expediente_id', expId).order('created_at', { ascending: false }),
        supabase.from('observaciones').select('*').eq('expediente_id', expId).order('created_at', { ascending: false }),
        supabase.from('seguimientos').select('*').eq('expediente_id', expId).order('fecha_actuacion', { ascending: false }),
        supabase.from('historial_expedientes').select('*').eq('expediente_id', expId).order('created_at', { ascending: false }),
      ])
      setDocumentos((docRes.data as Documento[]) || [])
      setObservaciones((obsRes.data as Observacion[]) || [])
      setSeguimientos((segRes.data as Seguimiento[]) || [])
      setHistorial((histRes.data as HistorialEntry[]) || [])
    }
    loadDetail()
  }, [selectedExp])

  const filtered = expedientes.filter((e) =>
    e.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (e.numero_expediente || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.user_id) { alert('Seleccione un cliente'); return }
    const numero = generateCaseNumber()
    const { data, error } = await supabase
      .from('expedientes')
      .insert({
        user_id: formData.user_id,
        numero_expediente: numero,
        titulo: formData.titulo,
        descripcion: formData.descripcion || null,
        area_juridica: formData.area_juridica,
        estado: formData.estado,
        prioridad: formData.prioridad,
      })
      .select()
      .single()
    if (error) { alert('Error: ' + error.message); return }
    await logAuditoria('crear_expediente', `Expediente ${numero} creado`, 'expediente', data.id)

    try {
      const cliente = clientes.find((c) => c.id === formData.user_id)
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'case_creation',
          userEmail: cliente?.email || '',
          userName: cliente?.nombre_completo || '',
          caseData: {
            numero_expediente: numero,
            titulo: formData.titulo,
            area_juridica: formData.area_juridica,
            documentos: [],
          },
        }),
      })
    } catch (e) {
      console.error('Notification email failed:', e)
    }

    setShowCreate(false)
    setFormData({ user_id: '', titulo: '', descripcion: '', area_juridica: AREAS[0], estado: 'Iniciado', prioridad: 'Normal' })
    loadExpedientes()
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedExp) return
    const updates = {
      titulo: formData.titulo,
      descripcion: formData.descripcion || null,
      area_juridica: formData.area_juridica,
      estado: formData.estado,
      prioridad: formData.prioridad,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('expedientes').update(updates).eq('id', selectedExp.id)
    if (error) { alert('Error: ' + error.message); return }
    if (selectedExp.estado !== formData.estado) {
      await logHistorial(selectedExp.id, 'estado', selectedExp.estado, formData.estado)
    }
    if (selectedExp.prioridad !== formData.prioridad) {
      await logHistorial(selectedExp.id, 'prioridad', selectedExp.prioridad, formData.prioridad)
    }
    await logAuditoria('editar_expediente', `Expediente ${selectedExp.numero_expediente} editado`, 'expediente', selectedExp.id)
    setShowEdit(false)
    loadExpedientes()
  }

  async function handleUpload(files: FileList) {
    if (!selectedExp) return
    setUploading(true)
    setUploadProgress(0)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > MAX_FILE_SIZE) { alert(`${file.name} excede el tamaño máximo`); continue }
      if (!ALLOWED_EXTENSIONS.includes(file.type) && file.type !== '') {
        const ext = file.name.split('.').pop()?.toLowerCase()
        const validExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'rar']
        if (!ext || !validExt.includes(ext)) { alert(`${file.name}: tipo no permitido`); continue }
      }
      setUploadProgress(Math.round((i / files.length) * 100))
      const { ruta, error } = await uploadDocument(file, selectedExp.user_id, selectedExp.id)
      if (error) { alert(`Error subiendo ${file.name}: ${error}`); continue }
      await supabase.from('documentos').insert({
        expediente_id: selectedExp.id,
        user_id: selectedExp.user_id,
        nombre: file.name,
        ruta_storage: ruta,
        tipo_mime: file.type || null,
        tamano_bytes: file.size,
        visible_cliente: true,
      })
    }
    setUploadProgress(100)
    setUploading(false)
    const { data } = await supabase.from('documentos').select('*').eq('expediente_id', selectedExp.id).order('created_at', { ascending: false })
    setDocumentos((data as Documento[]) || [])
    await logAuditoria('subir_documentos', `Documentos subidos al expediente ${selectedExp.numero_expediente}`, 'expediente', selectedExp.id)
  }

  async function toggleDocVisibility(doc: Documento) {
    await supabase.from('documentos').update({ visible_cliente: !doc.visible_cliente }).eq('id', doc.id)
    setDocumentos((prev) => prev.map((d) => d.id === doc.id ? { ...d, visible_cliente: !d.visible_cliente } : d))
  }

  async function deleteDoc(doc: Documento) {
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.storage.from('documentos').remove([doc.ruta_storage])
    await supabase.from('documentos').delete().eq('id', doc.id)
    setDocumentos((prev) => prev.filter((d) => d.id !== doc.id))
    if (selectedExp) await logAuditoria('eliminar_documento', `Documento ${doc.nombre} eliminado`, 'documento', doc.id)
  }

  async function addObservacion() {
    if (!selectedExp || !newObs.trim()) return
    await supabase.from('observaciones').insert({
      expediente_id: selectedExp.id,
      contenido: newObs,
      visible_cliente: obsVisible,
    })
    setNewObs('')
    setObsVisible(false)
    const { data } = await supabase.from('observaciones').select('*').eq('expediente_id', selectedExp.id).order('created_at', { ascending: false })
    setObservaciones((data as Observacion[]) || [])
  }

  async function deleteObs(obs: Observacion) {
    if (!confirm('¿Eliminar esta observación?')) return
    await supabase.from('observaciones').delete().eq('id', obs.id)
    setObservaciones((prev) => prev.filter((o) => o.id !== obs.id))
  }

  async function addSeguimiento() {
    if (!selectedExp) return
    await supabase.from('seguimientos').insert({
      expediente_id: selectedExp.id,
      tipo_actuacion: newSeg.tipo_actuacion,
      descripcion: newSeg.descripcion || null,
      fecha_actuacion: newSeg.fecha_actuacion,
      fecha_vencimiento: newSeg.fecha_vencimiento || null,
      estado: 'Pendiente',
    })
    setNewSeg({ tipo_actuacion: 'Notificación', descripcion: '', fecha_actuacion: new Date().toISOString().slice(0, 10), fecha_vencimiento: '' })
    const { data } = await supabase.from('seguimientos').select('*').eq('expediente_id', selectedExp.id).order('fecha_actuacion', { ascending: false })
    setSeguimientos((data as Seguimiento[]) || [])
    await logAuditoria('registrar_actuacion', `Actuación ${newSeg.tipo_actuacion} en ${selectedExp.numero_expediente}`, 'seguimiento', selectedExp.id)
  }

  async function updateSegEstado(seg: Seguimiento, estado: string) {
    await supabase.from('seguimientos').update({ estado }).eq('id', seg.id)
    setSeguimientos((prev) => prev.map((s) => s.id === seg.id ? { ...s, estado } : s))
  }

  function openEdit(exp: Expediente) {
    setSelectedExp(exp)
    setFormData({
      user_id: exp.user_id,
      titulo: exp.titulo,
      descripcion: exp.descripcion || '',
      area_juridica: exp.area_juridica || AREAS[0],
      estado: exp.estado,
      prioridad: exp.prioridad,
    })
    setShowEdit(true)
  }

  function openCreate() {
    loadClientes()
    setFormData({ user_id: '', titulo: '', descripcion: '', area_juridica: AREAS[0], estado: 'Iniciado', prioridad: 'Normal' })
    setShowCreate(true)
  }

  if (loading) return <div className="text-center mt-3"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Gestión de expedientes</h2>
          <div className="page-subtitle">Administre todos los casos jurídicos</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo expediente</button>
      </div>

      <div className="card mb-3">
        <div className="card-body-tight">
          <input className="form-input" placeholder="Buscar por título o número..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#9878;</div>
              <h3>No hay expedientes</h3>
              <p>Cree un nuevo expediente para comenzar</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exp) => (
                    <tr key={exp.id}>
                      <td><strong>{exp.numero_expediente || '—'}</strong></td>
                      <td>{exp.titulo}</td>
                      <td>{exp.profiles?.nombre_completo || '—'}</td>
                      <td><span className={`badge ${getEstadoColor(exp.estado)}`}>{exp.estado}</span></td>
                      <td><span className={`badge ${getPrioridadColor(exp.prioridad)}`}>{exp.prioridad}</span></td>
                      <td>{formatDate(exp.created_at)}</td>
                      <td>
                        <button className="btn btn-sm btn-outline" onClick={() => setSelectedExp(exp)}>Ver</button>
                        <button className="btn btn-sm btn-outline" style={{ marginLeft: 4 }} onClick={() => openEdit(exp)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedExp && !showEdit} onClose={() => setSelectedExp(null)} title={selectedExp?.titulo || ''} large>
        {selectedExp && (
          <div>
            <div className="flex gap-2 mb-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${getEstadoColor(selectedExp.estado)}`}>{selectedExp.estado}</span>
              <span className={`badge ${getPrioridadColor(selectedExp.prioridad)}`}>{selectedExp.prioridad}</span>
              <span className="badge badge-muted">{selectedExp.numero_expediente}</span>
            </div>

            <div className="tabs">
              <button className={`tab ${detailTab === 'info' ? 'active' : ''}`} onClick={() => setDetailTab('info')}>Información</button>
              <button className={`tab ${detailTab === 'docs' ? 'active' : ''}`} onClick={() => setDetailTab('docs')}>Documentos</button>
              <button className={`tab ${detailTab === 'obs' ? 'active' : ''}`} onClick={() => setDetailTab('obs')}>Observaciones</button>
              <button className={`tab ${detailTab === 'seg' ? 'active' : ''}`} onClick={() => setDetailTab('seg')}>Seguimiento</button>
              <button className={`tab ${detailTab === 'hist' ? 'active' : ''}`} onClick={() => setDetailTab('hist')}>Historial</button>
            </div>

            {detailTab === 'info' && (
              <div>
                <p><strong>Cliente:</strong> {selectedExp.profiles?.nombre_completo || '—'}</p>
                <p><strong>Correo:</strong> {selectedExp.profiles?.email || '—'}</p>
                <p><strong>Cédula:</strong> {selectedExp.profiles?.cedula || '—'}</p>
                <p><strong>Área jurídica:</strong> {selectedExp.area_juridica || '—'}</p>
                <p><strong>Fecha de creación:</strong> {formatDateTime(selectedExp.created_at)}</p>
                {selectedExp.descripcion && <div className="divider"></div>}
                {selectedExp.descripcion && <p><strong>Descripción:</strong> {selectedExp.descripcion}</p>}
              </div>
            )}

            {detailTab === 'docs' && (
              <div>
                <label className="drop-zone" style={{ marginBottom: 16 }}>
                  <div className="drop-icon">&#128193;</div>
                  <p>{uploading ? `Subiendo... ${uploadProgress}%` : 'Haga clic o arrastre archivos para subir'}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>PDF, Word, Excel, ZIP, RAR — máx. 50MB</p>
                  <input type="file" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && handleUpload(e.target.files)} disabled={uploading} accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
                </label>
                {uploading && <div className="upload-progress mb-2"><div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} /></div>}
                {documentos.length === 0 ? (
                  <p className="text-muted text-center" style={{ padding: 16 }}>No hay documentos</p>
                ) : (
                  documentos.map((doc) => (
                    <div key={doc.id} className="file-list-item">
                      <div className="file-info">
                        <div>
                          <div className="file-name">{doc.nombre}</div>
                          <div className="file-size">{formatBytes(doc.tamano_bytes)} · {formatDate(doc.created_at)}</div>
                        </div>
                      </div>
                      <div className="file-actions">
                        <span className={`badge ${doc.visible_cliente ? 'badge-success' : 'badge-muted'}`}>{doc.visible_cliente ? 'Visible' : 'Oculto'}</span>
                        <button className="btn btn-sm btn-outline" onClick={() => toggleDocVisibility(doc)}>{doc.visible_cliente ? 'Ocultar' : 'Mostrar'}</button>
                        <button className="btn btn-sm btn-outline" onClick={() => downloadDocument(doc)}>Descargar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteDoc(doc)}>Eliminar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'obs' && (
              <div>
                <div className="mb-2">
                  <textarea className="form-textarea" placeholder="Escriba una observación..." value={newObs} onChange={(e) => setNewObs(e.target.value)} />
                  <div className="flex items-center gap-1 mt-2">
                    <label className="form-check" style={{ marginBottom: 0, flex: 1 }}>
                      <input type="checkbox" checked={obsVisible} onChange={(e) => setObsVisible(e.target.checked)} />
                      <label>Visible para el cliente</label>
                    </label>
                    <button className="btn btn-primary btn-sm" onClick={addObservacion}>Agregar</button>
                  </div>
                </div>
                <div className="divider" />
                {observaciones.length === 0 ? (
                  <p className="text-muted text-center" style={{ padding: 16 }}>No hay observaciones</p>
                ) : (
                  observaciones.map((obs) => (
                    <div key={obs.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div className="flex justify-between">
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDateTime(obs.created_at)}</div>
                        <div className="flex gap-1">
                          <span className={`badge ${obs.visible_cliente ? 'badge-success' : 'badge-muted'}`}>{obs.visible_cliente ? 'Visible' : 'Interna'}</span>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteObs(obs)}>Eliminar</button>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, marginTop: 4 }}>{obs.contenido}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'seg' && (
              <div>
                <div className="card mb-2" style={{ background: 'var(--color-surface-alt)' }}>
                  <div className="card-body-tight">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tipo de actuación</label>
                        <select className="form-select" value={newSeg.tipo_actuacion} onChange={(e) => setNewSeg({ ...newSeg, tipo_actuacion: e.target.value })}>
                          {['Demanda', 'Audiencia', 'Notificación', 'Recurso', 'Diligencia', 'Consulta', 'Reunión'].map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Fecha de actuación</label>
                        <input className="form-input" type="date" value={newSeg.fecha_actuacion} onChange={(e) => setNewSeg({ ...newSeg, fecha_actuacion: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Descripción</label>
                      <input className="form-input" value={newSeg.descripcion} onChange={(e) => setNewSeg({ ...newSeg, descripcion: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Fecha de vencimiento (opcional)</label>
                      <input className="form-input" type="date" value={newSeg.fecha_vencimiento} onChange={(e) => setNewSeg({ ...newSeg, fecha_vencimiento: e.target.value })} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={addSeguimiento}>+ Agregar actuación</button>
                  </div>
                </div>
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
                          <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="form-select" style={{ width: 'auto', fontSize: 13, padding: '4px 8px' }} value={seg.estado} onChange={(e) => updateSegEstado(seg, e.target.value)}>
                              <option>Pendiente</option>
                              <option>En curso</option>
                              <option>Completado</option>
                            </select>
                            {seg.fecha_vencimiento && <span className="badge badge-muted">Vence: {formatDate(seg.fecha_vencimiento)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'hist' && (
              <div>
                {historial.length === 0 ? (
                  <p className="text-muted text-center" style={{ padding: 16 }}>No hay cambios registrados</p>
                ) : (
                  historial.map((h) => (
                    <div key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{formatDateTime(h.created_at)}</div>
                      <p style={{ fontSize: 14 }}>
                        <strong>{h.campo}:</strong> {h.valor_anterior || '—'} &rarr; {h.valor_nuevo || '—'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo expediente" large>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Cliente <span className="required">*</span></label>
            <select className="form-select" required value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}>
              <option value="">Seleccione un cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre_completo} — {c.email}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Título <span className="required">*</span></label>
            <input className="form-input" required value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea className="form-textarea" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Área jurídica</label>
              <select className="form-select" value={formData.area_juridica} onChange={(e) => setFormData({ ...formData, area_juridica: e.target.value })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="form-select" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                {ESTADOS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Prioridad</label>
            <select className="form-select" value={formData.prioridad} onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}>
              {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Crear expediente</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar expediente" large>
        <form onSubmit={handleEdit}>
          <div className="form-group">
            <label>Título <span className="required">*</span></label>
            <input className="form-input" required value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea className="form-textarea" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Área jurídica</label>
              <select className="form-select" value={formData.area_juridica} onChange={(e) => setFormData({ ...formData, area_juridica: e.target.value })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select className="form-select" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                {ESTADOS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Prioridad</label>
            <select className="form-select" value={formData.prioridad} onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}>
              {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowEdit(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar cambios</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
