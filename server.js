import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import conexion from './Backend/config/db.js';
import rutasSolicitudes from './Backend/Routes/solicitudes.js';

const app = express();
const PUERTO = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.use(rutasSolicitudes);

// ─── Test ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

// ─── Login ─────────────────────────────────────────────────────────────────────
app.post('/login', (req, res) => {
    const { correo, pass } = req.body;

    if (!correo || !pass) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    conexion.query(
        `SELECT u.*, r.nombreRol AS rol
         FROM usuario u
         JOIN rol r ON u.rol_idRol = r.idRol
         WHERE u.correo = ? AND u.pass = SHA2(?, 256)`,
        [correo, pass],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0)
                return res.status(401).json({ message: 'Credenciales inválidas' });

            const usuario = results[0];

            const token = jwt.sign(
                { id: usuario.idUsuario, nombre: usuario.nombre, rol: usuario.rol },
                process.env.JWT_SECRET || 'clave_secreta_temporal',
                { expiresIn: '2h' }
            );

            res.json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    idUsuario: usuario.idUsuario,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    telefono: usuario.telefono,
                    direccion: usuario.direccion,
                    documento: usuario.documento,
                    rol: usuario.rol
                }
            });
        }
    );
});

// ─── Buscar usuario (para validar en register) ─────────────────────────────────
app.get('/usuario', (req, res) => {
    const { correo, documento } = req.query;

    if (!correo && !documento) {
        return res.status(400).json({ message: 'Se requiere el parámetro correo o documento para validar.' });
    }

    let sql = 'SELECT idUsuario, nombre, correo, documento FROM usuario WHERE ';
    let parametro = '';

    if (correo) {
        sql += 'correo = ?';
        parametro = correo;
    } else if (documento) {
        sql += 'documento = ?';
        parametro = documento;
    }

    conexion.query(sql, [parametro], (err, results) => {
        if (err) {
            console.error('❌ Error en GET /usuario:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ─── Listar usuarios ───────────────────────────────────────────────────────────
app.get('/usuarios', (req, res) => {
    conexion.query(
        `SELECT u.idUsuario, u.nombre, u.correo, u.documento, u.direccion, u.telefono, u.rol_idRol, r.nombreRol AS rol 
         FROM usuario u 
         LEFT JOIN rol r ON u.rol_idRol = r.idRol`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ─── Crear usuario ─────────────────────────────────────────────────────────────
app.post('/usuarios', (req, res) => {
    const { nombre, correo, documento, direccion, telefono, pass, rol_idRol, TipoDocumento_idTipoDocumento } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const rolFinal = rol_idRol || 3;

    // 1. Insertar usuario con SHA2
    conexion.query(
        'INSERT INTO usuario (nombre, correo, documento, telefono, direccion, pass, rol_idRol, TipoDocumento_idTipoDocumento) VALUES (?, ?, ?, ?, ?, SHA2(?, 256), ?, ?)',
        [nombre, correo, documento, telefono, direccion, pass, rolFinal, TipoDocumento_idTipoDocumento],
        (err, results) => {
            if (err) {
                console.error('❌ Error POST /usuarios:', err);
                return res.status(500).json({ error: err.message });
            }

            const idUsuario = results.insertId;

            // 2. Si el rol es usuario (3), insertar también en cliente
            if (rolFinal === 3 || rolFinal === '3') {
                conexion.query(
                    'INSERT INTO cliente (usuario_idUsuario) VALUES (?)',
                    [idUsuario],
                    (err2) => {
                        if (err2) {
                            console.error('❌ Error INSERT cliente:', err2);
                            // No bloqueamos, el usuario ya fue creado
                        }
                    }
                );
            }

            res.status(201).json({ message: 'Usuario creado', idUsuario });
        }
    );
});

// ─── Actualizar usuario ────────────────────────────────────────────────────────
app.put('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, correo, documento, direccion, telefono, rol_idRol } = req.body;

    conexion.query(
        'UPDATE usuario SET nombre = ?, correo = ?, documento = ?, direccion = ?, telefono = ?, rol_idRol = ? WHERE idUsuario = ?',
        [nombre, correo, documento, direccion, telefono, rol_idRol, id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Usuario actualizado con éxito' });
        }
    );
});

// ─── Eliminar usuario ──────────────────────────────────────────────────────────
app.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;

    conexion.query('DELETE FROM usuario WHERE idUsuario = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuario eliminado con éxito' });
    });
});

// ─── Listar productos ──────────────────────────────────────────────────────────
app.get('/productos', (req, res) => {
    conexion.query('SELECT * FROM producto', (err, results) => {
        if (err) {
            console.error('❌ Error en GET /productos:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ─── Crear producto ────────────────────────────────────────────────────────────
app.post('/productos', (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;

    if (!nombre || !precio) {
        return res.status(400).json({ message: 'Nombre y Precio son campos requeridos' });
    }

    conexion.query(
        'INSERT INTO producto (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)',
        [nombre, descripcion, precio, stock || 0],
        (err, results) => {
            if (err) {
                console.error('❌ Error en POST /productos:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Producto creado', idProducto: results.insertId });
        }
    );
});

// ─── Actualizar producto ───────────────────────────────────────────────────────
app.put('/productos/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock } = req.body;

    conexion.query(
        'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE idProducto = ?',
        [nombre, descripcion, precio, stock, id],
        (err, results) => {
            if (err) {
                console.error('❌ Error en PUT /productos:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Producto actualizado con éxito' });
        }
    );
});

// ─── Eliminar producto ─────────────────────────────────────────────────────────
app.delete('/productos/:id', (req, res) => {
    const { id } = req.params;

    conexion.query('DELETE FROM producto WHERE idProducto = ?', [id], (err, results) => {
        if (err) {
            console.error('❌ Error en DELETE /productos:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Producto eliminado con éxito' });
    });
});

// ─── Crear venta + pago (pasarela simulada) ────────────────────────────────────
app.post('/venta', (req, res) => {
    const { idUsuario, total, metodoPago, detallePago, productos } = req.body;

    if (!idUsuario || !total || !productos || productos.length === 0) {
        return res.status(400).json({ message: 'Faltan datos para registrar la venta' });
    }

    // 1. Insertar la venta
    conexion.query(
        "INSERT INTO Venta (Fecha, Estado, total, idUsuario) VALUES (CURDATE(), 'pagado', ?, ?)",
        [total, idUsuario],
        (err, resultVenta) => {
            if (err) {
                console.error('❌ Error POST /venta:', err);
                return res.status(500).json({ error: err.message });
            }

            const idVenta = resultVenta.insertId;

            // 2. Insertar productos en VentaDetalle
            const valores = productos.map(p => [
                p.cantidad,
                p.precioUnitario,
                p.cantidad * p.precioUnitario, // subtotal
                idVenta,
                p.idProducto
            ]);

            conexion.query(
                'INSERT INTO VentaDetalle (cantidad, precioUnitario, subtotal, Venta_idVenta, producto_idProducto) VALUES ?',
                [valores],
                (err2) => {
                    if (err2) {
                        console.error('❌ Error insertando VentaDetalle:', err2);
                        return res.status(500).json({ error: err2.message });
                    }

                    // 3. Insertar en tabla pago
                    const referencia = 'PAY-' + Date.now();
                    conexion.query(
                        'INSERT INTO pago (Venta_idVenta, metodoPago, referenciaPago, detallePago, estadoPago) VALUES (?, ?, ?, ?, ?)',
                        [idVenta, metodoPago, referencia, detallePago || null, 'aprobado'],
                        (err3) => {
                            if (err3) {
                                console.error('❌ Error insertando pago:', err3);
                                return res.status(500).json({ error: err3.message });
                            }

                            res.status(201).json({
                                message: 'Venta y pago registrados correctamente',
                                idVenta,
                                referencia
                            });
                        }
                    );
                }
            );
        }
    );
});

// ─── Historial de ventas de un usuario ────────────────────────────────────────
app.get('/ventas/:idUsuario', (req, res) => {
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
            if (err) {
                console.error('❌ Error GET /ventas:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(results);
        }
    );
});

// ─── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});