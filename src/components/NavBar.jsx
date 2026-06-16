  import React from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import '../CSS/NavBar.css';
  import logo from '../assets/Logo_reloj.png';

  function NavBar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
  const rol = user?.rol?.toLowerCase();

<<<<<<< HEAD
  const cerrarSesion = () => {
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/', { replace: true });
  };
=======
    const cerrarSesion = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.clear();
      navigate('/', { replace: true });
    };
>>>>>>> e2fa39c (Correcion vistas roles & login/register)

    

    return (
      <nav>
        <div className="nav-links">
          <div className='logo-container'>
            <img className='logo' src={logo} alt="Logo" />
          </div>

          {!user && (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}

          {user && (
            <>
              <Link to="/home">Home</Link>

              {rol === 'admin' && (
                <>
                  <Link to="/panel_solicitud">Solicitudes</Link>
                  <Link to="/usuarios">Usuarios</Link>
                </>
              )}

              {rol === 'tecnico' && (
                <>
                  <Link to="/relojes">Relojes</Link>
                  <Link to="/panel_solicitud">Solicitudes</Link>
                </>
              )}

              {rol === 'Cliente'  && (
                <>
                  <Link to="/panel_solicitud">Solicitudes</Link>
                  <Link to="/perfil">Perfil</Link>
                </>
              )}
            </>
          )}
        </div>

        {user && (
<<<<<<< HEAD
          <>
            <Link to="/home">Home</Link>

            {user.rol === 'admin' && (
              <>
                <Link to="/panel_solicitud">Solicitudes</Link>
                <Link to="/usuarios">Usuarios</Link>
              </>
            )}

            {user.rol === 'tecnico' && (
              <>
                <Link to="/">Relojes</Link>
                <Link to="/panel_solicitud">Solicitudes</Link>
              </>
            )}

            {(user.rol === 'Cliente' || user.rol === 'cliente') && (
              <>
                <Link to="/mis-solicitudes">Mis Solicitudes</Link>
                <Link to="/Perfil">Perfil</Link>
                <Link to="/panel_solicitud">Solicitudes</Link>
              </>
            )}

            {user.rol === 'usuario' && (
              <>
                <Link to="/mis-solicitudes">Mis Solicitudes</Link>
                <Link to="/catalogo">Catálogo</Link>   {/* ← agrega esta línea */}
                <Link to="/perfil">Perfil</Link>
              </>
            )}
          </>
=======
          <button className="nav-right" onClick={cerrarSesion}>
            Cerrar Sesión
          </button>
>>>>>>> e2fa39c (Correcion vistas roles & login/register)
        )}
      </nav>
    );
  }

  export default NavBar;