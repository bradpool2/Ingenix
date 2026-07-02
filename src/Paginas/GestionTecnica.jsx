import React, { useState, useEffect } from 'react';
import '../CSS/PanelSol.css'; 
import { authFetch } from '../components/api.js';

export default function GestionTecnica() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cargar solicitudes al entrar
  const cargarSolicitudes = () => {
    authFetch('http://localhost:3000/api/tecnico/solicitudes')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSolicitudes(data);
        setCargando(false);
      })
      .catch(err => console.error("Error:", err));
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  // Función para cambiar el estado desde el frontend
  const cambiarEstado = (id, nuevoEstado) => {
    authFetch(`http://localhost:3000/api/tecnico/solicitudes/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevoEstado })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        alert(`Orden #${id} cambiada a: ${nuevoEstado}`);
        cargarSolicitudes(); // Recargar la lista actualizada
      }
    })
    .catch(err => console.error(err));
  };

  if (cargando) return <div style={{ padding: '20px' }}>Cargando panel técnico...</div>;

  return (
    <div className="seccion-actividad-reciente" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>Panel de Control Técnico — Ingenix</h2>
        <p style={{ color: '#555' }}>Administra los estados de reparación y entrega de las órdenes ingresadas.</p>
      </div>

      <table className="tabla-dashboard">
        <thead>
          <tr>
            <th>ID Orden</th>
            <th>Fecha Ingreso</th>
            <th>Total Estimado</th>
            <th>Estado Actual</th>
            <th>Acciones de Proceso</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((sol) => (
            <tr key={sol.idSolicitud}>
              <td className="id-resaltado">#{sol.idSolicitud}</td>
              <td>{sol.fecha}</td>
              <td>${Number(sol.total_estimado).toLocaleString('es-CO')} COP</td>
              <td>
                <span className={`badge-estado ${sol.estado.toLowerCase().replace(" ", "-")}`}>
                  {sol.estado}
                </span>
              </td>
              <td>
                {/* Selector rápido para cambiar estados */}
                <select 
                  value={sol.estado} 
                  onChange={(e) => cambiarEstado(sol.idSolicitud, e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="Pendiente">⏳ Marcar Pendiente</option>
                  <option value="En proceso">⚙️ Iniciar Trabajo</option>
                  <option value="Terminado">✅ Finalizar Reparación</option>
                  <option value="Entregado">📦 Entregar al Cliente</option>
                  <option value="Cancelado">❌ Cancelar Orden</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}