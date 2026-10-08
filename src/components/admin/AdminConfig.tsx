import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { logAuditoria } from '../../lib/helpers'
import type { ConfigCategoria, ConfigEstado, ConfigTipoActuacion } from '../../types'

type Tab = 'categorias' | 'estados' | 'actuaciones'

export default function AdminConfig() {
  const [tab, setTab] = useState<Tab>('categorias')
  const [categorias, setCategorias] = useState<ConfigCategoria[]>([])
  const [estados, setEstados] = useState<ConfigEstado[]>([])
  const [tipos, setTipos] = useState<ConfigTipoActuacion[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState({ nombre: '', descripcion: '' })

  async function loadAll() {
    setLoading(true)
    const [catRes, estRes, tipRes] = await Promise.all([
      supabase.from('config_categorias').select('*').order('nombre'),
      supabase.from('config_estados').select('*').order('nombre'),
      supabase.from('config_tipos_actuacion').select('*').order('nombre'),
    ])
    setCategorias((catRes.data as ConfigCategoria[]) || [])
    setEstados((estRes.data as ConfigEstado[]) || [])
    setTipos((tipRes.data as ConfigTipoActuacion[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function addCategoria() {
    if (!newItem.nombre.trim()) return
    await supabase.from('config_categorias').insert({ nombre: newItem.nombre, descripcion: newItem.descripcion || null })
    await logAuditoria('crear_categoria', `Categoría "${newItem.nombre}" creada`, 'config_categoria')
    setNewItem({ nombre: '', descripcion: '' })
    loadAll()
  }

  async function addEstado() {
    if (!newItem.nombre.trim()) return
    await supabase.from('config_estados').insert({ nombre: newItem.nombre, descripcion: newItem.descripcion || null })
    await logAuditoria('crear_estado', `Estado "${newItem.nombre}" creado`, 'config_estado')
    setNewItem({ nombre: '', descripcion: '' })
    loadAll()
  }

  async function addTipo() {
    if (!newItem.nombre.trim()) return
    await supabase.from('config_tipos_actuacion').insert({ nombre: newItem.nombre, descripcion: newItem.descripcion || null })
    await logAuditoria('crear_tipo_actuacion', `Tipo de actuación "${newItem.nombre}" creado`, 'config_tipo_actuacion')
    setNewItem({ nombre: '', descripcion: '' })
    loadAll()
  }

  async function toggleCategoria(id: string, activa: boolean) {
    await supabase.from('config_categorias').update({ activa: !activa }).eq('id', id)
    loadAll()
  }

  async function toggleEstado(id: string, activo: boolean) {
    await supabase.from('config_estados').update({ activo: !activo }).eq('id', id)
    loadAll()
  }

  async function toggleTipo(id: string, activo: boolean) {
    await supabase.from('config_tipos_actuacion').update({ activo: !activo }).eq('id', id)
    loadAll()
  }

  async function deleteCategoria(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return
    await supabase.from('config_categorias').delete().eq('id', id)
    loadAll()
  }

  async function deleteEstado(id: string) {
    if (!confirm('¿Eliminar este estado?')) return
    await supabase.from('config_estados').delete().eq('id', id)
    loadAll()
  }

  async function deleteTipo(id: string) {
    if (!confirm('¿Eliminar este tipo de actuación?')) return
    await supabase.from('config_tipos_actuacion').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <div className="text-center mt-3"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Configuración</h2>
          <div className="page-subtitle">Gestione categorías, estados y tipos de actuación</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'categorias' ? 'active' : ''}`} onClick={() => { setTab('categorias'); setNewItem({ nombre: '', descripcion: '' }) }}>Categorías</button>
        <button className={`tab ${tab === 'estados' ? 'active' : ''}`} onClick={() => { setTab('estados'); setNewItem({ nombre: '', descripcion: '' }) }}>Estados</button>
        <button className={`tab ${tab === 'actuaciones' ? 'active' : ''}`} onClick={() => { setTab('actuaciones'); setNewItem({ nombre: '', descripcion: '' }) }}>Tipos de actuación</button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <h4 style={{ marginBottom: 12 }}>Agregar nuevo</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input className="form-input" value={newItem.nombre} onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input className="form-input" value={newItem.descripcion} onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => tab === 'categorias' ? addCategoria() : tab === 'estados' ? addEstado() : addTipo()}>
            + Agregar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tab === 'categorias' && categorias.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.descripcion || '—'}</td>
                    <td><span className={`badge ${c.activa ? 'badge-success' : 'badge-muted'}`}>{c.activa ? 'Sí' : 'No'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => toggleCategoria(c.id, c.activa)}>{c.activa ? 'Desactivar' : 'Activar'}</button>
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => deleteCategoria(c.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {tab === 'estados' && estados.map((e) => (
                  <tr key={e.id}>
                    <td>{e.nombre}</td>
                    <td>{e.descripcion || '—'}</td>
                    <td><span className={`badge ${e.activo ? 'badge-success' : 'badge-muted'}`}>{e.activo ? 'Sí' : 'No'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => toggleEstado(e.id, e.activo)}>{e.activo ? 'Desactivar' : 'Activar'}</button>
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => deleteEstado(e.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {tab === 'actuaciones' && tipos.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre}</td>
                    <td>{t.descripcion || '—'}</td>
                    <td><span className={`badge ${t.activo ? 'badge-success' : 'badge-muted'}`}>{t.activo ? 'Sí' : 'No'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => toggleTipo(t.id, t.activo)}>{t.activo ? 'Desactivar' : 'Activar'}</button>
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 4 }} onClick={() => deleteTipo(t.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
