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
  const [tab, setTab] = useState("dashboard");
  const [ordenes, setOrdenes] = useState([]);
  const [caja, setCaja] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [pagosCuotas, setPagosCuotas] = useState([]);
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
      cargarVentas();
      cargarPagosCuotas();
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

  const cargarVentas = async () => {
    const { data } = await supabase.from("ventas_cuotas").select("*").order("id", { ascending: false });
    setVentas(data || []);
  };

  const cargarPagosCuotas = async () => {
    const { data } = await supabase.from("pagos_cuotas").select("*").order("venta_id, numero_cuota", { ascending: true });
    setPagosCuotas(data || []);
  };

  const guardarOrden = async (orden) => {
    if (!orden.cliente || !orden.telefono || !orden.equipo) {
      alert("Completa: Cliente, Teléfono y Equipo");
      return;
    }
      const { data, error } = await supabase.from("ordenes").insert([{ estado: "Ingresado", ...orden, fecha: new Date().toISOString() }]);
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

  const guardarVenta = async (ventaData, cuotas) => {
    const { data, error } = await supabase.from("ventas_cuotas").insert([ventaData]).select();
    if (!error && data && data.length > 0) {
      const ventaId = data[0].id;
      const cuotasConId = cuotas.map(c => ({ ...c, venta_id: ventaId }));
      await supabase.from("pagos_cuotas").insert(cuotasConId);
      if (ventaData.entrada > 0) {
        await guardarMovimientoCaja({
          tipo: "ingreso",
          categoria: "cuota",
          monto: ventaData.entrada,
          descripcion: `Entrada - ${ventaData.cliente} - ${ventaData.equipo}`
        });
      }
      cargarVentas();
      cargarPagosCuotas();
    } else if (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  const registrarPago = async (pagoId, monto, cliente, equipo) => {
    await supabase.from("pagos_cuotas").update({ estado: "pagado", fecha_pago: new Date().toISOString() }).eq("id", pagoId);
    await guardarMovimientoCaja({
      tipo: "ingreso",
      categoria: "cuota",
      monto: monto,
      descripcion: `Cuota - ${cliente} - ${equipo}`
    });
    cargarPagosCuotas();
  };

  const toggleBloqueo = async (ventaId, estadoActual) => {
    const nuevoEstado = estadoActual === "activo" ? "bloqueado" : "activo";
    await supabase.from("ventas_cuotas").update({ estado_dispositivo: nuevoEstado }).eq("id", ventaId);
    cargarVentas();
  };

  const eliminarVenta = async (id) => {
    if (!window.confirm("¿Eliminar esta venta y todas sus cuotas?")) return;
    await supabase.from("ventas_cuotas").delete().eq("id", id);
    cargarVentas();
    cargarPagosCuotas();
  };

  const generarPDF = (orden) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const generarCopia = (startY, esPrimeralCopia) => {
      doc.setFillColor(20, 23, 21);
      doc.rect(0, startY, pageWidth, 25, 'F');
      const logoX = 15;
      doc.addImage(logo, 'PNG', logoX, startY + 5, 45, 16);
      const rightCenterX = pageWidth - 42;
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("FIXLAB", rightCenterX, startY + 12, { align: 'center' });
      doc.setTextColor(255, 122, 26);
      doc.setFontSize(9);
      doc.text("Reparación de celulares y PC", rightCenterX, startY + 22, { align: 'center' });
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
      const lineHeight = 8;

      doc.setFont(undefined, 'bold'); doc.text("Cliente:", col1X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.cliente || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold'); doc.text("Falla:", col2X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.falla || '', col2X + 12, yPos);

      yPos += lineHeight;
      doc.setFont(undefined, 'bold'); doc.text("Teléfono:", col1X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.telefono || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold'); doc.text("Accesorios:", col2X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.accesorios || 'no', col2X + 22, yPos);

      yPos += lineHeight;
      doc.setFont(undefined, 'bold'); doc.text("Equipo:", col1X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.equipo || '', col1X + 20, yPos);
      doc.setFont(undefined, 'bold'); doc.text("IMEI / Serie:", col2X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.imei || '', col2X + 26, yPos);

      yPos += lineHeight;
      doc.setFont(undefined, 'bold'); doc.text("Tipo Contraseña:", col1X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.tipo_contrasena || 'No esp.', col1X + 30, yPos);
      doc.setFont(undefined, 'bold'); doc.text("Contraseña:", col2X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.password || 'No registrada', col2X + 24, yPos);

      yPos += lineHeight;
      doc.setFont(undefined, 'bold'); doc.text("Estado:", col1X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(orden.estado || '', col1X + 14, yPos);
      doc.setFont(undefined, 'bold'); doc.text("Importe:", col2X, yPos);
      doc.setFont(undefined, 'normal'); doc.text(`$${orden.importe || ''}`, col2X + 18, yPos);

      yPos += lineHeight + 2;
      doc.setFont(undefined, 'bold'); doc.text("Observaciones:", col1X, yPos);
      doc.setFont(undefined, 'normal');
      const obsLines = doc.splitTextToSize(orden.observaciones || 'Sin observaciones', pageWidth - 20);
      doc.text(obsLines, col1X, yPos + lineHeight);
      yPos += obsLines.length * 6 + 8;

      doc.setLineWidth(0.3);
      doc.line(10, yPos, pageWidth - 10, yPos);
      yPos += 8;
      doc.setFont(undefined, 'bold'); doc.setFontSize(9);
      doc.text("TÉRMINOS Y CONDICIONES", 10, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal'); doc.setFontSize(8);
      const terms = "1) Para retirar el equipo es OBLIGATORIA la presentación de este comprobante. SIN ESTE COMPROBANTE NO SE ENTREGA EL EQUIPO. 2) Los equipos no retirados dentro de los 60 días podrán ser descartados. 3) El cliente autoriza diagnóstico y reparación. FIX LAB no se responsabiliza por fallas ocultas o equipos previamente manipulados.";
      const splitTerms = doc.splitTextToSize(terms, pageWidth - 20);
      doc.text(splitTerms, 10, yPos);

      yPos = startY + 105;
      doc.setLineWidth(0.5); doc.setDrawColor(0, 0, 0);
      doc.line(pageWidth - 55, yPos, pageWidth - 20, yPos);
      yPos += 5;
      doc.setFontSize(9); doc.setFont(undefined, 'normal');
      if (esPrimeralCopia) {
        doc.addImage(firma, 'PNG', pageWidth - 55, yPos + 15, 30, 20);
        doc.text("Firma Técnico", pageWidth - 50, yPos);
      } else {
        doc.text("Firma Cliente", pageWidth - 50, yPos);
      }

      yPos = startY + 125;
      doc.setFillColor(20, 23, 21);
      doc.rect(0, yPos, pageWidth, 15, 'F');
      doc.setFontSize(10); doc.setTextColor(255, 122, 26); doc.setFont(undefined, 'bold');
      doc.text("MAESTRO VIDAL 1379 LOCAL 2 - WSP 3516789960", pageWidth / 2, yPos + 8, { align: 'center' });
    };

    generarCopia(0, true);
    doc.setLineWidth(0.3); doc.setDrawColor(200, 200, 200); doc.setLineDash([5, 5]);
    doc.line(10, 140, pageWidth - 10, 140);
    doc.setLineDash([]);
    generarCopia(145, false);
    doc.save(`orden-${orden.id}-${orden.cliente}.pdf`);
  };

  if (!session) {
    return (
      <div style={{ background: "#0c0e0d", color: "#eef0ee", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#141715", padding: "32px", borderRadius: "12px", width: "300px", border: "1px solid #2a2e2b" }}>
          <div style={{ fontSize: "40px", marginBottom: "20px" }}>🔧</div>
          <h1 style={{ marginBottom: "24px" }}>Iniciar Sesión</h1>
          {loginError && <p style={{ color: "#e53e3e", marginBottom: "12px" }}>{loginError}</p>}
          <input type="email" placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee" }} />
          <input type="password" placeholder="Contraseña" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} style={{ width: "100%", padding: "10px", marginBottom: "20px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee" }} />
          <button onClick={login} style={{ width: "100%", background: "#ff7a1a", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0c0e0d", color: "#eef0ee", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ background: "#141715", borderBottom: "1px solid #2a2e2b", padding: "24px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, color: "#eef0ee", fontSize: "48px", fontWeight: "700" }}>🔧 FIX<span style={{ color: "#ff7a1a" }}>LAB</span></h1>
        <button onClick={logout} style={{ background: "#6ee7a0", color: "#000", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Cerrar Sesión</button>
      </div>

      <div style={{ display: "flex" }}>
        <div style={{ background: "#141715", width: "200px", borderRight: "1px solid #2a2e2b", padding: "16px", maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
          <button onClick={() => setTab("dashboard")} style={{ width: "100%", padding: "12px", marginBottom: "8px", background: tab === "dashboard" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>📊 Dashboard</button>
          <button onClick={() => setTab("servicio")} style={{ width: "100%", padding: "12px", marginBottom: "8px", background: tab === "servicio" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>Servicio Técnico</button>
          <button onClick={() => setTab("caja")} style={{ width: "100%", padding: "12px", marginBottom: "8px", background: tab === "caja" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>Caja</button>
          <button onClick={() => setTab("stock")} style={{ width: "100%", padding: "12px", marginBottom: "8px", background: tab === "stock" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>Stock</button>
          <button onClick={() => setTab("cuotas")} style={{ width: "100%", padding: "12px", background: tab === "cuotas" ? "#ff7a1a" : "transparent", border: "1px solid #2a2e2b", borderRadius: "6px", color: "#eef0ee", cursor: "pointer" }}>📱 Ventas Cuotas</button>
        </div>

        <div style={{ flex: 1, padding: "24px", maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
          {tab === "dashboard" && <Dashboard ordenes={ordenes} caja={caja} productos={productos} ventas={ventas} pagosCuotas={pagosCuotas} setTab={setTab} />}
          {tab === "servicio" && <ServicioTecnico ordenes={ordenes} guardarOrden={guardarOrden} actualizarOrden={actualizarOrden} eliminarOrden={eliminarOrden} generarPDF={generarPDF} guardarMovimientoCaja={guardarMovimientoCaja} />}
          {tab === "caja" && <Caja caja={caja} guardarMovimientoCaja={guardarMovimientoCaja} productos={productos} />}
          {tab === "stock" && <Stock productos={productos} cargarProductos={cargarProductos} guardarMovimientoCaja={guardarMovimientoCaja} />}
          {tab === "cuotas" && <VentasCuotas ventas={ventas} pagosCuotas={pagosCuotas} guardarVenta={guardarVenta} registrarPago={registrarPago} toggleBloqueo={toggleBloqueo} eliminarVenta={eliminarVenta} />}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ ordenes, caja, productos, ventas, pagosCuotas, setTab }) {
  const [expandStockBajo, setExpandStockBajo] = useState(false);
  const [expandBalance, setExpandBalance] = useState(true);
  const [expandCuotasVencidas, setExpandCuotasVencidas] = useState(false);

  const ordenesPendientes = ordenes.filter((o) => o.estado !== "Entregado").length;
  const ingresos = caja.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
  const egresos = caja.filter((m) => m.tipo === "egreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
  const productosStockBajo = productos.filter((p) => p.cantidad <= 1);

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const cuotasVencidas = pagosCuotas.filter(p => {
    if (p.estado === "pagado") return false;
    return new Date(p.fecha_vencimiento + 'T00:00:00') < hoy;
  });
  const ventasConVencidas = ventas.filter(v => cuotasVencidas.some(p => p.venta_id === v.id));

  return (
    <div style={{ color: "#eef0ee" }}>
      <h1 style={{ fontSize: "36px", marginBottom: "30px", textAlign: "center" }}>📊 Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <div style={{ background: "#141715", padding: "24px", borderRadius: "12px", border: "2px solid #ff7a1a", textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "#ff7a1a", fontSize: "14px" }}>📋 ÓRDENES PENDIENTES</h3>
          <h1 style={{ margin: "12px 0 0 0", fontSize: "48px", color: "#6ee7a0" }}>{ordenesPendientes}</h1>
        </div>
        <div style={{ background: "#141715", padding: "24px", borderRadius: "12px", border: "2px solid #6ee7a0", textAlign: "center", cursor: "pointer" }} onClick={() => setExpandBalance(!expandBalance)}>
          <h3 style={{ margin: 0, color: "#6ee7a0", fontSize: "14px" }}>💰 BALANCE CAJA {expandBalance ? "▼" : "▶"}</h3>
          {expandBalance && <h1 style={{ margin: "12px 0 0 0", fontSize: "32px", color: (ingresos - egresos) >= 0 ? "#6ee7a0" : "#e53e3e" }}>${(ingresos - egresos).toFixed(2)}</h1>}
        </div>
        <div style={{ background: "#141715", padding: "24px", borderRadius: "12px", border: "2px solid #e53e3e", textAlign: "center", cursor: "pointer" }} onClick={() => setExpandStockBajo(!expandStockBajo)}>
          <h3 style={{ margin: 0, color: "#e53e3e", fontSize: "14px" }}>⚠️ STOCK BAJO</h3>
          <h1 style={{ margin: "12px 0 0 0", fontSize: "48px", color: "#e53e3e" }}>{productosStockBajo.length}</h1>
        </div>
        <div style={{ background: "#141715", padding: "24px", borderRadius: "12px", border: cuotasVencidas.length > 0 ? "2px solid #e53e3e" : "2px solid #3b82f6", textAlign: "center", cursor: "pointer" }} onClick={() => setExpandCuotasVencidas(!expandCuotasVencidas)}>
          <h3 style={{ margin: 0, color: cuotasVencidas.length > 0 ? "#e53e3e" : "#3b82f6", fontSize: "14px" }}>🔒 CUOTAS VENCIDAS {expandCuotasVencidas ? "▼" : "▶"}</h3>
          <h1 style={{ margin: "12px 0 0 0", fontSize: "48px", color: cuotasVencidas.length > 0 ? "#e53e3e" : "#6ee7a0" }}>{cuotasVencidas.length}</h1>
        </div>
      </div>

      {expandStockBajo && productosStockBajo.length > 0 && (
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "30px", border: "2px solid #e53e3e" }}>
          <h3 style={{ color: "#e53e3e", marginTop: 0 }}>Productos con Stock Bajo:</h3>
          {productosStockBajo.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px", backgroundColor: "#1a1f1c", borderRadius: "4px", marginBottom: "8px" }}>
              <div><p style={{ margin: 0, fontWeight: "bold" }}>{p.nombre}</p><p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9aa39c" }}>{p.categoria}</p></div>
              <span style={{ color: "#e53e3e", fontWeight: "bold" }}>{p.cantidad} unid.</span>
            </div>
          ))}
        </div>
      )}

      {expandCuotasVencidas && cuotasVencidas.length > 0 && (
        <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "30px", border: "2px solid #e53e3e" }}>
          <h3 style={{ color: "#e53e3e", marginTop: 0 }}>Cuotas Vencidas:</h3>
          {ventasConVencidas.map(v => {
            const venc = cuotasVencidas.filter(p => p.venta_id === v.id);
            return (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px", backgroundColor: "#1a1f1c", borderRadius: "4px", marginBottom: "8px" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: "bold" }}>{v.cliente} — {v.equipo}</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#e53e3e" }}>{venc.length} cuota(s) vencida(s)</p>
                </div>
                <button onClick={() => setTab("cuotas")} style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Ver</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <button onClick={() => setTab("servicio")} style={{ background: "linear-gradient(135deg, #ff7a1a 0%, #ff9c42 100%)", color: "#000", border: "none", padding: "20px", borderRadius: "8px", fontSize: "18px", fontWeight: "600", cursor: "pointer" }}>📱 Servicio Técnico</button>
        <button onClick={() => setTab("caja")} style={{ background: "linear-gradient(135deg, #6ee7a0 0%, #8ff4b8 100%)", color: "#000", border: "none", padding: "20px", borderRadius: "8px", fontSize: "18px", fontWeight: "600", cursor: "pointer" }}>💵 Caja</button>
        <button onClick={() => setTab("stock")} style={{ background: "linear-gradient(135deg, #3b82f6 0%, #5ba3ff 100%)", color: "#fff", border: "none", padding: "20px", borderRadius: "8px", fontSize: "18px", fontWeight: "600", cursor: "pointer" }}>📦 Stock</button>
        <button onClick={() => setTab("cuotas")} style={{ background: "linear-gradient(135deg, #9b59b6 0%, #b97de0 100%)", color: "#fff", border: "none", padding: "20px", borderRadius: "8px", fontSize: "18px", fontWeight: "600", cursor: "pointer" }}>🔒 Ventas Cuotas</button>
      </div>
    </div>
  );
}

function VentasCuotas({ ventas, pagosCuotas, guardarVenta, registrarPago, toggleBloqueo, eliminarVenta }) {
  const inputStyle = { width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee", boxSizing: "border-box" };

  const [form, setForm] = useState({ cliente: "", telefono: "", equipo: "", imei: "", precio_total: "", entrada: "0", cuotas_total: "6", fecha_primer_vencimiento: "", notas: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const precioTotal = parseFloat(form.precio_total) || 0;
  const entrada = parseFloat(form.entrada) || 0;
  const cantCuotas = parseInt(form.cuotas_total) || 1;
  const montoCuota = cantCuotas > 0 ? ((precioTotal - entrada) / cantCuotas).toFixed(2) : "0.00";

  const handleSave = () => {
    if (!form.cliente || !form.telefono || !form.equipo || !form.precio_total || !form.cuotas_total || !form.fecha_primer_vencimiento) {
      alert("Completa todos los campos obligatorios (*)");
      return;
    }
    const ventaData = {
      cliente: form.cliente, telefono: form.telefono, equipo: form.equipo, imei: form.imei,
      precio_total: precioTotal, entrada: entrada, cuotas_total: cantCuotas,
      monto_cuota: parseFloat(montoCuota), fecha_venta: new Date().toISOString(),
      fecha_primer_vencimiento: form.fecha_primer_vencimiento,
      estado_dispositivo: "activo", notas: form.notas
    };
    const cuotas = [];
    const fechaBase = new Date(form.fecha_primer_vencimiento + 'T12:00:00');
    for (let i = 0; i < cantCuotas; i++) {
      const fecha = new Date(fechaBase);
      fecha.setMonth(fecha.getMonth() + i);
      cuotas.push({ numero_cuota: i + 1, fecha_vencimiento: fecha.toISOString().split('T')[0], monto: parseFloat(montoCuota), estado: "pendiente" });
    }
    guardarVenta(ventaData, cuotas);
    setForm({ cliente: "", telefono: "", equipo: "", imei: "", precio_total: "", entrada: "0", cuotas_total: "6", fecha_primer_vencimiento: "", notas: "" });
  };

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const getCuotaEstado = (pago) => {
    if (pago.estado === "pagado") return "pagado";
    return new Date(pago.fecha_vencimiento + 'T00:00:00') < hoy ? "vencido" : "pendiente";
  };
  const getPagosVenta = (ventaId) => pagosCuotas.filter(p => p.venta_id === ventaId);
  const ventasFiltradas = ventas.filter(v =>
    (v.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.equipo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.imei || '').includes(busqueda)
  );

  return (
    <div>
      <h2>📱 Ventas en Cuotas</h2>
      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0, color: "#ff7a1a" }}>Nueva Venta</h3>
        <input placeholder="Cliente *" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} style={inputStyle} />
        <input placeholder="Teléfono WhatsApp *" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
        <input placeholder="Equipo (ej: iPhone 12, Samsung A54) *" value={form.equipo} onChange={e => setForm({ ...form, equipo: e.target.value })} style={inputStyle} />
        <input placeholder="IMEI / Serie" value={form.imei} onChange={e => setForm({ ...form, imei: e.target.value })} style={inputStyle} />
        <input type="number" placeholder="Precio total *" value={form.precio_total} onChange={e => setForm({ ...form, precio_total: e.target.value })} style={inputStyle} />
        <label style={{ color: "#9aa39c", fontSize: "12px", display: "block", marginBottom: "4px" }}>Entrada (0 si no hay)</label>
<input type="number" value={form.entrada} onChange={e => setForm({ ...form, entrada: e.target.value })} style={inputStyle} />
<label style={{ color: "#9aa39c", fontSize: "12px", display: "block", marginBottom: "4px" }}>Cantidad de cuotas *</label>
<input type="number" value={form.cuotas_total} onChange={e => setForm({ ...form, cuotas_total: e.target.value })} style={inputStyle} />
        <div style={{ background: "#1a1f1c", padding: "10px", borderRadius: "4px", marginBottom: "8px", color: "#6ee7a0", fontWeight: "600" }}>
          💰 Monto por cuota: ${montoCuota}
        </div>
        <label style={{ color: "#9aa39c", fontSize: "12px", display: "block", marginBottom: "4px" }}>Fecha primer vencimiento *</label>
        <input type="date" value={form.fecha_primer_vencimiento} onChange={e => setForm({ ...form, fecha_primer_vencimiento: e.target.value })} style={inputStyle} />
        <input placeholder="Notas (opcional)" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} style={inputStyle} />
        <button onClick={handleSave} style={{ width: "100%", background: "#6ee7a0", color: "#000", border: "none", padding: "12px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "16px" }}>Guardar Venta</button>
      </div>

      <input placeholder="🔍 Buscar por cliente, equipo o IMEI..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle, marginBottom: "12px" }} />

      {ventasFiltradas.length === 0 && <div style={{ color: "#9aa39c", textAlign: "center", padding: "40px" }}>No hay ventas registradas</div>}

      {ventasFiltradas.map(venta => {
        const pagos = getPagosVenta(venta.id);
        const pagados = pagos.filter(p => p.estado === "pagado").length;
        const vencidos = pagos.filter(p => getCuotaEstado(p) === "vencido").length;
        const proxima = pagos.find(p => p.estado !== "pagado");
        const bloqueado = venta.estado_dispositivo === "bloqueado";

        return (
          <div key={venta.id} style={{ background: "#141715", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: vencidos > 0 ? "2px solid #e53e3e" : bloqueado ? "2px solid #9aa39c" : "1px solid #2a2e2b" }}>
            <div style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} onClick={() => setExpandedId(expandedId === venta.id ? null : venta.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", fontSize: "15px" }}>{venta.cliente} — {venta.equipo}</div>
                <div style={{ fontSize: "12px", color: "#9aa39c", marginTop: "4px" }}>💰 Total: ${venta.precio_total} | Cuota: ${venta.monto_cuota} | {pagados}/{venta.cuotas_total} pagadas</div>
                {vencidos > 0 && <div style={{ fontSize: "12px", color: "#e53e3e", marginTop: "2px" }}>⚠️ {vencidos} cuota(s) vencida(s)</div>}
                {proxima && pagados < venta.cuotas_total && <div style={{ fontSize: "12px", color: "#ff7a1a", marginTop: "2px" }}>📅 Próx. venc.: {new Date(proxima.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}</div>}
                {pagados === venta.cuotas_total && <div style={{ fontSize: "12px", color: "#6ee7a0", marginTop: "2px" }}>✅ PAGADO COMPLETO</div>}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "8px" }}>
                <span style={{ background: bloqueado ? "#e53e3e" : "#6ee7a0", color: "#000", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}>
                  {bloqueado ? "🔒 BLOQUEADO" : "🔓 ACTIVO"}
                </span>
                <span style={{ color: "#ff7a1a" }}>{expandedId === venta.id ? "▼" : "▶"}</span>
              </div>
            </div>

            {expandedId === venta.id && (
              <div style={{ marginTop: "14px" }}>
                <div style={{ background: "#1a1f1c", padding: "10px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <span><strong>IMEI:</strong> {venta.imei || "No registrado"}</span>
                    <span><strong>Tel:</strong> {venta.telefono}</span>
                    <span><strong>Entrada:</strong> ${venta.entrada || 0}</span>
                    <span><strong>Fecha venta:</strong> {new Date(venta.fecha_venta).toLocaleDateString('es-AR')}</span>
                  </div>
                  {venta.notas && <div style={{ marginTop: "6px" }}><strong>Notas:</strong> {venta.notas}</div>}
                </div>

                <h4 style={{ margin: "0 0 8px 0", color: "#ff7a1a" }}>Cuotas:</h4>
                {pagos.map(pago => {
                  const estado = getCuotaEstado(pago);
                  return (
                    <div key={pago.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#0c0e0d", borderRadius: "4px", marginBottom: "4px" }}>
                      <div>
                        <span style={{ fontWeight: "600" }}>Cuota {pago.numero_cuota}</span>
                        <span style={{ fontSize: "12px", color: "#9aa39c", marginLeft: "8px" }}>{new Date(pago.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')} | ${pago.monto}</span>
                        {pago.fecha_pago && <span style={{ fontSize: "11px", color: "#6ee7a0", marginLeft: "8px" }}>✓ {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}</span>}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 7px", borderRadius: "3px", background: estado === "pagado" ? "#6ee7a0" : estado === "vencido" ? "#e53e3e" : "#ff7a1a", color: "#000" }}>
                          {estado === "pagado" ? "✓ PAGADO" : estado === "vencido" ? "⚠ VENCIDO" : "PENDIENTE"}
                        </span>
                        {estado !== "pagado" && (
                          <button onClick={() => registrarPago(pago.id, pago.monto, venta.cliente, venta.equipo)} style={{ background: "#6ee7a0", color: "#000", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Cobrar</button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button onClick={() => toggleBloqueo(venta.id, venta.estado_dispositivo)} style={{ flex: 1, background: bloqueado ? "#6ee7a0" : "#e53e3e", color: bloqueado ? "#000" : "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}>
                    {bloqueado ? "🔓 Desbloquear" : "🔒 Bloquear"}
                  </button>
                  <button onClick={() => { const msg = encodeURIComponent(`Hola ${venta.cliente}! Te recordamos que tenés una cuota pendiente de $${venta.monto_cuota} con Fix Lab. Por favor regularizá tu situación. Gracias!`); window.open(`https://wa.me/${venta.telefono.replace(/\D/g, '')}?text=${msg}`, '_blank'); }} style={{ background: "#25D366", color: "#fff", border: "none", padding: "10px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>📱 WhatsApp</button>
                  <button onClick={() => eliminarVenta(venta.id)} style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "10px 14px", borderRadius: "6px", cursor: "pointer" }}>🗑</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ServicioTecnico({ ordenes, guardarOrden, actualizarOrden, eliminarOrden, generarPDF, guardarMovimientoCaja }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState(null);

    // --- Detección de duplicados (traída de Britos) ---
    const soloNumeros = (t) => (t || "").toString().replace(/\D/g, "");
    const textoLimpio = (t) => (t || "").toString().trim().toLowerCase();
    // Últimos 10 dígitos: así "351 678-9960" y "+54 9 351 6789960" cuentan como el mismo número
    const telNormal = (t) => soloNumeros(t).slice(-10);
    const telForm = telNormal(form.telefono);
    const ordenesMismoTel = telForm.length >= 6 ? ordenes.filter((o) => telNormal(o.telefono) === telForm && o.id !== editingId) : [];
    const clienteConocido = ordenesMismoTel.length > 0 ? ordenesMismoTel[0] : null;

    const buscarDuplicado = () => {
        const abiertas = ordenes.filter((o) => o.estado !== "Entregado" && o.id !== editingId);
        const imeiForm = textoLimpio(form.imei);
        if (imeiForm) {
            const dupImei = abiertas.find((o) => textoLimpio(o.imei) === imeiForm);
            if (dupImei) return `Ya hay una orden abierta con este IMEI/Serie:\n\nOrden #${dupImei.id} - ${dupImei.cliente} - ${dupImei.equipo} (${dupImei.estado || "Ingresado"})`;
        }
        if (telForm && textoLimpio(form.equipo)) {
            const dupEquipo = abiertas.find((o) => telNormal(o.telefono) === telForm && textoLimpio(o.equipo) === textoLimpio(form.equipo));
            if (dupEquipo) return `Este cliente ya tiene una orden abierta con el mismo equipo:\n\nOrden #${dupEquipo.id} - ${dupEquipo.cliente} - ${dupEquipo.equipo} (${dupEquipo.estado || "Ingresado"})`;
        }
        return null;
    };

    const handleSave = () => {
        const aviso = buscarDuplicado();
        if (aviso && !window.confirm(`⚠️ Posible orden duplicada\n\n${aviso}\n\n¿Querés guardarla igual?`)) return;
        if (editingId) {
            const { id, fecha, ...updateData } = form;
            actualizarOrden(editingId, updateData);
            setEditingId(null); setForm({});
        } else {
            guardarOrden(form); setForm({});
        }
    };
  const handleEdit = (orden) => { setEditingId(orden.id); setForm(orden); };
  const handleCancel = () => { setEditingId(null); setForm({}); };
  const ordenesFiltradas = ordenes.filter((o) => (o.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) || (o.equipo || '').toLowerCase().includes(busqueda.toLowerCase()) || o.id.toString().includes(busqueda));
  const handleEstadoChange = (orden, nuevoEstado) => {
    actualizarOrden(orden.id, { estado: nuevoEstado });
    if (nuevoEstado === "Entregado" && orden.importe) {
      guardarMovimientoCaja({ tipo: "ingreso", categoria: "reparacion", monto: orden.importe, descripcion: `Reparación - ${orden.cliente}` });
    }
    const mensaje = encodeURIComponent(`Hola ${orden.cliente}! Tu equipo cambió a ${nuevoEstado}. - Fix Lab`);
    window.open(`https://wa.me/${orden.telefono.replace(/\D/g, '')}?text=${mensaje}`, '_blank');
  };

  return (
    <div>
      <h2>Servicio Técnico</h2>
      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <input placeholder="Cliente" value={form.cliente || ""} onChange={(e) => setForm({ ...form, cliente: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
              <input placeholder="Teléfono" value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
              {clienteConocido && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", background: "#1a1f1c", border: "1px solid #ff7a1a", borderRadius: "4px", padding: "8px", marginBottom: "8px", fontSize: "13px" }}>
                      <span>👤 Cliente conocido: <strong>{clienteConocido.cliente}</strong> — {ordenesMismoTel.length} orden(es) anterior(es)</span>
                      {textoLimpio(form.cliente) !== textoLimpio(clienteConocido.cliente) && (
                          <button onClick={() => setForm({ ...form, cliente: clienteConocido.cliente })} style={{ background: "#ff7a1a", color: "#000", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}>Usar nombre</button>
                      )}
                  </div>
              )}
        <input placeholder="Equipo" value={form.equipo || ""} onChange={(e) => setForm({ ...form, equipo: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Falla" value={form.falla || ""} onChange={(e) => setForm({ ...form, falla: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="IMEI/Serie" value={form.imei || ""} onChange={(e) => setForm({ ...form, imei: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Accesorios" value={form.accesorios || ""} onChange={(e) => setForm({ ...form, accesorios: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input placeholder="Observaciones" value={form.observaciones || ""} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <select value={form.tipo_contrasena || ""} onChange={(e) => setForm({ ...form, tipo_contrasena: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
          <option value="">-- Tipo de Contraseña --</option>
          <option value="patron">Patrón</option>
          <option value="numero">Número</option>
          <option value="alfanumerico">Alfanumérico</option>
        </select>
        <input placeholder="Contraseña" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <select value={form.estado || "Ingresado"} onChange={(e) => setForm({ ...form, estado: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
          <option>Ingresado</option><option>Diagnóstico</option><option>En reparación</option><option>Esperando repuesto</option><option>Listo</option><option>Entregado</option>
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
                <div style={{ fontSize: "12px", color: "#9aa39c", marginTop: "4px" }}>📅 {new Date(orden.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
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
                <p><strong>Observaciones:</strong> {orden.observaciones}</p>
                <p><strong>Tipo de Contraseña:</strong> {orden.tipo_contrasena || 'No especificado'}</p>
                <p><strong>Contraseña:</strong> {orden.password || 'No registrada'}</p>
                <p><strong>Estado:</strong> {orden.estado}</p>
                <p><strong>Importe:</strong> ${orden.importe}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select value={orden.estado || "Ingresado"} onChange={(e) => handleEstadoChange(orden, e.target.value)} style={{ padding: "6px 12px", borderRadius: "4px", background: "#1a1f1c", border: "1px solid #2a2e2b", color: "#eef0ee", cursor: "pointer", fontSize: "12px" }}>
                <option>Ingresado</option><option>Diagnóstico</option><option>En reparación</option><option>Esperando repuesto</option><option>Listo</option><option>Entregado</option>
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

function Caja({ caja, guardarMovimientoCaja, productos }) {
  const [form, setForm] = useState({ tipo: "ingreso", categoria: "reparacion", monto: "", descripcion: "", producto_id: null, cantidad: 0 });
  const [filtro, setFiltro] = useState("todos");

  const ingresos = caja.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
  const egresos = caja.filter((m) => m.tipo === "egreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
  const getFechaInicio = () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (filtro === "hoy") return hoy;
    if (filtro === "semana") { const h = new Date(hoy); h.setDate(h.getDate() - 7); return h; }
    if (filtro === "mes") { const h = new Date(hoy); h.setDate(h.getDate() - 30); return h; }
    return new Date(0);
  };
  const cajaFiltrada = caja.filter((m) => new Date(m.fecha) >= getFechaInicio());

  const handleSave = async () => {
    if (form.tipo === "venta" && form.producto_id && form.cantidad > 0) {
      const producto = productos.find((p) => p.id === form.producto_id);
      if (producto) {
        const monto = form.cantidad * producto.precio_venta;
        await guardarMovimientoCaja({ tipo: "ingreso", categoria: "venta", monto, descripcion: `Venta - ${producto.nombre} (${form.cantidad} unid.)` });
        const nuevaCantidad = Math.max(0, producto.cantidad - form.cantidad);
        await supabase.from("productos").update({ cantidad: nuevaCantidad }).eq("id", producto.id);
        setForm({ tipo: "ingreso", categoria: "reparacion", monto: "", descripcion: "", producto_id: null, cantidad: 0 });
      }
    } else if (form.monto && form.descripcion && form.tipo !== "venta") {
      await guardarMovimientoCaja(form);
      setForm({ tipo: "ingreso", categoria: "reparacion", monto: "", descripcion: "", producto_id: null, cantidad: 0 });
    } else {
      alert("Completa todos los campos");
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
        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, monto: "", descripcion: "", producto_id: null, cantidad: 0 })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
          <option value="ingreso">Ingreso</option>
          <option value="venta">Venta de Accesorios</option>
          <option value="egreso">Egreso</option>
        </select>
        {form.tipo === "venta" ? (
          <>
            <select value={form.producto_id || ""} onChange={(e) => setForm({ ...form, producto_id: parseInt(e.target.value) || null })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
              <option value="">-- Selecciona producto --</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.cantidad})</option>)}
            </select>
            <input type="number" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 0 })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
          </>
        ) : (
          <>
            {form.tipo === "ingreso" && (
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
                <option value="reparacion">Reparación</option>
                <option value="cuota">Cuota de venta</option>
                <option value="otro">Otro</option>
              </select>
            )}
            <input type="number" placeholder="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
            <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
          </>
        )}
        <button onClick={handleSave} style={{ width: "100%", background: "#6ee7a0", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Guardar</button>
      </div>
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        {["todos","hoy","semana","mes"].map(f => <button key={f} onClick={() => setFiltro(f)} style={{ padding: "8px 12px", background: filtro === f ? "#ff7a1a" : "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee", cursor: "pointer" }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>)}
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

function Stock({ productos, cargarProductos, guardarMovimientoCaja }) {
  const [form, setForm] = useState({ nombre: "", categoria: "", cantidad: 0, precio_venta: 0 });
  const [editingId, setEditingId] = useState(null);
  const categorias = ["Fundas Samsung","Fundas Xiaomi","Fundas iPhone","Fundas Motorola","Vidrios Templados Samsung","Vidrios Templados Xiaomi","Vidrios Templados iPhone","Vidrios Templados Motorola","Cargadores","Cables USB","Cargadores 12V","Holders","Cargadores Inalámbricos","Cables","Manos Libres","Auriculares Bluetooth","Vinchas Bluetooth","Lámparas","Parlantes","Relojes","Smartwatch","Joystick","Teclados","Mouse","Combos Teclado Mouse","Iluminación","Despertadores","Micrófonos","Pendrives","Memorias","Accesorios Varios"];

  const handleAgregar = async () => {
    if (form.nombre && form.categoria && form.cantidad > 0) {
      if (editingId) { const { id, ...d } = form; await supabase.from("productos").update(d).eq("id", editingId); }
      else { await supabase.from("productos").insert([form]); }
      cargarProductos(); setEditingId(null); setForm({ nombre: "", categoria: "", cantidad: 0, precio_venta: 0 });
    }
  };
  const handleEditar = (p) => { setEditingId(p.id); setForm(p); };
  const handleCancelar = () => { setEditingId(null); setForm({ nombre: "", categoria: "", cantidad: 0, precio_venta: 0 }); };
  const handleEliminar = async (id) => { await supabase.from("productos").delete().eq("id", id); cargarProductos(); };
  const handleDescontar = async (id, cantidad) => {
    const producto = productos.find((p) => p.id === id);
    if (producto) {
      await supabase.from("productos").update({ cantidad: Math.max(0, producto.cantidad - cantidad) }).eq("id", id);
      await guardarMovimientoCaja({ tipo: "ingreso", categoria: "venta", monto: cantidad * producto.precio_venta, descripcion: `Venta - ${producto.nombre} (${cantidad} unid.)` });
      cargarProductos();
    }
  };
  const productosPorCategoria = {};
  productos.forEach((p) => { if (!productosPorCategoria[p.categoria]) productosPorCategoria[p.categoria] = []; productosPorCategoria[p.categoria].push(p); });

  return (
    <div>
      <h2>Stock</h2>
      <div style={{ background: "#141715", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3>{editingId ? "Editar Producto" : "Agregar Producto"}</h3>
        <input placeholder="Nombre del producto" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }}>
          <option value="">-- Selecciona categoría --</option>
          {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <input type="number" placeholder="Cantidad" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: parseInt(e.target.value) || 0 })} style={{ width: "100%", padding: "8px", marginBottom: "8px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <input type="number" placeholder="Precio de venta" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: parseFloat(e.target.value) || 0 })} style={{ width: "100%", padding: "8px", marginBottom: "12px", background: "#1a1f1c", border: "1px solid #2a2e2b", borderRadius: "4px", color: "#eef0ee" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleAgregar} style={{ flex: 1, background: "#6ee7a0", color: "#000", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>{editingId ? "Actualizar" : "Agregar"}</button>
          {editingId && <button onClick={handleCancelar} style={{ flex: 1, background: "#e53e3e", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>Cancelar</button>}
        </div>
      </div>
      <div>
        {Object.keys(productosPorCategoria).map((categoria) => (
          <div key={categoria} style={{ marginBottom: "24px" }}>
            <h3 style={{ background: "#ff7a1a", color: "#000", padding: "12px", borderRadius: "6px" }}>📦 {categoria}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px", marginTop: "12px" }}>
              {productosPorCategoria[categoria].map((p) => (
                <div key={p.id} style={{ background: "#141715", padding: "12px", borderRadius: "8px", border: p.cantidad <= 1 ? "2px solid #e53e3e" : "1px solid #2a2e2b" }}>
                  <h4 style={{ margin: "0 0 8px 0" }}>{p.nombre}</h4>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: p.cantidad <= 1 ? "#e53e3e" : "#6ee7a0" }}>📦 Stock: {p.cantidad} {p.cantidad <= 1 && "⚠️ BAJO"}</p>
                  <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#ff7a1a" }}>💰 ${p.precio_venta}</p>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                    <button onClick={() => handleDescontar(p.id, 1)} style={{ flex: 1, background: "#3b82f6", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>-1</button>
                    <button onClick={() => handleDescontar(p.id, 5)} style={{ flex: 1, background: "#3b82f6", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>-5</button>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => handleEditar(p)} style={{ flex: 1, background: "#ff7a1a", color: "#000", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Editar</button>
                    <button onClick={() => handleEliminar(p.id)} style={{ flex: 1, background: "#e53e3e", color: "#fff", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}