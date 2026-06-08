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

app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

app.post('/login', (req, res) => {
    const { nombre, pass } = req.body;

    if (!nombre || !pass) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    conexion.query(
        `SELECT u.*, r.nombreRol AS rol
         FROM usuario u
         JOIN rol r ON u.rol_idRol = r.idRol
         WHERE u.nombre = ? AND u.pass = ?`,
        [nombre, pass],
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

            res.json({ mensaje: 'Login exitoso', token, usuario });
        }
    );
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

app.post('/usuarios', (req, res) => {
    const { nombre, correo, documento, direccion, pass, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    conexion.query(
        'INSERT INTO usuario (nombre, correo, documento, direccion, pass, rol_idRol) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre, correo, documento, direccion, pass, rol_idRol || 1],
        (err, results) => {
            if (err) {
                docConsole.error('❌ Error POST /usuarios:', err);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Usuario creado', idUsuario: results.insertId });
        }
    );
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

app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});