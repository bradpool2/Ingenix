import app from './app.js';

const PUERTO = 3000;

app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PUERTO}`);
});


