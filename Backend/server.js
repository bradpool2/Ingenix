import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import conexion from './config/db.js';
import { verificarToken, soloAdmin, soloTecnico } from './Middleware/Auth.js';
import rutasSolicitudes from './Routes/solicitudes.js';

const app = express();
const PUERTO = process.env.PORT || 3000;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(rutasSolicitudes);

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const carpeta = './uploads/solicitudes';
        if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
        cb(null, carpeta);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `solicitud_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 2 },
    fileFilter: (req, file, cb) => {
        const tiposValidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (tiposValidos.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Tipo de archivo no permitido'));
    }
});

const cargarImagenesSolicitud = (req, res, next) => {
    upload.array('imagen', 2)(req, res, (error) => {
        if (!error) return next();

        const mensaje = error.code === 'LIMIT_FILE_SIZE'
            ? 'Cada imagen debe pesar máximo 10 MB.'
            : error.code === 'LIMIT_FILE_COUNT'
                ? 'Solo puedes cargar máximo 2 imágenes.'
                : error.message === 'Tipo de archivo no permitido'
                    ? 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.'
                    : 'No se pudieron cargar las imágenes.';

        return res.status(400).json({ error: mensaje });
    });
};

app.use('/uploads', express.static('uploads'));

// ─── Test ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

// ─── Login ────────────────────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { correo, pass } = req.body;
    if (!correo || !pass) return res.status(400).json({ message: 'Faltan datos' });

    try {
        const { rows } = await conexion.query(
            `SELECT u.*, r.nombrerol AS rol
             FROM usuario u
             JOIN rol r ON u.rol_idrol = r.idrol
             WHERE lower(u.correo) = lower($1)`,
            [correo]
        );

        if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

        const usuario = rows[0];
        const coinciden = await bcrypt.compare(pass, usuario.pass);
        if (!coinciden) return res.status(401).json({ message: 'Credenciales inválidas' });

        const usuarioNormalizado = {
            idUsuario: usuario.idusuario ?? usuario.idUsuario ?? usuario["idUsuario"],
            nombre: usuario.nombre,
            correo: usuario.correo,
            documento: usuario.documento,
            telefono: usuario.telefono,
            direccion: usuario.direccion,
            rol: usuario.rol ?? usuario.nombrerol ?? 'usuario',
        };

        const token = jwt.sign(
            { id: usuarioNormalizado.idUsuario, nombre: usuarioNormalizado.nombre, rol: usuarioNormalizado.rol },
            process.env.JWT_SECRET || 'clave_secreta_temporal',
            { expiresIn: '2h' }
        );

        res.json({ mensaje: 'Login exitoso', token, usuario: usuarioNormalizado });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notificaciones del usuario autenticado.
app.get('/notificaciones', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT n.idnotificacion AS "idNotificacion", n.titulo, n.mensaje,
                    n.tipo, n.rol_destino AS "rolDestino",
                    n.idsolicitud AS "idSolicitud", n.prioridad,
                    n.requiere_accion AS "requiereAccion", n.created_at AS "createdAt",
                    COALESCE(nu.leida, false) AS leida
             FROM notificacion_usuario nu
             JOIN notificacion n ON n.idnotificacion = nu.id_notificacion
             WHERE nu.id_usuario = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [req.usuario.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notificaciones/:id/leida', verificarToken, async (req, res) => {
    try {
        await conexion.query(
            `UPDATE notificacion_usuario SET leida = true
             WHERE id_notificacion = $1 AND id_usuario = $2`,
            [req.params.id, req.usuario.id]
        );
        res.json({ message: 'Notificación marcada como leída.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notificaciones/marcar-todas-leidas', verificarToken, async (req, res) => {
    try {
        await conexion.query(
            'UPDATE notificacion_usuario SET leida = true WHERE id_usuario = $1',
            [req.usuario.id]
        );
        res.json({ message: 'Notificaciones marcadas como leídas.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notificaciones/:id/accion', verificarToken, soloTecnico, async (req, res) => {
    const { accion } = req.body;
    if (accion !== 'aceptar') return res.status(400).json({ message: 'Acción no válida.' });
    try {
        const { rows } = await conexion.query(
            `SELECT n.idsolicitud AS "idSolicitud"
             FROM notificacion_usuario nu
             JOIN notificacion n ON n.idnotificacion = nu.id_notificacion
             WHERE n.idnotificacion = $1 AND nu.id_usuario = $2`,
            [req.params.id, req.usuario.id]
        );
        if (rows.length === 0 || !rows[0].idSolicitud) return res.status(404).json({ message: 'Notificación no encontrada.' });
        await conexion.query(
            `UPDATE solicitud SET estado = 'En proceso', tecnico_asignado = $1
             WHERE idSolicitud = $2 AND estado = 'Pendiente'`,
            [req.usuario.nombre, rows[0].idSolicitud]
        );
        await conexion.query(
            `UPDATE notificacion_usuario SET leida = true
             WHERE id_notificacion = $1 AND id_usuario = $2`,
            [req.params.id, req.usuario.id]
        );
        res.json({ message: 'Solicitud aceptada.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Recuperar contraseña ─────────────────────────────────────────────────────
app.post('/recuperar-password', async (req, res) => {
    const { correo } = req.body;
    try {
        const { rows } = await conexion.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
        if (rows.length === 0) return res.json({ message: 'No existe una cuenta con ese correo.' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiracion = new Date(Date.now() + 15 * 60 * 1000);

        await conexion.query(
            `UPDATE usuario SET token_recuperacion = $1, expiracion_token = $2 WHERE correo = $3`,
            [token, expiracion, correo]
        );

        const enlace = `http://localhost:5173/restablecer-password/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: correo,
            subject: 'Recuperación de contraseña - Ingenix',
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">
                <h1 style="color:#99c1bb;text-align:center;">INGENIX</h1>
                <h2 style="text-align:center;">Recuperación de contraseña</h2>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                <div style="text-align:center;margin:35px 0;">
                    <a href="${enlace}" style="background:#99c1bb;color:white;text-decoration:none;padding:15px 30px;border-radius:8px;font-weight:bold;">
                        Restablecer contraseña
                    </a>
                </div>
                <p style="font-size:13px;color:#777;">Este enlace será válido durante <strong>15 minutos</strong>.</p>
            </div>`
        });

        res.json({ message: 'Se envió un correo de recuperación.' });
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ─── Restablecer contraseña ───────────────────────────────────────────────────
app.post('/restablecer-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Datos incompletos.' });

    try {
        const { rows } = await conexion.query(
            `SELECT * FROM usuario WHERE token_recuperacion = $1 AND expiracion_token > NOW()`,
            [token]
        );
        if (rows.length === 0) return res.status(400).json({ message: 'El enlace ya expiró o no es válido.' });

        const nuevaPassword = await bcrypt.hash(password, 10);
        await conexion.query(
            `UPDATE usuario SET pass = $1, token_recuperacion = NULL, expiracion_token = NULL WHERE "idUsuario" = $2`,
            [nuevaPassword, rows[0].idUsuario]
        );

        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar.' });
    }
});

// ─── Registro público ─────────────────────────────────────────────────────────
app.post('/usuarios/registro', async (req, res) => {
    const { nombre, correo, documento, direccion, pass, rol_idRol } = req.body;
    if (!nombre || !correo || !documento || !pass)
        return res.status(400).json({ message: 'Faltan datos obligatorios' });

    try {
        const passEncriptada = await bcrypt.hash(pass, 10);
        const { rows } = await conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, pass, "rol_idRol") VALUES ($1, $2, $3, $4, $5, $6) RETURNING "idUsuario"',
            [nombre, correo, documento, direccion, passEncriptada, rol_idRol || 3]
        );
        res.status(201).json({ message: 'Usuario registrado con éxito', idUsuario: rows[0].idUsuario });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Buscar usuario ───────────────────────────────────────────────────────────
app.get('/usuario', async (req, res) => {
    const { correo, documento } = req.query;
    if (!correo && !documento) return res.status(400).json({ message: 'Se requiere correo o documento.' });

    try {
        const campo = correo ? 'correo' : 'documento';
        const valor = correo || documento;
        const { rows } = await conexion.query(
            `SELECT "idUsuario", nombre, correo, documento FROM usuario WHERE ${campo} = $1`,
            [valor]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Listar usuarios ──────────────────────────────────────────────────────────
app.get('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT u.idusuario AS "idUsuario", u.nombre, u.correo, u.documento, u.direccion,
                    u.rol_idrol AS "rol_idRol", r.nombrerol AS rol
             FROM usuario u
             LEFT JOIN rol r ON u.rol_idrol = r.idrol`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/usuarios/tecnicos', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT u.idusuario AS "idUsuario", u.nombre
             FROM usuario u
             JOIN rol r ON u.rol_idrol = r.idrol
             WHERE LOWER(r.nombrerol) = 'tecnico'`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, correo, documento, direccion, pass, rol_idRol } = req.body;
    if (!nombre || !correo || !documento || !pass)
        return res.status(400).json({ message: 'Faltan datos obligatorios' });

    try {
        const passEncriptada = await bcrypt.hash(pass, 10);
        const { rows } = await conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, pass, rol_idrol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING idusuario AS "idUsuario"',
            [nombre, correo, documento, direccion, passEncriptada, rol_idRol || 1]
        );
        res.status(201).json({ message: 'Usuario creado con éxito', idUsuario: rows[0].idUsuario });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, documento, direccion, telefono, rol_idRol } = req.body;
    try {
        await conexion.query(
            'UPDATE usuario SET nombre=$1, correo=$2, documento=$3, direccion=$4, telefono=$5, rol_idrol=$6 WHERE idusuario=$7',
            [nombre, correo, documento, direccion, telefono, rol_idRol, id]
        );
        const { rows } = await conexion.query(
            `SELECT idusuario AS "idUsuario", nombre, correo, documento,
                    telefono, direccion
             FROM usuario
             WHERE idusuario = $1`,
            [id]
        );
        res.json({
            message: 'Usuario actualizado con éxito',
            usuario: { ...rows[0], rol: req.usuario.rol },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        await conexion.query('DELETE FROM usuario WHERE idusuario = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Productos ────────────────────────────────────────────────────────────────
app.get('/productos/con-categorias', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT p.idproducto AS "idProducto",
                    p.nombre,
                    p.descripcion,
                    p.precio,
                    p.stock,
                    p.tipoproducto_idtipoproducto AS "tipoProducto_idTipoProducto",
                    categorias.categorias
             FROM producto p
             LEFT JOIN (
                 SELECT pc.producto_idproducto,
                        STRING_AGG(c.nombre, ', ') AS categorias
                 FROM producto_categoria pc
                 JOIN categoria c ON c.idcategoria = pc.categoria_idcategoria
                 GROUP BY pc.producto_idproducto
             ) AS categorias
             ON categorias.producto_idproducto = p.idproducto`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/productos', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query('SELECT * FROM producto');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/productos', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    if (!nombre || !precio) return res.status(400).json({ message: 'Nombre y Precio son requeridos' });
    try {
        const { rows } = await conexion.query(
            'INSERT INTO producto (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4) RETURNING "idProducto"',
            [nombre, descripcion, precio, stock || 0]
        );
        res.status(201).json({ message: 'Producto creado', idProducto: rows[0].idProducto });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/productos/:id', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    try {
        await conexion.query(
            'UPDATE producto SET nombre=$1, descripcion=$2, precio=$3, stock=$4 WHERE "idProducto"=$5',
            [nombre, descripcion, precio, stock, req.params.id]
        );
        res.json({ message: 'Producto actualizado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/productos/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        await conexion.query('DELETE FROM producto_y_solicitud WHERE "producto_idProducto" = $1', [req.params.id]);
        await conexion.query('DELETE FROM producto WHERE "idProducto" = $1', [req.params.id]);
        res.json({ message: 'Producto eliminado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/productos/:id/categorias', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT c."idCategoria", c.nombre
             FROM categoria c
             JOIN producto_categoria pc ON pc."categoria_idCategoria" = c."idCategoria"
             WHERE pc."producto_idProducto" = $1`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/productos/:id/categorias', async (req, res) => {
    const { categorias } = req.body;
    try {
        await conexion.query('DELETE FROM producto_categoria WHERE "producto_idProducto" = $1', [req.params.id]);
        if (categorias && categorias.length > 0) {
            for (const catId of categorias) {
                await conexion.query(
                    'INSERT INTO producto_categoria ("producto_idProducto", "categoria_idCategoria") VALUES ($1, $2)',
                    [req.params.id, catId]
                );
            }
        }
        res.json({ message: 'Categorías actualizadas correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Categorías ───────────────────────────────────────────────────────────────
app.get('/categorias', async (req, res) => {
    try {
        const { rows } = await conexion.query('SELECT * FROM categoria ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/categorias', verificarToken, soloAdmin, async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
    try {
        const { rows } = await conexion.query(
            'INSERT INTO categoria (nombre) VALUES ($1) RETURNING "idCategoria"',
            [nombre]
        );
        res.status(201).json({ idCategoria: rows[0].idCategoria, nombre });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/categorias/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        await conexion.query('DELETE FROM categoria WHERE "idCategoria" = $1', [req.params.id]);
        res.json({ message: 'Categoría eliminada con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/estadisticas', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT
                COUNT(*) FILTER (WHERE TipoDeSolicitud_idDeSolicitud = 1
                    AND estado NOT IN ('Entregado', 'Cancelado')) AS mantenimientos,
                COUNT(*) FILTER (WHERE estado = 'Pendiente') AS entregas_pendientes,
                COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud`
        );
        const datos = rows[0];
        res.json({
            mantenimientos: `${datos.mantenimientos || 0} Activos`,
            entregas: `${datos.entregas_pendientes || 0} Pendientes`,
            totalEstimado: `$${Number(datos.suma_total).toLocaleString('es-CO')}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/ultimas-solicitudes', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT idsolicitud AS "idSolicitud", numeroOrden AS "numeroOrden",
                    estado, TO_CHAR(fecha_registro, 'DD/MM/YYYY HH24:MI') AS fecha,
                    total_estimado
             FROM solicitud
             ORDER BY fecha_registro DESC LIMIT 5`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/comparativo', verificarToken, soloTecnico, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT DATE(fecha_registro) AS fecha, COUNT(*) AS total_solicitudes,
                    COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             WHERE DATE(fecha_registro) IN (CURRENT_DATE, CURRENT_DATE - INTERVAL '1 day')
             GROUP BY DATE(fecha_registro)`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Reportes ─────────────────────────────────────────────────────────────────
app.get('/api/reportes/semanal', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT TO_CHAR(DATE_TRUNC('week', fecha_registro), 'IYYY-IW') AS semana,
                    MIN(DATE(fecha_registro)) AS fecha_inicio,
                    MAX(DATE(fecha_registro)) AS fecha_fin,
                    COUNT(*) AS total_solicitudes,
                    COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             GROUP BY DATE_TRUNC('week', fecha_registro)
             ORDER BY semana DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reportes/mensual', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT TO_CHAR(fecha_registro, 'YYYY-MM') AS mes,
                    COUNT(*) AS total_solicitudes,
                    COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             GROUP BY TO_CHAR(fecha_registro, 'YYYY-MM')
             ORDER BY mes DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Solicitud cliente ────────────────────────────────────────────────────────
app.post('/api/venta', verificarToken, cargarImagenesSolicitud, async (req, res) => {
    const { tipo, nombreArticulo, descripcion, urgencia, estadoArticulo, precioEstimado } = req.body;
    const imagenes = Array.isArray(req.files) ? req.files : [];
    const imagenUrls = imagenes.map((file) => `/uploads/solicitudes/${file.filename}`);
    const imagenUrl = imagenUrls[0] || null;
    const eliminarImagenes = () => {
        imagenes.forEach((file) => fs.unlink(file.path, () => {}));
    };

    if (!tipo || !nombreArticulo || !descripcion) {
        eliminarImagenes();
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const tipoDeSolicitud = tipo === 'mantenimiento' ? 1 : 4;
    const urgenciaFinal   = tipo === 'mantenimiento' ? (urgencia || 'Media') : 'Media';
    const ordenGenerada   = Math.floor(Math.random() * 90000) + 10000;
    const totalEstimado = tipo === 'venta' && precioEstimado
        ? Number(precioEstimado)
        : 0;

    if (!Number.isFinite(totalEstimado) || totalEstimado < 0) {
        eliminarImagenes();
        return res.status(400).json({ error: 'El precio estimado no es válido.' });
    }

    try {
        const clienteResult = await conexion.query(
            'SELECT idcliente FROM cliente WHERE usuario_idusuario = $1',
            [req.usuario.id]
        );

        if (clienteResult.rows.length === 0) {
            return res.status(400).json({
                error: 'El usuario autenticado no tiene un perfil de cliente.',
            });
        }

        const idCliente = clienteResult.rows[0].idcliente;

        await conexion.query(
            `INSERT INTO solicitud (
                idSolicitud, numeroOrden, fecha_registro, cliente_idCliente,
                estado, TipoDeSolicitud_idDeSolicitud, urgencia, total_estimado
             )
             VALUES ($1, $2, NOW(), $3, 'Pendiente', $4, $5, $6)`,
            [
                ordenGenerada,
                String(ordenGenerada),
                idCliente,
                tipoDeSolicitud,
                urgenciaFinal,
                totalEstimado,
            ]
        );

        const detalleCompleto = `[${tipo.toUpperCase()}] ${nombreArticulo}: ${descripcion}` +
            `${estadoArticulo ? ` | Estado: ${estadoArticulo}` : ''}` +
            `${precioEstimado ? ` | Precio estimado: $${precioEstimado}` : ''}` +
            `${imagenUrls.length ? ` | Imágenes: ${imagenUrls.join(', ')}` : ''}`;
        const detalle = detalleCompleto.slice(0, 200);

        await conexion.query(
            `INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
             VALUES ($1, $2, 1, $3)`,
            [2, ordenGenerada, detalle]
        );

        res.status(201).json({ message: 'Solicitud enviada correctamente', numeroOrden: ordenGenerada, tipo, imagenUrl, imagenUrls });
    } catch (err) {
        eliminarImagenes();
        console.error('Error al guardar solicitud de cliente:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Ventas / Carrito ─────────────────────────────────────────────────────────
app.post('/venta', async (req, res) => {
    const { idUsuario, total, metodoPago, detallePago, productos } = req.body;
    if (!idUsuario || !total || !productos || productos.length === 0)
        return res.status(400).json({ message: 'Faltan datos para registrar la venta' });

    try {
        const { rows: ventaRows } = await conexion.query(
            `INSERT INTO venta (fecha, estado, total, idusuario) VALUES (CURRENT_DATE, 'pagado', $1, $2) RETURNING idventa`,
            [total, idUsuario]
        );
        const idVenta = ventaRows[0].idVenta;

        for (const p of productos) {
            await conexion.query(
                `INSERT INTO ventadetalle (cantidad, preciounitario, subtotal, venta_idventa, producto_idproducto) VALUES ($1, $2, $3, $4, $5)`,
                [p.cantidad, p.precioUnitario, p.cantidad * p.precioUnitario, idVenta, p.idProducto]
            );
        }

        const referencia = 'PAY-' + Date.now();
        await conexion.query(
            `INSERT INTO pago (venta_idventa, metodopago, referenciapago, detallepago, estadopago) VALUES ($1, $2, $3, $4, $5)`,
            [idVenta, metodoPago, referencia, detallePago || null, 'aprobado']
        );

        res.status(201).json({ message: 'Venta y pago registrados correctamente', idVenta, referencia });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/ventas/:idUsuario', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT v."idVenta", v."Fecha", v.total, v."Estado",
                    vd.cantidad, vd."precioUnitario", vd.subtotal,
                    p.nombre AS producto,
                    pg."metodoPago", pg."referenciaPago", pg."estadoPago"
             FROM "Venta" v
             JOIN "VentaDetalle" vd ON v."idVenta" = vd."Venta_idVenta"
             JOIN producto p ON vd."producto_idProducto" = p."idProducto"
             LEFT JOIN pago pg ON v."idVenta" = pg."Venta_idVenta"
             WHERE v."idUsuario" = $1
             ORDER BY v."Fecha" DESC`,
            [req.params.idUsuario]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Técnico solicitudes ──────────────────────────────────────────────────────
app.get('/api/tecnico/solicitudes', verificarToken, soloTecnico, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT idSolicitud, TO_CHAR(fecha_registro, 'DD/MM/YYYY') AS fecha, total_estimado, estado
             FROM solicitud ORDER BY fecha_registro DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tecnico/solicitudes/:id/estado', verificarToken, soloTecnico, async (req, res) => {
    const { nuevoEstado } = req.body;
    try {
        await conexion.query(
            'UPDATE solicitud SET estado = $1 WHERE idSolicitud = $2',
            [nuevoEstado, req.params.id]
        );
        res.json({ message: `Solicitud #${req.params.id} actualizada a ${nuevoEstado}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Solicitudes del cliente autenticado
app.get('/api/mis-solicitudes', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query(
                `SELECT s.idSolicitud AS "idSolicitud",
                    s.numeroOrden AS "numeroOrden",
                    s.fecha_registro,
                    s.total_estimado,
                    s.estado,
                    s.urgencia,
                    COALESCE(STRING_AGG(COALESCE(ps.detalle_servicio, ''), ', '), '') AS servicios
             FROM solicitud s
                         JOIN cliente c ON c.idcliente = s.cliente_idcliente
                         LEFT JOIN producto_y_solicitud ps
                             ON ps.solicitud_idSolicitud = s.idSolicitud
                         WHERE c.usuario_idusuario = $1
                         GROUP BY s.idSolicitud, s.numeroOrden, s.fecha_registro,
                      s.total_estimado, s.estado, s.urgencia
             ORDER BY s.fecha_registro DESC`,
            [req.usuario.id]
        );

        const payload = rows.map((row) => ({
            ...row,
            servicios: row.servicios || 'Sin servicios',
            fecha_registro: row.fecha_registro
                ? new Date(row.fecha_registro).toISOString().slice(0, 10)
                : null,
        }));

        res.json(payload);
    } catch (err) {
        console.error('Error en /api/mis-solicitudes:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});
