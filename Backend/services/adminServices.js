import AdminModel from "../Models/adminModel.js"; 
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
        UserModel.findByEmail(userData.email, (err, results) => {
            if (err) return callback(err);
            
            if (results.length > 0) {

                return callback({ status: 409, message: "El correo ya existe en la base de datos" });
            }

            const saltRounds = 10;
            const hashedPassword = bcrypt.hashSync(userData.contrasena, saltRounds);
            
            const newUser = { ...userData, contrasena: hashedPassword };

            UserModel.create(newUser, callback);
        });
    },

    // Servicio para autenticar un usuario (Login)
    loginUser: (email, password, callback) => {
        UserModel.findByEmail(email, (err, results) => {
            if (err) return callback(err);

            if (results.length === 0) {
                return callback({ status: 401, message: "Credenciales inválidas" });
            }

            const usuario = results[0];

            const passwordCorrecto = bcrypt.compareSync(password, usuario.contrasena);
            if (!passwordCorrecto) {
                return callback({ status: 401, message: "Credenciales inválidas" });
            }


           return callback(null, {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email
            });
        });
    }
};

export default AdminServices; 
