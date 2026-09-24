import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import conexion from '../config/db.js';
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

    const idProductoAsignado = 2;

    const detalleServicio = services
      .map((servicio) => servicio.nombre)
      .filter(Boolean)
      .join(', ');

    const queryRelacion = `
      INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
      VALUES (?, ?, ?, ?)
    `;

    conexion.query(
      queryRelacion,
      [idProductoAsignado, idSolicitud, 1, detalleServicio],
      (errRelacion) => {
        if (errRelacion) {
          console.error('❌ Error al relacionar servicios:', errRelacion.message);
          return res.status(500).json({ error: errRelacion.message });
        }
        res.status(201).json({ message: 'Solicitud guardada correctamente' });
      }
    );
  });
});

// Traer todas las solicitudes
router.get('/solicitudes', verificarToken, soloTecnico, (req, res) => {
  const query = `
    SELECT 
      s.idSolicitud AS "idSolicitud",
      s.numeroOrden AS "numeroOrden",
      s.fecha_registro,
      s.total_estimado,
      s.estado,
      s.urgencia,
      s.nombreTecnico,
      s.tecnico_asignado,
      s.observacion_admin AS "observacionAdmin",
      s.cliente_idCliente,
      COALESCE(u.nombre, 'Sin cliente asociado') AS "clienteNombre",
      s.TipoDeSolicitud_idDeSolicitud AS "tipo",
      GROUP_CONCAT(ps.detalle_servicio SEPARATOR ', ') AS servicios
    FROM solicitud s
    LEFT JOIN cliente c ON c.idcliente = s.cliente_idCliente
    LEFT JOIN usuario u ON u.idusuario = c.usuario_idusuario
    LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
    GROUP BY s.idSolicitud, u.nombre
    ORDER BY s.fecha_registro DESC
  `;

  conexion.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
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
          solicitud_idsolicitud,
          nombrearticulo,
          descripcion,
          estadoarticulo,
          precioestimado,
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
 
          return res.status(201).json({
            message: 'Solicitud enviada correctamente',
            idSolicitud,
            numeroOrden,
          });
        }
      );
    }
  );
});

const estadosAdmin = {
  Pendiente: ['Cancelado'],
  'En proceso': ['Cancelado'],
  Terminado: ['Cancelado'],
  'En revision': ['Aprobado', 'En proceso', 'Cancelado'],
  Aprobado: ['Entregado', 'Almacenado'],
};

// Solicitudes aprobadas que deben pasar al inventario.
router.get('/solicitudes/almacenado', verificarToken, soloAdmin, async (req, res) => {
  try {
    await conexion.query(`
      ALTER TABLE solicitud
        ADD COLUMN IF NOT EXISTS ubicacion TEXT,
        ADD COLUMN IF NOT EXISTS nota TEXT,
        ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(50)
    `);
    await conexion.query(`
      UPDATE solicitud
      SET estado = 'Almacenado'
      WHERE estado = 'Aprobado'
        AND fecha_registro <= CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);
    const { rows } = await conexion.query(`
      SELECT s.idSolicitud AS "idSolicitud", s.numeroOrden AS "numeroOrden",
             s.fecha_registro AS "fechaRegistro", s.estado,
             s.ubicacion, s.nota, s.estado_revision AS "estadoRevision",
             COALESCE(STRING_AGG(COALESCE(ps.detalle_servicio, ''), ', '), '') AS servicios
      FROM solicitud s
      LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
      WHERE s.estado = 'Almacenado'
      GROUP BY s.idSolicitud, s.numeroOrden, s.fecha_registro, s.estado,
               s.ubicacion, s.nota, s.estado_revision
      ORDER BY s.fecha_registro DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar solicitud por id. Incluye el detalle estructurado y las imágenes
// guardadas en la solicitud nueva o dentro del texto legado de servicios.
router.get('/solicitudes/:id', async (req, res) => {
  try {
    const { rows } = await conexion.query(`
      SELECT
        s.idSolicitud AS "idSolicitud",
        s.numeroOrden AS "numeroOrden",
        s.fecha_registro AS "fechaRegistro",
        s.total_estimado AS "totalEstimado",
        s.estado,
        s.urgencia,
        s.nombreTecnico,
        s.tecnico_asignado,
        s.observacion_admin AS "observacionAdmin",
        s.cliente_idCliente AS "clienteId",
        COALESCE(u.nombre, 'Sin cliente asociado') AS "clienteNombre",
        s.TipoDeSolicitud_idDeSolicitud AS "tipo",
        co.monto AS contraoferta,
        co.comentario AS "comentarioContraoferta",
        ds.precio_final AS "precioFinal",
        ds.nombrearticulo AS "nombreArticulo",
        ds.descripcion,
        ds.estadoarticulo AS "estadoArticulo",
        ds.precioestimado AS "precioEstimado",
        ds.imagen,
        COALESCE(STRING_AGG(DISTINCT si.ruta, ','), '') AS "imagenesGuardadas",
        COALESCE(STRING_AGG(DISTINCT COALESCE(ps.detalle_servicio, ''), ', '), '') AS servicios
      FROM solicitud s
      LEFT JOIN cliente c ON c.idcliente = s.cliente_idCliente
      LEFT JOIN usuario u ON u.idusuario = c.usuario_idusuario
      LEFT JOIN detalle_solicitud ds ON ds.solicitud_idsolicitud = s.idSolicitud
      LEFT JOIN solicitud_imagen si ON si.solicitud_id = s.idSolicitud
      LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
      LEFT JOIN LATERAL (
        SELECT monto, comentario
        FROM contraoferta_solicitud
        WHERE solicitud_id = s.idSolicitud
        ORDER BY creado_en DESC
        LIMIT 1
      ) co ON true
      WHERE s.idSolicitud = $1
      GROUP BY s.idSolicitud, u.nombre, ds.nombrearticulo, ds.descripcion,
        ds.estadoarticulo, ds.precioestimado, ds.imagen, ds.precio_final,
        co.monto, co.comentario
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const detalle = rows[0];
    const imagenes = [
      ...(detalle.imagen ? String(detalle.imagen).split(',').map((url) => url.trim()) : []),
      ...(detalle.imagenesGuardadas ? String(detalle.imagenesGuardadas).split(',') : []),
      ...(String(detalle.servicios || '').match(/\/uploads\/solicitudes\/[^\s,|]+/g) || []),
    ].filter((url, index, lista) => url && lista.indexOf(url) === index);
    detalle.imagenes = imagenes;
    res.json(detalle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/solicitudes/:id/contraoferta', verificarToken, soloAdmin, async (req, res) => {
  const monto = Number(req.body.monto);
  const comentario = req.body.comentario?.toString().trim() || null;
  if (!Number.isFinite(monto) || monto < 0) {
    return res.status(400).json({ error: 'El monto de la contraoferta no es válido.' });
  }
  try {
    const result = await conexion.query(`
      INSERT INTO contraoferta_solicitud (solicitud_id, monto, comentario, usuario_id)
      SELECT idSolicitud, $1, $2, $3
      FROM solicitud
      WHERE idSolicitud = $4 AND TipoDeSolicitud_idDeSolicitud = 4
      RETURNING id
    `, [monto, comentario, req.usuario.id, req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Solicitud de venta no encontrada.' });
    }
    res.json({ message: 'Contraoferta guardada.', monto, comentario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/solicitudes/:id/venta', verificarToken, soloAdmin, async (req, res) => {
  const precio = req.body.precioFinal === null || req.body.precioFinal === ''
    ? null
    : Number(req.body.precioFinal);
  if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
    return res.status(400).json({ error: 'El precio final no es válido.' });
  }
  try {
    const result = await conexion.query(`
      UPDATE detalle_solicitud ds
      SET precio_final = $1
      FROM solicitud s
      WHERE ds.solicitud_idsolicitud = s.idSolicitud
        AND s.idSolicitud = $2
        AND s.TipoDeSolicitud_idDeSolicitud = 4
    `, [precio, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Solicitud de venta no encontrada.' });
    res.json({ message: 'Precio final guardado.', precioFinal: precio });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/solicitudes/almacenado/ejecutar', verificarToken, soloAdmin, async (req, res) => {
  try {
    const result = await conexion.query(`
      UPDATE solicitud SET estado = 'Almacenado'
      WHERE estado = 'Aprobado'
        AND fecha_registro <= CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);
    res.json({ message: `Se archivaron ${result.rowCount} solicitudes.`, archivadas: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/solicitudes/:id/almacenado', verificarToken, soloAdmin, async (req, res) => {
  const { ubicacion, nota, estadoRevision } = req.body;
  try {
    await conexion.query(`
      ALTER TABLE solicitud
        ADD COLUMN IF NOT EXISTS ubicacion TEXT,
        ADD COLUMN IF NOT EXISTS nota TEXT,
        ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(50)
    `);
    const result = await conexion.query(`
      UPDATE solicitud
      SET ubicacion = $1, nota = $2, estado_revision = $3
      WHERE idSolicitud = $4 AND estado = 'Almacenado'
    `, [ubicacion || null, nota || null, estadoRevision || 'Pendiente', req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Solicitud almacenada no encontrada.' });
    res.json({ message: 'Ficha de inventario guardada.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar estado según el rol y la transición permitida.
router.put('/solicitudes/:id/estado', verificarToken, soloTecnico, (req, res) => {
  const { id } = req.params;
  const { estado, tecnico_asignado, observacion_admin } = req.body;

  const estadosValidos = ['Pendiente', 'En proceso', 'Terminado', 'En revision', 'Aprobado', 'Entregado', 'Almacenado', 'Cancelado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  conexion.query(
    'SELECT estado, TipoDeSolicitud_idDeSolicitud AS tipo FROM solicitud WHERE idSolicitud = ?',
    [id],
    (errConsulta, resultados) => {
    if (errConsulta) return res.status(500).json({ error: errConsulta.message });
    if (resultados.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const estadoActual = resultados[0].estado;
    const esVenta = Number(resultados[0].tipo) === TIPO_SOLICITUD.VENTA;
    const transicionesVentaAdmin = {
      Pendiente: ['En revision', 'Aprobado', 'Cancelado'],
      'En revision': ['Aprobado', 'Cancelado', 'En proceso'],
      Aprobado: ['Entregado', 'Cancelado'],
    };
    const permitidos = req.usuario?.rol === 'admin'
      ? (esVenta ? transicionesVentaAdmin[estadoActual] || [] : estadosAdmin[estadoActual] || [])
      : ({ Pendiente: ['En proceso'], 'En proceso': ['Terminado'], Terminado: ['En revision'] }[estadoActual] || []);
    if (!permitidos.includes(estado)) {
      return res.status(403).json({
        error: `La solicitud de ${esVenta ? 'venta' : 'entrega'} no puede pasar de ${estadoActual} a ${estado}.`,
      });
    }
    if (req.usuario?.rol === 'admin' && estadoActual === 'En revision' && estado === 'En proceso' && !observacion_admin?.trim()) {
      return res.status(400).json({ error: 'Debes indicar el motivo de la devolución al técnico.' });
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
      res.json({ message: 'Estado actualizado correctamente' });
      });
  });
});
// Reporte financiero — semana / mes / año
router.get('/reportes/financiero', (req, res) => {
  const { rango } = req.query; // 'semana', 'mes', 'anio'

  let formatoFecha;
  if (rango === 'semana') {
    formatoFecha = '%Y-%u'; // año-semana
  } else if (rango === 'anio') {
    formatoFecha = '%Y';
  } else {
    formatoFecha = '%Y-%m'; // mes por defecto
  }

  const query = `
    SELECT 
      DATE_FORMAT(s.fecha_registro, ?) AS periodo,
      s.TipoDeSolicitud_idDeSolicitud AS tipo,
      SUM(s.total_estimado) AS total
    FROM solicitud s
    WHERE s.estado = 'Entregado'
    GROUP BY periodo, tipo
    ORDER BY periodo ASC
  `;

  conexion.query(query, [formatoFecha], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const datosAgrupados = {};

    results.forEach(row => {
      if (!datosAgrupados[row.periodo]) {
        datosAgrupados[row.periodo] = { periodo: row.periodo, mantenimiento: 0, venta: 0 };
      }
      if (row.tipo === 1) datosAgrupados[row.periodo].mantenimiento = Number(row.total) || 0;
      if (row.tipo === 4) datosAgrupados[row.periodo].venta = Number(row.total) || 0;
    });

    res.json(Object.values(datosAgrupados));
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

    results.forEach(row => {
      if (row.tipo === 1) resumen.mantenimiento = { total: Number(row.total) || 0, cantidad: row.cantidad };
      if (row.tipo === 4) resumen.venta = { total: Number(row.total) || 0, cantidad: row.cantidad };
    });

    res.json(resumen);
  });
});
// Asignar técnico y/o urgencia (acción del admin)
router.put('/solicitudes/:id/asignar', verificarToken, soloAdmin, (req, res) => {
  const { id } = req.params;
  const { tecnico_asignado, urgencia } = req.body;

  if (!tecnico_asignado && !urgencia) {
    return res.status(400).json({ message: 'Debes enviar al menos tecnico_asignado o urgencia' });
  }
  if (urgencia && !['Baja', 'Media', 'Alta'].includes(urgencia)) {
    return res.status(400).json({ message: 'La urgencia debe ser Baja, Media o Alta.' });
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
      res.json({ message: 'Solicitud asignada correctamente' });
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
