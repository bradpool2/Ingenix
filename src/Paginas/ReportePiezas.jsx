import React, { useEffect, useState } from 'react';
import '../CSS/Reporte.css';
// Al principio de server.js
const db = require('/db.js'); // Ajusta la ruta a donde está tu conexión

export default function ReportePiezas() {
  const [incidencias, setIncidencias] = useState([]);
  const [nuevaIncidencia, setNuevaIncidencia] = useState({ orden: '', pieza: '', motivo: '' });

  // Categorías para el selector dinámico
  const piezasDisponibles = {
    reloj: ['Vidrio rayado o roto', 'Caja golpeada', 'Corona rota o floja', 'Tapa trasera dañada', 'Correa desgastada', 'Cierre roto', 'Eslabones sueltos', 'No enciende / sin movimiento', 'Atrasa o adelanta', 'Agujas sueltas o caídas'],
    joyeria: ['Pieza rota o partida', 'Soldadura débil', 'Deformación visible', 'Baño desgastado', 'Opacidad / falta de brillo', 'Manchas o corrosión', 'Piedra suelta o perdida', 'Cierre dañado', 'Engaste flojo']
  };

  const fetchIncidencias = () => {
    fetch('http://localhost:3000/reporte-piezas-perdidas')
      .then(res => res.json())
      .then(data => setIncidencias(data))
      .catch(err => console.error("Error al cargar incidencias:", err));
  };

  useEffect(() => { fetchIncidencias(); }, []);

  const enviarReporte = async () => {
    // 1. Verifica antes de enviar: ¿Qué tiene nuevaIncidencia?
    console.log("Datos enviados:", JSON.stringify(nuevaIncidencia));

    const response = await fetch('http://localhost:3000/reporte-piezas-perdidas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaIncidencia)
    });

    // 2. Mira la respuesta del servidor en consola
    const result = await response.json();
    console.log("Respuesta del server:", result);
};

  return (
    <div className="perfil-container">
      <h2>Reportar Pieza Perdida/Dañada</h2>
      
      <div className="formulario-reporte">
        <input 
          placeholder="ID Orden" 
          value={nuevaIncidencia.orden}
          onChange={e => setNuevaIncidencia({...nuevaIncidencia, orden: e.target.value})} 
        />
        
        {/* Selector profesional */}
        <select 
          value={nuevaIncidencia.pieza}
          onChange={e => setNuevaIncidencia({...nuevaIncidencia, pieza: e.target.value})}
        >
          <option value="">Selecciona la pieza afectada...</option>
          <optgroup label="Relojes">
            {piezasDisponibles.reloj.map(p => <option key={p} value={p}>{p}</option>)}
          </optgroup>
          <optgroup label="Joyería">
            {piezasDisponibles.joyeria.map(p => <option key={p} value={p}>{p}</option>)}
          </optgroup>
        </select>

        <textarea 
          placeholder="Motivo de la pérdida" 
          value={nuevaIncidencia.motivo}
          onChange={e => setNuevaIncidencia({...nuevaIncidencia, motivo: e.target.value})} 
        />
        <button onClick={enviarReporte}>Reportar Incidencia</button>
      </div>

      <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid #eee' }} />

      <h3>Historial de Reportes</h3>
      <table className="tabla-reporte">
        <thead>
          <tr><th>Orden</th><th>Pieza</th><th>Motivo</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {incidencias.length === 0 ? (
            <tr><td colSpan="4" style={{textAlign: 'center'}}>No hay reportes activos</td></tr>
          ) : (
            incidencias.map((i, index) => (
              <tr key={index}>
                <td>{i.orden}</td>
                <td>{i.pieza}</td>
                <td>{i.motivo}</td>
                <td><span className="badge-pendiente">Pendiente de Admin</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}