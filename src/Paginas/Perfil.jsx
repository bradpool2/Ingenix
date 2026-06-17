import { useState } from 'react';
import '../CSS/Global.css';

function Perfil() {
  const userGuardado = JSON.parse(localStorage.getItem('user'));
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({
    nombre: userGuardado?.nombre || '',
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
          nombre: datos.nombre,
          correo: datos.correo,
          telefono: datos.telefono,
          documento: userGuardado.documento,
          direccion: userGuardado.direccion,
          rol_idRol: userGuardado.rol_idRol
        })
      });

      if (res.ok) {
        const nuevoUser = { ...userGuardado, ...datos };
        localStorage.setItem('user', JSON.stringify(nuevoUser));
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
      <div className="tarjeta-login">
        <h2 className="titulo-perfil">Mi Perfil</h2>

        <div className="perfil-datos">
          <div className="dato-grupo">
            <label>Nombre</label>
            {editando
              ? <input name="nombre" value={datos.nombre} onChange={manejarCambio} />
              : <span>{datos.nombre || 'No registrado'}</span>}
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
            <span className="badge-rol">{datos.rol}</span>
          </div>
        </div>

        <div className="perfil-botones">
          {editando ? (
            <>
              <button className="btn-volver" onClick={guardar}>Guardar</button>
              <button className="btn-volver" onClick={() => setEditando(false)}>Cancelar</button>
            </>
          ) : (
            <button className="btn-volver" onClick={() => setEditando(true)}>Editar perfil</button>
          )}
          <button className="btn-volver" onClick={() => window.history.back()}>Volver</button>
        </div>
      </div>
    </div>
  );
}

export default Perfil;