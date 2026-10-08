export interface Profile {
  id: string
  email: string
  nombre_completo: string
  cedula: string
  celular: string
  direccion: string
  rol: 'admin' | 'cliente'
  autorizacion_datos: boolean
  autorizacion_fecha: string | null
  autorizacion_version: string | null
  created_at: string
}

export interface Expediente {
  id: string
  user_id: string
  numero_expediente: string | null
  titulo: string
  descripcion: string | null
  area_juridica: string | null
  estado: string
  prioridad: string
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'nombre_completo' | 'email' | 'cedula'>
}

export interface Documento {
  id: string
  expediente_id: string
  user_id: string
  nombre: string
  ruta_storage: string
  tipo_mime: string | null
  tamano_bytes: number | null
  visible_cliente: boolean
  created_at: string
}

export interface Observacion {
  id: string
  expediente_id: string
  autor_id: string
  contenido: string
  visible_cliente: boolean
  created_at: string
}

export interface Seguimiento {
  id: string
  expediente_id: string
  autor_id: string
  tipo_actuacion: string
  descripcion: string | null
  fecha_actuacion: string
  fecha_vencimiento: string | null
  estado: string
  created_at: string
}

export interface HistorialEntry {
  id: string
  expediente_id: string
  autor_id: string
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
}

export interface BitacoraEntry {
  id: string
  autor_id: string | null
  accion: string
  detalle: string | null
  entidad: string | null
  entidad_id: string | null
  created_at: string
}

export interface ConfigCategoria {
  id: string
  nombre: string
  descripcion: string | null
  activa: boolean
  created_at: string
}

export interface ConfigEstado {
  id: string
  nombre: string
  descripcion: string | null
  color: string
  activo: boolean
  created_at: string
}

export interface ConfigTipoActuacion {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  created_at: string
}
