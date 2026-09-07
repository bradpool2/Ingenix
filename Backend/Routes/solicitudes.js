import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import conexion from '../config/db.js';
import { crearNotificacion } from '../Services/notificaciones.js';
import { verificarToken, soloAdmin, soloTecnico } from '../Middleware/Auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const TIPO_SOLICITUD = {
  MANTENIMIENTO: 1,
  VENTA: 4,
};
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'solicitudes');
 
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
 
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombreUnico);
  },
});
 
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
 
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('FORMATO_NO_PERMITIDO'));
    }
    cb(null, true);
  },
});
function generarNumeroOrden() {
  const fecha = new Date();
  const yyyymmdd = fecha.toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  return `SOL-${yyyymmdd}-${aleatorio}`;
}
 
function validarMantenimiento(body) {
  const errores = [];
  if (!body.nombreArticulo || !body.nombreArticulo.trim()) {
    errores.push('Indica qué artículo necesita mantenimiento.');
  }
  if (!body.descripcion || !body.descripcion.trim()) {
    errores.push('Describe el daño o el motivo del mantenimiento.');
  }
  if (body.urgencia && !['Baja', 'Media', 'Alta'].includes(body.urgencia)) {
    errores.push('Urgencia inválida.');
  }
  return errores;
}
 
function validarVenta(body) {
  const errores = [];
  if (!body.nombreArticulo || !body.nombreArticulo.trim()) {
    errores.push('Indica qué producto quieres vender.');
  }
  if (!body.descripcion || !body.descripcion.trim()) {
    errores.push('La descripción del producto es obligatoria.');
  }
  if (
    body.estadoArticulo &&
    !['Excelente', 'Bueno', 'Regular', 'Malo'].includes(body.estadoArticulo)
  ) {
    errores.push('Estado del artículo inválido.');
  }
  if (body.precioEstimado !== undefined && body.precioEstimado !== '') {
    const precio = Number(body.precioEstimado);
    if (Number.isNaN(precio) || precio < 0) {
      errores.push('El precio estimado debe ser un número válido.');
    }
  }
  return errores;
}
// Crear solicitud
router.post('/solicitudes', (req, res) => {
  const { orden, tipo, subtipo, danos, services, total, fecha } = req.body;

  const querySolicitud = `
    INSERT INTO solicitud (
      numeroOrden,
      fecha_registro,
      total_estimado,
      TipoDeSolicitud_idDeSolicitud
    )
    VALUES (
      ?,
      STR_TO_DATE(?, '%d/%m/%Y'),
      ?,
      1
    )
  `;

  conexion.query(querySolicitud, [orden, fecha, total], (err, resultSolicitud) => {
    if (err) {
      console.error('❌ Error al insertar en solicitud:', err.message);
      return res.status(500).json({ error: err.message });
    }

    const idSolicitud = resultSolicitud.insertId;

    if (!services || services.length === 0) {
      return res.status(201).json({ message: 'Solicitud guardada correctamente sin servicios' });
    }

    res.status(201).json({ message: 'Solicitud guardada correctamente', idSolicitud });
  });
});

// Traer todas las solicitudes
router.get('/solicitudes', verificarToken, soloTecnico, (req, res) => {
  const params = [];
  const filtroTecnico = req.usuario.rol === 'tecnico'
    ? 'WHERE s.tecnico_asignado = ?'
    : '';
  if (filtroTecnico) params.push(String(req.usuario.id));
  const query = `
    SELECT 
      s.idsolicitud AS "idSolicitud",
      s.numeroorden AS "numeroOrden",
      CASE WHEN s.tipodesolicitud_iddesolicitud = 4 THEN 'Venta' ELSE 'Mantenimiento' END AS tipo,
      s.fecha_registro AS "fechaRegistro",
      s.total_estimado AS "totalEstimado",
      s.estado,
      s.urgencia,
      s.tecnico_asignado AS "tecnicoAsignado",
      COALESCE(u.nombre, s.tecnico_asignado) AS "tecnicoNombre",
      s.observacion_admin AS "observacionAdmin",
      clienteUsuario.nombre AS "clienteNombre",
      COALESCE(
        STRING_AGG(ds.nombrearticulo || ': ' || ds.descripcion, ', '),
        STRING_AGG(ps.detalle_servicio, ', ')
      ) AS servicios
    FROM solicitud s
    LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
    LEFT JOIN detalle_solicitud ds ON ds.solicitud_idsolicitud = s.idsolicitud
    LEFT JOIN usuario u ON u.idusuario::text = s.tecnico_asignado::text
    LEFT JOIN cliente c ON c.idcliente = s.cliente_idcliente
    LEFT JOIN usuario clienteUsuario ON clienteUsuario.idusuario = c.usuario_idusuario
    ${filtroTecnico}
    GROUP BY s.idsolicitud, s.numeroorden, s.fecha_registro, s.total_estimado,
      s.estado, s.urgencia, s.tecnico_asignado, u.nombre, s.observacion_admin,
      s.cliente_idcliente, clienteUsuario.nombre
    ORDER BY s.fecha_registro DESC
  `;

  conexion.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(Array.isArray(results) ? results : []);
  });
});

router.get('/solicitudes/mis-solicitudes', verificarToken, (req, res) => {
  const query = `
    SELECT
      s.idsolicitud AS "idSolicitud",
      s.numeroorden AS "numeroOrden",
      s.fecha_registro AS "fechaRegistro",
      s.estado,
      s.urgencia,
      s.total_estimado AS "totalEstimado",
      COALESCE(STRING_AGG(ds.nombrearticulo || ': ' || ds.descripcion, ', '), '') AS servicios
    FROM solicitud s
    INNER JOIN cliente c ON c.idcliente = s.cliente_idcliente
    LEFT JOIN detalle_solicitud ds ON ds.solicitud_idsolicitud = s.idsolicitud
    WHERE c.usuario_idusuario = ?
    GROUP BY s.idsolicitud, s.numeroorden, s.fecha_registro, s.estado,
      s.urgencia, s.total_estimado
    ORDER BY s.fecha_registro DESC
  `;
  conexion.query(query, [req.usuario.id], (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(Array.isArray(resultados) ? resultados : []);
  });
});

// Solicitudes de mantenimiento archivadas. Solo el personal interno puede consultarlas.
router.get('/solicitudes/almacenado', verificarToken, soloTecnico, (req, res) => {
  const query = `
    SELECT
      s.idsolicitud AS "idSolicitud",
      s.numeroorden AS "numeroOrden",
      s.fecha_registro AS "fechaRegistro",
      s.estado,
      s.urgencia,
      s.total_estimado AS "totalEstimado",
      clienteUsuario.nombre AS "clienteNombre",
      COALESCE(
        STRING_AGG(ds.nombrearticulo || ': ' || ds.descripcion, ', '),
        STRING_AGG(ps.detalle_servicio, ', ')
      ) AS servicios
    FROM solicitud s
    LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
    LEFT JOIN detalle_solicitud ds ON ds.solicitud_idsolicitud = s.idsolicitud
    LEFT JOIN cliente c ON c.idcliente = s.cliente_idcliente
    LEFT JOIN usuario clienteUsuario ON clienteUsuario.idusuario = c.usuario_idusuario
    WHERE s.TipoDeSolicitud_idDeSolicitud = 1
      AND s.estado = 'Almacenado'
    GROUP BY s.idsolicitud, s.numeroorden, s.fecha_registro, s.estado,
      s.urgencia, s.total_estimado, clienteUsuario.nombre
    ORDER BY s.fecha_registro DESC
  `;

  conexion.query(query, (error, resultados) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json(resultados);
  });
});

// Archiva de forma idempotente los mantenimientos aprobados con más de 30 días.
// Esta operación está restringida a administradores para evitar cambios de estado no autorizados.
router.post('/solicitudes/almacenado/ejecutar', verificarToken, soloAdmin, (req, res) => {
  const query = `
    UPDATE solicitud
    SET estado = 'Almacenado'
    WHERE TipoDeSolicitud_idDeSolicitud = 1
      AND estado = 'Aprobado'
      AND fecha_registro IS NOT NULL
      AND fecha_registro < CURRENT_TIMESTAMP - INTERVAL '30 days'
    RETURNING idsolicitud AS "idSolicitud", numeroorden AS "numeroOrden",
      cliente_idcliente AS "clienteId", fecha_registro AS "fechaRegistro"
  `;

  conexion.query(query, async (error, archivadas) => {
    if (error) return res.status(500).json({ error: error.message });

    const solicitudes = Array.isArray(archivadas) ? archivadas : [];
    try {
      await Promise.all(solicitudes.map(async (solicitud) => {
        const clientes = await new Promise((resolve, reject) => {
          conexion.query(
            `SELECT u.idusuario AS "usuarioId"
             FROM cliente c
             INNER JOIN usuario u ON u.idusuario = c.usuario_idusuario
             WHERE c.idcliente = ?`,
            [solicitud.clienteId],
            (clienteError, resultados) => clienteError ? reject(clienteError) : resolve(resultados)
          );
        });
        const usuarioId = clientes[0]?.usuarioId;
        const notificaciones = [
          usuarioId && crearNotificacion({
            titulo: 'Solicitud almacenada',
            mensaje: `La solicitud ${solicitud.numeroOrden || `#${solicitud.idSolicitud}`} fue almacenada automáticamente después de 30 días.`,
            tipo: 'sistema',
            rolDestino: 'cliente',
            usuarioIds: [usuarioId],
            idSolicitud: solicitud.idSolicitud,
          }),
          crearNotificacion({
            titulo: 'Solicitud archivada automáticamente',
            mensaje: `La solicitud ${solicitud.numeroOrden || `#${solicitud.idSolicitud}`} cambió a estado Almacenado.`,
            tipo: 'sistema',
            rolDestino: 'admin',
            idSolicitud: solicitud.idSolicitud,
          }),
        ].filter(Boolean);
        await Promise.all(notificaciones);
      }));
      return res.json({
        message: 'Proceso de almacenado automático completado.',
        archivadas: solicitudes.length,
        solicitudes,
      });
    } catch (notificationError) {
      console.error('❌ Solicitudes archivadas, pero falló una notificación:', notificationError.message);
      return res.status(207).json({
        message: 'Solicitudes archivadas, pero no se pudieron crear todas las notificaciones.',
        archivadas: solicitudes.length,
        solicitudes,
        advertencia: true,
      });
    }
  });
});

router.post('/solicitudes/cliente', upload.single('imagen'), (req, res) => {
  const { tipo, cliente_idCliente } = req.body;
 
  if (!cliente_idCliente) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(401).json({ message: 'Debes iniciar sesión para enviar una solicitud.' });
  }
 
  if (!['mantenimiento', 'venta'].includes(tipo)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'Tipo de solicitud inválido.' });
  }
 
  const errores =
    tipo === 'mantenimiento' ? validarMantenimiento(req.body) : validarVenta(req.body);
 
  if (errores.length > 0) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: errores.join(' '), errores });
  }
 
  const idTipoSolicitud =
    tipo === 'mantenimiento' ? TIPO_SOLICITUD.MANTENIMIENTO : TIPO_SOLICITUD.VENTA;
 
  const numeroOrden = generarNumeroOrden();
  const rutaImagen = req.file ? `/uploads/solicitudes/${req.file.filename}` : null;
 
  const precioEstimado =
    tipo === 'venta' && req.body.precioEstimado ? Number(req.body.precioEstimado) : null;
 
  const urgencia = tipo === 'mantenimiento' ? req.body.urgencia || 'Media' : 'Media';
 
  const queryInsertarSolicitud = `
    INSERT INTO solicitud (
      numeroOrden,
      fecha_registro,
      cliente_idCliente,
      estado,
      urgencia,
      total_estimado,
      TipoDeSolicitud_idDeSolicitud
    )
    VALUES (?, NOW(), ?, 'Pendiente', ?, ?, ?)
  `;
 
  conexion.query(
    queryInsertarSolicitud,
    [
      numeroOrden,
      cliente_idCliente,
      urgencia,
      precioEstimado ? Math.round(precioEstimado) : null,
      idTipoSolicitud,
    ],
    (errSolicitud, resultSolicitud) => {
      if (errSolicitud) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('❌ Error al insertar en solicitud:', errSolicitud.message);
        return res.status(500).json({ error: errSolicitud.message });
      }
 
      const idSolicitud = resultSolicitud.insertId;
 
      const queryInsertarDetalle = `
        INSERT INTO detalle_solicitud (
          solicitud_idSolicitud,
          nombreArticulo,
          descripcion,
          estadoArticulo,
          precioEstimado,
          imagen
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `;
 
      conexion.query(
        queryInsertarDetalle,
        [
          idSolicitud,
          req.body.nombreArticulo.trim(),
          req.body.descripcion.trim(),
          tipo === 'venta' ? req.body.estadoArticulo || null : null,
          precioEstimado,
          rutaImagen,
        ],
        (errDetalle) => {
          if (errDetalle) {
            if (req.file) fs.unlink(req.file.path, () => {});
            console.error('❌ Error al insertar en detalleSolicitud:', errDetalle.message);
            return res.status(500).json({ error: errDetalle.message });
          }
 
          Promise.all([
            crearNotificacion({
              titulo: 'Nueva solicitud recibida',
              mensaje: `La solicitud ${numeroOrden} requiere revisión.`,
              tipo: 'sistema',
              rolDestino: 'admin',
              idSolicitud,
              prioridad: urgencia === 'Alta' ? 'alta' : 'normal',
              requiereAccion: true,
            }),
            crearNotificacion({
              titulo: 'Nueva solicitud disponible',
              mensaje: `La solicitud ${numeroOrden} está pendiente de asignación.`,
              tipo: 'sistema',
              rolDestino: 'tecnico',
              idSolicitud,
              prioridad: urgencia === 'Alta' ? 'alta' : 'normal',
              requiereAccion: true,
            }),
          ])
            .then(() => res.status(201).json({
              message: 'Solicitud enviada correctamente',
              idSolicitud,
              numeroOrden,
            }))
            .catch((errorNotificacion) => {
              console.error('❌ Solicitud creada, pero falló la notificación:', errorNotificacion.message);
              res.status(201).json({
                message: 'Solicitud creada, pero no se pudo enviar la notificación interna.',
                idSolicitud,
                numeroOrden,
                advertencia: true,
              });
            });
        }
      );
    }
  );
});

// Buscar solicitud por id
router.get('/solicitudes/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      s.idsolicitud AS "idSolicitud",
      s.numeroorden AS "numeroOrden",
      s.fecha_registro AS "fechaRegistro",
      s.total_estimado AS "totalEstimado",
      s.estado,
      s.urgencia,
      s.tecnico_asignado AS "tecnicoAsignado",
      COALESCE(u.nombre, s.tecnico_asignado) AS "tecnicoNombre",
      clienteUsuario.nombre AS "clienteNombre",
      s.observacion_admin AS "observacionAdmin",
      COALESCE(
        STRING_AGG(ds.nombrearticulo || ': ' || ds.descripcion, ', '),
        STRING_AGG(ps.detalle_servicio, ', ')
      ) AS servicios
    FROM solicitud s
    LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
    LEFT JOIN detalle_solicitud ds ON ds.solicitud_idsolicitud = s.idsolicitud
    LEFT JOIN usuario u ON u.idusuario::text = s.tecnico_asignado::text
    LEFT JOIN cliente c ON c.idcliente = s.cliente_idcliente
    LEFT JOIN usuario clienteUsuario ON clienteUsuario.idusuario = c.usuario_idusuario
    WHERE s.idsolicitud = ?
    GROUP BY s.idsolicitud, s.numeroorden, s.fecha_registro, s.total_estimado,
      s.estado, s.urgencia, s.tecnico_asignado, u.nombre, s.observacion_admin,
      clienteUsuario.nombre
  `;

  conexion.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(results[0]);
  });
});

// Cambiar estado
router.put('/solicitudes/:id/estado', verificarToken, soloTecnico, (req, res) => {
  const { id } = req.params;
  const { estado, tecnico_asignado, observacion_admin } = req.body;

  const estadosValidos = ['Pendiente', 'En proceso', 'Terminado', 'En revision', 'Aprobado', 'Entregado', 'Almacenado', 'Cancelado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  let query = `UPDATE solicitud SET estado = ?`;
  const params = [estado];

  if (tecnico_asignado) {
    query += `, tecnico_asignado = ?`;
    params.push(tecnico_asignado);
  }

  if (observacion_admin) {
    query += `, observacion_admin = ?`;
    params.push(observacion_admin);
  }

  query += ` WHERE idSolicitud = ?`;
  params.push(id);

  conexion.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    conexion.query(
      `SELECT u.idusuario AS "usuarioId"
       FROM solicitud s
       INNER JOIN cliente c ON c.idcliente = s.cliente_idcliente
       INNER JOIN usuario u ON u.idusuario = c.usuario_idusuario
       WHERE s.idsolicitud = ?`,
      [id],
      (errorCliente, clientes) => {
        if (errorCliente) return res.status(500).json({ error: errorCliente.message });
        const usuarioId = clientes[0]?.usuarioId;
        const avisarCliente = usuarioId
          ? crearNotificacion({
            titulo: 'Actualización de tu solicitud',
            mensaje: `Tu solicitud #${id} ahora está: ${estado}.`,
            tipo: 'sistema',
            rolDestino: 'cliente',
            usuarioIds: [usuarioId],
            idSolicitud: id,
          })
          : Promise.resolve();

        avisarCliente
          .then(() => res.json({ message: 'Estado actualizado correctamente' }))
          .catch((notificationError) => {
            console.error('❌ Estado actualizado, pero falló la notificación:', notificationError.message);
            res.json({
              message: 'Estado actualizado correctamente, pero no se pudo notificar al cliente.',
              advertencia: true,
            });
          });
      }
    );
  });
});
// Reporte financiero — semana / mes / año
router.get('/reportes/financiero', (req, res) => {
  const { rango } = req.query; // 'semana', 'mes', 'anio'

  let formatoFecha;
  if (rango === 'semana') {
    formatoFecha = 'IYYY-IW'; // año-semana ISO
  } else if (rango === 'anio') {
    formatoFecha = 'YYYY';
  } else {
    formatoFecha = 'YYYY-MM'; // mes por defecto
  }

  const query = `
    SELECT 
      TO_CHAR(s.fecha_registro, '${formatoFecha}') AS periodo,
      s.TipoDeSolicitud_idDeSolicitud AS tipo,
      SUM(s.total_estimado) AS total
    FROM solicitud s
    WHERE s.estado = 'Entregado'
    GROUP BY periodo, tipo
    ORDER BY periodo ASC
  `;

  conexion.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const datosAgrupados = {};

    results.forEach(row => {
      if (!datosAgrupados[row.periodo]) {
        datosAgrupados[row.periodo] = { periodo: row.periodo, mantenimiento: 0, venta: 0 };
      }
      if (Number(row.tipo) === 1) datosAgrupados[row.periodo].mantenimiento = Number(row.total) || 0;
      if (Number(row.tipo) === 4) datosAgrupados[row.periodo].venta = Number(row.total) || 0;
    });

    res.json(Array.isArray(results) ? Object.values(datosAgrupados) : []);
  });
});

// Totales generales (para las tarjetas resumen)
router.get('/reportes/financiero/totales', (req, res) => {
  const query = `
    SELECT 
      s.TipoDeSolicitud_idDeSolicitud AS tipo,
      SUM(s.total_estimado) AS total,
      COUNT(*) AS cantidad
    FROM solicitud s
    WHERE s.estado = 'Entregado'
    GROUP BY tipo
  `;

  conexion.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const resumen = { mantenimiento: { total: 0, cantidad: 0 }, venta: { total: 0, cantidad: 0 } };

    (Array.isArray(results) ? results : []).forEach(row => {
      if (row.tipo === 1) resumen.mantenimiento = { total: Number(row.total) || 0, cantidad: row.cantidad };
      if (row.tipo === 4) resumen.venta = { total: Number(row.total) || 0, cantidad: row.cantidad };
    });

    res.json(resumen);
  });
});
// Asignar técnico y/o urgencia (acción del admin)
router.put('/solicitudes/:id/asignar', (req, res) => {
  const { id } = req.params;
  const { tecnico_asignado, urgencia } = req.body;

  if (!tecnico_asignado && !urgencia) {
    return res.status(400).json({ message: 'Debes enviar al menos tecnico_asignado o urgencia' });
  }

  // Primero consultamos el estado actual
  conexion.query('SELECT estado FROM solicitud WHERE idSolicitud = ?', [id], (errConsulta, resultados) => {
    if (errConsulta) return res.status(500).json({ error: errConsulta.message });
    if (resultados.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const estadoActual = resultados[0].estado;

    let query = `UPDATE solicitud SET `;
    const params = [];
    const sets = [];

    if (tecnico_asignado) {
      sets.push('tecnico_asignado = ?');
      params.push(tecnico_asignado);

      // Solo cambia el estado si estaba en Pendiente
      if (estadoActual === 'Pendiente') {
        sets.push('estado = ?');
        params.push('En proceso');
      }
    }
    if (urgencia) {
      sets.push('urgencia = ?');
      params.push(urgencia);
    }

    query += sets.join(', ') + ' WHERE idSolicitud = ?';
    params.push(id);

    conexion.query(query, params, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const usuarioId = Number(tecnico_asignado);
      const notificarTecnico = Number.isInteger(usuarioId) && usuarioId > 0
        ? crearNotificacion({
          titulo: 'Solicitud asignada',
          mensaje: `Se te asignó la solicitud #${id}.`,
          tipo: 'sistema',
          rolDestino: 'tecnico',
          usuarioIds: [usuarioId],
          idSolicitud: id,
          requiereAccion: true,
        })
        : Promise.resolve();

      notificarTecnico
        .then(() => res.json({ message: 'Solicitud asignada correctamente' }))
        .catch((notificationError) => {
          console.error('❌ Solicitud asignada, pero falló la notificación:', notificationError.message);
          res.json({
            message: 'Solicitud asignada, pero no se pudo notificar al técnico.',
            advertencia: true,
          });
        });
    });
  });
});
// ---------------------------------------------------------------------------
// Manejo de errores de multer (tamaño, formato) para esta ruta
// ---------------------------------------------------------------------------
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'La imagen no debe superar 5 MB.' });
    }
  }
  if (err && err.message === 'FORMATO_NO_PERMITIDO') {
    return res.status(400).json({ message: 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.' });
  }
  next(err);
});
 

export default router;