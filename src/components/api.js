export const authFetch = (url, opciones = {}) => {
    const token = localStorage.getItem('token');
    const headers = new Headers(opciones.headers || {});

    if (!(opciones.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, {
        ...opciones,
        headers,
    });
};
