import React from 'react';
import '../CSS/AdminPanel.css';

const ROLES = ['admin', 'tecnico', 'usuario', 'Cliente'];

export default function UserManagement({ users, onUpdate, onDelete }) {
  return (
    <div className="view-content">
      {Array.isArray(users) && users.length === 0 && (
        <p className="empty-msg">No hay usuarios registrados.</p>
      )}

      {Array.isArray(users) && users.map(u => (
        <div key={u.id} className="user-row">
          <span className="user-id">#{u.id}</span>
          <div className="user-fields">
            <input
              className="field-input"
              value={u.user}
              onChange={(e) => onUpdate({ ...u, user: e.target.value })}
              placeholder="Usuario"
            />
            <select
              className="field-select"
              value={u.rol}
              onChange={(e) => onUpdate({ ...u, rol: e.target.value })}
            >
              {ROLES.map(rol => (
                <option key={rol} value={rol}>{rol}</option>
              ))}
            </select>
          </div>
          <button className="btn-delete" onClick={() => onDelete(u.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  );
}