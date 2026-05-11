import '../CSS/Global.css';

function Perfil() {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    return (
      <div className="contenedor-padre">
        <div className="tarjeta-login">
          <h2 className="titulo-perfil">No hay sesión activa</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor-padre">
      <div className="tarjeta-login">
        <h2 className="titulo-perfil">Mi Perfil</h2>
        
        <div className="perfil-datos">
          <div className="dato-grupo">
            <label>ID de Usuario:</label>
            <span>{user.id}</span>
          </div>

          <div className="dato-grupo">
            <label>Nombre:</label>
            <span>{user.user}</span>
          </div>

          <div className="dato-grupo">
            <label>Rol asignado:</label>
            <span className="badge-rol">{user.rol}</span>
          </div>
        </div>

        <button className="btn-volver" onClick={() => window.history.back()}>
          Volver
        </button>
      </div>
    </div>
  );
}

export default Perfil;