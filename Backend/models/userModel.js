import db  from '../config/db.js';

const UserModel = {
    // Buscar todos los usuarios
    findAll: (callback) => {
        const query = 'SELECT id_usuario, email, nombre FROM usuarios';
        db.query(query, callback);
    },

    // Buscar un usuario por su ID
    findById: (id, callback) => {
        const query = 'SELECT id_usuario, email, nombre FROM usuarios WHERE id_usuario = ?';
        db.query(query, [id], callback);
    },

    // Buscar un usuario por su Email (Esencial para Login y Registro)
    findByEmail: (email, callback) => {
        const query = 'SELECT * FROM usuarios WHERE email = ?';
        db.query(query, [email], callback);
    },

    // Insertar un nuevo usuario
    create: (userData, callback) => {
        const { id_usuario, email, nombre, contrasena } = userData;
        const query = 'INSERT INTO usuarios(id_usuario, email, nombre, contrasena) VALUES (?, ?, ?, ?)';
        db.query(query, [id_usuario, email, nombre, contrasena], callback);
    }
};

export default UserModel; 