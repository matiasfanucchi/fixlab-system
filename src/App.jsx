import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "./logo.png";

const supabase = createClient(
  "https://gtfexxsbfprxqdbjlfjy.supabase.co",
  "sb_publishable_ALou-nprG8wRyhw9fri4_g_rITe6-bx"
);

const estados = [
  "Ingresado",
  "Diagnóstico",
  "En reparación",
  "Esperando repuesto",
  "Listo",
  "Entregado",
];

export default function App() {
  const [ordenes, setOrdenes] = useState([]);

  const [form, setForm] = useState({
    cliente: "",
    telefono: "",
    equipo: "",
    imei: "",
    falla: "",
    password: "",
    accesorios: "",
    observaciones: "",
    importe: "",
  });

  async function cargarOrdenes() {
    const { data } = await supabase
      .from("ordenes")
      .select("*")
      .order("id", { ascending: false });
    setOrdenes(data || []);
  }

  async function guardarOrden() {
    const { data, error } = await supabase
      .from("ordenes")
      .insert([{ ...form, estado: "Ingresado" }]);

    console.log("DATA:", data);
    console.log("ERROR:", error);

    setForm({
      cliente: "",
      telefono: "",
      equipo: "",
      imei: "",
      falla: "",
      password: "",
      accesorios: "",
      observaciones: "",
      importe: "",
    });

    cargarOrdenes();
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
        startY: y + 42,
        theme: "plain",
        body: [
          [`Cliente: ${orden.cliente}`, `Falla: ${orden.falla}`],
          [`Teléfono: ${orden.telefono}`, `Accesorios: ${orden.accesorios}`],
          [`Equipo: ${orden.equipo}`, `Observaciones: ${orden.observaciones}`],
          [`IMEI / Serie: ${orden.imei}`, `Contraseña: ${orden.password}`],
          [`Importe: $${orden.importe}`, `Estado: ${orden.estado}`],
        ],
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.roundedRect(20, y + 88, 170, 24, 3, 3);
      doc.setFontSize(7);
      doc.text(
        "1) Para retirar el equipo es OBLIGATORIA la presentacion de este comprobante. SIN ESTE COMPROBANTE NO SE ENTREGA EL EQUIPO. 2) Los equipos no retirados dentro de los 60 dias podran ser descartados. 3) El cliente autoriza diagnostico y reparacion. FIX LAB no se responsabiliza por fallas ocultas o equipos previamente manipulados.",
        24, y + 95, { maxWidth: 160 }
      );

      doc.line(30, y + 126, 80, y + 126);
      doc.line(130, y + 126, 180, y + 126);
      doc.setFontSize(8);
      doc.text("Firma Cliente", 44, y + 132);
      doc.text("Firma Tecnico", 144, y + 132);
      doc.setFillColor(15, 15, 15);
      doc.rect(0, y + 138, 210, 10, "F");
      doc.setTextColor(255, 165, 0);
      doc.setFontSize(10);
      doc.text("MAESTRO VIDAL 1379 LOCAL 2 - WSP 3516789960", 105, y + 145, { align: "center" });
    }

    crearCopia(0);
    doc.setDrawColor(120);
    doc.line(10, 148, 200, 148);
    crearCopia(147);
    doc.save(`orden-${orden.id}.pdf`);
  }

  async function cambiarEstado(id, estado) {
    await supabase.from("ordenes").update({ estado }).eq("id", id);
    cargarOrdenes();
  }

  useEffect(() => {
    cargarOrdenes();
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <nav>
          <button>Dashboard</button>
          <button>Servicio Técnico</button>
          <button>Stock</button>
          <button>Caja</button>
        </nav>
      </aside>

      <main className="content">
        <div className="topcards">
          <div className="card orange">
            <h2>{ordenes.length}</h2>
            <p>Órdenes</p>
          </div>
          <div className="card">
            <h2>0</h2>
            <p>Stock Bajo</p>
          </div>
          <div className="card">
            <h2>$0</h2>
            <p>Caja Diaria</p>
          </div>
        </div>

        <div className="formcard">
          <h2>Nueva Orden Técnica</h2>
          <div className="grid">
            <input placeholder="Cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <input placeholder="Equipo" value={form.equipo} onChange={(e) => setForm({ ...form, equipo: e.target.value })} />
            <input placeholder="IMEI / Serie" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            <input placeholder="Falla" value={form.falla} onChange={(e) => setForm({ ...form, falla: e.target.value })} />
            <input placeholder="Contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input placeholder="Accesorios" value={form.accesorios} onChange={(e) => setForm({ ...form, accesorios: e.target.value })} />
            <input placeholder="Importe" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} />
            <input placeholder="Observaciones" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <button className="savebtn" onClick={guardarOrden}>Guardar Orden</button>
        </div>

        <div className="orders">
          <h2>Órdenes Técnicas</h2>
          {ordenes.map((o) => (
            <div className="ordercard" key={o.id}>
              <div>
                <h3>{o.cliente}</h3>
                <p>{o.telefono}</p>
                <p>{o.equipo}</p>
                <p>{o.falla}</p>
              </div>
              <div className="statusbox">
                <select value={o.estado} onChange={(e) => cambiarEstado(o.id, e.target.value)}>
                  {estados.map((estado) => (
                    <option key={estado}>{estado}</option>
                  ))}
                </select>
                <button className="printbtn" onClick={() => imprimirOrden(o)}>PDF</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial; background: #111; }
        .app { display: flex; min-height: 100vh; background: #111; color: white; }
        .sidebar { width: 250px; background: #181818; padding: 30px 20px; border-right: 1px solid #2a2a2a; }
        .sidebar nav { display: flex; flex-direction: column; gap: 10px; }
        .sidebar button { background: #222; color: white; border: none; padding: 15px; border-radius: 10px; cursor: pointer; text-align: left; }
        .sidebar button:hover { background: orange; color: black; }
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
        .ordercard { background: #222; padding: 20px; border-radius: 12px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
      `}</style>
    </div>
  );
}