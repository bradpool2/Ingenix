import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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

// ─── Buscar usuario (validar en register) ─────────────────────────────────────
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
        `SELECT u.idUsuario, u.nombre, u.correo, u.documento, u.direccion, u.rol_idRol, r.nombreRol AS rol 
         FROM usuario u 
         LEFT JOIN rol r ON u.rol_idRol = r.idRol`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ─── Listar técnicos ───────────────────────────────────────────────────────────
app.get('/usuarios/tecnicos', (req, res) => {
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

// ─── Crear usuario ─────────────────────────────────────────────────────────────
app.post('/usuarios', async (req, res) => {
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
                if (err) {
                    console.error('❌ Error POST /usuarios:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: 'Usuario creado con éxito', idUsuario: results.insertId });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error interno al procesar la contraseña' });
    }
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

// ─── Productos con categorías (DEBE IR ANTES de /productos/:id) ────────────────
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

    conexion.query('DELETE FROM producto_y_solicitud WHERE producto_idProducto = ?', [id], (errRelacion) => {
        if (errRelacion) {
            console.error('❌ Error al borrar relaciones del producto:', errRelacion.message);
            return res.status(500).json({ error: errRelacion.message });
        }

        conexion.query('DELETE FROM producto WHERE idProducto = ?', [id], (err, results) => {
            if (err) {
                console.error('❌ Error en DELETE /productos:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Producto eliminado con éxito junto a su historial de uso' });
        });
    });
});

// ─── Categorías de un producto específico (DEBE IR ANTES de con-categorias ya está arriba) ──
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

// ─── Asignar categorías a un producto ─────────────────────────────────────────
app.put('/productos/:id/categorias', (req, res) => {
    const { id } = req.params;
    const { categorias } = req.body;

    conexion.query('DELETE FROM producto_categoria WHERE producto_idProducto = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!categorias || categorias.length === 0) {
            return res.json({ message: 'Categorías actualizadas (sin categorías asignadas)' });
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

// ─── Categorías ────────────────────────────────────────────────────────────────
app.get('/categorias', (req, res) => {
    conexion.query('SELECT * FROM categoria ORDER BY nombre ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/categorias', (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

    conexion.query('INSERT INTO categoria (nombre) VALUES (?)', [nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ idCategoria: results.insertId, nombre });
    });
});

app.delete('/categorias/:id', (req, res) => {
    const { id } = req.params;
    conexion.query('DELETE FROM categoria WHERE idCategoria = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Categoría eliminada con éxito' });
    });
});

// ─── Dashboard ─────────────────────────────────────────────────────────────────
app.get('/api/dashboard/estadisticas', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_solicitudes,
            IFNULL(SUM(total_estimado), 0) as suma_total
        FROM solicitud
    `;

    conexion.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener estadísticas:", err.message);
            return res.status(500).json({ error: err.message });
        }

        const datos = results[0];
        res.json({
            mantenimientos: `${datos.total_solicitudes} Activos`,
            entregas: "Pendientes",
            totalEstimado: `${Number(datos.suma_total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`
        });
    });
});

app.get('/api/dashboard/ultimas-solicitudes', (req, res) => {
    const sql = `
        SELECT idSolicitud, DATE_FORMAT(fecha_registro, '%d/%m/%Y') AS fecha, total_estimado 
        FROM solicitud 
        ORDER BY fecha_registro DESC 
        LIMIT 5
    `;

    conexion.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener últimas solicitudes:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ─── Técnico solicitudes ───────────────────────────────────────────────────────
app.get('/api/tecnico/solicitudes', (req, res) => {
    const sql = `
        SELECT idSolicitud, DATE_FORMAT(fecha_registro, '%d/%m/%Y') AS fecha, total_estimado, estado 
        FROM solicitud 
        ORDER BY fecha_registro DESC
    `;
    conexion.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/api/tecnico/solicitudes/:id/estado', (req, res) => {
    const { id } = req.params;
    const { nuevoEstado } = req.body;

    conexion.query(
        'UPDATE solicitud SET estado = ? WHERE idSolicitud = ?',
        [nuevoEstado, id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `Solicitud #${id} actualizada a ${nuevoEstado} con éxito` });
        }
    );
});

// ─── Crear venta + pago ────────────────────────────────────────────────────────
app.post('/venta', (req, res) => {
    const { idUsuario, total, metodoPago, detallePago, productos } = req.body;

    if (!idUsuario || !total || !productos || productos.length === 0) {
        return res.status(400).json({ message: 'Faltan datos para registrar la venta' });
    }

    conexion.query(
        "INSERT INTO Venta (Fecha, Estado, total, idUsuario) VALUES (CURDATE(), 'pagado', ?, ?)",
        [total, idUsuario],
        (err, resultVenta) => {
            if (err) {
                console.error('❌ Error POST /venta:', err);
                return res.status(500).json({ error: err.message });
            }

            const idVenta = resultVenta.insertId;

            const valores = productos.map(p => [
                p.cantidad,
                p.precioUnitario,
                p.cantidad * p.precioUnitario,
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