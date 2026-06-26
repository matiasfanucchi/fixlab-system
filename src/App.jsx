import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from './logo.png';

const supabase = createClient(
  "https://gtfexxsbfprxqdbjlfjy.supabase.co",
  "sb_publishable_ALou-nprG8wRyhw9fri4_g_rITe6-bx"
);

const estados = ["Ingresado", "Diagnóstico", "En reparación", "Esperando repuesto", "Listo", "Entregado"];
const categoriasProducto = ["Accesorios celular", "Accesorios PC", "Informática", "Otros"];

export default function App() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("servicio");
  const [ordenes, setOrdenes] = useState([]);
  const [caja, setCaja] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });
    if (session) {
      cargarOrdenes();
      cargarCaja();
      cargarProductos();
    }
  }, [session]);

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });
    if (error) setLoginError(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const cargarOrdenes = async () => {
    const { data } = await supabase.from("ordenes").select("*");
    setOrdenes(data || []);
  };

  const cargarCaja = async () => {
    const { data } = await supabase.from("caja").select("*");
    setCaja(data || []);
  };

  const cargarProductos = async () => {
    const { data } = await supabase.from("productos").select("*");
    setProductos(data || []);
  };

  const guardarOrden = async (orden) => {
    const { error } = await supabase.from("ordenes").insert([orden]);
    if (!error) cargarOrdenes();
  };

  const actualizarOrden = async (id, updates) => {
    await supabase.from("ordenes").update(updates).eq("id", id);
    cargarOrdenes();
  };

  const eliminarOrden = async (id) => {
    await supabase.from("ordenes").delete().eq("id", id);
    cargarOrdenes();
  };

  const generarPDF = (orden) => {
    const doc = new jsPDF();
    doc.addImage(logo, 'PNG', 10, 10, 20, 20);
    doc.setFontSize(16);
    doc.text("COMPROBANTE TÉCNICO", 40, 20);
    doc.setFontSize(10);
    doc.text(`Cliente: ${orden.cliente}`, 10, 40);
    doc.text(`Teléfono: ${orden.telefono}`, 10, 50);
    doc.text(`Equipo: ${orden.equipo}`, 10, 60);
    doc.text(`Falla: ${orden.falla}`, 10, 70);
    doc.text(`Estado: ${orden.estado}`, 10, 80);
    doc.text(`Importe: $${orden.importe}`, 10, 90);
    doc.save(`orden-${orden.cliente}.pdf`);
  };

  if (!session) {
    return (
      <div style={{ background: "#0c0e0d", color: "#eef0ee", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#141715", padding: "32px", borderRadius: "12px", width: "300px", border: "1px solid #2a2e2b" }}>
          <img src={logo} alt="Fix Lab" style={{ width: "60px", marginBottom: "20px" }} />
          <h1 style={{ marginBottom: "24px" }}>Iniciar Sesión</h1>
          {loginError && <p style={{ color: "#e53e3e", marginBottom: "12px" }}>{loginError}</p>}
          <input
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            style={{ width: "100%", padding: "10px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee" }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            style={{ width: "100%", padding: "10px", marginBottom: "20px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee" }}
          />
          <button onClick={login} style={{ width: "100%", background: "#ff7a1a", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0c0e0d", color: "#eef0ee", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ background: "#141715", borderBottom: "1px solid #2a2e2b", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>FIXLAB</h1>
        <button onClick={logout} style={{ background: "#6ee7a0", color: "#000", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
          Cerrar Sesión
        </button>
      </div>

      <div style={{ display: "flex" }}>
        <div style={{ background: "#141715", width: "200px", borderRight: "1px solid #2a2e2b", padding: "16px" }}>
          <button onClick={() => setTab("servicio")} style={{ width: "100%", padding: "12px", marginBottom: "8px", background: tab === "servicio" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>
            Servicio Técnico
          </button>
          <button onClick={() => setTab("caja")} style={{ width: "100%", padding: "12px", marginBottom: "8px", background: tab === "caja" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>
            Caja
          </button>
          <button onClick={() => setTab("stock")} style={{ width: "100%", padding: "12px", background: tab === "stock" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>
            Stock
          </button>
        </div>

        <div style={{ flex: 1, padding: "24px" }}>
          {tab === "servicio" && <ServicioTecnico ordenes={ordenes} guardarOrden={guardarOrden} actualizarOrden={actualizarOrden} eliminarOrden={eliminarOrden} generarPDF={generarPDF} />}
          {tab === "caja" && <Caja caja={caja} setCaja={setCaja} ordenes={ordenes} />}
          {tab === "stock" && <Stock productos={productos} setProductos={setProductos} />}
        </div>
      </div>
    </div>
  );
}

function ServicioTecnico({ ordenes, guardarOrden, actualizarOrden, eliminarOrden, generarPDF }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);

  const handleSave = () => {
    if (editingId) {
      actualizarOrden(editingId, form);
      setEditingId(null);
    } else {
      guardarOrden({ ...form, fecha: new Date().toISOString() });
    }
    setForm({});
  };

  return (
    <div>
      <h2>Servicio Técnico</h2>
      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <input placeholder="Cliente" value={form.cliente || ""} onChange={(e) => setForm({ ...form, cliente: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Teléfono" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Equipo" value={form.equipo || ""} onChange={(e) => setForm({ ...form, equipo: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Falla" value={form.falla || ""} onChange={(e) => setForm({ ...form, falla: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Importe" value={form.importe || ""} onChange={(e) => setForm({ ...form, importe: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <button onClick={handleSave} style={{ width: "100%", background: "#6ee7a0", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
          {editingId ? "Actualizar" : "Guardar"}
        </button>
      </div>
      <div>
        {ordenes.map((orden) => (
          <div key={orden.id} style={{ background: "#141715", padding: "12px", marginBottom: "8px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{orden.cliente}</strong> - {orden.equipo} - {orden.estado}
            </div>
            <div>
              <button onClick={() => generarPDF(orden)} style={{ marginRight: "8px", background: "#ff7a1a", color: "#000", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}>
                PDF
              </button>
              <button onClick={() => eliminarOrden(orden.id)} style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Caja({ caja, setCaja, ordenes }) {
  const ingresos = caja.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
  const egresos = caja.filter((m) => m.tipo === "egreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);

  return (
    <div>
      <h2>Caja</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}>
          <p style={{ margin: 0, color: "#6ee7a0" }}>Ingresos</p>
          <h3 style={{ margin: "8px 0 0 0" }}>${ingresos.toFixed(2)}</h3>
        </div>
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}>
          <p style={{ margin: 0, color: "#e53e3e" }}>Egresos</p>
          <h3 style={{ margin: "8px 0 0 0" }}>-${egresos.toFixed(2)}</h3>
        </div>
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}>
          <p style={{ margin: 0, color: "#ff7a1a" }}>Balance</p>
          <h3 style={{ margin: "8px 0 0 0" }}>${(ingresos - egresos).toFixed(2)}</h3>
        </div>
      </div>
      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}>
        {caja.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #2a2e2b" }}>
            <span>{m.descripcion}</span>
            <span style={{ color: m.tipo === "ingreso" ? "#6ee7a0" : "#e53e3e" }}>${m.monto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stock({ productos, setProductos }) {
  return (
    <div>
      <h2>Stock</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
        {productos.map((p) => (
          <div key={p.id} style={{ background: "#141715", padding: "12px", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>{p.nombre}</h4>
            <p style={{ margin: "0", fontSize: "12px", color: "#9aa39c" }}>Stock: {p.cantidad}</p>
            <p style={{ margin: "0", fontSize: "12px", color: "#ff7a1a" }}>${p.precio_venta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}