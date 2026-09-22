import React, { useState, useEffect } from 'react';
import '../CSS/AdminPanel.css';
import { authFetch } from '../components/api.js';

export default function Productos_Crud() {
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoriasSeleccionadas: []
  });
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [mostrarCategorias, setMostrarCategorias] = useState(true);

  const obtenerProductos = async () => {
    try {
      const res = await authFetch('http://localhost:3000/productos/con-categorias');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data.map((p) => ({
        ...p,
        idProducto: p.idProducto ?? p.idproducto,
      })) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const obtenerCategorias = async () => {
    try {
      const res = await authFetch('http://localhost:3000/categorias');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data.map((categoria) => ({
        ...categoria,
        idCategoria: categoria.idCategoria ?? categoria.idcategoria,
      })) : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    obtenerProductos();
    obtenerCategorias();
  }, []);

  // ---------------- CATEGORÍAS ----------------

  const handleCrearCategoria = async (e) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      const res = await authFetch('http://localhost:3000/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaCategoria })
      });
      if (res.ok) {
        setNuevaCategoria('');
        obtenerCategorias();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEliminarCategoria = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"? Se quitará de todos los productos que la tengan.`)) return;
    try {
      const res = await authFetch(`http://localhost:3000/categorias/${id}`, { method: 'DELETE' });
      if (res.ok) {
        obtenerCategorias();
        obtenerProductos();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || 'No se pudo eliminar la categoría.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- PRODUCTOS ----------------

  const toggleCategoriaNuevoProducto = (idCategoria) => {
    const categoriaId = String(idCategoria);
    setNuevoProducto(prev => {
      const yaEsta = prev.categoriasSeleccionadas.includes(categoriaId);
      return {
        ...prev,
        categoriasSeleccionadas: yaEsta
          ? prev.categoriasSeleccionadas.filter(c => c !== categoriaId)
          : [...prev.categoriasSeleccionadas, categoriaId]
      };
    });
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('http://localhost:3000/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoProducto.nombre,
          descripcion: nuevoProducto.descripcion,
          precio: nuevoProducto.precio,
          stock: nuevoProducto.stock
        })
      });
      if (res.ok) {
        const creado = await res.json();
        if (nuevoProducto.categoriasSeleccionadas.length > 0) {
          const idProducto = creado.idProducto ?? creado.idproducto;
          await authFetch(`http://localhost:3000/productos/${idProducto}/categorias`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categorias: nuevoProducto.categoriasSeleccionadas })
          });
        }
        obtenerProductos();
        setNuevoProducto({ nombre: '', descripcion: '', precio: '', stock: '', categoriasSeleccionadas: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id, productoActualizado) => {
    try {
      await authFetch(`http://localhost:3000/productos/${id}`, {
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
    if (!window.confirm('¿Seguro que deseas eliminar este producto? También se eliminará su historial de uso en solicitudes.')) return;
    try {
      const res = await authFetch(`http://localhost:3000/productos/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        obtenerProductos();
      } else {
        const data = await res.json();
        alert('No se pudo eliminar: ' + (data.error || 'error desconocido'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (id, campo, valor) => {
    setProducts((actuales) => actuales.map((p) => (
      p.idProducto === id ? { ...p, [campo]: valor } : p
    )));
  };

  return (
    <div className="view-content">

      {/* ---------------- SECCIÓN CATEGORÍAS ---------------- */}
      <div className="form-crear-usuario">
        <div className="encabezado-colapsable" onClick={() => setMostrarCategorias(!mostrarCategorias)}>
          <h3>Gestión de categorías</h3>
          <span className="flecha-colapsable">{mostrarCategorias ? '▲' : '▼'}</span>
        </div>

        {mostrarCategorias && (
          <>
            <form onSubmit={handleCrearCategoria} className="fila-nueva-categoria">
              <input
                type="text"
                placeholder="Nombre de la categoría (ej: Relojes, Cadenas...)"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
              />
              <button type="submit" className="btn-crear">Agregar categoría</button>
            </form>

            <div className="lista-categorias-chips">
              {categorias.length === 0
                ? <p className="empty-msg">No hay categorías creadas aún.</p>
                : categorias.map(c => (
                    <div key={c.idCategoria} className="categoria-admin-item">
                      <span>{c.nombre}</span>
                      <button
                        type="button"
                        className="chip-eliminar"
                        aria-label={`Eliminar categoría ${c.nombre}`}
                        onClick={() => handleEliminarCategoria(c.idCategoria, c.nombre)}
                      >
                        ×
                      </button>
                    </div>
                  ))
              }
            </div>
          </>
        )}
      </div>

      {/* ---------------- SECCIÓN NUEVO PRODUCTO ---------------- */}
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

        <p className="seccion-label">Categorías</p>
        <div className="lista-categorias-chips seleccionables">
          {categorias.length === 0
            ? <p className="empty-msg">Crea categorías arriba para poder asignarlas.</p>
            : categorias.map(c => (
                <button
                  type="button"
                  key={c.idCategoria}
                  className={`chip-categoria seleccionable ${nuevoProducto.categoriasSeleccionadas.includes(String(c.idCategoria)) ? 'activa' : ''}`}
                  onClick={() => toggleCategoriaNuevoProducto(c.idCategoria)}
                >
                  {c.nombre}
                </button>
              ))
          }
        </div>

        <button type="submit" className="btn-crear" style={{ marginTop: '16px' }}>Agregar Producto</button>
      </form>

      <hr className="divisor" />

      {/* ---------------- TABLA DE PRODUCTOS ---------------- */}
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
                <th>Categorías</th>
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
                  <td className="celda-categorias">{p.categorias || '—'}</td>
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