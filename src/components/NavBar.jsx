import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../CSS/NavBar.css';
import logo from '../assets/Logo_reloj.png';

function NavBar() {
  const navigate = useNavigate();

  const cerrarSesion = () => {
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/', { replace: true }); 
  };

  const user = JSON.parse(localStorage.getItem('user'));

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

            {user.rol === 'admin' && (
              <>
                <Link to="/panel_solicitud">Solicitudes</Link>
                <Link to="/usuarios">Usuarios</Link>
              </>
            )}

            {user.rol === 'tecnico' && (
              <>
                <Link to="/relojes">Relojes</Link>
                <Link to="/panel_solicitud">Solicitudes</Link>
              </>
            )}

            {(user.rol === 'Cliente' || user.rol === 'cliente') && (
              <>
                <Link to="/panel_solicitud">Solicitudes</Link>
                <Link to="/perfil">Perfil</Link>
              </>
            )}
          </>
        )}
      </div>

      {user && (
        <button className="nav-right" onClick={cerrarSesion}>
          Cerrar Sesión
        </button>
      )}
    </nav>
  );
}

export default NavBar;