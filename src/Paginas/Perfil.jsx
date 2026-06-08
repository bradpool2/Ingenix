import { useState } from 'react';
import '../CSS/Global.css';

function Perfil() {
  const userGuardado = JSON.parse(localStorage.getItem('user'));
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({
    user: userGuardado?.user || '',
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
      const res = await fetch(`http://localhost:3001/usuarios/${userGuardado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      if (res.ok) {
        const actualizado = await res.json();
        localStorage.setItem('user', JSON.stringify({ ...userGuardado, ...actualizado }));
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