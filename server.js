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
import crypto from 'crypto'
import swaggerUi from 'swagger-ui-express';
import conexion from './Backend/config/db.js';
import { verificarToken, soloAdmin, soloTecnico } from './Backend/Middleware/Auth.js';
import rutasSolicitudes from './Backend/Routes/solicitudes.js';
import rutasNotificaciones from './Backend/Routes/notificaciones.js';
import { crearNotificacion } from './Backend/Services/notificaciones.js';
import openapi from './Backend/docs/openapi.js';

const app = express();
const PUERTO = 3000;

const obtenerOcrearCliente = (usuario) => new Promise((resolve, reject) => {
    conexion.query(
        'SELECT idcliente FROM cliente WHERE usuario_idusuario = ?',
        [usuario.id],
        (buscarError, clientes) => {
            if (buscarError) return reject(buscarError);
            if (clientes[0]?.idcliente) return resolve(clientes[0].idcliente);

            conexion.query(
                `INSERT INTO cliente (documento, direccion, telefono, usuario_idusuario)
                 VALUES (?, ?, ?, ?)`,
                [usuario.documento || null, usuario.direccion || null, usuario.telefono || null, usuario.id],
                (crearError, resultado) => {
                    if (crearError) return reject(crearError);
                    resolve(resultado.insertId);
                }
            );
        }
    );
});
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
app.get('/api-docs.json', (req, res) => res.json(openapi));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'Ingenix API - Swagger',
    swaggerOptions: { persistAuthorization: true },
}));
app.use(rutasSolicitudes);
app.use(rutasNotificaciones);

// ─── Multer (imágenes) ────────────────────────────────────────────────────────
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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const tiposValidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (tiposValidos.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Tipo de archivo no permitido'));
    }
});

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

app.post('/login', (req, res) => {
    const { correo, pass } = req.body;

    if (!correo || !pass) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    conexion.query(
        `SELECT
             u.idusuario AS "idUsuario",
             u.nombre,
             u.correo,
             u.documento,
             u.direccion,
             u.telefono,
             u.pass,
             u.rol_idrol AS "rol_idRol",
             r.nombrerol AS rol
         FROM usuario u
         JOIN rol r ON u.rol_idrol = r.idrol
         WHERE u.correo = ?`,
        [correo],
        async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0)
                return res.status(401).json({ message: 'Credenciales inválidas' });

            const usuario = results[0];
            const coinciden = await bcrypt.compare(pass, usuario.pass);

            if (!coinciden) {
                return res.status(401).json({ message: 'Credenciales inválidas' });
            }

            const rolNormalizado = usuario.rol?.toLowerCase()
                .replace('administrador', 'admin')
                .replace('técnico', 'tecnico');
            usuario.rol = rolNormalizado;
            const token = jwt.sign(
                { id: usuario.idUsuario, nombre: usuario.nombre, rol: rolNormalizado },
                process.env.JWT_SECRET || 'clave_secreta_temporal',
                { expiresIn: '2h' }
            );

            res.json({ mensaje: 'Login exitoso', token, usuario });
        }
    );
});
app.post('/recuperar-password', (req, res) => {

    const { correo } = req.body;

    conexion.query(
        'SELECT * FROM usuario WHERE correo = ?',
        [correo],
        async (err, results) => {

            if (err)
                return res.status(500).json({ message: 'Error del servidor' });

            if (results.length === 0)
                return res.json({
                    message: 'No existe una cuenta con ese correo.'
                });

            const token = crypto.randomBytes(32).toString('hex');

            const expiracion = new Date(
                Date.now() + 15 * 60 * 1000
            );

            conexion.query(
                `UPDATE usuario
                 SET token_recuperacion = ?,
                     expiracion_token = ?
                 WHERE correo = ?`,
                [token, expiracion, correo]
            );

            const enlace =
                `http://localhost:5173/restablecer-password/${token}`;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: correo,
                subject: 'Recuperación de contraseña - Ingenix',
                html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;background:#f8fbfb;border-radius:12px;border:1px solid #ddd;">
                
                    <h1 style="color:#99c1bb;text-align:center;">
                        INGENIX
                    </h1>
                
                    <h2 style="text-align:center;color:#292814;">
                        Recuperación de contraseña
                    </h2>
                
                    <p style="font-size:15px;color:#555;">
                        Hola,
                    </p>
                
                    <p style="font-size:15px;color:#555;">
                        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
                    </p>
                
                    <div style="text-align:center;margin:35px 0;">
                
                        <a
                        href="${enlace}"
                        style="
                            background:#99c1bb;
                            color:white;
                            text-decoration:none;
                            padding:15px 30px;
                            border-radius:8px;
                            font-weight:bold;
                            display:inline-block;
                        ">
                
                            Restablecer contraseña
                
                        </a>
                
                    </div>
                
                    <p style="font-size:13px;color:#777;">
                        Este enlace será válido durante <strong>15 minutos</strong>.
                    </p>
                
                    <p style="font-size:13px;color:#777;">
                        Si tú no solicitaste este cambio, puedes ignorar este correo.
                    </p>
                
                    <hr>
                
                    <p style="font-size:12px;color:#999;text-align:center;">
                        © Ingenix - Sistema de gestión para relojería
                    </p>
                
                </div>
                `
            });

            res.json({
                message: 'Se envió un correo de recuperación.'
            });

        }
    );
});
app.post('/restablecer-password', async (req, res) => {

    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({
            message: 'Datos incompletos.'
        });
    }

    conexion.query(

        `SELECT *
         FROM usuario
         WHERE token_recuperacion = ?
         AND expiracion_token > NOW()`,

        [token],

        async (err, results) => {

            if (err)
                return res.status(500).json({
                    message: 'Error del servidor.'
                });

            if (results.length === 0)
                return res.status(400).json({
                    message: 'El enlace ya expiró o no es válido.'
                });

            const usuario = results[0];

            const nuevaPassword = await bcrypt.hash(password,10);

            conexion.query(

                `UPDATE usuario
                 SET pass=?,
                     token_recuperacion=NULL,
                     expiracion_token=NULL
                 WHERE idUsuario=?`,

                [nuevaPassword, usuario.idUsuario],

                (err2)=>{

                    if(err2)
                        return res.status(500).json({
                            message:"Error al actualizar."
                        });

                    res.json({
                        message:"Contraseña actualizada correctamente."
                    });

                }

            );

        }

    );

});
app.post('/usuarios/registro', async (req, res) => {
    const { nombre, correo, documento, direccion, telefono, pass, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    try {
        const saltos = await bcrypt.genSalt(10);
        const passEncriptada = await bcrypt.hash(pass, saltos);

        conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, telefono, pass, rol_idRol) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, correo, documento, direccion, telefono, passEncriptada, rol_idRol || 4],
            (err, results) => {
                if (err) {
                    console.error('❌ Error POST /usuarios/registro:', err);
                    return res.status(500).json({ error: err.message });
                }
                const idUsuario = results.insertId;
                const crearPerfil = Number(rol_idRol || 4) === 3
                    ? obtenerOcrearCliente({ id: idUsuario, documento, direccion, telefono })
                    : Promise.resolve();
                crearPerfil
                    .then(() => res.status(201).json({ message: 'Usuario registrado con éxito', idUsuario }))
                    .catch((perfilError) => res.status(500).json({ error: perfilError.message }));
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error interno al procesar la contraseña' });
    }
});

app.get('/usuario', (req, res) => {
    const { correo, documento } = req.query;

    if (!correo && !documento) {
        return res.status(400).json({ message: 'Se requiere el parámetro correo o documento.' });
    }

    let sql = 'SELECT idUsuario, nombre, correo, documento FROM usuario WHERE ';
    let parametro = '';

    if (correo) { sql += 'correo = ?'; parametro = correo; }
    else { sql += 'documento = ?'; parametro = documento; }

    conexion.query(sql, [parametro], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ─── Usuarios (protegidas) ────────────────────────────────────────────────────
app.get('/usuarios', verificarToken, soloAdmin, (req, res) => {
    conexion.query(
        `SELECT u.idusuario AS "idUsuario", u.nombre, u.correo, u.documento, u.direccion,
                u.telefono, u.rol_idrol AS "rol_idRol", r.nombrerol AS rol
         FROM usuario u 
         LEFT JOIN rol r ON u.rol_idrol = r.idrol`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.post('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, correo, documento, direccion, telefono, pass, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    try {
        const saltos = await bcrypt.genSalt(10);
        const passEncriptada = await bcrypt.hash(pass, saltos);

        conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, telefono, pass, rol_idRol) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, correo, documento, direccion, telefono, passEncriptada, rol_idRol || 1],
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                const idUsuario = results.insertId;
                const crearPerfil = Number(rol_idRol || 1) === 3
                    ? obtenerOcrearCliente({ id: idUsuario, documento, direccion, telefono })
                    : Promise.resolve();
                crearPerfil
                    .then(() => res.status(201).json({ message: 'Usuario creado con éxito', idUsuario }))
                    .catch((perfilError) => res.status(500).json({ error: perfilError.message }));
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error interno al procesar la contraseña' });
    }
});

app.put('/usuarios/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const { nombre, correo, documento, direccion, telefono, rol_idRol } = req.body;
    if (!id || !nombre?.trim() || !correo?.trim()) {
        return res.status(400).json({ message: 'ID, nombre y correo son obligatorios.' });
    }
    if (!/^\d{10}$/.test(String(telefono || ''))) {
        return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos.' });
    }

    conexion.query(
        `UPDATE usuario
         SET nombre = ?, correo = ?, documento = ?, direccion = ?, telefono = ?,
             rol_idrol = COALESCE(?, rol_idrol)
         WHERE idusuario = ?`,
        [nombre, correo, documento, direccion, telefono, rol_idRol || null, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            conexion.query(
                `INSERT INTO cliente (documento, direccion, telefono, usuario_idusuario)
                 SELECT documento, direccion, telefono, idusuario
                 FROM usuario
                 WHERE idusuario = ? AND rol_idrol = 3
                   AND NOT EXISTS (
                     SELECT 1 FROM cliente WHERE usuario_idusuario = ?
                   )`,
                [id, id],
                (crearPerfilError) => {
                    if (crearPerfilError) return res.status(500).json({ error: crearPerfilError.message });
                    conexion.query(
                        'UPDATE cliente SET telefono = ?, direccion = ?, documento = ? WHERE usuario_idusuario = ?',
                        [telefono, direccion, documento, id],
                        (perfilError) => {
                            if (perfilError) return res.status(500).json({ error: perfilError.message });
                            res.json({
                                message: 'Usuario actualizado con éxito',
                                usuario: { idUsuario: Number(id), nombre, correo, documento, direccion, telefono, rol_idRol },
                            });
                        }
                    );
                }
            );
        }
    );
});

app.get('/usuarios/tecnicos', verificarToken, soloAdmin, (req, res) => {
    conexion.query(
        `SELECT u.idusuario AS "idUsuario", u.nombre 
         FROM usuario u 
         JOIN rol r ON u.rol_idrol = r.idrol 
         WHERE LOWER(r.nombrerol) = 'tecnico'`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.delete('/usuarios/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    conexion.query('DELETE FROM usuario WHERE idUsuario = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuario eliminado con éxito' });
    });
});

// ─── Productos ────────────────────────────────────────────────────────────────
app.get('/productos', verificarToken, (req, res) => {
    conexion.query('SELECT * FROM producto', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/productos/con-categorias', (req, res) => {
    conexion.query(
        `SELECT p.*, GROUP_CONCAT(c.nombre SEPARATOR ', ') AS categorias
         FROM producto p
         LEFT JOIN producto_categoria pc ON pc.producto_idProducto = p.idProducto
         LEFT JOIN categoria c ON c.idCategoria = pc.categoria_idCategoria
         GROUP BY p.idProducto`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.post('/productos', verificarToken, soloAdmin, (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    if (!nombre || !precio) {
        return res.status(400).json({ message: 'Nombre y Precio son campos requeridos' });
    }
    conexion.query(
        'INSERT INTO producto (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)',
        [nombre, descripcion, precio, stock || 0],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Producto creado', idProducto: results.insertId });
        }
    );
});

app.put('/productos/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock } = req.body;
    conexion.query(
        'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE idProducto = ?',
        [nombre, descripcion, precio, stock, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Producto actualizado con éxito' });
        }
    );
});

app.delete('/productos/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    conexion.query('DELETE FROM producto_y_solicitud WHERE producto_idProducto = ?', [id], (errRelacion) => {
        if (errRelacion) return res.status(500).json({ error: errRelacion.message });
        conexion.query('DELETE FROM producto WHERE idProducto = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Producto eliminado con éxito' });
        });
    });
});

// ─── Categorías ───────────────────────────────────────────────────────────────
app.get('/categorias', (req, res) => {
    conexion.query('SELECT * FROM categoria ORDER BY nombre ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/categorias', verificarToken, soloAdmin, (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
    conexion.query('INSERT INTO categoria (nombre) VALUES (?)', [nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ idCategoria: results.insertId, nombre });
    });
});

app.delete('/categorias/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    conexion.query('DELETE FROM categoria WHERE idCategoria = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Categoría eliminada con éxito' });
    });
});

app.get('/productos/:id/categorias', (req, res) => {
    const { id } = req.params;
    conexion.query(
        `SELECT c.idCategoria, c.nombre 
         FROM categoria c
         JOIN producto_categoria pc ON pc.categoria_idCategoria = c.idCategoria
         WHERE pc.producto_idProducto = ?`,
        [id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.put('/productos/:id/categorias', (req, res) => {
    const { id } = req.params;
    const { categorias } = req.body;

    conexion.query('DELETE FROM producto_categoria WHERE producto_idProducto = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!categorias || categorias.length === 0) {
            return res.json({ message: 'Categorías actualizadas sin asignaciones' });
        }

        const valores = categorias.map(catId => [id, catId]);
        conexion.query(
            'INSERT INTO producto_categoria (producto_idProducto, categoria_idCategoria) VALUES ?',
            [valores],
            (errInsert) => {
                if (errInsert) return res.status(500).json({ error: errInsert.message });
                res.json({ message: 'Categorías actualizadas correctamente' });
            }
        );
    });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/estadisticas', (req, res) => {
    conexion.query(
        `SELECT
           COUNT(*) FILTER (WHERE estado NOT IN ('Entregado', 'Cancelado')) AS solicitudes_activas,
           COUNT(*) FILTER (WHERE estado IN ('Aprobado', 'Terminado')) AS entregas_pendientes,
           COALESCE(SUM(total_estimado) FILTER (WHERE estado NOT IN ('Cancelado')), 0) AS suma_total,
           COUNT(*) FILTER (WHERE tipodesolicitud_iddesolicitud = 1) AS mantenimientos
         FROM solicitud`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            const datos = results[0];
            res.json({
                mantenimientos: `${datos.mantenimientos || 0} Activos`,
                entregas: `${datos.entregas_pendientes || 0} Órdenes`,
                totalEstimado: `${Number(datos.suma_total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`
            });
        }
    );
});

app.get('/api/dashboard/ultimas-solicitudes', (req, res) => {
    conexion.query(
    `SELECT  idsolicitud AS "idSolicitud",
     numeroorden AS "numeroOrden",
     estado,
     CASE WHEN tipodesolicitud_iddesolicitud = 4 THEN 'Venta' ELSE 'Mantenimiento' END AS tipo,
    DATE_FORMAT(fecha_registro, '%d/%m/%Y %H:%i') AS fecha,
    total_estimado
    FROM solicitud
    WHERE DATE(fecha_registro) = CURDATE()
    ORDER BY fecha_registro DESC
    LIMIT 5;`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.get('/api/dashboard/comparativo', verificarToken, soloTecnico, (req, res) => {
    conexion.query(
        `SELECT DATE(fecha_registro) AS fecha, COUNT(*) AS total_solicitudes,
                IFNULL(SUM(total_estimado), 0) AS suma_total
         FROM solicitud
         WHERE DATE(fecha_registro) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
         GROUP BY DATE(fecha_registro)`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ─── Reportes ─────────────────────────────────────────────────────────────────
app.get('/api/reportes/semanal', verificarToken, soloAdmin, (req, res) => {
    conexion.query(
        `SELECT YEARWEEK(fecha_registro, 1) AS semana,
                MIN(DATE(fecha_registro)) AS fecha_inicio,
                MAX(DATE(fecha_registro)) AS fecha_fin,
                COUNT(*) AS total_solicitudes,
                IFNULL(SUM(total_estimado), 0) AS suma_total
         FROM solicitud
         GROUP BY YEARWEEK(fecha_registro, 1)
         ORDER BY semana DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.get('/api/reportes/mensual', verificarToken, soloAdmin, (req, res) => {
    conexion.query(
        `SELECT DATE_FORMAT(fecha_registro, '%Y-%m') AS mes,
                COUNT(*) AS total_solicitudes,
                IFNULL(SUM(total_estimado), 0) AS suma_total
         FROM solicitud
         GROUP BY DATE_FORMAT(fecha_registro, '%Y-%m')
         ORDER BY mes DESC`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ─── Solicitud cliente (mantenimiento o venta) ────────────────────────────────
app.post('/api/venta', verificarToken, upload.single('imagen'), (req, res) => {
    const { tipo, nombreArticulo, descripcion, urgencia, estadoArticulo, precioEstimado } = req.body;
    const imagenUrl = req.file ? `/uploads/solicitudes/${req.file.filename}` : null;

    if (!tipo || !nombreArticulo || !descripcion) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const tipoDeSolicitud = tipo === 'mantenimiento' ? 1 : 4;
    const urgenciaFinal = tipo === 'mantenimiento' ? (urgencia || 'Media') : 'Media';
    const ordenGenerada = Math.floor(Math.random() * 90000) + 10000;

    obtenerOcrearCliente(req.usuario)
        .then((clienteId) => {
            conexion.query(
        `INSERT INTO solicitud (numeroOrden, fecha_registro, cliente_idCliente, estado, TipoDeSolicitud_idDeSolicitud, urgencia)
         VALUES (?, NOW(), ?, 'Pendiente', ?, ?)`,
        [`SOL-${ordenGenerada}`, clienteId, tipoDeSolicitud, urgenciaFinal],
        (err, resultadoSolicitud) => {
            if (err) return res.status(500).json({ error: err.message });
            const idSolicitud = resultadoSolicitud.insertId;

            const detalle = `[${tipo.toUpperCase()}] ${nombreArticulo}: ${descripcion}` +
                `${estadoArticulo ? ` | Estado: ${estadoArticulo}` : ''}` +
                `${precioEstimado ? ` | Precio estimado: $${precioEstimado}` : ''}` +
                `${imagenUrl ? ` | Imagen: ${imagenUrl}` : ''}`;

            conexion.query(
                `INSERT INTO detalle_solicitud
                 (solicitud_idSolicitud, nombreArticulo, descripcion, estadoArticulo, precioEstimado, imagen)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [idSolicitud, nombreArticulo, descripcion, estadoArticulo || null,
                 precioEstimado ? Number(precioEstimado) : null, imagenUrl],
                (errDetalle) => {
                    if (errDetalle) return res.status(500).json({ error: errDetalle.message });
                    Promise.all([
                       crearNotificacion({
                           titulo: 'Nueva solicitud recibida',
                           mensaje: `La solicitud ${ordenGenerada} requiere revisión.`,
                           tipo: 'sistema',
                           rolDestino: 'admin',
                           idSolicitud,
                           prioridad: urgenciaFinal === 'Alta' ? 'alta' : 'normal',
                           requiereAccion: true,
                       }),
                       crearNotificacion({
                           titulo: 'Nueva solicitud disponible',
                           mensaje: `La solicitud ${ordenGenerada} está pendiente de asignación.`,
                           tipo: 'sistema',
                           rolDestino: 'tecnico',
                           idSolicitud,
                           prioridad: urgenciaFinal === 'Alta' ? 'alta' : 'normal',
                           requiereAccion: true,
                       }),
                    ])
                       .then(() => res.status(201).json({
                           message: 'Solicitud enviada correctamente',
                           idSolicitud,
                           numeroOrden: `SOL-${ordenGenerada}`,
                           tipo,
                           imagenUrl,
                       }))
                       .catch((notificationError) => {
                           console.error('❌ Solicitud creada, pero falló la notificación:', notificationError.message);
                           res.status(201).json({
                               message: 'Solicitud creada, pero no se pudo enviar la notificación interna.',
                               numeroOrden: ordenGenerada,
                               tipo,
                               imagenUrl,
                               advertencia: true,
                           });
                       });
                }
            );
        }
            );
        })
        .catch((clienteError) => res.status(500).json({ error: clienteError.message }));
});

// ─── Ventas (carrito) ─────────────────────────────────────────────────────────
app.post('/venta', verificarToken, (req, res) => {
    const { idUsuario, total, metodoPago, detallePago, productos } = req.body;

    if (!idUsuario || !total || !productos || productos.length === 0) {
        return res.status(400).json({ message: 'Faltan datos para registrar la venta' });
    }

    conexion.query(
        "INSERT INTO Venta (Fecha, Estado, total, idUsuario) VALUES (CURDATE(), 'pagado', ?, ?)",
        [total, idUsuario],
        (err, resultVenta) => {
            if (err) return res.status(500).json({ error: err.message });

            const idVenta = resultVenta.insertId;
            const valores = productos.map(p => [p.cantidad, p.precioUnitario, p.cantidad * p.precioUnitario, idVenta, p.idProducto]);

            conexion.query(
                'INSERT INTO VentaDetalle (cantidad, precioUnitario, subtotal, Venta_idVenta, producto_idProducto) VALUES ?',
                [valores],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    const referencia = 'PAY-' + Date.now();
                    conexion.query(
                        'INSERT INTO pago (Venta_idVenta, metodoPago, referenciaPago, detallePago, estadoPago) VALUES (?, ?, ?, ?, ?)',
                        [idVenta, metodoPago, referencia, detallePago || null, 'aprobado'],
                        (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            res.status(201).json({ message: 'Venta y pago registrados correctamente', idVenta, referencia });
                        }
                    );
                }
            );
        }
    );
});

app.get('/ventas/:idUsuario', verificarToken, (req, res) => {
    const { idUsuario } = req.params;
    conexion.query(
        `SELECT v.idVenta, v.Fecha, v.total, v.Estado,
                vd.cantidad, vd.precioUnitario, vd.subtotal,
                p.nombre AS producto,
                pg.metodoPago, pg.referenciaPago, pg.estadoPago
         FROM Venta v
         JOIN VentaDetalle vd ON v.idVenta = vd.Venta_idVenta
         JOIN producto p ON vd.producto_idProducto = p.idProducto
         LEFT JOIN pago pg ON v.idVenta = pg.Venta_idVenta
         WHERE v.idUsuario = ?
         ORDER BY v.Fecha DESC`,
        [idUsuario],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

const ejecutarAlmacenadoProgramado = () => {
    conexion.query(
        `UPDATE solicitud
         SET estado = 'Almacenado'
         WHERE tipodesolicitud_iddesolicitud = 1
           AND estado = 'Aprobado'
           AND fecha_registro < CURRENT_TIMESTAMP - INTERVAL '30 days'`,
        (error, resultado) => {
            if (error) {
                console.error('❌ Error en el archivado automático:', error.message);
                return;
            }
            if (resultado.affectedRows > 0) {
                console.log(`📦 Archivado automático: ${resultado.affectedRows} solicitud(es).`);
            }
        }
    );
};

app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
    ejecutarAlmacenadoProgramado();
    setInterval(ejecutarAlmacenadoProgramado, 24 * 60 * 60 * 1000);
});