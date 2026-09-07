import React, { useState, useEffect } from 'react';
import UserManagement from './Usarios_Crud';
import Catalog from './Productos_Crud';
import ReporteFinanciero from '../Paginas/ReportesFinancieros';
import NotificacionesAdmin from './NotificacionesAdmin';
import '../CSS/AdminPanel.css';

import { FaBoxesStacked } from "react-icons/fa6";
import { FaHouseUser } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { FaChartLine } from "react-icons/fa6";
import { FaBell } from "react-icons/fa";

import { FaRegUser } from "react-icons/fa";

import NavBar from '../components/NavBar'
import { authFetch } from '../components/api.js';

const admin = { id: 1, nombre: "Admin Principal" };

const VIEWS = {
  home:     { label: 'Panel de administración' },
  users:    { label: 'Gestión de usuarios' },
  products: { label: 'Gestión de productos' },
  reportes: { label: 'Reporte Financiero' },
  notifications: { label: 'Notificaciones' },
};

export default function AdminPanel() {
  const [view, setView] = useState('home');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    authFetch("http://localhost:3000/usuarios").then(r => r.json()).then(data => setUsers(Array.isArray(data) ? data : []));
    authFetch("http://localhost:3000/productos").then(r => r.json()).then(data => setProducts(Array.isArray(data) ? data : []));
  }, []);

  const updateUser = async (user) => {
    const idUsuario = user.idUsuario ?? user.idusuario;
    const res = await authFetch(`http://localhost:3000/usuarios/${idUsuario}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    });
    const updated = await res.json();
    setUsers(users.map(u => (u.idUsuario ?? u.idusuario) === idUsuario ? { ...u, ...updated.usuario } : u));
  };
   const deleteUser = async (id) => {
    await authFetch(`http://localhost:3000/usuarios/${id}`, { method: "DELETE" });
    setUsers(users.filter(u => (u.idUsuario ?? u.idusuario) !== id));
  };

  const addProduct = async (data) => {
    const res = await authFetch("http://localhost:3000/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const newProduct = await res.json();
    setProducts([...products, newProduct]);
  };

  const deleteProduct = async (id) => {
    await authFetch(`http://localhost:3000/productos/${id}`, { method: "DELETE" });
    setProducts(products.filter(p => (p.idProducto ?? p.idproducto) !== id));
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
        <button className={`nav-item ${view === 'reportes' ? 'active' : ''}`} onClick={() => setView('reportes')}><FaChartLine />
        Reportes</button>
        <button className={`nav-item ${view === 'notifications' ? 'active' : ''}`} onClick={() => setView('notifications')}><FaBell />
         Notificaciones</button>
      </aside>

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
              <div className="home-card" onClick={() => setView('reportes')}>
              <FaChartLine color='black' size={35} />
                <span className="hc-label">Reporte Financiero</span>
              </div>
            </div>
          )}
          {view === 'users'    && <UserManagement users={users} onUpdate={updateUser} onDelete={deleteUser} />}
          {view === 'products' && <Catalog products={products} onAdd={addProduct} onDelete={deleteProduct} />}
          {view === 'reportes' && <ReporteFinanciero />}
          {view === 'notifications' && <NotificacionesAdmin />}
        </div>
      </main>

    </div>
  );
}