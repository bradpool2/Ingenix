import React, { useState } from 'react';
import '../CSS/AdminPanel.css';

export default function Catalog({ products, onAdd, onDelete }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onAdd(form);
    setForm({ nombre: '', descripcion: '', precio: '' });
  };

  return (
    <div className="view-content">
      <form className="add-form" onSubmit={handleSubmit}>
        <input
          className="field-input"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <input
          className="field-input"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
        <input
          className="field-input"
          placeholder="Precio"
          value={form.precio}
          onChange={(e) => setForm({ ...form, precio: e.target.value })}
        />
        <button className="btn-add" type="submit">+ Agregar</button>
      </form>

      {Array.isArray(products) && products.length === 0 && (
        <p className="empty-msg">No hay productos registrados.</p>
      )}

      {Array.isArray(products) && products.map(p => (
        <div key={p.id} className="product-row">
          <div>
            <p className="product-name">{p.nombre}</p>
            <p className="product-desc">{p.descripcion}</p>
          </div>
          <div className="product-right">
            <span className="product-price">${p.precio}</span>
            <button className="btn-delete" onClick={() => onDelete(p.id)}>Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );
}