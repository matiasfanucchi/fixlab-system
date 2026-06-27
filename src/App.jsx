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
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Función para generar UNA copia del comprobante
  const generarCopia = (startY) => {
    // Header oscuro
    doc.setFillColor(20, 23, 21);
    doc.rect(0, startY, pageWidth, 25, 'F');

    // Logo
    doc.addImage(logo, 'PNG', 10, startY + 8, 12, 12);

    // Título
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("FIX", 25, startY + 15);
    doc.setTextColor(255, 122, 26);
    doc.text("LAB", 35, startY + 15);

    doc.setTextColor(255, 122, 26);
    doc.setFontSize(10);
    doc.text("Reparación de celulares y PC", 25, startY + 20);

    // Línea divisoria
    doc.setDrawColor(255, 122, 26);
    doc.setLineWidth(0.5);
    doc.line(10, startY + 28, pageWidth - 10, startY + 28);

    // Contenido principal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`ORDEN # ${orden.id}`, 10, startY + 35);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    // Fecha derecha
    const fecha = new Date(orden.fecha).toLocaleString('es-AR');
    doc.text(`Fecha: ${fecha}`, pageWidth - 60, startY + 35);

    // Línea
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.line(10, startY + 38, pageWidth - 10, startY + 38);

    // Datos cliente (2 columnas)
    let yPos = startY + 45;
    const col1X = 10;
    const col2X = pageWidth / 2;

    // Columna izquierda
    doc.setFont(undefined, 'bold');
    doc.text("Cliente:", col1X, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(orden.cliente || '', col1X + 20, yPos);

    // Columna derecha
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
    // Línea
    doc.setLineWidth(0.3);
    doc.line(10, yPos, pageWidth - 10, yPos);

    // Términos y condiciones
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

    // Espacios para firmas
    yPos = startY + 105;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(15, yPos, 50, yPos);
    doc.line(pageWidth - 55, yPos, pageWidth - 20, yPos);

    // Agregar firma digital (solo en primera copia)
    if (startY === 0) {
    doc.addImage(firma, 'PNG', pageWidth - 55, yPos + 40, 30, 20);
  }

    yPos += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text("Firma Cliente", 20, yPos);
    doc.text("Firma Técnico", pageWidth - 50, yPos);

    // Footer oscuro
    yPos = startY + 125;
    doc.setFillColor(20, 23, 21);
    doc.rect(0, yPos, pageWidth, 15, 'F');

    doc.setFontSize(10);
    doc.setTextColor(255, 122, 26);
    doc.setFont(undefined, 'bold');
    doc.text("MAESTRO VIDAL 1379 LOCAL 2 - WSP 3516789960", pageWidth / 2, yPos + 8, { align: 'center' });
  };

  // Generar primera copia
  generarCopia(0);

  // Generar línea de corte
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.setLineDash([5, 5]); // Línea punteada
  doc.line(10, 140, pageWidth - 10, 140);
  doc.setLineDash([]); // Volver a línea normal

  // Generar segunda copia
  generarCopia(145);

  doc.save(`orden-${orden.id}-${orden.cliente}.pdf`);
};

  const generarLinkWhatsApp = (orden) => {
    const mensaje = encodeURIComponent(`Hola ${orden.cliente}, adjunto tu comprobante técnico de la orden #${orden.id}. Equipo: ${orden.equipo} - Estado: ${orden.estado}`);
    const link = `https://wa.me/${orden.telefono.replace(/\D/g, '')}?text=${mensaje}`;
    window.open(link, '_blank');
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
              generarLinkWhatsApp={generarLinkWhatsApp}
            />
          )}
          {tab === "caja" && <Caja caja={caja} setCaja={setCaja} ordenes={ordenes} />}
          {tab === "stock" && <Stock productos={productos} setProductos={setProductos} />}
        </div>
      </div>
    </div>
  );
}

function ServicioTecnico({ ordenes, guardarOrden, actualizarOrden, eliminarOrden, generarPDF, generarLinkWhatsApp }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);

  const handleSave = () => {
    if (editingId) {
      actualizarOrden(editingId, form);
      setEditingId(null);
      setForm({});
    } else {
      guardarOrden({ ...form, fecha: new Date().toISOString() });
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

 return (
  <div>
    <h2>Servicio Técnico</h2>
    <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
      <input 
        placeholder="Cliente" 
        value={form.cliente || ""} 
        onChange={(e) => setForm({ ...form, cliente: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <input 
        placeholder="Teléfono" 
        value={form.telefono || ""} 
        onChange={(e) => setForm({ ...form, telefono: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <input 
        placeholder="Equipo" 
        value={form.equipo || ""} 
        onChange={(e) => setForm({ ...form, equipo: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <input 
        placeholder="Falla" 
        value={form.falla || ""} 
        onChange={(e) => setForm({ ...form, falla: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <input 
        placeholder="IMEI/Serie" 
        value={form.imei || ""} 
        onChange={(e) => setForm({ ...form, imei: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <input 
        placeholder="Accesorios" 
        value={form.accesorios || ""} 
        onChange={(e) => setForm({ ...form, accesorios: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <input 
        placeholder="Observaciones" 
        value={form.observaciones || ""} 
        onChange={(e) => setForm({ ...form, observaciones: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <select 
        value={form.estado || "Ingresado"} 
        onChange={(e) => setForm({ ...form, estado: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
        <option>Ingresado</option>
        <option>Diagnóstico</option>
        <option>En reparación</option>
        <option>Esperando repuesto</option>
        <option>Listo</option>
        <option>Entregado</option>
      </select>
      <input 
        placeholder="Importe" 
        value={form.importe || ""} 
        onChange={(e) => setForm({ ...form, importe: e.target.value })} 
        style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} 
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button 
          onClick={handleSave} 
          style={{ flex: 1, background: "#6ee7a0", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
          {editingId ? "Actualizar" : "Guardar"}
        </button>
        {editingId && (
          <button 
            onClick={handleCancel} 
            style={{ flex: 1, background: "#e53e3e", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
    <div>
      {ordenes.map((orden) => (
        <div key={orden.id} style={{ background: "#141715", padding: "12px", marginBottom: "8px", borderRadius: "6px" }}>
          <div style={{ marginBottom: "8px" }}>
            <strong>{orden.cliente}</strong> - {orden.equipo}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <select 
              value={orden.estado || "Ingresado"}
              onChange={(e) => {
                const nuevoEstado = e.target.value;
                actualizarOrden(orden.id, { estado: nuevoEstado });
                
                // Abrir WhatsApp automáticamente
                const mensaje = encodeURIComponent(`Hola ${orden.cliente}! Te informamos que tu equipo ${orden.equipo} cambió su estado a ${nuevoEstado}. Ante cualquier consulta escribinos. - Fix Lab`);
                const link = `https://wa.me/${orden.telefono.replace(/\D/g, '')}?text=${mensaje}`;
                window.open(link, '_blank');
              }}
              style={{ padding: "6px 12px", borderRadius: "4px", background: "#1a1f1c", border: "1px solid #2a2e2b", color: "#eef0ee", cursor: "pointer", fontSize: "12px" }}>
              <option>Ingresado</option>
              <option>Diagnóstico</option>
              <option>En reparación</option>
              <option>Esperando repuesto</option>
              <option>Listo</option>
              <option>Entregado</option>
            </select>
            <button 
              onClick={() => generarPDF(orden)} 
              style={{ background: "#ff7a1a", color: "#000", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
              PDF
            </button>
            <button 
              onClick={() => eliminarOrden(orden.id)} 
              style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
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
