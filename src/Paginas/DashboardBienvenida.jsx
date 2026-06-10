import React, { useState, useEffect } from 'react';
import { BiWrench, BiPackage, BiDollarCircle, BiHistory } from "react-icons/bi";
import '../CSS/PanelSol.css'; 

export default function DashboardBienvenida() {
  const [stats, setStats] = useState({ mantenimientos: "0 Activos", entregas: "0 Órdenes", totalEstimado: "$0 COP" });
  const [ultimasSolicitudes, setUltimasSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3000/api/dashboard/estadisticas').then(res => res.json()),
      fetch('http://localhost:3000/api/dashboard/ultimas-solicitudes').then(res => res.json())
    ])
    .then(([dataStats, dataLista]) => {
      if (!dataStats.error) {
        setStats(dataStats);
      }
      if (!dataLista.error) {
        setUltimasSolicitudes(dataLista);
      }
      setCargando(false);
    })
    .catch(err => {
      console.error("Error cargando datos del dashboard:", err);
      setCargando(false);
    });
  }, []);

  if (cargando) {
    return <div style={{ padding: '20px', color: '#666' }}>Cargando estadísticas del taller...</div>;
  }

  const tarjetasEstadisticas = [
    { id: 1, titulo: "Mantenimientos", total: stats.mantenimientos, icono: <BiWrench />, clase: "tarjeta-azul" },
    { id: 2, titulo: "Entregas Pendientes", total: stats.entregas, icono: <BiPackage />, clase: "tarjeta-amarilla" },
    { id: 3, titulo: "Total Estimado", total: stats.totalEstimado, icono: <BiDollarCircle />, clase: "tarjeta-verde" }
  ];

  return (
    <div className="contenedor-bienvenida-solicitudes">
      <div className="encabezado-dashboard">
        <h2>Bienvenido al Módulo de Solicitudes</h2>
        <p>Selecciona una opción del menú lateral para crear un registro o revisa el estado actual del taller aquí abajo.</p>
      </div>

      <div className="grid-tarjetas-dashboard">
        {tarjetasEstadisticas.map((stat) => (
          <div key={stat.id} className={`tarjeta-stat ${stat.clase}`}>
            <div className="icono-stat">{stat.icono}</div>
            <div className="info-stat">
              <h3>{stat.titulo}</h3>
              <p>{stat.total}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla Dinámica con Datos de MySQL */}
      <div className="seccion-actividad-reciente">
        <div className="titulo-tabla-dashboard">
          <BiHistory className="icono-titulo" />
          <h3>Últimas solicitudes ingresadas en Ingenix</h3>
        </div>
        
        <table className="tabla-dashboard">
          <thead>
            <tr>
              <th>ID Solicitud</th>
              <th>Tipo de Gestión</th>
              <th>Fecha Registro</th>
              <th>Valor Estimado</th>
            </tr>
          </thead>
          <tbody>
            {ultimasSolicitudes.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#888' }}>No hay solicitudes registradas aún.</td>
              </tr>
            ) : (
              ultimasSolicitudes.map((sol) => (
                <tr key={sol.idSolicitud}>
                  <td className="id-resaltado">#{sol.idSolicitud}</td>
                  <td>Mantenimiento</td>
                  <td>{sol.fecha}</td>
                  <td>
                    <span className="badge-estado completado">
                      ${Number(sol.total_estimado).toLocaleString('es-CO')} COP
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}