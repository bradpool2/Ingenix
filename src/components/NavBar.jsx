import React from 'react';
import { Link } from 'react-router-dom';
import '../CSS/NavBar.css';
import logo from '../assets/Logo_reloj.png';

function NavBar({ cerrarSesion }) {
  const user = JSON.parse(localStorage.getItem('user'));

  

  return (
    <nav>
      <div className="nav-links">

        <div className='logo-container'>
          <img className='logo' src={logo} alt="Logo" />
        </div>

        {/* INVITADO */}
        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {/* USUARIO LOGUEADO */}
        {user && (
          <>
            <Link to="/home">Home</Link>

            {user.rol === 'admin' && (
              <>
                <Link to="/solicitud">Solicitud</Link>
                <Link to="/usuarios">Usuarios</Link>
              </>
            )}

            {user.rol === 'tecnico' && (
              <>
                <Link to="/relojes">Relojes</Link>
                <Link to="/solicitudes">Solicitudes</Link>
              </>
            )}

            {user.rol === 'cliente' && (
              <>
                <Link to="/mis-solicitudes">Mis Solicitudes</Link>
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