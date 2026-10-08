import { useEffect, useState } from 'react'
import { supabase, ADMIN_EMAIL } from '../../lib/supabase'
import { formatDateTime } from '../../lib/helpers'
import { logAuditoria } from '../../lib/helpers'
import type { Profile } from '../../types'
import Modal from '../ui/Modal'

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [editData, setEditData] = useState({ nombre_completo: '', cedula: '', celular: '', direccion: '', rol: 'cliente' })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsuarios((data as Profile[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = usuarios.filter((u) =>
    u.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.cedula.includes(search)
  )

  function openEdit(u: Profile) {
    setSelected(u)
    setEditData({ nombre_completo: u.nombre_completo, cedula: u.cedula, celular: u.celular, direccion: u.direccion, rol: u.rol })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return

    if (editData.rol !== selected.rol) {
      const { error: roleError } = await supabase.rpc('set_user_role', {
        target_user_id: selected.id,
        new_role: editData.rol,
      })
      if (roleError) { alert('Error al cambiar rol: ' + roleError.message); return }
      await logAuditoria('cambiar_rol', `Rol de ${selected.email} cambiado a ${editData.rol}`, 'perfil', selected.id)
    }

    const { error } = await supabase.from('profiles').update({
      nombre_completo: editData.nombre_completo,
      cedula: editData.cedula,
      celular: editData.celular,
      direccion: editData.direccion,
    }).eq('id', selected.id)
    if (error) { alert('Error: ' + error.message); return }
    if (editData.rol === selected.rol) {
      await logAuditoria('editar_usuario', `Usuario ${selected.email} actualizado`, 'perfil', selected.id)
    }
    setSelected(null)
    load()
  }

  if (loading) return <div className="text-center mt-3"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
          <div className="page-subtitle">Gestione las cuentas de clientes y administradores</div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body-tight">
          <input className="form-input" placeholder="Buscar por nombre, correo o cédula..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Cédula</th>
                  <th>Celular</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre_completo}</td>
                    <td>{u.email}</td>
                    <td>{u.cedula}</td>
                    <td>{u.celular}</td>
                    <td>
                      <span className={`badge ${u.rol === 'admin' ? 'badge-error' : 'badge-primary'}`}>
                        {u.rol === 'admin' ? 'Administrador' : 'Cliente'}
                      </span>
                    </td>
                    <td>{formatDateTime(u.created_at)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Editar usuario">
        {selected && (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nombre completo</label>
              <input className="form-input" value={editData.nombre_completo} onChange={(e) => setEditData({ ...editData, nombre_completo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input className="form-input" value={selected.email} disabled />
            </div>
            <div className="form-group">
              <label>Cédula</label>
              <input className="form-input" value={editData.cedula} onChange={(e) => setEditData({ ...editData, cedula: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Celular</label>
              <input className="form-input" value={editData.celular} onChange={(e) => setEditData({ ...editData, celular: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input className="form-input" value={editData.direccion} onChange={(e) => setEditData({ ...editData, direccion: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select className="form-select" value={editData.rol} onChange={(e) => setEditData({ ...editData, rol: e.target.value })}
                disabled={selected.email === ADMIN_EMAIL}>
                <option value="cliente">Cliente</option>
                <option value="admin">Administrador</option>
              </select>
              {selected.email === ADMIN_EMAIL && (
                <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>El administrador principal no puede cambiar su rol</p>
              )}
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
