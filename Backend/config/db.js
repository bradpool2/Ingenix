import mysql from 'mysql2';
import 'dotenv/config';
 
const conexion = mysql.createPool({
    host: 'localhost',
    database: 'ingenix2',
    user: 'root',
    password: '1234'
});
 
conexion.getConnection((error, connection) => {
    if (error) {
        console.error('❌ Error de Conexión a MySQL:', error.message);
    } else {
        console.log('✅ Conexión a Base de Datos MySQL Correcta');
    }
});
 
export default conexion;