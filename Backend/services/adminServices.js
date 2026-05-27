import AdminModel from "../Models/adminModel.js"; // IMPORTANTE: Agrega el .js
import bcrypt from "bcrypt";

const adminService = {
    // Servicio para listar productos
    getAllAdmins: (callback) => {
        AdminModel.findAll(callback);
    },

    // Servicio para buscar por ID
    getUserById: (id, callback) => {
        UserModel.findById(id, callback);
    },

    // Servicio para registrar un usuario con lógica de negocio
    registerUser: (userData, callback) => {
        // 1. Verificar si el correo ya existe en la base de datos
        UserModel.findByEmail(userData.email, (err, results) => {
            if (err) return callback(err);
            
            if (results.length > 0) {

                      // Retornamos un error personalizado indicando duplicidad
                return callback({ status: 409, message: "El correo ya existe en la base de datos" });
            }

            const saltRounds = 10;
            const hashedPassword = bcrypt.hashSync(userData.contrasena, saltRounds);
            
            // Reemplazamos la contraseña plana por la encriptada
            const newUser = { ...userData, contrasena: hashedPassword };

            // 3. Guardamos en la base de datos
            UserModel.create(newUser, callback);
        });
    },

    // Servicio para autenticar un usuario (Login)
    loginUser: (email, password, callback) => {
        UserModel.findByEmail(email, (err, results) => {
            if (err) return callback(err);

            // Verificar si el usuario existe
            if (results.length === 0) {
                return callback({ status: 401, message: "Credenciales inválidas" });
            }

            const usuario = results[0];

            // Verificar si la contraseña coincide con el hash guardado
            const passwordCorrecto = bcrypt.compareSync(password, usuario.contrasena);
            if (!passwordCorrecto) {
                return callback({ status: 401, message: "Credenciales inválidas" });
            }

            // Si todo está bien, retornamos los datos seguros del usuario

           return callback(null, {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email
            });
        });
    }
};

export default AdminServices; // CAMBIADO: Antes era module.exports
