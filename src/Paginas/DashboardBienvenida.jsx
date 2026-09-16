import React, { useState, useEffect } from 'react';
import { BiWrench, BiPackage, BiDollarCircle, BiHistory } from "react-icons/bi";
import '../CSS/PanelSol.css'; 
import { authFetch } from '../components/api.js';


export default function DashboardBienvenida() {
  const [periodo, setPeriodo] = useState('semana');
  const [stats, setStats] = useState({
    activosPeriodo: 0, activosHoy: 0, entregasPendientes: 0,
    mantenimientosPeriodo: 0, ventasPeriodo: 0, totalEstimadoPeriodo: 0,
  });
  const [ultimasSolicitudes, setUltimasSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch(`http://localhost:3000/api/dashboard/estadisticas?periodo=${periodo}`).then(res => res.json()),
      authFetch('http://localhost:3000/api/dashboard/ultimas-solicitudes').then(res => res.json())
    ])
    .then(([dataStats, dataLista]) => {
      if (!dataStats.error) {
        setStats(dataStats);
      }
      if (!dataLista.error) {
        setUltimasSolicitudes(Array.isArray(dataLista) ? dataLista : []);
      }
      setCargando(false);
    })
    .catch(err => {
      console.error("Error cargando datos del dashboard:", err);
      setCargando(false);
    });
  }, [periodo]);

  if (cargando) {
    return <div style={{ padding: '20px', color: '#666' }}>Cargando estadísticas del taller...</div>;
  }
  const dinero = Number(stats.totalEstimadoPeriodo || 0).toLocaleString('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  });
  const etiquetaPeriodo = periodo === 'dia' ? 'hoy' : 'últimos 7 días';
  const tarjetasEstadisticas = [
    { id: 1, titulo: `Solicitudes activas ${etiquetaPeriodo}`, total: stats.activosPeriodo, detalle: `Hoy: ${stats.activosHoy}`, icono: <BiWrench />, clase: "tarjeta-azul" },
    { id: 2, titulo: "Entregas pendientes", total: stats.entregasPendientes, detalle: "Listas para entrega", icono: <BiPackage />, clase: "tarjeta-amarilla" },
    { id: 3, titulo: `Valor estimado ${etiquetaPeriodo}`, total: dinero, detalle: `${stats.mantenimientosPeriodo} mantenimientos · ${stats.ventasPeriodo} ventas`, icono: <BiDollarCircle />, clase: "tarjeta-verde" }
  ];

  return (
    <div className="contenedor-bienvenida-solicitudes">
      <div className="encabezado-dashboard">
        <h2>Bienvenido al Módulo de Solicitudes</h2>
        <p>Selecciona una opción del menú lateral para crear un registro o revisa el estado actual del taller aquí abajo.</p>
        <label>
          Mostrar indicadores:
          <select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            <option value="dia">Hoy</option>
            <option value="semana">Últimos 7 días</option>
          </select>
        </label>
      </div>

      <div className="grid-tarjetas-dashboard">
        {tarjetasEstadisticas.map((stat) => (
          <div key={stat.id} className={`tarjeta-stat ${stat.clase}`}>
            <div className="icono-stat">{stat.icono}</div>
            <div className="info-stat">
              <h3>{stat.titulo}</h3>
              <p>{stat.total}</p>
              <small>{stat.detalle}</small>
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
              <th>Número de orden</th>
              <th>Tipo de Gestión</th>
              <th>Estado</th>
              <th>Fecha Registro</th>
              <th>Valor Estimado</th>
            </tr>
          </thead>
          <tbody>
            {ultimasSolicitudes.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>No hay solicitudes registradas aún.</td>
              </tr>
            ) : (
              ultimasSolicitudes.map((sol) => (
                <tr key={sol.idSolicitud}>
                  <td className="id-resaltado">#{sol.numeroOrden || sol.idSolicitud}</td>
                  <td>{sol.tipo || 'Mantenimiento'}</td>
                  <td><span className="badge-estado">{sol.estado || 'Pendiente'}</span></td>
                  <td>{sol.fecha}</td>
                  <td>
                    <span className="badge-estado completado">
                      ${Number(sol.totalEstimado ?? sol.total_estimado ?? 0).toLocaleString('es-CO')} COP
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