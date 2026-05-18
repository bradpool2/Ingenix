import mysql from 'mysql2';
// Creamos la conexión
const conexion = mysql.createConnection({
    host: 'localhost',
    database: 'Ingenix',
    user: 'root',
    password: ''
});

// Verificar la conexión
conexion.connect(error => {
    if (error) {
        console.error('❌ Error de Conexión a MySQL:', error.message);
    } else {
        console.log('✅ Conexión a Base de Datos MySQL Correcta');
    }
});

// Exportamos la conexión  usarla en los modelos
export default conexion;