import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import conexion from './Backend/config/db.js';
import { verificarToken, soloAdmin, soloTecnico } from './Backend/Middleware/Auth.js';
import rutasSolicitudes from './Backend/Routes/solicitudes.js';

const app = express();
const PUERTO = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(rutasSolicitudes);

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
        `SELECT u.*, r.nombreRol AS rol
         FROM usuario u
         JOIN rol r ON u.rol_idRol = r.idRol
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

            const token = jwt.sign(
                { id: usuario.idUsuario, nombre: usuario.nombre, rol: usuario.rol },
                process.env.JWT_SECRET || 'clave_secreta_temporal',
                { expiresIn: '2h' }
            );

            res.json({ mensaje: 'Login exitoso', token, usuario });
        }
    );
});


app.post('/usuarios/registro', async (req, res) => {
    const { nombre, correo, documento, direccion, pass, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    try {
        const saltos = await bcrypt.genSalt(10);
        const passEncriptada = await bcrypt.hash(pass, saltos);

        conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, pass, rol_idRol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, correo, documento, direccion, passEncriptada, rol_idRol || 4],
            (err, results) => {
                if (err) {
                    console.error('❌ Error POST /usuarios/registro:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: 'Usuario registrado con éxito', idUsuario: results.insertId });
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
        `SELECT u.idUsuario, u.nombre, u.correo, u.documento, u.direccion, u.rol_idRol, r.nombreRol AS rol 
         FROM usuario u 
         LEFT JOIN rol r ON u.rol_idRol = r.idRol`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.post('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, correo, documento, direccion, pass, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    try {
        const saltos = await bcrypt.genSalt(10);
        const passEncriptada = await bcrypt.hash(pass, saltos);

        conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, pass, rol_idRol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, correo, documento, direccion, passEncriptada, rol_idRol || 1],
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Usuario creado con éxito', idUsuario: results.insertId });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error interno al procesar la contraseña' });
    }
});

app.put('/usuarios/:id', verificarToken, (req, res) => {
    const { id } = req.params;
    const { nombre, correo, documento, direccion, telefono, rol_idRol } = req.body;

    conexion.query(
        'UPDATE usuario SET nombre = ?, correo = ?, documento = ?, direccion = ?, telefono = ?, rol_idRol = ? WHERE idUsuario = ?',
        [nombre, correo, documento, direccion, telefono, rol_idRol, id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Usuario actualizado con éxito' });
        }
    );
});

app.get('/usuarios/tecnicos', verificarToken, soloAdmin, (req, res) => {
    conexion.query(
        `SELECT u.idUsuario, u.nombre 
         FROM usuario u 
         JOIN rol r ON u.rol_idRol = r.idRol 
         WHERE r.nombreRol = 'tecnico'`,
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
app.get('/api/dashboard/estadisticas', verificarToken, soloTecnico, (req, res) => {
    conexion.query(
        `SELECT COUNT(*) as total_solicitudes, IFNULL(SUM(total_estimado), 0) as suma_total
         FROM solicitud WHERE DATE(fecha_registro) = CURDATE()`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            const datos = results[0];
            res.json({
                mantenimientos: `${datos.total_solicitudes} Activos`,
                entregas: 'Pendientes',
                totalEstimado: `${Number(datos.suma_total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`
            });
        }
    );
});

app.get('/api/dashboard/ultimas-solicitudes', verificarToken, soloTecnico, (req, res) => {
    conexion.query(
        `SELECT idSolicitud, DATE_FORMAT(fecha_registro, '%d/%m/%Y') AS fecha, total_estimado 
         FROM solicitud ORDER BY fecha_registro DESC LIMIT 5`,
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

    conexion.query(
        `INSERT INTO solicitud (idSolicitud, fecha_registro, cliente_idCliente, estado, TipoDeSolicitud_idDeSolicitud, urgencia)
         VALUES (?, NOW(), NULL, 'Pendiente', ?, ?)`,
        [ordenGenerada, tipoDeSolicitud, urgenciaFinal],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            const detalle = `[${tipo.toUpperCase()}] ${nombreArticulo}: ${descripcion}` +
                `${estadoArticulo ? ` | Estado: ${estadoArticulo}` : ''}` +
                `${precioEstimado ? ` | Precio estimado: $${precioEstimado}` : ''}` +
                `${imagenUrl ? ` | Imagen: ${imagenUrl}` : ''}`;

            conexion.query(
                `INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
                 VALUES (?, ?, 1, ?)`,
                [tipo === 'mantenimiento' ? 1 : 2, ordenGenerada, detalle],
                (errDetalle) => {
                    if (errDetalle) return res.status(500).json({ error: errDetalle.message });
                    res.status(201).json({ message: 'Solicitud enviada correctamente', numeroOrden: ordenGenerada, tipo, imagenUrl });
                }
            );
        }
    );
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

app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});