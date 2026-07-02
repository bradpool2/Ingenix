export const authFetch = (url, opciones = {}) => {
    const token = localStorage.getItem('token');
    return fetch(url, {
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...opciones.headers
        }
    });
};