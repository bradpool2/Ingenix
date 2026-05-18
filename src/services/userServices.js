// En tu userService.js
loginUser: (email, password, callback) => {
    // IMPORTANTE: Aquí tu Modelo debería hacer un INNER JOIN entre 'usuario' y 'rol'
    UserModel.findByEmailWithRol(email, (err, results) => {
        if (err) return callback(err);

        if (results.length === 0) {
            return callback({ status: 401, message: "Credenciales inválidas" });
        }

        const usuario = results[0];

        // Validar contraseña
        const passwordCorrecto = bcrypt.compareSync(password, usuario.contrasena);
        if (!passwordCorrecto) {
            return callback({ status: 401, message: "Credenciales inválidas" });
        }

        // Si todo está bien, retornamos los datos incluyendo el ROL
        return callback(null, {
            id: usuario.idUsuario,
            nombre: usuario.nombre,
            email: usuario.correo,
            rol: usuario.nombreRol // Aquí vendría 'admin', 'tecnico' o 'cliente' gracias al JOIN
        });
    });
}