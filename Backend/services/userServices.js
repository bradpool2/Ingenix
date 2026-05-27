loginUser: (email, password, callback) => {
    UserModel.findByEmailWithRol(email, (err, results) => {
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
            id: usuario.idUsuario,
            nombre: usuario.nombre,
            email: usuario.correo,
            rol: usuario.nombreRol 
        });
    });
}