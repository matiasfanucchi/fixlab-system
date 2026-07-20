import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import logo from './logo.png';
import firma from './firma.png';

const supabase = createClient(
  "https://gtfexxsbfprxqdbjlfjy.supabase.co",
  "sb_publishable_ALou-nprG8wRyhw9fri4_g_rITe6-bx"
);

const estados = ["Ingresado", "Diagnóstico", "En reparación", "Esperando repuesto", "Listo", "Entregado"];

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
  }, []);

  useEffect(() => {
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
    const { data } = await supabase.from("ordenes").select("*").order("id", { ascending: false });
    setOrdenes(data || []);
  };

  const cargarCaja = async () => {
    const { data } = await supabase.from("caja").select("*").order("fecha", { ascending: false });
    setCaja(data || []);
  };

  const cargarProductos = async () => {
    const { data } = await supabase.from("productos").select("*");
    setProductos(data || []);
  };

  const guardarOrden = async (orden) => {
  if (!orden.cliente || !orden.telefono || !orden.equipo) {
    alert("Completa: Cliente, Teléfono y Equipo");
    return;
  }
  
  // No enviar campos vacíos
  const ordenLimpia = Object.fromEntries(
    Object.entries(orden).filter(([_, v]) => v !== "" && v !== null)
  );
  
  const { data, error } = await supabase.from("ordenes").insert([{ ...ordenLimpia, fecha: new Date().toISOString() }]);
  
  if (error) {
    console.log("Error al guardar:", error);
    alert("Error: " + error.message);
  } else {
    cargarOrdenes();
    const mensaje = encodeURIComponent(`Hola ${orden.cliente}! Tu equipo ${orden.equipo} ha sido registrado en Fix Lab. Ante cualquier consulta escribinos. - Fix Lab`);
    const link = `https://wa.me/${orden.telefono.replace(/\D/g, '')}?text=${mensaje}`;
    setTimeout(() => window.open(link, '_blank'), 500);
  }
};

  const actualizarOrden = async (id, updates) => {
    await supabase.from("ordenes").update(updates).eq("id", id);
    cargarOrdenes();
  };

  const eliminarOrden = async (id) => {
    await supabase.from("ordenes").delete().eq("id", id);
    cargarOrdenes();
  };

  const guardarMovimientoCaja = async (movimiento) => {
    const { error } = await supabase.from("caja").insert([{ ...movimiento, fecha: new Date().toISOString() }]);
    if (!error) cargarCaja();
  };

  const generarPDF = (orden) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const generarCopia = (startY) => {
      doc.setFillColor(20, 23, 21);
      doc.rect(0, startY, pageWidth, 25, 'F');
      doc.addImage(logo, 'PNG', 10, startY + 8, 12, 12);
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("FIX", 25, startY + 15);
      doc.setTextColor(255, 122, 26);
      doc.text("LAB", 35, startY + 15);
      doc.setTextColor(255, 122, 26);
      doc.setFontSize(10);
      doc.text("Reparación de celulares y PC", 25, startY + 20);
      doc.setDrawColor(255, 122, 26);
      doc.setLineWidth(0.5);
      doc.line(10, startY + 28, pageWidth - 10, startY + 28);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`ORDEN # ${orden.id}`, 10, startY + 35);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const fecha = new Date(orden.fecha).toLocaleString('es-AR');
      doc.text(`Fecha: ${fecha}`, pageWidth - 60, startY + 35);
      doc.setLineWidth(0.3);
      doc.setDrawColor(150, 150, 150);
      doc.line(10, startY + 38, pageWidth - 10, startY + 38);
      let yPos = startY + 45;
      const col1X = 10;
      const col2X = pageWidth / 2;
      doc.setFont(undefined, 'bold');
      doc.text("Cliente:", col1X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.cliente || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold');
      doc.text("Falla:", col2X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.falla || '', col2X + 15, yPos);
      yPos += 8;
      doc.setFont(undefined, 'bold');
      doc.text("Teléfono:", col1X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.telefono || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold');
      doc.text("Accesorios:", col2X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.accesorios || 'no', col2X + 25, yPos);
      yPos += 8;
      doc.setFont(undefined, 'bold');
      doc.text("Equipo:", col1X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.equipo || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold');
      doc.text("Observaciones:", col2X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.observaciones || '', col2X + 30, yPos);
      yPos += 8;
      doc.setFont(undefined, 'bold');
      doc.text("IMEI / Serie:", col1X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.imei || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold');
      doc.text("Estado:", col2X, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(orden.estado || '', col2X + 15, yPos);
      yPos += 12;
      doc.setLineWidth(0.3);
      doc.line(10, yPos, pageWidth - 10, yPos);
      yPos += 8;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text("TÉRMINOS Y CONDICIONES", 10, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const terms = "1) Para retirar el equipo es OBLIGATORIA la presentación de este comprobante. SIN ESTE COMPROBANTE NO SE ENTREGA EL EQUIPO. 2) Los equipos no retirados dentro de los 60 días podrán ser descartados. 3) El cliente autoriza diagnóstico y reparación. FIX LAB no se responsabiliza por fallas ocultas o equipos previamente manipulados.";
      const splitTerms = doc.splitTextToSize(terms, pageWidth - 20);
      doc.text(splitTerms, 10, yPos);
      yPos = startY + 105;
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(15, yPos, 50, yPos);
      doc.line(pageWidth - 55, yPos, pageWidth - 20, yPos);
      if (startY === 0) {
        doc.addImage(firma, 'PNG', pageWidth - 55, yPos + 40, 30, 20);
      }
      yPos += 5;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text("Firma Cliente", 20, yPos);
      doc.text("Firma Técnico", pageWidth - 50, yPos);
      yPos = startY + 125;
      doc.setFillColor(20, 23, 21);
      doc.rect(0, yPos, pageWidth, 15, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 122, 26);
      doc.setFont(undefined, 'bold');
      doc.text("MAESTRO VIDAL 1379 LOCAL 2 - WSP 3516789960", pageWidth / 2, yPos + 8, { align: 'center' });
    };

    generarCopia(0);
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);
    doc.setLineDash([5, 5]);
    doc.line(10, 140, pageWidth - 10, 140);
    doc.setLineDash([]);
    generarCopia(145);
    doc.save(`orden-${orden.id}-${orden.cliente}.pdf`);
  };

  if (!session) {
    return (
      <div style={{ background: "#0c0e0d", color: "#eef0ee", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#141715", padding: "32px", borderRadius: "12px", width: "300px", border: "1px solid #2a2e2b" }}>
          <div style={{ fontSize: "40px", marginBottom: "20px" }}>🔧</div>
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
      <div style={{ background: "#141715", borderBottom: "1px solid #2a2e2b", padding: "24px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, color: "#eef0ee", fontSize: "48px", fontWeight: "700" }}>🔧 FIX<span style={{ color: "#ff7a1a" }}>LAB</span></h1>
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
          {tab === "servicio" && (
            <ServicioTecnico 
              ordenes={ordenes} 
              guardarOrden={guardarOrden} 
              actualizarOrden={actualizarOrden} 
              eliminarOrden={eliminarOrden} 
              generarPDF={generarPDF}
            />
          )}
          {tab === "caja" && <Caja caja={caja} guardarMovimientoCaja={guardarMovimientoCaja} />}
          {tab === "stock" && <Stock productos={productos} />}
        </div>
      </div>
    </div>
  );
}

function ServicioTecnico({ ordenes, guardarOrden, actualizarOrden, eliminarOrden, generarPDF }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const handleSave = () => {
    if (editingId) {
      actualizarOrden(editingId, form);
      setEditingId(null);
      setForm({});
    } else {
      guardarOrden(form);
      setForm({});
    }
  };

  const handleEdit = (orden) => {
    setEditingId(orden.id);
    setForm(orden);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({});
  };

  const ordenesFiltradas = ordenes.filter((o) =>
    (o.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (o.equipo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    o.id.toString().includes(busqueda)
  );

  return (
    <div>
      <h2>Servicio Técnico</h2>
      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <input placeholder="Cliente" value={form.cliente || ""} onChange={(e) => setForm({ ...form, cliente: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Teléfono" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Equipo" value={form.equipo || ""} onChange={(e) => setForm({ ...form, equipo: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Falla" value={form.falla || ""} onChange={(e) => setForm({ ...form, falla: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="IMEI/Serie" value={form.imei || ""} onChange={(e) => setForm({ ...form, imei: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Accesorios" value={form.accesorios || ""} onChange={(e) => setForm({ ...form, accesorios: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <select value={form.tipo_contrasena || ""} onChange={(e) => setForm({ ...form, tipo_contrasena: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
  <option value="">-- Tipo de Contraseña --</option>
  <option value="patron">Patrón</option>
  <option value="numero">Número</option>
  <option value="alfanumerico">Alfanumérico</option>
</select>
<input placeholder="Contraseña" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
<input placeholder="Observaciones" value={form.observaciones || ""} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <select value={form.estado || "Ingresado"} onChange={(e) => setForm({ ...form, estado: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
          <option>Ingresado</option>
          <option>Diagnóstico</option>
          <option>En reparación</option>
          <option>Esperando repuesto</option>
          <option>Listo</option>
          <option>Entregado</option>
        </select>
        <input placeholder="Importe" value={form.importe || ""} onChange={(e) => setForm({ ...form, importe: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleSave} style={{ flex: 1, background: "#6ee7a0", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>{editingId ? "Actualizar" : "Guardar"}</button>
          {editingId && <button onClick={handleCancel} style={{ flex: 1, background: "#e53e3e", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Cancelar</button>}
        </div>
      </div>
      <input placeholder="🔍 Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
      <div>
        {ordenesFiltradas.map((orden) => (
          <div key={orden.id} style={{ background: "#141715", padding: "12px", marginBottom: "8px", borderRadius: "6px" }}>
            <div style={{ marginBottom: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setExpandedId(expandedId === orden.id ? null : orden.id)}>
              <div>
                <strong>Orden #{orden.id}</strong> - {orden.cliente} - {orden.equipo}
                <div style={{ fontSize: "12px", color: "#9aa39c", marginTop: "4px" }}>
                  📅 {new Date(orden.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{ color: "#ff7a1a" }}>{expandedId === orden.id ? '▼' : '▶'}</span>
            </div>

            {expandedId === orden.id && (
              <div style={{ background: "#1a1f1c", padding: "12px", borderRadius: "4px", marginBottom: "8px", fontSize: "14px" }}>
                <p><strong>Cliente:</strong> {orden.cliente}</p>
                <p><strong>Teléfono:</strong> {orden.telefono}</p>
                <p><strong>Equipo:</strong> {orden.equipo}</p>
                <p><strong>Falla:</strong> {orden.falla}</p>
                <p><strong>IMEI/Serie:</strong> {orden.imei}</p>
                <p><strong>Accesorios:</strong> {orden.accesorios || 'no'}</p>
                <p><strong>Tipo de Contraseña:</strong> {orden.tipo_contrasena || 'No especificado'}</p>git add .
                <p><strong>Tipo de Contraseña:</strong> {orden.tipo_contrasena || 'No especificado'}</p>
                <p><strong>Contraseña:</strong> {orden.password || 'No registrada'}</p>
                <p><strong>Observaciones:</strong> {orden.observaciones}</p>
                <p><strong>Estado:</strong> {orden.estado}</p>
                <p><strong>Importe:</strong> ${orden.importe}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select value={orden.estado || "Ingresado"} onChange={(e) => { const nuevoEstado = e.target.value; actualizarOrden(orden.id, { estado: nuevoEstado }); const mensaje = encodeURIComponent(`Hola ${orden.cliente}! Tu equipo cambió a ${nuevoEstado}. - Fix Lab`); const link = `https://wa.me/${orden.telefono.replace(/\D/g, '')}?text=${mensaje}`; window.open(link, '_blank'); }} style={{ padding: "6px 12px", borderRadius: "4px", background: "#1a1f1c", border: "1px solid #2a2e2b", color: "#eef0ee", cursor: "pointer", fontSize: "12px" }}>
                <option>Ingresado</option>
                <option>Diagnóstico</option>
                <option>En reparación</option>
                <option>Esperando repuesto</option>
                <option>Listo</option>
                <option>Entregado</option>
              </select>
              <button onClick={() => generarPDF(orden)} style={{ background: "#ff7a1a", color: "#000", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>PDF</button>
              <button onClick={() => handleEdit(orden)} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Editar</button>
              <button onClick={() => eliminarOrden(orden.id)} style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Caja({ caja, guardarMovimientoCaja }) {
  const [form, setForm] = useState({ tipo: "ingreso", categoria: "reparacion", monto: "", descripcion: "" });
  const [filtro, setFiltro] = useState("todos");

  const ingresos = caja.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
  const egresos = caja.filter((m) => m.tipo === "egreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);

  const getFechaInicio = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (filtro === "hoy") return hoy;
    if (filtro === "semana") { const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7); return hace7; }
    if (filtro === "mes") { const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30); return hace30; }
    return new Date(0);
  };

  const cajaFiltrada = caja.filter((m) => new Date(m.fecha) >= getFechaInicio());

  const handleSave = () => {
    if (form.monto && form.descripcion) {
      guardarMovimientoCaja(form);
      setForm({ tipo: "ingreso", categoria: "reparacion", monto: "", descripcion: "" });
    }
  };

  return (
    <div>
      <h2>Caja</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}><p style={{ margin: 0, color: "#6ee7a0" }}>Ingresos</p><h3 style={{ margin: "8px 0 0 0" }}>${ingresos.toFixed(2)}</h3></div>
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}><p style={{ margin: 0, color: "#e53e3e" }}>Egresos</p><h3 style={{ margin: "8px 0 0 0" }}>-${egresos.toFixed(2)}</h3></div>
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}><p style={{ margin: 0, color: "#ff7a1a" }}>Balance</p><h3 style={{ margin: "8px 0 0 0" }}>${(ingresos - egresos).toFixed(2)}</h3></div>
      </div>

      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3>Nuevo Movimiento</h3>
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        {form.tipo === "ingreso" && (
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
            <option value="reparacion">Reparación</option>
            <option value="venta">Venta de Accesorios</option>
            <option value="otro">Otro</option>
          </select>
        )}
        <input type="number" placeholder="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <button onClick={handleSave} style={{ width: "100%", background: "#6ee7a0", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Guardar</button>
      </div>

      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        <button onClick={() => setFiltro("todos")} style={{ padding: "8px 12px", background: filtro === "todos" ? "#ff7a1a" : "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee", cursor: "pointer" }}>Todos</button>
        <button onClick={() => setFiltro("hoy")} style={{ padding: "8px 12px", background: filtro === "hoy" ? "#ff7a1a" : "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee", cursor: "pointer" }}>Hoy</button>
        <button onClick={() => setFiltro("semana")} style={{ padding: "8px 12px", background: filtro === "semana" ? "#ff7a1a" : "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee", cursor: "pointer" }}>Semana</button>
        <button onClick={() => setFiltro("mes")} style={{ padding: "8px 12px", background: filtro === "mes" ? "#ff7a1a" : "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee", cursor: "pointer" }}>Mes</button>
      </div>

      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px" }}>
        {cajaFiltrada.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #2a2e2b" }}>
            <span>{m.descripcion} ({new Date(m.fecha).toLocaleDateString('es-AR')})</span>
            <span style={{ color: m.tipo === "ingreso" ? "#6ee7a0" : "#e53e3e" }}>${m.monto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stock({ productos }) {
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