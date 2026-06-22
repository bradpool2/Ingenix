import { useState } from 'react';
import '../CSS/Global.css';
import NavBar from '../components/NavBar';
import { FaRegUser } from "react-icons/fa";

function Perfil() {
  const userGuardado = JSON.parse(localStorage.getItem('user'));
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({
    user: userGuardado?.nombre || '',        // 👈 cambiado de .user a .nombre
    correo: userGuardado?.correo || '',
    telefono: userGuardado?.telefono || '',
    rol: userGuardado?.rol || ''
  });

  if (!userGuardado) {
    return (
      <div className="contenedor-padre">
        <div className="tarjeta-login">
          <h2 className="titulo-perfil">No hay sesión activa</h2>
        </div>
      </div>
    );
  }

  const manejarCambio = (e) => {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  };

  const guardar = async () => {
    try {
      const res = await fetch(`http://localhost:3000/usuarios/${userGuardado.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datos.user,                 // 👈 cambiado de datos.nombre a datos.user (porque tu estado local se llama 'user')
          correo: datos.correo,
          documento: userGuardado.documento,
          direccion: userGuardado.direccion,
          telefono: datos.telefono,
          rol_idRol: userGuardado.rol_idRol
        })
      });

      if (res.ok) {
        const actualizado = { ...userGuardado, nombre: datos.user, correo: datos.correo, telefono: datos.telefono };
        localStorage.setItem('user', JSON.stringify(actualizado));
        alert("Datos actualizados correctamente");
        setEditando(false);
      } else {
        alert("Error al actualizar");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="contenedor-padre">
      <NavBar/>
      <div className="tarjeta-perfil">

        <div className="perfil-lateral">
          <div className="perfil-avatar">
            <FaRegUser size={36} color="var(--color-principal)" />
          </div>
          <h2 className="perfil-nombre">{datos.user}</h2>
          <span className="badge-rol">{datos.rol}</span>
        </div>

        <div className="perfil-contenido">
          <div className="perfil-encabezado">
            <h3>Información personal</h3>
            {!editando && (
              <button className="btn-editar-perfil" onClick={() => setEditando(true)}>
                Editar perfil
              </button>
            )}
          </div>

          <div className="perfil-grid">
            <div className="dato-grupo">
              <label>Nombre</label>
              {editando
                ? <input name="user" value={datos.user} onChange={manejarCambio} />
                : <span>{datos.user}</span>}
            </div>

            <div className="dato-grupo">
              <label>Correo</label>
              {editando
                ? <input name="correo" value={datos.correo} onChange={manejarCambio} />
                : <span>{datos.correo || 'No registrado'}</span>}
            </div>

            <div className="dato-grupo">
              <label>Teléfono</label>
              {editando
                ? <input name="telefono" value={datos.telefono} onChange={manejarCambio} />
                : <span>{datos.telefono || 'No registrado'}</span>}
            </div>

            <div className="dato-grupo">
              <label>Rol asignado</label>
              <span className="badge-rol-inline">{datos.rol}</span>
            </div>
          </div>

          <div className="perfil-botones">
            {editando ? (
              <>
                <button className="btn-guardar-perfil" onClick={guardar}>Guardar cambios</button>
                <button className="btn-cancelar-perfil" onClick={() => setEditando(false)}>Cancelar</button>
              </>
            ) : (
              <button className="btn-cancelar-perfil" onClick={() => window.history.back()}>Volver</button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
export default Perfil;