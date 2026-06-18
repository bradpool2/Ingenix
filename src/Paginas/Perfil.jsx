import React from 'react';
import NavBar from '../components/NavBar';
import "../CSS/Global.css";
import "../CSS/Perfil.css";

const Perfil = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const rol = user?.rol?.toLowerCase();

  return (
    <div className="perfil-container">
      <NavBar />
      
      <main className="perfil-card">
        <div className="perfil-header">
          <div className="avatar">{user?.nombre?.charAt(0).toUpperCase()}</div>
          <h2>{user?.nombre}</h2>
          <span className="badge-rol">{rol}</span>
        </div>

        <div className="info-section">
          <h3>Información Personal</h3>
          <p><strong>Correo:</strong> {user?.correo}</p>
          <p><strong>Documento:</strong> {user?.documento}</p>
        </div>

        {rol === 'tecnico' && (
          <div className="info-section">
            <h3>Perfil Técnico</h3>
            <p><strong>Especialidad:</strong> Relojería / Joyería</p>
            <p><strong>Solicitudes atendidas este mes:</strong> 12</p>
          </div>
        )}

        <div className="actions">
          <button className="btn-edit" onClick={() => alert('Función de editar en construcción')}>
            Editar Perfil
          </button>
        </div>
      </main>
    </div>
  );
};

export default Perfil;