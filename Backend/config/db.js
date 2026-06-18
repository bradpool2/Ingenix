import mysql from 'mysql2';
import 'dotenv/config';
 
const conexion = mysql.createPool({
    host: 'localhost',
    database: 'ingenix',
    user: 'root',
    password: ''
});
 
conexion.getConnection((error, connection) => {
    if (error) {
        console.error('❌ Error de Conexión a MySQL:', error.message);
    } else {
        console.log('✅ Conexión a Base de Datos MySQL Correcta');
    }
});
 
export default conexion;