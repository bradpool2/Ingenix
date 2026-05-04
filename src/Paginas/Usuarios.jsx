import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import Catalog from './Catalog';
import '../CSS/AdminPanel.css';
import { FaBoxesStacked } from "react-icons/fa6";
import { FaHouseUser } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";

import { FaRegUser } from "react-icons/fa";

import NavBar from '../components/NavBar'

const admin = { id: 1, nombre: "Admin Principal" };

const VIEWS = {
  home:     { label: 'Panel de administración' },
  users:    { label: 'Gestión de usuarios' },
  products: { label: 'Gestión de productos' },
};

export default function AdminPanel() {
  const [view, setView] = useState('home');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/usuarios").then(r => r.json()).then(setUsers);
    fetch("http://localhost:3000/productos").then(r => r.json()).then(setProducts);
  }, []);

  const updateUser = async (user) => {
    const res = await fetch(`http://localhost:3000/usuarios/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    const updated = await res.json();
    setUsers(users.map(u => u.id === updated.id ? updated : u));
  };

  const addProduct = async (data) => {
    const res = await fetch("http://localhost:3000/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const newProduct = await res.json();
    setProducts([...products, newProduct]);
  };

  const deleteProduct = async (id) => {
    await fetch(`http://localhost:3000/productos/${id}`, { method: "DELETE" });
    setProducts(products.filter(p => p.id !== id));
  };

  return (
    <div className="admin-layout">

      <NavBar />

      <aside className="sidebar">
        <div className="admin-avatar">
        <FaRegUser color='black' size={30} />

        </div>
        <strong className="admin-name">{admin.nombre}</strong>
        <span className="admin-role">ID: {admin.id} · Administrador</span>

        <div className="divider" />

        <button className={`nav-item ${view === 'home'     ? 'active' : ''}`} onClick={() => setView('home')}><FaHouseUser />
        Inicio</button>
        <button className={`nav-item ${view === 'users'    ? 'active' : ''}`} onClick={() => setView('users')}><FaUsersGear />
          Usuarios</button>
        <button className={`nav-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}><FaBoxesStacked />
        Productos</button>
      </aside>

      {/* MAIN — solo el contenido cambia */}
      <main className="main-section">
        <div className="main-header">
          {VIEWS[view].label}
        </div>
        <div className="main-body">
          {view === 'home' && (
            <div className="home-grid">
              <div className="home-card" onClick={() => setView('users')}>
              <FaUsersGear color='black' size={35} />
                <span className="hc-label">Gestión de usuarios</span>
              </div>
              <div className="home-card" onClick={() => setView('products')}>
              <FaBoxesStacked color='black' size={35} />
                <span className="hc-label">Gestión de productos</span>
              </div>
            </div>
          )}
          {view === 'users'    && <UserManagement users={users} onUpdate={updateUser} />}
          {view === 'products' && <Catalog products={products} onAdd={addProduct} onDelete={deleteProduct} />}
        </div>
      </main>

    </div>
  );
}