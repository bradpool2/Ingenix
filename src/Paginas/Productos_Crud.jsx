import React, { useState, useEffect } from 'react';
import '../CSS/AdminPanel.css';

export default function Productos_Crud() {
  const [products, setProducts] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: ''
  });

  const obtenerProductos = async () => {
    try {
      const res = await fetch('http://localhost:3000/productos');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoProducto)
      });
      if (res.ok) {
        obtenerProductos();
        setNuevoProducto({ nombre: '', descripcion: '', precio: '', stock: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, productoActualizado) => {
    try {
      await fetch(`http://localhost:3000/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoActualizado)
      });
      obtenerProductos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const res = await fetch(`http://localhost:3000/productos/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        obtenerProductos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (id, campo, valor) => {
    setProducts(products.map(p => p.idProducto === id ? { ...p, [campo]: valor } : p));
  };

  return (
    <div className="view-content">
      <form onSubmit={handleCrear} className="form-crear-usuario">
        <h3>Registrar Nuevo Producto</h3>
        <div className="grid-inputs">
          <input
            type="text"
            placeholder="Nombre del Producto"
            value={nuevoProducto.nombre}
            onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Descripción"
            value={nuevoProducto.descripcion}
            onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
          />
          <input
            type="number"
            placeholder="Precio"
            value={nuevoProducto.precio}
            onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Stock"
            value={nuevoProducto.stock}
            onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })}
            required
          />
        </div>
        <button type="submit" className="btn-crear">Agregar Producto</button>
      </form>

      <hr className="divisor" />

      {products.length === 0 ? (
        <p className="empty-msg">No hay productos registrados en el inventario.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.idProducto}>
                  <td>#{p.idProducto}</td>
                  <td>
                    <input
                      type="text"
                      value={p.nombre || ''}
                      onChange={(e) => handleInputChange(p.idProducto, 'nombre', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={p.descripcion || ''}
                      onChange={(e) => handleInputChange(p.idProducto, 'descripcion', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.precio || ''}
                      onChange={(e) => handleInputChange(p.idProducto, 'precio', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.stock || ''}
                      onChange={(e) => handleInputChange(p.idProducto, 'stock', e.target.value)}
                    />
                  </td>
                  <td>
                    <div className="btn-acciones">
                      <button className="btn-guardar" onClick={() => handleUpdate(p.idProducto, p)}>
                        Guardar
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(p.idProducto)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}