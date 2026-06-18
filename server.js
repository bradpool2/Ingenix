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

app.put('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, correo, documento, direccion, rol_idRol } = req.body;

    conexion.query(
        'UPDATE usuario SET nombre = ?, correo = ?, documento = ?, direccion = ?, rol_idRol = ? WHERE idUsuario = ?',
        [nombre, correo, documento, direccion, rol_idRol, id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Usuario actualizado con éxito' });
        }
    );
});

app.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;

    conexion.query('DELETE FROM usuario WHERE idUsuario = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuario eliminado con éxito' });
    });
});

app.get('/productos', (req, res) => {
    conexion.query('SELECT * FROM producto', (err, results) => {
        if (err) {
            console.error('❌ Error en GET /productos:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

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
// 1. Obtener reportes
app.get('/reporte-piezas-perdidas', (req, res) => {
    const query = 'SELECT * FROM reporte_piezas_perdidas ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener reportes:", err);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        res.json(results);
    });
});

// 2. Insertar reporte
app.post('/reporte-piezas-perdidas', (req, res) => {
    const { orden, pieza, motivo } = req.body;
    
    // VERIFICACIÓN: ¿Llegan los datos aquí?
    console.log("Recibido en server:", orden, pieza, motivo);

    const query = 'INSERT INTO reporte_piezas_perdidas (orden, pieza, motivo) VALUES (?, ?, ?)';
    
    db.query(query, [orden, pieza, motivo], (err, result) => {
        if (err) {
            // AQUÍ VERÁS EL ERROR REAL DE SQL
            console.error("ERROR SQL DETALLADO:", err); 
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Guardado' });
    });
});

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

    const sql = `UPDATE solicitud SET estado = ? WHERE idSolicitud = ?`;
    
    conexion.query(sql, [nuevoEstado, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Solicitud #${id} actualizada a ${nuevoEstado} con éxito` });
    });
});


app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});