import { useState } from 'react';
import '../CSS/Global.css';
import NavBar from '../components/NavBar';
import { FaRegUser } from "react-icons/fa";
import { authFetch } from '../components/api.js';

function Perfil() {
  const userGuardado = JSON.parse(localStorage.getItem('user'));
  const [editando, setEditando] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    actual: '',
    nueva: '',
    confirmar: '',
  });
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [mensajePassword, setMensajePassword] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
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
    const valor = e.target.name === 'telefono'
      ? e.target.value.replace(/\D/g, '').slice(0, 10)
      : e.target.value;
    setDatos({ ...datos, [e.target.name]: valor });
  };

  const guardar = async () => {
    if (!/^\d{10}$/.test(datos.telefono)) {
      alert('El número de teléfono debe tener exactamente 10 dígitos');
      return;
    }
    try {
      const idUsuario = userGuardado.idUsuario || userGuardado.idusuario;
      const res = await authFetch(`http://localhost:3000/usuarios/${idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datos.user,                 
          correo: datos.correo,
          documento: userGuardado.documento,
          direccion: userGuardado.direccion,
          telefono: datos.telefono,
          rol_idRol: userGuardado.rol_idRol
        })
      });

      if (res.ok) {
        const respuesta = await res.json().catch(() => ({}));
        localStorage.setItem('user', JSON.stringify({
          ...userGuardado,
          idUsuario,
          nombre: datos.user,
          correo: datos.correo,
          telefono: datos.telefono,
          ...(respuesta.usuario || {}),
        }));
        alert("Datos actualizados correctamente");
        setEditando(false);
      } else {
        const respuesta = await res.json().catch(() => ({}));
        alert(respuesta.error || respuesta.message || "Error al actualizar");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    }
  };

  const manejarCambioPassword = (event) => {
    setPasswordForm((actual) => ({
      ...actual,
      [event.target.name]: event.target.value,
    }));
    setMensajePassword('');
    setErrorPassword('');
  };

  const cambiarPassword = async (event) => {
    event.preventDefault();
    setMensajePassword('');
    setErrorPassword('');

    if (passwordForm.nueva !== passwordForm.confirmar) {
      setErrorPassword('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (passwordForm.nueva.length < 8) {
      setErrorPassword('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setCambiandoPassword(true);
    try {
      const res = await authFetch('http://localhost:3000/perfil/cambiar-password', {
        method: 'PUT',
        body: JSON.stringify({
          passwordActual: passwordForm.actual,
          passwordNueva: passwordForm.nueva,
        }),
      });
      const respuesta = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorPassword(respuesta.message || 'No se pudo actualizar la contraseña.');
        return;
      }

      setMensajePassword(respuesta.message || 'Contraseña actualizada correctamente.');
      setPasswordForm({ actual: '', nueva: '', confirmar: '' });
    } catch (error) {
      console.error('No se pudo cambiar la contraseña:', error);
      setErrorPassword('No se pudo conectar con el servidor. Intenta de nuevo.');
    } finally {
      setCambiandoPassword(false);
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
                ? <input
                    name="telefono"
                    type="tel"
                    value={datos.telefono}
                    onChange={manejarCambio}
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                  />
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

          <form className="perfil-password" onSubmit={cambiarPassword}>
            <h3>Cambiar contraseña</h3>
            <p>Confirma tu contraseña actual para guardar una nueva.</p>
            <div className="perfil-password-grid">
              <label>
                Contraseña actual
                <input
                  type="password"
                  name="actual"
                  value={passwordForm.actual}
                  onChange={manejarCambioPassword}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  name="nueva"
                  value={passwordForm.nueva}
                  onChange={manejarCambioPassword}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  name="confirmar"
                  value={passwordForm.confirmar}
                  onChange={manejarCambioPassword}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>
            {errorPassword && <p className="perfil-password-error" role="alert">{errorPassword}</p>}
            {mensajePassword && <p className="perfil-password-exito" role="status">{mensajePassword}</p>}
            <button type="submit" className="btn-guardar-perfil" disabled={cambiandoPassword}>
              {cambiandoPassword ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
export default Perfil;