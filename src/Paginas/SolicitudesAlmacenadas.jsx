import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../components/api.js';
import '../CSS/PanelSol.css';

const API = 'http://localhost:3000';

export default function SolicitudesAlmacenadas() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const usuario = JSON.parse(localStorage.getItem('user') || 'null');
  const esAdmin = usuario?.rol === 'admin';

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await authFetch(`${API}/solicitudes/almacenado`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || datos.error || 'No se pudieron cargar las solicitudes.');
      setSolicitudes(Array.isArray(datos) ? datos : []);
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarArchivado = async () => {
    setEjecutando(true);
    setMensaje('');
    try {
      const respuesta = await authFetch(`${API}/solicitudes/almacenado/ejecutar`, { method: 'POST' });
      const datos = await respuesta.json();
      if (!respuesta.ok && respuesta.status !== 207) {
        throw new Error(datos.message || datos.error || 'No se pudo ejecutar el almacenado automático.');
      }
      setMensaje(datos.message || `Se archivaron ${datos.archivadas} solicitudes.`);
      await cargar();
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <section className="seccion-actividad-reciente" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
        <div>
          <h2>Solicitudes almacenadas</h2>
          <p>Consultas de mantenimiento archivadas después de 30 días en estado aprobado.</p>
        </div>
        {esAdmin && (
          <button type="button" onClick={ejecutarArchivado} disabled={ejecutando}>
            {ejecutando ? 'Archivando...' : 'Ejecutar almacenado automático'}
          </button>
        )}
      </div>
      {mensaje && <p role="status">{mensaje}</p>}
      {cargando ? <p>Cargando solicitudes...</p> : solicitudes.length === 0 ? (
        <p>No hay solicitudes almacenadas.</p>
      ) : (
        <table className="tabla-dashboard">
          <thead>
            <tr><th>Orden</th><th>Cliente</th><th>Fecha de registro</th><th>Servicios</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {solicitudes.map((solicitud) => (
              <tr key={solicitud.idSolicitud}>
                <td>#{solicitud.numeroOrden || solicitud.idSolicitud}</td>
                <td>{solicitud.clienteNombre || '—'}</td>
                <td>{solicitud.fechaRegistro ? new Date(solicitud.fechaRegistro).toLocaleDateString('es-CO') : '—'}</td>
                <td>{solicitud.servicios || '—'}</td>
                <td>{solicitud.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
