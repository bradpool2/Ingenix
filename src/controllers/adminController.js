import AdminService from '../services/adminServices.js';

const UserController = {
    // Listar todos los usuarios
    getUsers: (req, res) => {
        UserService.getAllUsers((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (results.length === 0) return res.status(200).json({ message: "No hay registros" });
            res.status(200).json(results);
        });
    },

    // Buscar un usuario por ID
    getUserById: (req, res) => {
        const { id } = req.params;
        UserService.getUserById(id, (err, results) => {

             if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (results.length === 0) return res.status(404).json({ message: "No hay registros con ese ID" });
            res.status(200).json(results[0]);
        });
    },

    // Registrar un nuevo usuario
    register: (req, res) => {
        const { id_usuario, email, nombre, contrasena } = req.body;

        // Validación básica de entrada
        if (!id_usuario || !email || !nombre || !contrasena) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        UserService.registerUser({ id_usuario, email, nombre, contrasena }, (err, result) => {
            if (err) {
                // Si es un error controlado por el servicio (ej. correo duplicado)
                if (err.status) return res.status(err.status).json({ message: err.message });
                return res.status(500).json({ error: "Error al registrar el usuario" });
            }
            res.status(201).json({ message: "Usuario registrado correctamente" });
        });
    },

    // Iniciar Sesión
    login: (req, res) => {
        const { email, contrasena } = req.body;

        if (!email || !contrasena) {
            return res.status(400).json({ message: "Email y contraseña son requeridos" });
        }

        UserService.loginUser(email, contrasena, (err, usuarioValido) => {
            if (err) {

                          if (err.status) return res.status(err.status).json({ message: err.message });
                return res.status(500).json({ error: "Error en el proceso de autenticación" });
            }
            
            res.status(200).json({
                mensaje: "Autenticación exitosa",
                usuario: usuarioValido
            });
        });
    }
};

export default UserController;
