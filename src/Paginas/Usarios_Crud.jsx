import React, { useState, useEffect } from 'react';
import '../CSS/AdminPanel.css';

export default function Usuarios_Crud() {
  const [users, setUsers] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    correo: '',
    documento: '',
    direccion: '',
    pass: '',
    rol_idRol: '1'
  });

  const obtenerUsuarios = async () => {
    try {
      const res = await fetch('http://localhost:3000/usuarios');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoUsuario)
      });
      if (res.ok) {
        obtenerUsuarios();
        setNuevoUsuario({ nombre: '', correo: '', documento: '', direccion: '', pass: '', rol_idRol: '1' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, usuarioActualizado) => {
    try {
      await fetch(`http://localhost:3000/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuarioActualizado)
      });
      obtenerUsuarios();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      const res = await fetch(`http://localhost:3000/usuarios/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        obtenerUsuarios();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (id, campo, valor) => {
    setUsers(users.map(u => u.idUsuario === id ? { ...u, [campo]: valor } : u));
  };

  return (
    <div className="view-content">
      <form onSubmit={handleCrear} className="form-crear-usuario">
        <h3>Registrar Nuevo Usuario</h3>
        <div className="grid-inputs">
          <input
            type="text"
            placeholder="Nombre"
            value={nuevoUsuario.nombre}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Correo"
            value={nuevoUsuario.correo}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Documento"
            value={nuevoUsuario.documento}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, documento: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Dirección"
            value={nuevoUsuario.direccion}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, direccion: e.target.value })}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={nuevoUsuario.pass}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, pass: e.target.value })}
            required
          />
          <select
            value={nuevoUsuario.rol_idRol}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol_idRol: e.target.value })}
          >
            <option value="1">Administrador</option>
            <option value="2">Técnico</option>
            <option value="3">Usuario</option>
            <option value="4">Cliente</option>
          </select>
        </div>
        <button type="submit" className="btn-crear">Agregar Usuario</button>
      </form>

      <hr className="divisor" />

      {users.length === 0 ? (
        <p className="empty-msg">No hay usuarios registrados.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Documento</th>
                <th>Dirección</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.idUsuario}>
                  <td>#{u.idUsuario}</td>
                  <td>
                    <input
                      type="text"
                      value={u.nombre || ''}
                      onChange={(e) => handleInputChange(u.idUsuario, 'nombre', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      value={u.correo || ''}
                      onChange={(e) => handleInputChange(u.idUsuario, 'correo', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={u.documento || ''}
                      onChange={(e) => handleInputChange(u.idUsuario, 'documento', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={u.direccion || ''}
                      onChange={(e) => handleInputChange(u.idUsuario, 'direccion', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={u.rol_idRol || '1'}
                      onChange={(e) => handleInputChange(u.idUsuario, 'rol_idRol', e.target.value)}
                    >
                      <option value="1">Administrador</option>
                      <option value="2">Técnico</option>
                      <option value="3">Usuario</option>
                      <option value="4">Cliente</option>
                    </select>
                  </td>
                  <td>
                    <div className="btn-acciones">
                      <button className="btn-guardar" onClick={() => handleUpdate(u.idUsuario, u)}>
                        Guardar
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(u.idUsuario)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}