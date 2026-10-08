import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase, ALLOWED_FILE_EXTS, MAX_FILE_SIZE } from '../../lib/supabase'
import { uploadDocument, generateCaseNumber, formatBytes } from '../../lib/helpers'
import type { Expediente } from '../../types'

const CATEGORIAS = [
  'Salud, incapacidades y pensiones',
  'Tutelas y derechos fundamentales',
  'Derechos de petición y falta de respuesta',
  'Trabajo y prestaciones laborales',
  'Pensiones y seguridad social',
  'Deudas, cobros y obligaciones',
  'Bancos, seguros y créditos',
  'Vivienda, arrendamientos y propiedad',
  'Entidades públicas',
  'Demandas y procesos judiciales',
  'Investigaciones disciplinarias o administrativas',
  'Notificaciones y requerimientos',
  'Familia',
  'Otro asunto',
  'No sé qué categoría elegir',
]

interface PendingFile {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  ruta?: string
}

interface Props {
  onCreated: (exp: Expediente) => void
  onCancel: () => void
}

export default function ExponerCaso({ onCreated, onCancel }: Props) {
  const { profile } = useAuth()
  const [step, setStep] = useState(1)
  const [categoria, setCategoria] = useState('')
  const [titulo, setTitulo] = useState('')
  const [quePaso, setQuePaso] = useState('')
  const [quienInvolucrado, setQuienInvolucrado] = useState('')
  const [entidadPersona, setEntidadPersona] = useState('')
  const [desdeCuando, setDesdeCuando] = useState('')
  const [solucionBusca, setSolucionBusca] = useState('')
  const [haPresentadoPeticion, setHaPresentadoPeticion] = useState('')
  const [haRecibidoRespuesta, setHaRecibidoRespuesta] = useState('')
  const [tieneFechaLimite, setTieneFechaLimite] = useState('')
  const [fechaLimite, setFechaLimite] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [sinDocumentos, setSinDocumentos] = useState(false)
  const [files, setFiles] = useState<PendingFile[]>([])
  const [autorizacion, setAutorizacion] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function pickFiles(fileList: FileList | null) {
    if (!fileList) return
    const newFiles: PendingFile[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (file.size > MAX_FILE_SIZE) {
        newFiles.push({ file, status: 'error', error: 'Excede 50MB' })
        continue
      }
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !ALLOWED_FILE_EXTS.includes(ext)) {
        newFiles.push({ file, status: 'error', error: 'Formato no permitido' })
        continue
      }
      const dangerous = ['.exe', '.bat', '.cmd', '.sh', '.js', '.html', '.svg']
      if (dangerous.some((d) => file.name.toLowerCase().endsWith(d))) {
        newFiles.push({ file, status: 'error', error: 'Archivo peligroso' })
        continue
      }
      newFiles.push({ file, status: 'pending' })
    }
    setFiles((prev) => [...prev, ...newFiles])
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  function buildDescripcion(): string {
    const parts: string[] = []
    parts.push(`Categoría: ${categoria}`)
    if (quePaso) parts.push(`¿Qué pasó?: ${quePaso}`)
    if (quienInvolucrado) parts.push(`¿Quién está involucrado?: ${quienInvolucrado}`)
    if (entidadPersona) parts.push(`Entidad o persona: ${entidadPersona}`)
    if (desdeCuando) parts.push(`¿Desde cuándo?: ${desdeCuando}`)
    if (solucionBusca) parts.push(`¿Qué solución busca?: ${solucionBusca}`)
    if (haPresentadoPeticion) parts.push(`¿Ha presentado petición?: ${haPresentadoPeticion}`)
    if (haRecibidoRespuesta) parts.push(`¿Ha recibido respuesta?: ${haRecibidoRespuesta}`)
    if (tieneFechaLimite) parts.push(`¿Tiene fecha límite?: ${tieneFechaLimite}`)
    if (fechaLimite) parts.push(`Fecha límite: ${fechaLimite}`)
    if (observaciones) parts.push(`Observaciones: ${observaciones}`)
    return parts.join('\n')
  }

  async function handleSubmit() {
    if (!profile) return
    if (!autorizacion) {
      setError('Debe aceptar el aviso de tratamiento de datos personales.')
      return
    }
    if (!categoria) {
      setError('Seleccione una categoría.')
      return
    }
    setSubmitting(true)
    setError(null)

    const numero = generateCaseNumber()
    const descripcionCompleta = buildDescripcion()

    const { data, error: insertError } = await supabase
      .from('expedientes')
      .insert({
        user_id: profile.id,
        numero_expediente: numero,
        titulo: titulo || categoria,
        descripcion: descripcionCompleta,
        area_juridica: categoria,
        estado: 'Recibido',
        prioridad: 'Normal',
      })
      .select()
      .single()

    if (insertError || !data) {
      setError('Error al crear el expediente: ' + (insertError?.message || 'desconocido'))
      setSubmitting(false)
      return
    }

    const expediente = data as Expediente

    if (!sinDocumentos && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const pf = files[i]
        if (pf.status === 'error') continue
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f))
        const { ruta, error: upErr } = await uploadDocument(pf.file, profile.id, expediente.id)
        if (upErr) {
          setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: upErr } : f))
          continue
        }
        await supabase.from('documentos').insert({
          expediente_id: expediente.id,
          user_id: profile.id,
          nombre: pf.file.name,
          ruta_storage: ruta,
          tipo_mime: pf.file.type || null,
          tamano_bytes: pf.file.size,
          visible_cliente: true,
          remitente_id: profile.id,
          consultado: false,
        })
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'done', ruta } : f))
      }
    }

    await supabase.from('bitacora_auditoria').insert({
      autor_id: profile.id,
      accion: 'cliente_crear_expediente',
      detalle: `Expediente ${numero} creado por el cliente`,
      entidad: 'expediente',
      entidad_id: expediente.id,
    })

    setSubmitting(false)
    onCreated(expediente)
  }

  const canAdvanceStep1 = categoria !== ''
  const validFiles = files.filter((f) => f.status !== 'error')

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Exponer mi caso</h2>
          <div className="page-subtitle">Cuéntenos su caso paso a paso</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-body">
          <div className="step-indicator" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[1, 2, 3, 4].map((s) => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'var(--transition)',
              }} />
            ))}
          </div>

          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Paso 1: Seleccione el asunto</h3>
              <p className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>Elija la categoría que mejor describe su caso.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoria(cat)}
                    style={{
                      textAlign: 'left', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                      border: categoria === cat ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: categoria === cat ? 'var(--color-surface-alt)' : 'transparent',
                      cursor: 'pointer', transition: 'var(--transition)', fontSize: 14,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 mt-3" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" disabled={!canAdvanceStep1} onClick={() => setStep(2)}>Continuar</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Paso 2: Cuente lo sucedido</h3>
              <div className="form-group">
                <label>Título breve de su caso *</label>
                <input className="form-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Solicitud de pensión negada" />
              </div>
              <div className="form-group">
                <label>¿Qué pasó? *</label>
                <textarea className="form-textarea" rows={3} value={quePaso} onChange={(e) => setQuePaso(e.target.value)} placeholder="Describa los hechos en sus propias palabras" />
              </div>
              <div className="form-group">
                <label>¿Quién está involucrado?</label>
                <input className="form-input" value={quienInvolucrado} onChange={(e) => setQuienInvolucrado(e.target.value)} placeholder="Personas, entidades o empresas relacionadas" />
              </div>
              <div className="form-group">
                <label>¿Qué entidad o persona tiene el problema?</label>
                <input className="form-input" value={entidadPersona} onChange={(e) => setEntidadPersona(e.target.value)} placeholder="Ej: EPS, banco, jefe, etc." />
              </div>
              <div className="form-group">
                <label>¿Desde cuándo ocurre?</label>
                <input className="form-input" value={desdeCuando} onChange={(e) => setDesdeCuando(e.target.value)} placeholder="Ej: Hace 3 meses, desde enero 2025" />
              </div>
              <div className="form-group">
                <label>¿Qué solución busca?</label>
                <textarea className="form-textarea" rows={2} value={solucionBusca} onChange={(e) => setSolucionBusca(e.target.value)} placeholder="¿Qué resultado espera obtener?" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>¿Ha presentado una petición o reclamación?</label>
                  <select className="form-select" value={haPresentadoPeticion} onChange={(e) => setHaPresentadoPeticion(e.target.value)}>
                    <option value="">Seleccione...</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                    <option value="No estoy seguro">No estoy seguro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>¿Ha recibido respuesta?</label>
                  <select className="form-select" value={haRecibidoRespuesta} onChange={(e) => setHaRecibidoRespuesta(e.target.value)}>
                    <option value="">Seleccione...</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                    <option value="No estoy seguro">No estoy seguro</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>¿Tiene una fecha límite, audiencia o vencimiento próximo?</label>
                  <select className="form-select" value={tieneFechaLimite} onChange={(e) => setTieneFechaLimite(e.target.value)}>
                    <option value="">Seleccione...</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                    <option value="No estoy seguro">No estoy seguro</option>
                  </select>
                </div>
                {tieneFechaLimite === 'Sí' && (
                  <div className="form-group">
                    <label>¿Cuál es la fecha?</label>
                    <input className="form-input" type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Observaciones adicionales</label>
                <textarea className="form-textarea" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Cualquier información que considere relevante" />
              </div>
              <div className="flex gap-1" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>Anterior</button>
                <div className="flex gap-1">
                  <button className="btn btn-outline" onClick={() => setStep(3)}>Continuar</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Paso 3: Documentos</h3>
              <p className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>Adjunte los documentos que respaldan su caso. Puede subir varios archivos.</p>

              <div className="form-check" style={{ marginBottom: 16 }}>
                <input type="checkbox" id="sin-docs" checked={sinDocumentos} onChange={(e) => setSinDocumentos(e.target.checked)} />
                <label htmlFor="sin-docs">No tengo documentos por ahora</label>
              </div>

              {!sinDocumentos && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { fileInputRef.current?.click() }}>Seleccionar archivos</button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png"
                      onChange={(e) => pickFiles(e.target.files)}
                    />
                  </div>

                  {files.length > 0 && (
                    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                      {files.map((pf, idx) => (
                        <div key={idx} className="file-list-item" style={{ padding: '10px 12px' }}>
                          <div className="file-info">
                            <div>
                              <div className="file-name" style={{ fontSize: 14 }}>{pf.file.name}</div>
                              <div className="file-size">{formatBytes(pf.file.size)}</div>
                            </div>
                          </div>
                          <div className="file-actions">
                            {pf.status === 'uploading' && <span className="badge badge-warning">Subiendo...</span>}
                            {pf.status === 'done' && <span className="badge badge-success">Listo</span>}
                            {pf.status === 'pending' && <span className="badge badge-muted">Pendiente</span>}
                            {pf.status === 'error' && <span className="badge badge-error">{pf.error}</span>}
                            <button className="btn btn-sm btn-danger" onClick={() => removeFile(idx)}>Quitar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Formatos permitidos: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), ZIP, RAR, imágenes (JPG/PNG). Máximo 50MB por archivo.
                  </p>
                </>
              )}

              <div className="flex gap-1" style={{ justifyContent: 'space-between', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setStep(2)}>Anterior</button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>Continuar</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Paso 4: Revisar y enviar</h3>
              <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                <p><strong>Categoría:</strong> {categoria}</p>
                <p><strong>Título:</strong> {titulo || categoria}</p>
                {quePaso && <p><strong>¿Qué pasó?:</strong> {quePaso}</p>}
                {solucionBusca && <p><strong>Solución buscada:</strong> {solucionBusca}</p>}
                {tieneFechaLimite === 'Sí' && fechaLimite && <p><strong>Fecha límite:</strong> {fechaLimite}</p>}
                <p><strong>Documentos:</strong> {sinDocumentos ? 'Sin documentos' : `${validFiles.length} archivo(s)`}</p>
              </div>

              <div className="form-check" style={{ marginBottom: 16 }}>
                <input type="checkbox" id="auth-envio" checked={autorizacion} onChange={(e) => setAutorizacion(e.target.checked)} />
                <label htmlFor="auth-envio">
                  Autorizo el tratamiento de mis datos personales y la información suministrada para el análisis de mi caso.
                  Entiendo que esta información será manejada con confidencialidad conforme a la política de privacidad de LEXACASO.
                </label>
              </div>

              <div className="flex gap-1" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-outline" onClick={() => setStep(3)} disabled={submitting}>Anterior</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !autorizacion}>
                  {submitting ? 'Enviando...' : 'Enviar mi caso'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
