import { supabase, ADMIN_EMAIL, AUTH_VERSION } from './supabase'
import type { Documento } from '../types'

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getEstadoColor(estado: string): string {
  const map: Record<string, string> = {
    'Iniciado': 'badge-primary',
    'En estudio': 'badge-primary',
    'En proceso': 'badge-warning',
    'Suspendido': 'badge-muted',
    'Finalizado': 'badge-success',
    'Archivado': 'badge-muted',
  }
  return map[estado] || 'badge-secondary'
}

export function getPrioridadColor(prioridad: string): string {
  const map: Record<string, string> = {
    'Alta': 'badge-error',
    'Normal': 'badge-primary',
    'Baja': 'badge-muted',
  }
  return map[prioridad] || 'badge-secondary'
}

export async function uploadDocument(
  file: File,
  userId: string,
  expedienteId: string,
  onProgress?: (pct: number) => void
): Promise<{ ruta: string; error: string | null }> {
  const ext = file.name.split('.').pop()
  const fileName = `${userId}/${expedienteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { ruta: '', error: error.message }
  }

  if (onProgress) onProgress(100)
  return { ruta: data.path, error: null }
}

export async function downloadDocument(doc: Documento): Promise<{ error: string | null }> {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(doc.ruta_storage, 300)

  if (error) return { error: error.message }

  const a = document.createElement('a')
  a.href = data.signedUrl
  a.download = doc.nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  return { error: null }
}

export async function logAuditoria(
  accion: string,
  detalle: string,
  entidad?: string,
  entidadId?: string
): Promise<void> {
  await supabase.from('bitacora_auditoria').insert({
    accion,
    detalle,
    entidad: entidad || null,
    entidad_id: entidadId || null,
  })
}

export async function logHistorial(
  expedienteId: string,
  campo: string,
  valorAnterior: string | null,
  valorNuevo: string | null
): Promise<void> {
  await supabase.from('historial_expedientes').insert({
    expediente_id: expedienteId,
    campo,
    valor_anterior: valorAnterior,
    valor_nuevo: valorNuevo,
  })
}

export function generateCaseNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `LC-${year}-${random}`
}

export { ADMIN_EMAIL, AUTH_VERSION }
