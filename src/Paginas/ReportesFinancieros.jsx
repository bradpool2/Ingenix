import { useState, useEffect } from 'react';
import '../CSS/Solicitudes.css';

export default function ReporteFinanciero() {

  const [rango, setRango] = useState('mes');
  const [datos, setDatos] = useState([]);
  const [totales, setTotales] = useState({ mantenimiento: { total: 0, cantidad: 0 }, venta: { total: 0, cantidad: 0 } });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [rango]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resDatos, resTotales] = await Promise.all([
        fetch(`http://localhost:3000/reportes/financiero?rango=${rango}`),
        fetch(`http://localhost:3000/reportes/financiero/totales`)
      ]);
      setDatos(await resDatos.json());
      setTotales(await resTotales.json());
    } catch (err) {
      console.error('Error al cargar reporte:', err);
    } finally {
      setCargando(false);
    }
  };

  const fmt = (n) => `$${Number(n).toLocaleString('es-CO')} COP`;

  const totalGeneral = totales.mantenimiento.total + totales.venta.total;
  const maxValor = Math.max(...datos.map(d => Math.max(d.mantenimiento, d.venta)), 1);

  const generarPDF = () => {
    const etiquetaRango = rango === 'semana' ? 'Semanal' : rango === 'mes' ? 'Mensual' : 'Anual';

    const filasTabla = datos.map(d => `
      <tr>
        <td>${d.periodo}</td>
        <td>${fmt(d.mantenimiento)}</td>
        <td>${fmt(d.venta)}</td>
        <td><strong>${fmt(d.mantenimiento + d.venta)}</strong></td>
      </tr>
    `).join('');

    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head>
          <title>Reporte Financiero - Ingenix</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .subtitulo { color: #888; font-size: 13px; margin-bottom: 24px; }
            .resumen { display: flex; gap: 16px; margin-bottom: 24px; }
            .tarjeta { border: 2px solid #222; border-radius: 10px; padding: 14px 18px; flex: 1; }
            .tarjeta .label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; }
            .tarjeta .valor { font-size: 18px; font-weight: bold; margin-top: 4px; }
            .tarjeta .cantidad { font-size: 11px; color: #888; margin-top: 2px; }
            .destacada { background: #222; color: white; }
            .destacada .label, .destacada .cantidad { color: #ccc; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background: #222; color: white; }
            tr:nth-child(even) { background: #f9f9f9; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Reporte Financiero - Ingenix</h1>
          <p class="subtitulo">Periodo: ${etiquetaRango} · Generado: ${new Date().toLocaleDateString('es-CO')}</p>

          <div class="resumen">
            <div class="tarjeta">
              <div class="label">Mantenimiento</div>
              <div class="valor">${fmt(totales.mantenimiento.total)}</div>
              <div class="cantidad">${totales.mantenimiento.cantidad} solicitudes</div>
            </div>
            <div class="tarjeta">
              <div class="label">Ventas</div>
              <div class="valor">${fmt(totales.venta.total)}</div>
              <div class="cantidad">${totales.venta.cantidad} ventas</div>
            </div>
            <div class="tarjeta destacada">
              <div class="label">Total general</div>
              <div class="valor">${fmt(totalGeneral)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Mantenimiento</th>
                <th>Ventas</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${filasTabla || '<tr><td colspan="4">No hay datos para este periodo</td></tr>'}
            </tbody>
          </table>

          <button onclick="window.print()" style="margin-top:24px; padding:10px 20px; background:#222; color:white; border:none; border-radius:8px; cursor:pointer;">
            Imprimir / Guardar como PDF
          </button>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div className="reporte-contenedor">

      <p className="formulario-titulo">Reporte financiero</p>
      <p className="formulario-subtitulo">Ingresos por mantenimiento y ventas</p>
      <button className="btn-siguiente" onClick={generarPDF} style={{ alignSelf: 'flex-start' }}>
        Generar reporte PDF
      </button>

      <div className="reporte-tarjetas">
        <div className="reporte-tarjeta">
          <span className="reporte-tarjeta-label">Mantenimiento</span>
          <span className="reporte-tarjeta-valor">{fmt(totales.mantenimiento.total)}</span>
          <span className="reporte-tarjeta-cantidad">{totales.mantenimiento.cantidad} solicitudes</span>
        </div>
        <div className="reporte-tarjeta">
          <span className="reporte-tarjeta-label">Ventas</span>
          <span className="reporte-tarjeta-valor">{fmt(totales.venta.total)}</span>
          <span className="reporte-tarjeta-cantidad">{totales.venta.cantidad} ventas</span>
        </div>
        <div className="reporte-tarjeta destacada">
          <span className="reporte-tarjeta-label">Total general</span>
          <span className="reporte-tarjeta-valor">{fmt(totalGeneral)}</span>
        </div>
      </div>

      <div className="entrega-filtros">
        {['semana', 'mes', 'anio'].map(r => (
          <button
            key={r}
            className={`filtro-btn ${rango === r ? 'activo' : ''}`}
            onClick={() => setRango(r)}
          >
            {r === 'semana' ? 'Semanal' : r === 'mes' ? 'Mensual' : 'Anual'}
          </button>
        ))}
      </div>

      <div className="reporte-grafica">
        {cargando ? (
          <p className="resumen-vacio">Cargando...</p>
        ) : datos.length === 0 ? (
          <p className="resumen-vacio">No hay datos para este periodo</p>
        ) : (
          datos.map((d) => (
            <div key={d.periodo} className="grafica-columna">
              <div className="grafica-barras">
                <div
                  className="barra mantenimiento"
                  style={{ height: `${(d.mantenimiento / maxValor) * 160}px` }}
                  title={fmt(d.mantenimiento)}
                />
                <div
                  className="barra venta"
                  style={{ height: `${(d.venta / maxValor) * 160}px` }}
                  title={fmt(d.venta)}
                />
              </div>
              <span className="grafica-label">{d.periodo}</span>
            </div>
          ))
        )}
      </div>

      <div className="grafica-leyenda">
        <span><span className="leyenda-color mantenimiento" /> Mantenimiento</span>
        <span><span className="leyenda-color venta" /> Ventas</span>
      </div>

      <table className="reporte-tabla">
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Mantenimiento</th>
            <th>Ventas</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.periodo}>
              <td>{d.periodo}</td>
              <td>{fmt(d.mantenimiento)}</td>
              <td>{fmt(d.venta)}</td>
              <td><strong>{fmt(d.mantenimiento + d.venta)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}