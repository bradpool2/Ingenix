import { useState } from 'react';
import NavBar from "../components/NavBar";
import '../CSS/Global.css';

function Perfil() {
  const userGuardado = JSON.parse(localStorage.getItem('user'));

  const [editando, setEditando] = useState(false);

  const [datos, setDatos] = useState({
    nombre: userGuardado?.nombre || '',
    correo: userGuardado?.correo || '',
    telefono: userGuardado?.telefono || '',
    direccion: userGuardado?.direccion || '',
    documento: userGuardado?.documento || '',
    rol: userGuardado?.rol || ''
  });

  if (!userGuardado) {
    return (
      <div>
        <NavBar />

        <div
          className="contenedor-padre"
          style={{ paddingTop: "100px" }}
        >
          <div className="tarjeta-login">
            <h2>No hay sesión activa</h2>
          </div>
        </div>
      </div>
    );
  }

  const manejarCambio = (e) => {
    setDatos({
      ...datos,
      [e.target.name]: e.target.value
    });
  };

  const guardar = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/usuarios/${userGuardado.idUsuario}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: datos.nombre,
            correo: datos.correo,
            telefono: datos.telefono,
            direccion: datos.direccion,
            documento: datos.documento,
            rol_idRol: userGuardado.rol_idRol || 3
          })
        }
      );

      if (res.ok) {
        const nuevoUser = {
          ...userGuardado,
          ...datos
        };

        localStorage.setItem(
          'user',
          JSON.stringify(nuevoUser)
        );

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

  const campo = (label, name, tipo = 'text') => (
    <div className="dato-grupo">
      <label>{label}</label>

      {editando ? (
        <input
          type={tipo}
          name={name}
          value={datos[name]}
          onChange={manejarCambio}
        />
      ) : (
        <span>{datos[name] || 'No registrado'}</span>
      )}
    </div>
  );

  return (
    <div>
      <NavBar />

      <div
        className="contenedor-padre"
        style={{ paddingTop: "100px" }}
      >
        <div className="tarjeta-login">
          <h2 className="titulo-perfil">
            Mi Perfil
          </h2>

          <div className="perfil-datos">
            {campo('Nombre', 'nombre')}
            {campo('Correo', 'correo', 'email')}
            {campo('Teléfono', 'telefono')}
            {campo('Dirección', 'direccion')}
            {campo('Documento', 'documento')}

            <div className="dato-grupo">
              <label>Rol asignado</label>

              <span className="badge-rol">
                {datos.rol}
              </span>
            </div>
          </div>

          <div className="perfil-botones">
            {editando ? (
              <>
                <button
                  className="btn-volver"
                  onClick={guardar}
                >
                  Guardar
                </button>

                <button
                  className="btn-volver"
                  onClick={() =>
                    setEditando(false)
                  }
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                className="btn-volver"
                onClick={() =>
                  setEditando(true)
                }
              >
                Editar perfil
              </button>
            )}

            <button
              className="btn-volver"
              onClick={() =>
                window.history.back()
              }
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perfil;