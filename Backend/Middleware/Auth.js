import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_temporal');
        req.usuario = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};

export const soloAdmin = (req, res, next) => {
    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};

export const soloTecnico = (req, res, next) => {
    if (req.usuario?.rol !== 'tecnico' && req.usuario?.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de técnico.' });
    }
    next();
};