import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "./logo.png";

const supabase = createClient(
  "https://gtfexxsbfprxqdbjlfjy.supabase.co",
  "sb_publishable_ALou-nprG8wRyhw9fri4_g_rITe6-bx"
);

const estados = ["Ingresado","Diagnóstico","En reparación","Esperando repuesto","Listo","Entregado"];
const categoriasProducto = ["Accesorios celular","Informática","Otro"];

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [loginError, setLoginError] = useState("");
  const [seccion, setSeccion] = useState("servicio");
  const [ordenes, setOrdenes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [vistaCaja, setVistaCaja] = useState("dia");
  const [form, setForm] = useState({ cliente:"", telefono:"", equipo:"", imei:"", falla:"", password:"", accesorios:"", observaciones:"", importe:"" });
  const [formCaja, setFormCaja] = useState({ tipo:"ingreso", categoria:"Venta accesorio", descripcion:"", monto:"" });
  const [formProducto, setFormProducto] = useState({ nombre:"", categoria:"Accesorios celular", compatible_con:"", cantidad:"", precio_costo:"", precio_venta:"", stock_minimo:"3" });
  const [editandoProducto, setEditandoProducto] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSesion(session));
    supabase.auth.onAuthStateChange((_event, session) => setSesion(session));
  }, []);

  useEffect(() => {
    if (sesion) { cargarOrdenes(); cargarCaja(); cargarProductos(); }
  }, [sesion]);

  async function login() {
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginForm.email, password: loginForm.password });
    if (error) setLoginError("Email o contraseña incorrectos");
  }

  async function logout() { await supabase.auth.signOut(); }

  async function cargarOrdenes() {
    const { data } = await supabase.from("ordenes").select("*").order("id", { ascending: false });
    setOrdenes(data || []);
  }

  async function cargarCaja() {
    const { data } = await supabase.from("caja").select("*").order("fecha", { ascending: false });
    setMovimientos(data || []);
  }

  async function cargarProductos() {
    const { data } = await supabase.from("productos").select("*").order("nombre");
    setProductos(data || []);
  }

  async function guardarOrden() {
    await supabase.from("ordenes").insert([{ ...form, estado: "Ingresado" }]);
    setForm({ cliente:"", telefono:"", equipo:"", imei:"", falla:"", password:"", accesorios:"", observaciones:"", importe:"" });
    cargarOrdenes();
  }

  async function eliminarOrden(id) {
    if (!window.confirm("¿Seguro que querés eliminar esta orden?")) return;
    await supabase.from("ordenes").delete().eq("id", id);
    cargarOrdenes();
  }

 async function cambiarEstado(id, estado, orden) {
    await supabase.from("ordenes").update({ estado }).eq("id", id);
    if (estado === "Entregado" && orden.importe) {
      await supabase.from("caja").insert([{
        tipo: "ingreso", categoria: "Servicio técnico",
        descripcion: `Orden #${id} - ${orden.cliente} - ${orden.equipo}`,
        monto: parseFloat(orden.importe) || 0, orden_id: id,
      }]);
    }
    if (orden.telefono) {
      const msg = encodeURIComponent(`Hola ${orden.cliente}! Te informamos que tu equipo *${orden.equipo}* cambió su estado a *${estado}*. Ante cualquier consulta escribinos. - Fix Lab`);
      window.open(`https://wa.me/549${orden.telefono}?text=${msg}`, "_blank");
    }
    cargarOrdenes(); cargarCaja();
  }

  async function guardarMovimiento() {
    if (!formCaja.monto || !formCaja.descripcion) return;
    await supabase.from("caja").insert([{ ...formCaja, monto: parseFloat(formCaja.monto) }]);
    setFormCaja({ tipo:"ingreso", categoria:"Venta accesorio", descripcion:"", monto:"" });
    cargarCaja();
  }

  async function eliminarMovimiento(id) {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    await supabase.from("caja").delete().eq("id", id);
    cargarCaja();
  }

  async function guardarProducto() {
    if (!formProducto.nombre || !formProducto.cantidad) return;
    const datos = {
      ...formProducto,
      cantidad: parseInt(formProducto.cantidad),
      precio_costo: parseFloat(formProducto.precio_costo) || 0,
      precio_venta: parseFloat(formProducto.precio_venta) || 0,
      stock_minimo: parseInt(formProducto.stock_minimo) || 3,
    };
    if (editandoProducto) {
      await supabase.from("productos").update(datos).eq("id", editandoProducto);
      setEditandoProducto(null);
    } else {
      await supabase.from("productos").insert([datos]);
    }
    setFormProducto({ nombre:"", categoria:"Accesorios celular", compatible_con:"", cantidad:"", precio_costo:"", precio_venta:"", stock_minimo:"3" });
    cargarProductos();
  }

  async function eliminarProducto(id) {
    if (!window.confirm("¿Eliminar este producto?")) return;
    await supabase.from("productos").delete().eq("id", id);
    cargarProductos();
  }

  function editarProducto(p) {
    setFormProducto({ nombre:p.nombre, categoria:p.categoria, compatible_con:p.compatible_con||"", cantidad:p.cantidad, precio_costo:p.precio_costo, precio_venta:p.precio_venta, stock_minimo:p.stock_minimo });
    setEditandoProducto(p.id);
  }

  async function ajustarStock(id, delta) {
    const prod = productos.find(p => p.id === id);
    const nueva = Math.max(0, prod.cantidad + delta);
    await supabase.from("productos").update({ cantidad: nueva }).eq("id", id);
    if (delta < 0 && prod.precio_venta) {
      await supabase.from("caja").insert([{
        tipo: "ingreso", categoria: "Venta accesorio",
        descripcion: `Venta: ${prod.nombre}`,
        monto: prod.precio_venta,
      }]);
      cargarCaja();
    }
    cargarProductos();
  }

  function filtrarMovimientos() {
    const ahora = new Date();
    return movimientos.filter(m => {
      const fecha = new Date(m.fecha);
      if (vistaCaja === "dia") return fecha.toDateString() === ahora.toDateString();
      if (vistaCaja === "semana") return (ahora - fecha) / (1000*60*60*24) <= 7;
      if (vistaCaja === "mes") return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
      return true;
    });
  }

  function calcularTotales() {
    const filtrados = filtrarMovimientos();
    const ingresos = filtrados.filter(m => m.tipo === "ingreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
    const egresos = filtrados.filter(m => m.tipo === "egreso").reduce((a, m) => a + parseFloat(m.monto || 0), 0);
    return { ingresos, egresos, balance: ingresos - egresos };
  }

  function imprimirOrden(orden) {
    const doc = new jsPDF();
    function crearCopia(y) {
      doc.setLineDash([], 0);
      doc.setFillColor(15, 15, 15);
      doc.rect(0, y, 210, 20, "F");
      doc.addImage(logo, "PNG", 0, y, 210, 20);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`ORDEN # ${orden.id}`, 20, y + 32);
      doc.setFontSize(9);
      doc.text(`Fecha: ${new Date().toLocaleString()}`, 135, y + 32);
      doc.line(20, y + 36, 190, y + 36);
      autoTable(doc, {
        startY: y + 42, theme: "plain",
        body: [
          [`Cliente: ${orden.cliente}`, `Falla: ${orden.falla}`],
          [`Teléfono: ${orden.telefono}`, `Accesorios: ${orden.accesorios}`],
          [`Equipo: ${orden.equipo}`, `Observaciones: ${orden.observaciones}`],
          [`IMEI / Serie: ${orden.imei}`, `Contraseña: ${orden.password}`],
          [`Importe: $${orden.importe}`, `Estado: ${orden.estado}`],
        ],
        styles: { fontSize: 10, cellPadding: 4 },
      });
      doc.roundedRect(20, y + 105, 170, 24, 3, 3);
      doc.setFontSize(7);
      doc.text("1) Para retirar el equipo es OBLIGATORIA la presentacion de este comprobante. SIN ESTE COMPROBANTE NO SE ENTREGA EL EQUIPO. 2) Los equipos no retirados dentro de los 60 dias podran ser descartados. 3) El cliente autoriza diagnostico y reparacion. FIX LAB no se responsabiliza por fallas ocultas o equipos previamente manipulados.", 24, y + 112, { maxWidth: 160 });
      doc.line(30, y + 143, 80, y + 143);
      doc.line(130, y + 143, 180, y + 143);
      doc.setFontSize(8);
      doc.text("Firma Cliente", 44, y + 149);
      doc.text("Firma Tecnico", 144, y + 149);
      doc.setFillColor(15, 15, 15);
      doc.rect(0, y + 155, 210, 10, "F");
      doc.setTextColor(255, 165, 0);
      doc.setFontSize(10);
      doc.text("MAESTRO VIDAL 1379 LOCAL 2 - WSP 3516789960", 105, y + 162, { align: "center" });
    }
    crearCopia(0);
    doc.setDrawColor(120);
    doc.line(10, 148, 200, 148);
    crearCopia(147);
    doc.save(`orden-${orden.id}.pdf`);
  }

  const { ingresos, egresos, balance } = calcularTotales();
  const stockBajo = productos.filter(p => p.cantidad <= p.stock_minimo);

  if (!sesion) {
    return (
      <div style={{display:"flex", justifyContent:"center", alignItems:"center", minHeight:"100vh", background:"#111"}}>
        <div style={{background:"#1d1d1d", padding:"40px", borderRadius:"20px", width:"360px"}}>
          <div style={{textAlign:"center", marginBottom:"30px"}}>
            <img src={logo} alt="Fix Lab" style={{width:"100%", borderRadius:"10px"}} />
          </div>
          <h2 style={{color:"white", textAlign:"center", marginBottom:"25px"}}>Iniciar Sesión</h2>
          <input placeholder="Email" type="email" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})}
            style={{width:"100%", padding:"15px", background:"#2a2a2a", border:"none", borderRadius:"10px", color:"white", marginBottom:"15px", boxSizing:"border-box"}} />
          <input placeholder="Contraseña" type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            onKeyDown={e => e.key === "Enter" && login()}
            style={{width:"100%", padding:"15px", background:"#2a2a2a", border:"none", borderRadius:"10px", color:"white", marginBottom:"10px", boxSizing:"border-box"}} />
          {loginError && <p style={{color:"#e53e3e", marginBottom:"10px", fontSize:"14px"}}>{loginError}</p>}
          <button onClick={login} style={{width:"100%", padding:"15px", background:"orange", color:"black", border:"none", borderRadius:"10px", cursor:"pointer", fontWeight:"bold", fontSize:"16px"}}>Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <nav>
          <button onClick={() => setSeccion("servicio")} className={seccion === "servicio" ? "active" : ""}>Servicio Técnico</button>
          <button onClick={() => setSeccion("caja")} className={seccion === "caja" ? "active" : ""}>Caja</button>
          <button onClick={() => setSeccion("stock")} className={seccion === "stock" ? "active" : ""}>
            Stock {stockBajo.length > 0 && <span style={{background:"#e53e3e", color:"white", borderRadius:"50%", padding:"2px 7px", fontSize:"12px", marginLeft:"5px"}}>{stockBajo.length}</span>}
          </button>
        </nav>
        <button onClick={logout} style={{marginTop:"auto", background:"#e53e3e", color:"white", border:"none", padding:"12px", borderRadius:"10px", cursor:"pointer", fontWeight:"bold", width:"100%"}}>
          Cerrar Sesión
        </button>
      </aside>

      <main className="content">

        {seccion === "servicio" && (
          <>
            <div className="topcards">
              <div className="card orange"><h2>{ordenes.length}</h2><p>Órdenes</p></div>
              <div className="card"><h2>{ordenes.filter(o => o.estado !== "Entregado").length}</h2><p>En curso</p></div>
              <div className="card"><h2>{ordenes.filter(o => o.estado === "Listo").length}</h2><p>Listos</p></div>
            </div>
            <div className="formcard">
              <h2>Nueva Orden Técnica</h2>
              <div className="grid">
                <input placeholder="Cliente" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} />
                <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                <input placeholder="Equipo" value={form.equipo} onChange={e => setForm({...form, equipo: e.target.value})} />
                <input placeholder="IMEI / Serie" value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
                <input placeholder="Falla" value={form.falla} onChange={e => setForm({...form, falla: e.target.value})} />
                <input placeholder="Contraseña" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                <input placeholder="Accesorios" value={form.accesorios} onChange={e => setForm({...form, accesorios: e.target.value})} />
                <input placeholder="Importe" value={form.importe} onChange={e => setForm({...form, importe: e.target.value})} />
                <input placeholder="Observaciones" value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} />
              </div>
              <button className="savebtn" onClick={async () => {
  const { data } = await supabase.from("ordenes").insert([{ ...form, estado: "Ingresado" }]).select().single();
  if (data && form.telefono) {
    const msg = encodeURIComponent(`Hola ${form.cliente}! Recibimos tu equipo *${form.equipo}* en Fix Lab. Tu número de orden es *#${data.id}*. Te avisamos cuando esté listo! - Fix Lab`);
    window.open(`https://wa.me/549${form.telefono}?text=${msg}`, "_blank");
  }
  setForm({ cliente:"", telefono:"", equipo:"", imei:"", falla:"", password:"", accesorios:"", observaciones:"", importe:"" });
  cargarOrdenes();
}}>Guardar y avisar por WhatsApp</button>
            </div>
            <div className="orders">
              <h2>Órdenes Técnicas</h2>
              {ordenes.map(o => (
                <div className="ordercard" key={o.id}>
                  <div>
                    <h3>{o.cliente}</h3>
                    <p>{o.telefono}</p>
                    <p>{o.equipo}</p>
                    <p>{o.falla}</p>
                  </div>
                  <div className="statusbox">
                    <select value={o.estado} onChange={e => cambiarEstado(o.id, e.target.value, o)}>
                      {estados.map(estado => <option key={estado}>{estado}</option>)}
                    </select>
                    <button className="printbtn" onClick={() => imprimirOrden(o)}>PDF</button>
                    <button className="deletebtn" onClick={() => eliminarOrden(o.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {seccion === "caja" && (
          <>
            <div className="topcards">
              <div className="card" style={{border:"2px solid #48bb78"}}>
                <h2 style={{color:"#48bb78"}}>${ingresos.toFixed(2)}</h2><p>Ingresos</p>
              </div>
              <div className="card" style={{border:"2px solid #e53e3e"}}>
                <h2 style={{color:"#e53e3e"}}>${egresos.toFixed(2)}</h2><p>Egresos</p>
              </div>
              <div className="card orange">
                <h2>${balance.toFixed(2)}</h2><p>Balance</p>
              </div>
            </div>
            <div className="formcard">
              <h2>Nuevo Movimiento</h2>
              <div className="grid">
                <select value={formCaja.tipo} onChange={e => setFormCaja({...formCaja, tipo: e.target.value})}>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
                <select value={formCaja.categoria} onChange={e => setFormCaja({...formCaja, categoria: e.target.value})}>
                  <option>Venta accesorio</option>
                  <option>Servicio técnico</option>
                  <option>Compra repuesto</option>
                  <option>Gasto local</option>
                  <option>Otro</option>
                </select>
                <input placeholder="Descripción" value={formCaja.descripcion} onChange={e => setFormCaja({...formCaja, descripcion: e.target.value})} />
                <input placeholder="Monto" type="number" value={formCaja.monto} onChange={e => setFormCaja({...formCaja, monto: e.target.value})} />
              </div>
              <button className="savebtn" onClick={guardarMovimiento}>Guardar Movimiento</button>
            </div>
            <div className="orders">
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
                <h2 style={{margin:0}}>Movimientos</h2>
                <div style={{display:"flex", gap:"10px"}}>
                  {["dia","semana","mes"].map(v => (
                    <button key={v} onClick={() => setVistaCaja(v)}
                      style={{padding:"8px 16px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"bold",
                        background: vistaCaja === v ? "orange" : "#333", color: vistaCaja === v ? "black" : "white"}}>
                      {v === "dia" ? "Hoy" : v === "semana" ? "Semana" : "Mes"}
                    </button>
                  ))}
                </div>
              </div>
              {filtrarMovimientos().map(m => (
                <div className="ordercard" key={m.id}>
                  <div>
                    <h3 style={{color: m.tipo === "ingreso" ? "#48bb78" : "#e53e3e"}}>
                      {m.tipo === "ingreso" ? "+" : "-"}${parseFloat(m.monto).toFixed(2)}
                    </h3>
                    <p>{m.categoria}</p>
                    <p>{m.descripcion}</p>
                    <p style={{fontSize:"12px", color:"#888"}}>{new Date(m.fecha).toLocaleString()}</p>
                  </div>
                  <button className="deletebtn" onClick={() => eliminarMovimiento(m.id)}>Eliminar</button>
                </div>
              ))}
            </div>
          </>
        )}

        {seccion === "stock" && (
          <>
            <div className="topcards">
              <div className="card orange"><h2>{productos.length}</h2><p>Productos</p></div>
              <div className="card" style={{border: stockBajo.length > 0 ? "2px solid #e53e3e" : "none"}}>
                <h2 style={{color: stockBajo.length > 0 ? "#e53e3e" : "orange"}}>{stockBajo.length}</h2>
                <p>Stock Bajo</p>
              </div>
              <div className="card">
                <h2>${productos.reduce((a, p) => a + (p.precio_venta * p.cantidad), 0).toLocaleString()}</h2>
                <p>Valor Stock</p>
              </div>
            </div>

            {stockBajo.length > 0 && (
              <div style={{background:"#2d1515", border:"1px solid #e53e3e", borderRadius:"12px", padding:"15px", marginBottom:"20px"}}>
                <h3 style={{color:"#e53e3e", margin:"0 0 10px"}}>⚠ Stock bajo</h3>
                {stockBajo.map(p => (
                  <p key={p.id} style={{margin:"4px 0", color:"#ffaaaa"}}>{p.nombre} — {p.cantidad} unidades</p>
                ))}
              </div>
            )}

            <div className="formcard">
              <h2>{editandoProducto ? "Editar Producto" : "Nuevo Producto"}</h2>
              <div className="grid">
                <input placeholder="Nombre del producto" value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})} />
                <select value={formProducto.categoria} onChange={e => setFormProducto({...formProducto, categoria: e.target.value})}>
                  {categoriasProducto.map(c => <option key={c}>{c}</option>)}
                </select>
                <input placeholder="Compatible con (ej: Samsung A05, iPhone 13)" value={formProducto.compatible_con} onChange={e => setFormProducto({...formProducto, compatible_con: e.target.value})} />
                <input placeholder="Cantidad" type="number" value={formProducto.cantidad} onChange={e => setFormProducto({...formProducto, cantidad: e.target.value})} />
                <input placeholder="Precio costo" type="number" value={formProducto.precio_costo} onChange={e => setFormProducto({...formProducto, precio_costo: e.target.value})} />
                <input placeholder="Precio venta" type="number" value={formProducto.precio_venta} onChange={e => setFormProducto({...formProducto, precio_venta: e.target.value})} />
                <input placeholder="Stock mínimo (alerta)" type="number" value={formProducto.stock_minimo} onChange={e => setFormProducto({...formProducto, stock_minimo: e.target.value})} />
              </div>
              <div style={{display:"flex", gap:"10px"}}>
                <button className="savebtn" onClick={guardarProducto}>{editandoProducto ? "Actualizar" : "Agregar Producto"}</button>
                {editandoProducto && <button className="savebtn" style={{background:"#555"}} onClick={() => { setEditandoProducto(null); setFormProducto({ nombre:"", categoria:"Accesorios celular", compatible_con:"", cantidad:"", precio_costo:"", precio_venta:"", stock_minimo:"3" }); }}>Cancelar</button>}
              </div>
            </div>

            <div className="orders">
              <h2>Inventario</h2>
              {productos.map(p => (
                <div className="ordercard" key={p.id} style={{borderLeft: p.cantidad <= p.stock_minimo ? "3px solid #e53e3e" : "none"}}>
                  <div>
                    <h3>{p.nombre}</h3>
                    <p style={{color:"#888"}}>{p.categoria} {p.compatible_con && `· ${p.compatible_con}`}</p>
                    <p>Costo: ${p.precio_costo} · Venta: ${p.precio_venta}</p>
                  </div>
                  <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"8px"}}>
                    <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                      <button onClick={() => ajustarStock(p.id, -1)} style={{background:"#e53e3e", color:"white", border:"none", borderRadius:"6px", padding:"5px 12px", cursor:"pointer", fontSize:"18px", fontWeight:"bold"}}>−</button>
                      <span style={{fontSize:"22px", fontWeight:"bold", color: p.cantidad <= p.stock_minimo ? "#e53e3e" : "white"}}>{p.cantidad}</span>
                      <button onClick={() => ajustarStock(p.id, 1)} style={{background:"#48bb78", color:"white", border:"none", borderRadius:"6px", padding:"5px 12px", cursor:"pointer", fontSize:"18px", fontWeight:"bold"}}>+</button>
                    </div>
                    <div style={{display:"flex", gap:"8px"}}>
                      <button className="printbtn" onClick={() => editarProducto(p)}>Editar</button>
                      <button className="deletebtn" onClick={() => eliminarProducto(p.id)}>Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </main>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial; background: #111; }
        .app { display: flex; min-height: 100vh; background: #111; color: white; }
        .sidebar { width: 220px; background: #181818; padding: 30px 20px; border-right: 1px solid #2a2a2a; display: flex; flex-direction: column; }
        .sidebar nav { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .sidebar button { background: #222; color: white; border: none; padding: 15px; border-radius: 10px; cursor: pointer; text-align: left; font-size: 14px; }
        .sidebar button:hover, .sidebar button.active { background: orange; color: black; }
        .content { flex: 1; padding: 30px; }
        .topcards { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-bottom: 30px; }
        .card { background: #1d1d1d; padding: 25px; border-radius: 15px; }
        .orange { border: 2px solid orange; }
        .card h2 { margin: 0; color: orange; font-size: 35px; }
        .formcard { background: #1d1d1d; padding: 25px; border-radius: 15px; margin-bottom: 30px; }
        .grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 15px; }
        input { padding: 15px; background: #2a2a2a; border: none; border-radius: 10px; color: white; }
        select { padding: 12px; border: none; border-radius: 10px; background: orange; color: black; font-weight: bold; }
        .savebtn { margin-top: 20px; background: orange; color: black; border: none; padding: 15px 25px; border-radius: 10px; cursor: pointer; font-weight: bold; }
        .orders { background: #1d1d1d; padding: 25px; border-radius: 15px; }
        .printbtn { margin-top: 10px; background: white; color: black; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .deletebtn { margin-top: 10px; background: #e53e3e; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .ordercard { background: #222; padding: 20px; border-radius: 12px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
        .statusbox { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
      `}</style>
    </div>
  );
}