import express from 'express';
import conexion from '../config/db.js';

const router = express.Router();

router.post('/solicitudes', (req, res) => {
  const { orden, tipo, subtipo, danos, services, total, fecha } = req.body;

  const ordenLimpia = parseInt(orden.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 90000) + 10000;

  const querySolicitud = `
    INSERT INTO solicitud (idSolicitud, fecha_registro, total_estimado)
    VALUES (?, STR_TO_DATE(?, '%d/%m/%Y'), ?)
  `;

  conexion.query(querySolicitud, [ordenLimpia, fecha, total], (err, resultSolicitud) => {
    if (err) {
      console.error('❌ Error al insertar en solicitud:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!services || services.length === 0) {
      return res.status(201).json({ message: 'Solicitud guardada correctamente sin servicios' });
    }

    const idProductoAsignado = tipo === 'reloj' ? 1 : 2;

    const queryRelacion = `
      INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
      VALUES (?, ?, ?, ?)
    `;

    let completados = 0;
    let huboError = false;

    services.forEach((servicio) => {
      conexion.query(
        queryRelacion,
        [idProductoAsignado, ordenLimpia, 1, servicio.nombre],
        (errRelacion) => {
          if (huboError) return;

          if (errRelacion) {
            huboError = true;
            console.error('❌ Error al insertar en producto_y_solicitud:', errRelacion.message);
            return res.status(500).json({ error: errRelacion.message });
          }

          completados++;
          if (completados === services.length) {
            res.status(201).json({ message: 'Solicitud guardada correctamente en ingenix' });
          }
        }
      );
    });
  });
});

export default router;