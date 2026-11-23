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
import process from 'node:process';
import swaggerUi from 'swagger-ui-express';
import conexion from './Backend/config/db.js';
import { verificarToken, soloAdmin, soloTecnico } from './Backend/Middleware/Auth.js';
import rutasSolicitudes from './Backend/Routes/solicitudes.js';
import rutasNotificaciones from './Backend/Routes/notificaciones.js';
import { crearNotificacion } from './Backend/Services/notificaciones.js';
import openapi from './Backend/docs/openapi.js';

const app = express();
const PUERTO = Number(process.env.PORT || 3000);

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
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const VERSION_TERMINOS = '1.0';

const prepararReglaRetiro = async () => {
    await conexion.query(`
        ALTER TABLE usuario
        ADD COLUMN IF NOT EXISTS terminos_aceptados_en TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS version_terminos VARCHAR(30)
    `);
    await conexion.query(`
        ALTER TABLE solicitud
        ADD COLUMN IF NOT EXISTS fecha_listo_retiro TIMESTAMPTZ
    `);
    await conexion.query(`
        UPDATE solicitud
        SET fecha_listo_retiro = date_trunc('second', CURRENT_TIMESTAMP)
        WHERE estado = 'Aprobado' AND fecha_listo_retiro IS NULL
    `);
    await conexion.query(`
        CREATE TABLE IF NOT EXISTS solicitud_recordatorio (
            solicitud_id INTEGER NOT NULL REFERENCES solicitud(idsolicitud) ON DELETE CASCADE,
            fecha_listo_retiro TIMESTAMPTZ NOT NULL,
            dia INTEGER NOT NULL CHECK (dia IN (1, 15, 30)),
            correo_enviado BOOLEAN NOT NULL DEFAULT FALSE,
            notificacion_enviada BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (solicitud_id, fecha_listo_retiro, dia)
        )
    `);
};

const prepararAlertasStock = async () => {
    await conexion.query(`
        CREATE TABLE IF NOT EXISTS producto_stock_alerta (
            producto_id INTEGER PRIMARY KEY REFERENCES producto(idproducto) ON DELETE CASCADE,
            alerta_activa BOOLEAN NOT NULL DEFAULT TRUE,
            notificacion_enviada BOOLEAN NOT NULL DEFAULT FALSE
        )
    `);
};

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.get('/api-docs.json', (req, res) => res.json(openapi));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'Ingenix API - Swagger',
    swaggerOptions: { persistAuthorization: true },
}));
app.get('/docs/openapi.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'Ingenix API - Swagger',
    swaggerOptions: { persistAuthorization: true },
}));
app.use(rutasSolicitudes);
app.use(rutasNotificaciones);
app.get('/api/reportes/dashboard', verificarToken, soloAdmin, async (req, res) => {
    const periodo = ['semanal', 'mensual', 'anual'].includes(req.query.periodo)
        ? req.query.periodo
        : 'mensual';
    const intervalos = {
        semanal: "CURRENT_DATE - INTERVAL '6 days'",
        mensual: "CURRENT_DATE - INTERVAL '1 month'",
        anual: "CURRENT_DATE - INTERVAL '1 year'",
    };

    try {
        const { rows } = await conexion.query(
            `SELECT
                COUNT(*)::integer AS total_solicitudes,
                COUNT(*) FILTER (WHERE tipodesolicitud_iddesolicitud = 1)::integer AS mantenimientos,
                COUNT(*) FILTER (WHERE tipodesolicitud_iddesolicitud = 4)::integer AS ventas,
                COUNT(*) FILTER (WHERE estado = 'Entregado')::integer AS entregadas,
                COALESCE(SUM(total_estimado), 0)::numeric AS total_estimado
             FROM solicitud
             WHERE fecha_registro >= ${intervalos[periodo]}`
        );
        res.json({ periodo, generadoEn: new Date().toISOString(), ...rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

            const expiracion = new Date(
                Date.now() + 15 * 60 * 1000
            );

            conexion.query(
                `UPDATE usuario
                 SET token_recuperacion = ?,
                     expiracion_token = ?
                 WHERE correo = ?`,
                [tokenHash, expiracion, correo],
                async (errorActualizacion, resultadoActualizacion) => {
                    if (errorActualizacion) {
                        console.error('❌ No se pudo guardar el token de recuperación:', errorActualizacion.message);
                        return res.status(500).json({ message: 'No se pudo iniciar la recuperación de contraseña.' });
                    }
                    if (resultadoActualizacion.affectedRows === 0) {
                        return res.status(404).json({ message: 'No existe una cuenta con ese correo.' });
                    }

                    const enlace =
                        `http://localhost:5173/restablecer-password/${token}`;

                    try {
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
                    } catch (errorCorreo) {
                        console.error('❌ No se pudo enviar el correo de recuperación:', errorCorreo.message);
                        return res.status(503).json({
                            message: 'No se pudo enviar el correo de recuperación. Intenta nuevamente más tarde.'
                        });
                    }

                    res.json({
                        message: 'Se envió un correo de recuperación.'
                    });
                }
            );

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

        `SELECT idusuario AS "idUsuario"
         FROM usuario
         WHERE token_recuperacion IN (?, ?)
         AND expiracion_token > NOW()`,

        [crypto.createHash('sha256').update(token).digest('hex'), token],

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
                 WHERE idusuario=?`,

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
    const { nombre, correo, documento, direccion, telefono, pass, rol_idRol, aceptaTerminos } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }
    if (aceptaTerminos !== true) {
        return res.status(400).json({ message: 'Debes aceptar los términos sobre el plazo de recogida para registrarte.' });
    }

    try {
        const saltos = await bcrypt.genSalt(10);
        const passEncriptada = await bcrypt.hash(pass, saltos);

        conexion.query(
            `INSERT INTO usuario
                (nombre, correo, documento, direccion, telefono, pass, rol_idRol,
                 terminos_aceptados_en, version_terminos)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [nombre, correo, documento, direccion, telefono, passEncriptada, rol_idRol || 4, VERSION_TERMINOS],
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
    const telefonoNormalizado = String(telefono ?? '').replace(/\D/g, '');
    if (telefonoNormalizado.length > 10) {
        return res.status(400).json({ message: 'El teléfono no puede tener más de 10 dígitos.' });
    }

    conexion.query(
        `UPDATE usuario
         SET nombre = ?, correo = ?, documento = ?, direccion = ?, telefono = ?,
             rol_idrol = COALESCE(?, rol_idrol)
         WHERE idusuario = ?`,
        [nombre, correo, documento, direccion, telefonoNormalizado, rol_idRol || null, id],
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
                        [telefonoNormalizado, direccion, documento, id],
                        (perfilError) => {
                            if (perfilError) return res.status(500).json({ error: perfilError.message });
                            res.json({
                                message: 'Usuario actualizado con éxito',
                                usuario: { idUsuario: Number(id), nombre, correo, documento, direccion, telefono: telefonoNormalizado, rol_idRol },
                            });
                        }
                    );
                }
            );
        }
    );
});

app.put('/perfil/cambiar-password', verificarToken, async (req, res) => {
    const idUsuario = Number(req.usuario?.id);
    const { passwordActual, passwordNueva } = req.body;

    if (!Number.isSafeInteger(idUsuario) || idUsuario < 1) {
        return res.status(401).json({ message: 'La sesión no contiene un usuario válido.' });
    }
    if (typeof passwordActual !== 'string' || typeof passwordNueva !== 'string'
        || !passwordActual || !passwordNueva) {
        return res.status(400).json({ message: 'Indica la contraseña actual y la nueva contraseña.' });
    }
    if (passwordNueva.length < 8) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    try {
        const usuarios = await conexion.query(
            'SELECT pass FROM usuario WHERE idusuario = ?',
            [idUsuario]
        );
        if (usuarios.length === 0) {
            return res.status(404).json({ message: 'No se encontró el usuario de la sesión.' });
        }

        const coincide = await bcrypt.compare(passwordActual, usuarios[0].pass);
        if (!coincide) {
            return res.status(400).json({ message: 'La contraseña actual no es correcta.' });
        }

        const esLaMisma = await bcrypt.compare(passwordNueva, usuarios[0].pass);
        if (esLaMisma) {
            return res.status(400).json({ message: 'La nueva contraseña debe ser diferente a la actual.' });
        }

        const hash = await bcrypt.hash(passwordNueva, 10);
        const resultado = await conexion.query(
            'UPDATE usuario SET pass = ? WHERE idusuario = ?',
            [hash, idUsuario]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ message: 'No se pudo encontrar el usuario para actualizar la contraseña.' });
        }

        return res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('❌ No se pudo cambiar la contraseña del perfil:', error.message);
        return res.status(500).json({ message: 'No se pudo actualizar la contraseña.' });
    }
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
    conexion.query('DELETE FROM notificacion_usuario WHERE id_usuario = ?', [id], (notificacionError) => {
        if (notificacionError) return res.status(500).json({ error: notificacionError.message });
        conexion.query('UPDATE contraoferta_solicitud SET usuario_id = NULL WHERE usuario_id = ?', [id], (contraofertaError) => {
            if (contraofertaError) return res.status(500).json({ error: contraofertaError.message });
            conexion.query('DELETE FROM pago WHERE Venta_idVenta IN (SELECT idVenta FROM Venta WHERE idUsuario = ?)', [id], (pagoError) => {
                if (pagoError) return res.status(500).json({ error: pagoError.message });
                conexion.query('DELETE FROM VentaDetalle WHERE Venta_idVenta IN (SELECT idVenta FROM Venta WHERE idUsuario = ?)', [id], (detalleError) => {
                    if (detalleError) return res.status(500).json({ error: detalleError.message });
                    conexion.query('DELETE FROM Venta WHERE idUsuario = ?', [id], (ventaError) => {
                        if (ventaError) return res.status(500).json({ error: ventaError.message });
                        conexion.query('UPDATE cliente SET usuario_idusuario = NULL WHERE usuario_idusuario = ?', [id], (clienteError) => {
                            if (clienteError) return res.status(500).json({ error: clienteError.message });
                            conexion.query('DELETE FROM usuario WHERE idUsuario = ?', [id], (err, resultado) => {
                                if (err) return res.status(500).json({ error: err.message });
                                if (resultado.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
                                res.json({ message: 'Usuario eliminado con éxito' });
                            });
                        });
                    });
                });
            });
        });
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
            revisarAlertasStock();
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
            revisarAlertasStock();
            res.json({ message: 'Producto actualizado con éxito' });
        }
    );
});

app.delete('/productos/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    conexion.query('DELETE FROM producto_y_solicitud WHERE producto_idProducto = ?', [id], (solicitudError) => {
        if (solicitudError) return res.status(500).json({ error: solicitudError.message });
        conexion.query('DELETE FROM producto_categoria WHERE producto_idProducto = ?', [id], (categoriaError) => {
            if (categoriaError) return res.status(500).json({ error: categoriaError.message });
            conexion.query('DELETE FROM producto WHERE idProducto = ?', [id], (err, resultado) => {
                if (err) return res.status(500).json({ error: err.message });
                if (resultado.affectedRows === 0) return res.status(404).json({ message: 'Producto no encontrado.' });
                res.json({ message: 'Producto eliminado con éxito' });
            });
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
    conexion.query('DELETE FROM producto_categoria WHERE categoria_idCategoria = ?', [id], (relacionError) => {
        if (relacionError) return res.status(500).json({ error: relacionError.message });
        conexion.query('DELETE FROM categoria WHERE idCategoria = ?', [id], (err, resultado) => {
            if (err) return res.status(500).json({ error: err.message });
            if (resultado.affectedRows === 0) return res.status(404).json({ message: 'Categoría no encontrada.' });
            res.json({ message: 'Categoría eliminada con éxito' });
        });
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
    const periodo = req.query.periodo === 'dia' ? 'dia' : 'semana';
    const filtroPeriodo = periodo === 'dia'
        ? `fecha_registro >= CURRENT_DATE AND fecha_registro < CURRENT_DATE + INTERVAL '1 day'`
        : `fecha_registro >= CURRENT_DATE - INTERVAL '6 days'`;
    conexion.query(
        `SELECT
           COUNT(*) FILTER (WHERE estado NOT IN ('Entregado', 'Cancelado', 'Almacenado')) AS activos_periodo,
           COUNT(*) FILTER (WHERE estado NOT IN ('Entregado', 'Cancelado', 'Almacenado')
             AND fecha_registro >= CURRENT_DATE AND fecha_registro < CURRENT_DATE + INTERVAL '1 day') AS activos_hoy,
           COUNT(*) FILTER (WHERE estado IN ('Aprobado', 'Terminado')) AS entregas_pendientes,
           COALESCE(SUM(total_estimado) FILTER (WHERE estado NOT IN ('Cancelado') AND ${filtroPeriodo}), 0) AS total_estimado_periodo,
           COUNT(*) FILTER (WHERE tipodesolicitud_iddesolicitud = 1 AND ${filtroPeriodo}) AS mantenimientos_periodo,
           COUNT(*) FILTER (WHERE tipodesolicitud_iddesolicitud = 4 AND ${filtroPeriodo}) AS ventas_periodo
         FROM solicitud`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            const datos = results[0];
            const activosPeriodo = Number(datos.activos_periodo) || 0;
            const activosHoy = Number(datos.activos_hoy) || 0;
            const entregasPendientes = Number(datos.entregas_pendientes) || 0;
            const mantenimientosPeriodo = Number(datos.mantenimientos_periodo) || 0;
            const ventasPeriodo = Number(datos.ventas_periodo) || 0;
            const totalEstimadoPeriodo = Number(datos.total_estimado_periodo) || 0;
            res.json({
                periodo,
                activosPeriodo,
                activosHoy,
                entregasPendientes,
                mantenimientosPeriodo,
                ventasPeriodo,
                totalEstimadoPeriodo,
                mantenimientos: `${mantenimientosPeriodo} Activos`,
                entregas: `${entregasPendientes} Pendientes`,
                totalEstimado: `$${totalEstimadoPeriodo.toLocaleString('es-CO')}`,
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
app.post('/api/venta', verificarToken, upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'imagenFrontal', maxCount: 1 },
    { name: 'imagenTrasera', maxCount: 1 },
]), (req, res) => {
    const { tipo, nombreArticulo, descripcion, urgencia, estadoArticulo, precioEstimado } = req.body;
    const imagenGeneral = req.files?.imagen?.[0];
    const imagenFrontal = req.files?.imagenFrontal?.[0];
    const imagenTrasera = req.files?.imagenTrasera?.[0];
    const imagenUrl = imagenGeneral ? `/uploads/solicitudes/${imagenGeneral.filename}` : null;

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
                    const imagenes = [
                        imagenGeneral && [idSolicitud, 'general', imagenUrl],
                        imagenFrontal && [idSolicitud, 'frontal', `/uploads/solicitudes/${imagenFrontal.filename}`],
                        imagenTrasera && [idSolicitud, 'trasera', `/uploads/solicitudes/${imagenTrasera.filename}`],
                    ].filter(Boolean);
                    const guardarImagenes = imagenes.length
                        ? new Promise((resolve, reject) => conexion.query(
                            'INSERT INTO solicitud_imagen (solicitud_id, tipo, ruta) VALUES ?',
                            [imagenes],
                            (error) => error ? reject(error) : resolve()
                        ))
                        : Promise.resolve();
                    guardarImagenes.then(() => Promise.all([
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
                    ]))
                       .then(() => res.status(201).json({
                           message: 'Solicitud enviada correctamente',
                           idSolicitud,
                           numeroOrden: `SOL-${ordenGenerada}`,
                           tipo,
                           imagenUrl,
                       }))
                       .catch((notificationError) => {
                           console.error('❌ Solicitud creada, pero falló un paso posterior:', notificationError.message);
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
    const usuarioAutenticado = Number(req.usuario?.id);
    const usuarioSolicitado = Number(idUsuario);

    if (!Number.isInteger(usuarioAutenticado) || usuarioAutenticado < 1) {
        return res.status(401).json({ message: 'La sesión no contiene un usuario válido.' });
    }
    if (usuarioSolicitado && usuarioSolicitado !== usuarioAutenticado) {
        return res.status(403).json({ message: 'El usuario de la venta no coincide con la sesión activa.' });
    }
    if (total == null || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ message: 'Faltan datos para registrar la venta' });
    }

    const cantidadesPorProducto = new Map();
    for (const producto of productos) {
        const idProducto = Number(producto.idProducto ?? producto.idproducto);
        const cantidad = Number(producto.cantidad);
        if (!Number.isSafeInteger(idProducto) || idProducto < 1
            || !Number.isSafeInteger(cantidad) || cantidad < 1) {
            return res.status(400).json({ message: 'El carrito contiene un producto o cantidad no válida.' });
        }
        const cantidadAcumulada = (cantidadesPorProducto.get(idProducto) || 0) + cantidad;
        if (!Number.isSafeInteger(cantidadAcumulada)) {
            return res.status(400).json({ message: 'La cantidad total de un producto no es válida.' });
        }
        cantidadesPorProducto.set(idProducto, cantidadAcumulada);
    }

    conexion.transaction(async (transaccion) => {
        const idsProducto = [...cantidadesPorProducto.keys()].sort((a, b) => a - b);
        const marcadores = idsProducto.map(() => '?').join(', ');
        const inventario = await transaccion.query(
            `SELECT idProducto AS "idProducto", nombre, precio, stock
             FROM producto
             WHERE idProducto IN (${marcadores})
             ORDER BY idProducto
             FOR UPDATE`,
            idsProducto
        );
        const productosPorId = new Map(
            inventario.map((producto) => [Number(producto.idProducto ?? producto.idproducto), producto])
        );

        for (const [idProducto, cantidad] of cantidadesPorProducto) {
            const producto = productosPorId.get(idProducto);
            if (!producto) {
                const error = new Error(`El producto #${idProducto} ya no está disponible.`);
                error.status = 409;
                throw error;
            }

            if (producto.stock != null && cantidad > Number(producto.stock)) {
                const error = new Error(
                    `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}.`
                );
                error.status = 409;
                throw error;
            }
        }

        const lineasVenta = [...cantidadesPorProducto].map(([idProducto, cantidad]) => {
            const producto = productosPorId.get(idProducto);
            const precio = Number(producto.precio);
            if (!Number.isFinite(precio) || precio < 0) {
                throw new Error(`El precio de ${producto.nombre} no es válido.`);
            }
            return { idProducto, cantidad, precio };
        });
        const totalCalculado = lineasVenta.reduce(
            (suma, linea) => suma + linea.cantidad * linea.precio,
            0
        );

        for (const linea of lineasVenta) {
            const producto = productosPorId.get(linea.idProducto);
            if (producto.stock == null) continue;

            const resultadoStock = await transaccion.query(
                `UPDATE producto
                 SET stock = stock - ?
                 WHERE idProducto = ? AND stock >= ?`,
                [linea.cantidad, linea.idProducto, linea.cantidad]
            );
            if (resultadoStock.affectedRows === 0) {
                const error = new Error(`Stock insuficiente para ${producto.nombre}.`);
                error.status = 409;
                throw error;
            }
        }

        const ventas = await transaccion.query(
            "INSERT INTO Venta (Fecha, Estado, total, idUsuario) VALUES (CURDATE(), 'pagado', ?, ?)",
            [totalCalculado, usuarioAutenticado]
        );
        const idVenta = ventas.insertId;
        const valores = lineasVenta.map((linea) => [
            linea.cantidad,
            linea.precio,
            linea.cantidad * linea.precio,
            idVenta,
            linea.idProducto,
        ]);
        await transaccion.query(
            'INSERT INTO VentaDetalle (cantidad, precioUnitario, subtotal, Venta_idVenta, producto_idProducto) VALUES ?',
            [valores]
        );

        const referencia = 'PAY-' + Date.now();
        await transaccion.query(
            'INSERT INTO pago (Venta_idVenta, metodoPago, referenciaPago, detallePago, estadoPago) VALUES (?, ?, ?, ?, ?)',
            [idVenta, metodoPago, referencia, detallePago || null, 'aprobado']
        );

        return { idVenta, referencia, total: totalCalculado };
    })
        .then((resultado) => {
            revisarAlertasStock();
            res.status(201).json({
                message: 'Venta y pago registrados correctamente',
                ...resultado,
            });
        })
        .catch((error) => {
            if (error.status) {
                return res.status(error.status).json({ message: error.message });
            }
            console.error('❌ No se pudo registrar la venta:', error.message);
            return res.status(500).json({ message: 'No se pudo registrar la venta.' });
        });
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

const ejecutarRecordatoriosRetiro = async () => {
    try {
        const solicitudes = await conexion.query(`
            SELECT
                s.idsolicitud AS "idSolicitud",
                s.numeroorden AS "numeroOrden",
                s.fecha_listo_retiro AS "fechaListoRetiro",
                c.usuario_idusuario AS "usuarioId",
                u.correo,
                (timezone('America/Bogota', CURRENT_TIMESTAMP)::date
                    - (s.fecha_listo_retiro AT TIME ZONE 'America/Bogota')::date)::integer AS "diasDesdeListo"
            FROM solicitud s
            INNER JOIN cliente c ON c.idcliente = s.cliente_idcliente
            INNER JOIN usuario u ON u.idusuario = c.usuario_idusuario
            WHERE s.estado IN ('Aprobado', 'Almacenado')
              AND s.fecha_listo_retiro IS NOT NULL
              AND timezone('America/Bogota', CURRENT_TIMESTAMP)::date
                  > (s.fecha_listo_retiro AT TIME ZONE 'America/Bogota')::date
        `);

        for (const solicitud of solicitudes) {
            const diasDesdeListo = Number(solicitud.diasDesdeListo);
            for (const dia of [1, 15, 30]) {
                if (diasDesdeListo < dia) continue;

                await conexion.query(
                    `INSERT INTO solicitud_recordatorio (solicitud_id, fecha_listo_retiro, dia)
                     VALUES (?, ?, ?)
                     ON CONFLICT (solicitud_id, fecha_listo_retiro, dia) DO NOTHING`,
                    [solicitud.idSolicitud, solicitud.fechaListoRetiro, dia]
                );
                const [recordatorio] = await conexion.query(
                    `SELECT correo_enviado AS "correoEnviado",
                            notificacion_enviada AS "notificacionEnviada"
                     FROM solicitud_recordatorio
                     WHERE solicitud_id = ? AND fecha_listo_retiro = ? AND dia = ?`,
                    [solicitud.idSolicitud, solicitud.fechaListoRetiro, dia]
                );
                const orden = solicitud.numeroOrden || `#${solicitud.idSolicitud}`;
                const mensaje = `El artículo de la solicitud ${orden} está listo. Tienes 30 días desde que fue aprobado para recogerlo o solicitar un envío. Este es tu recordatorio del día ${dia}.`;

                if (!recordatorio.notificacionEnviada) {
                    try {
                        await crearNotificacion({
                            titulo: `Recordatorio de recogida: día ${dia}`,
                            mensaje,
                            tipo: 'sistema',
                            rolDestino: 'cliente',
                            usuarioIds: [solicitud.usuarioId],
                            idSolicitud: solicitud.idSolicitud,
                        });
                        await conexion.query(
                            `UPDATE solicitud_recordatorio SET notificacion_enviada = TRUE
                             WHERE solicitud_id = ? AND fecha_listo_retiro = ? AND dia = ?`,
                            [solicitud.idSolicitud, solicitud.fechaListoRetiro, dia]
                        );
                    } catch (error) {
                        console.error(`❌ No se pudo crear el recordatorio interno de la solicitud ${orden}:`, error.message);
                    }
                }

                if (!recordatorio.correoEnviado) {
                    try {
                        await transporter.sendMail({
                            from: process.env.EMAIL_USER,
                            to: solicitud.correo,
                            subject: `Recordatorio de recogida de tu solicitud ${orden}`,
                            text: `${mensaje}\n\nPor favor, comunícate con Ingenix para coordinar el envío o recoge tu artículo dentro del plazo.`,
                            html: `<p>${mensaje}</p><p>Comunícate con Ingenix para coordinar el envío o recoge tu artículo dentro del plazo.</p>`,
                        });
                        await conexion.query(
                            `UPDATE solicitud_recordatorio SET correo_enviado = TRUE
                             WHERE solicitud_id = ? AND fecha_listo_retiro = ? AND dia = ?`,
                            [solicitud.idSolicitud, solicitud.fechaListoRetiro, dia]
                        );
                    } catch (error) {
                        console.error(`❌ No se pudo enviar el recordatorio por correo de la solicitud ${orden}:`, error.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error al procesar recordatorios de recogida:', error.message);
    }
};

let revisandoStockBajo = false;

const revisarAlertasStock = async () => {
    if (revisandoStockBajo) return;
    revisandoStockBajo = true;

    try {
        await conexion.query(`
            UPDATE producto_stock_alerta alerta
            SET alerta_activa = FALSE, notificacion_enviada = FALSE
            FROM producto p
            WHERE p.idproducto = alerta.producto_id
              AND (p.stock IS NULL OR p.stock > 2)
              AND alerta.alerta_activa = TRUE
        `);
        await conexion.query(`
            INSERT INTO producto_stock_alerta (producto_id, alerta_activa, notificacion_enviada)
            SELECT idproducto, TRUE, FALSE
            FROM producto
            WHERE stock <= 2
            ON CONFLICT (producto_id) DO UPDATE
            SET alerta_activa = TRUE,
                notificacion_enviada = CASE
                    WHEN producto_stock_alerta.alerta_activa
                        THEN producto_stock_alerta.notificacion_enviada
                    ELSE FALSE
                END
        `);
        const productosConStockBajo = await conexion.query(`
            SELECT p.idproducto AS "idProducto", p.nombre, p.stock
            FROM producto_stock_alerta alerta
            INNER JOIN producto p ON p.idproducto = alerta.producto_id
            WHERE alerta.alerta_activa = TRUE
              AND alerta.notificacion_enviada = FALSE
              AND p.stock <= 2
        `);

        for (const producto of productosConStockBajo) {
            try {
                await crearNotificacion({
                    titulo: `Stock crítico: ${producto.nombre}`,
                    mensaje: `Quedan ${producto.stock} unidades de ${producto.nombre}. Reponer este producto con urgencia.`,
                    tipo: 'sistema',
                    rolDestino: 'admin',
                    prioridad: 'urgente',
                });
                await conexion.query(
                    `UPDATE producto_stock_alerta
                     SET notificacion_enviada = TRUE
                     WHERE producto_id = ? AND alerta_activa = TRUE`,
                    [producto.idProducto]
                );
            } catch (error) {
                console.error(`❌ No se pudo enviar la alerta de stock para ${producto.nombre}:`, error.message);
            }
        }
    } catch (error) {
        console.error('❌ No se pudieron revisar las alertas de stock:', error.message);
    } finally {
        revisandoStockBajo = false;
    }
};

const ejecutarAlmacenadoProgramado = () => {
    conexion.query(
        `UPDATE solicitud
         SET estado = 'Almacenado'
         WHERE estado = 'Aprobado'
           AND fecha_listo_retiro IS NOT NULL
           AND fecha_listo_retiro < CURRENT_TIMESTAMP - INTERVAL '30 days'
         RETURNING idsolicitud, numeroorden, cliente_idcliente`,
        async (error, solicitudesArchivadas) => {
            if (error) {
                console.error('❌ Error en el archivado automático:', error.message);
                return;
            }

            const solicitudes = Array.isArray(solicitudesArchivadas)
                ? solicitudesArchivadas
                : [];

            if (solicitudes.length === 0) return;

            try {
                await Promise.all(solicitudes.map(async (solicitud) => {
                    const idSolicitud = solicitud.idSolicitud ?? solicitud.idsolicitud;
                    const numeroOrden = solicitud.numeroOrden ?? solicitud.numeroorden;
                    const clienteId = solicitud.clienteId ?? solicitud.cliente_idcliente;
                    const clientes = await new Promise((resolve, reject) => {
                        conexion.query(
                            `SELECT u.idusuario AS "usuarioId"
                             FROM cliente c
                             INNER JOIN usuario u ON u.idusuario = c.usuario_idusuario
                             WHERE c.idcliente = ?`,
                            [clienteId],
                            (clienteError, resultados) => (
                                clienteError ? reject(clienteError) : resolve(resultados)
                            )
                        );
                    });
                    const usuarioId = clientes[0]?.usuarioId;
                    const notificaciones = [
                        usuarioId && crearNotificacion({
                            titulo: 'Solicitud almacenada',
                            mensaje: `La solicitud ${numeroOrden || `#${idSolicitud}`} fue almacenada automáticamente después de 30 días en estado aprobado.`,
                            tipo: 'sistema',
                            rolDestino: 'cliente',
                            usuarioIds: [usuarioId],
                            idSolicitud,
                        }),
                        crearNotificacion({
                            titulo: 'Solicitud archivada automáticamente',
                            mensaje: `La solicitud ${numeroOrden || `#${idSolicitud}`} cambió a estado Almacenado.`,
                            tipo: 'sistema',
                            rolDestino: 'admin',
                            idSolicitud,
                        }),
                    ].filter(Boolean);
                    await Promise.all(notificaciones);
                }));
                console.log(`📦 Archivado automático: ${solicitudes.length} solicitud(es).`);
            } catch (notificationError) {
                console.error('❌ Solicitudes archivadas, pero falló una notificación:', notificationError.message);
            }
        }
    );
};

Promise.all([prepararReglaRetiro(), prepararAlertasStock()])
    .then(() => {
        app.listen(PUERTO, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
            ejecutarAlmacenadoProgramado();
            ejecutarRecordatoriosRetiro();
            revisarAlertasStock();
            setInterval(ejecutarAlmacenadoProgramado, 24 * 60 * 60 * 1000);
            setInterval(ejecutarRecordatoriosRetiro, 24 * 60 * 60 * 1000);
            setInterval(revisarAlertasStock, 60 * 1000);
        });
    })
    .catch((error) => {
        console.error('❌ No se pudo preparar la regla de recogida:', error.message);
        process.exitCode = 1;
    });
