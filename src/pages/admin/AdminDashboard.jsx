// src/pages/admin/AdminDashboard.jsx
// Full admin panel for Govardhan — manage clients, payments, files, orders
import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, setDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../firebase/config";
import useAuth from "../../hooks/useAuth";

const TABS = ["Dashboard","Clients","Add Client","Payments","Orders"];

// ── Small UI helpers ────────────────────────────────────────────────────────
const Card = ({ children, style={} }) => (
  <div style={{ background:"var(--card)", border:"1px solid var(--bord)", borderRadius:14, padding:"20px 18px", ...style }}>
    {children}
  </div>
);

const Inp = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>
    <input {...props} style={{ width:"100%", padding:"11px 14px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:"0.92rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
  </div>
);

const Sel = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>
    <select {...props} style={{ width:"100%", padding:"11px 14px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:"0.92rem", color:"var(--txt)", fontFamily:"inherit", outline:"none" }}>
      {children}
    </select>
  </div>
);

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    paid:    { bg:"rgba(16,185,129,.15)", color:"#10B981", label:"Paid" },
    partial: { bg:"rgba(245,158,11,.15)", color:"#F59E0B", label:"Partial" },
    due:     { bg:"rgba(239,68,68,.15)",  color:"#EF4444", label:"Due" },
    done:    { bg:"rgba(16,185,129,.15)", color:"#10B981", label:"Done" },
    pending: { bg:"rgba(245,158,11,.15)", color:"#F59E0B", label:"Pending" },
    new:     { bg:"rgba(99,102,241,.15)", color:"#6366F1", label:"New" },
  };
  const s = map[status] || map.pending;
  return <span style={{ background:s.bg, color:s.color, padding:"3px 10px", borderRadius:50, fontSize:"0.75rem", fontWeight:700 }}>{s.label}</span>;
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AdminDashboard({ t }) {
  const { logout, profile } = useAuth();
  const [tab, setTab]       = useState("Dashboard");
  const [clients, setClients] = useState([]);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");

  // New client form state
  const [nc, setNc] = useState({
    coachingName:"", ownerName:"", email:"", phone:"",
    password:"", city:"", state:"Bihar", totalBilled:0,
    totalPaid:0, plan:"client",
  });

  // New order form state
  const [no, setNo] = useState({
    clientId:"", topic:"", type:"MCQ", quantity:0,
    rate:0, driveLink:"", status:"pending", notes:"",
  });

  const css = `
    :root {
      --bg:   ${t.bg};
      --card: ${t.bgCard};
      --bg2:  ${t.bgCard2};
      --bord: ${t.border};
      --txt:  ${t.text};
      --mut:  ${t.muted};
      --gold: ${t.gold};
      --acc:  ${t.accent};
      --grn:  ${t.green};
      --red:  ${t.red};
    }
    body { background: var(--bg); color: var(--txt); font-family: 'Plus Jakarta Sans',sans-serif; }
    * { box-sizing: border-box; margin:0; padding:0; }
    button { font-family: inherit; cursor: pointer; }
  `;

  // ── FETCH DATA ───────────────────────────────────────────────────────────
  const fetchClients = async () => {
    const snap = await getDocs(collection(db,"users"));
    const list = snap.docs
      .map(d => ({ id:d.id, ...d.data() }))
      .filter(u => u.role === "client");
    setClients(list);
  };

  const fetchOrders = async () => {
    const snap = await getDocs(query(collection(db,"orders"), orderBy("createdAt","desc")));
    setOrders(snap.docs.map(d => ({ id:d.id, ...d.data() })));
  };

  useEffect(() => { fetchClients(); fetchOrders(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  // ── ADD CLIENT ────────────────────────────────────────────────────────────
  const addClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, nc.email, nc.password);
      // Save profile in Firestore
      await setDoc(doc(db,"users",cred.user.uid), {
        uid:          cred.user.uid,
        role:         "client",
        coachingName: nc.coachingName,
        ownerName:    nc.ownerName,
        email:        nc.email,
        phone:        nc.phone,
        city:         nc.city,
        state:        nc.state,
        totalBilled:  Number(nc.totalBilled),
        totalPaid:    Number(nc.totalPaid),
        logoUrl:      "",
        createdAt:    serverTimestamp(),
      });
      flash("✅ Client added successfully!");
      setNc({ coachingName:"", ownerName:"", email:"", phone:"", password:"", city:"", state:"Bihar", totalBilled:0, totalPaid:0 });
      fetchClients();
      setTab("Clients");
    } catch(err) {
      flash("❌ Error: " + err.message);
    }
    setLoading(false);
  };

  // ── ADD ORDER ─────────────────────────────────────────────────────────────
  const addOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const total = Number(no.quantity) * Number(no.rate);
      await addDoc(collection(db,"orders"), {
        ...no,
        quantity:  Number(no.quantity),
        rate:      Number(no.rate),
        totalFee:  total,
        status:    no.status || "pending",
        createdAt: serverTimestamp(),
      });
      flash("✅ Order added successfully!");
      setNo({ clientId:"", topic:"", type:"MCQ", quantity:0, rate:0, driveLink:"", status:"pending", notes:"" });
      fetchOrders();
    } catch(err) {
      flash("❌ Error: " + err.message);
    }
    setLoading(false);
  };

  // ── UPDATE ORDER STATUS ───────────────────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    await updateDoc(doc(db,"orders",id), { status });
    fetchOrders();
  };

  // ── UPDATE PAYMENT ────────────────────────────────────────────────────────
  const updatePayment = async (clientId, totalPaid) => {
    await updateDoc(doc(db,"users",clientId), { totalPaid: Number(totalPaid) });
    fetchClients();
    flash("✅ Payment updated!");
  };

  // ── STATS ─────────────────────────────────────────────────────────────────
  const totalBilled = clients.reduce((s,c) => s + (c.totalBilled||0), 0);
  const totalPaid   = clients.reduce((s,c) => s + (c.totalPaid||0), 0);
  const totalDues   = clients.reduce((s,c) => s + Math.max(0,(c.totalBilled||0)-(c.totalPaid||0)), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  return (
    <div style={{ minHeight:"100vh", background:t.bg }}>
      <style>{css}</style>

      {/* ── TOP NAV ── */}
      <div style={{
        position:"sticky", top:0, zIndex:100,
        background:t.nav, backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${t.border}`,
        padding:"0 20px", display:"flex", alignItems:"center",
        justifyContent:"space-between", height:60,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#F59E0B,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:"0.9rem", color:"#070B14" }}>DG</div>
          <div>
            <div style={{ fontWeight:800, fontSize:"0.95rem", color:t.text }}>Admin Panel</div>
            <div style={{ fontSize:"0.72rem", color:t.muted }}>DG HelpMate · {profile?.ownerName || "Govardhan"}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {TABS.map(tab2 => (
            <button key={tab2} onClick={() => setTab(tab2)} style={{
              padding:"6px 14px", borderRadius:8, border:"none", fontSize:"0.82rem", fontWeight:600,
              background: tab===tab2 ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard,
              color: tab===tab2 ? "#070B14" : t.muted,
              border: tab===tab2 ? "none" : `1px solid ${t.border}`,
            }}>{tab2}</button>
          ))}
          <button onClick={logout} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${t.border}`, background:t.bgCard, color:t.muted, fontSize:"0.82rem", fontWeight:600 }}>
            Logout
          </button>
        </div>
      </div>

      {/* ── FLASH MESSAGE ── */}
      {msg && (
        <div style={{
          position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:999,
          background: msg.startsWith("✅") ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${msg.startsWith("✅") ? t.green : t.red}`,
          color: msg.startsWith("✅") ? t.green : t.red,
          padding:"10px 24px", borderRadius:50, fontSize:"0.9rem", fontWeight:700,
        }}>{msg}</div>
      )}

      <div style={{ padding:"24px 20px", maxWidth:1200, margin:"0 auto" }}>

        {/* ══ DASHBOARD TAB ══ */}
        {tab === "Dashboard" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.5rem", color:t.text, marginBottom:24 }}>
              👋 Welcome back, {profile?.ownerName || "Govardhan"}!
            </h2>
            {/* KPI Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
              {[
                { label:"Total Clients",   val:clients.length,              color:t.accent, icon:"👥" },
                { label:"Total Billed",    val:`₹${totalBilled.toLocaleString()}`,  color:t.gold,   icon:"💰" },
                { label:"Total Received",  val:`₹${totalPaid.toLocaleString()}`,    color:t.green,  icon:"✅" },
                { label:"Total Dues",      val:`₹${totalDues.toLocaleString()}`,    color:t.red,    icon:"⚠️" },
                { label:"Pending Orders",  val:pendingOrders,               color:t.saffron, icon:"📦" },
              ].map(({ label, val, color, icon }) => (
                <Card key={label}>
                  <div style={{ fontSize:"1.6rem", marginBottom:8 }}>{icon}</div>
                  <div style={{ fontSize:"0.78rem", color:t.muted, marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:"1.7rem", fontWeight:900, color }}>{val}</div>
                </Card>
              ))}
            </div>

            {/* Recent Clients with Dues */}
            <Card>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:16 }}>⚠️ Clients with Pending Dues</h3>
              {clients.filter(c => (c.totalBilled - c.totalPaid) > 0).length === 0
                ? <p style={{ color:t.muted, fontSize:"0.9rem" }}>No pending dues! 🎉</p>
                : clients.filter(c => (c.totalBilled - c.totalPaid) > 0)
                    .sort((a,b) => (b.totalBilled-b.totalPaid) - (a.totalBilled-a.totalPaid))
                    .map(c => (
                  <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${t.border}` }}>
                    <div>
                      <div style={{ fontWeight:700, color:t.text, fontSize:"0.93rem" }}>{c.coachingName}</div>
                      <div style={{ fontSize:"0.78rem", color:t.muted }}>{c.ownerName} · {c.phone}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:900, fontSize:"1.1rem", color:t.red }}>₹{(c.totalBilled - c.totalPaid).toLocaleString()}</div>
                      <div style={{ fontSize:"0.75rem", color:t.muted }}>Dues</div>
                    </div>
                  </div>
                ))
              }
            </Card>
          </div>
        )}

        {/* ══ CLIENTS TAB ══ */}
        {tab === "Clients" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text }}>All Clients ({clients.length})</h2>
              <button onClick={() => setTab("Add Client")} style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", padding:"9px 18px", borderRadius:9, fontWeight:700, fontSize:"0.88rem" }}>
                + Add New Client
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
              {clients.map(c => {
                const dues = (c.totalBilled||0) - (c.totalPaid||0);
                return (
                  <Card key={c.id}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      {c.logoUrl
                        ? <img src={c.logoUrl} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }} />
                        : <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"1rem", color:"#fff" }}>{c.coachingName?.[0]}</div>
                      }
                      <div>
                        <div style={{ fontWeight:700, fontSize:"0.97rem", color:t.text }}>{c.coachingName}</div>
                        <div style={{ fontSize:"0.78rem", color:t.muted }}>{c.ownerName} · {c.city}</div>
                      </div>
                      <div style={{ marginLeft:"auto" }}>
                        <Badge status={dues <= 0 ? "paid" : dues < 500 ? "partial" : "due"} />
                      </div>
                    </div>
                    {/* Payment row */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                      {[
                        { label:"Billed", val:`₹${(c.totalBilled||0).toLocaleString()}`, color:t.text },
                        { label:"Paid",   val:`₹${(c.totalPaid||0).toLocaleString()}`,   color:t.green },
                        { label:"Dues",   val:`₹${Math.max(0,dues).toLocaleString()}`,   color:dues>0?t.red:t.green },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ textAlign:"center", background:t.bgCard2, borderRadius:8, padding:"8px 4px" }}>
                          <div style={{ fontSize:"0.7rem", color:t.muted }}>{label}</div>
                          <div style={{ fontWeight:800, fontSize:"0.95rem", color }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {/* Quick payment update */}
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="number" defaultValue={c.totalPaid}
                        id={`pay-${c.id}`}
                        style={{ flex:1, padding:"8px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, fontSize:"0.87rem", color:t.text, fontFamily:"inherit", outline:"none" }}
                      />
                      <button
                        onClick={() => updatePayment(c.id, document.getElementById(`pay-${c.id}`).value)}
                        style={{ background:`linear-gradient(135deg,${t.green},#059669)`, color:"#fff", border:"none", padding:"8px 14px", borderRadius:8, fontWeight:700, fontSize:"0.82rem" }}>
                        Update
                      </button>
                    </div>
                    <div style={{ marginTop:8, fontSize:"0.75rem", color:t.muted }}>📧 {c.email} · 📞 {c.phone}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ ADD CLIENT TAB ══ */}
        {tab === "Add Client" && (
          <div style={{ maxWidth:560 }}>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:22 }}>➕ Add New Client</h2>
            <Card>
              <form onSubmit={addClient}>
                <Inp label="Coaching Name" required value={nc.coachingName} onChange={e => setNc({...nc, coachingName:e.target.value})} placeholder="e.g. SVM Classes Official" />
                <Inp label="Owner Name" required value={nc.ownerName} onChange={e => setNc({...nc, ownerName:e.target.value})} placeholder="e.g. Satyam Sir" />
                <Inp label="Email (for login)" type="email" required value={nc.email} onChange={e => setNc({...nc, email:e.target.value})} placeholder="coaching@email.com" />
                <Inp label="Password (for login)" type="password" required value={nc.password} onChange={e => setNc({...nc, password:e.target.value})} placeholder="Set a password for client" />
                <Inp label="Phone / WhatsApp" required value={nc.phone} onChange={e => setNc({...nc, phone:e.target.value})} placeholder="+91 XXXXXXXXXX" />
                <Inp label="City" value={nc.city} onChange={e => setNc({...nc, city:e.target.value})} placeholder="e.g. Patna" />
                <Sel label="State" value={nc.state} onChange={e => setNc({...nc, state:e.target.value})}>
                  {["Bihar","Jharkhand","UP","Delhi","Other"].map(s => <option key={s}>{s}</option>)}
                </Sel>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Inp label="Total Billed (₹)" type="number" value={nc.totalBilled} onChange={e => setNc({...nc, totalBilled:e.target.value})} placeholder="0" />
                  <Inp label="Total Paid (₹)" type="number" value={nc.totalPaid} onChange={e => setNc({...nc, totalPaid:e.target.value})} placeholder="0" />
                </div>
                <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", fontWeight:800, border:"none", borderRadius:10, fontSize:"0.97rem", marginTop:4 }}>
                  {loading ? "Creating..." : "Create Client Account →"}
                </button>
              </form>
            </Card>
          </div>
        )}

        {/* ══ PAYMENTS TAB ══ */}
        {tab === "Payments" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:20 }}>💰 Payment Overview</h2>
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
              {[
                { l:"Total Billed",   v:`₹${totalBilled.toLocaleString()}`,  c:t.text  },
                { l:"Total Received", v:`₹${totalPaid.toLocaleString()}`,    c:t.green },
                { l:"Total Dues",     v:`₹${totalDues.toLocaleString()}`,    c:t.red   },
              ].map(({l,v,c}) => (
                <Card key={l} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"0.78rem", color:t.muted, marginBottom:6 }}>{l}</div>
                  <div style={{ fontSize:"1.8rem", fontWeight:900, color:c }}>{v}</div>
                </Card>
              ))}
            </div>
            {/* Table */}
            <Card style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.87rem" }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${t.border}` }}>
                    {["Coaching Name","Owner","Billed","Paid","Dues","Status","Update Paid"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:t.muted, fontWeight:700, fontSize:"0.78rem", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.sort((a,b) => ((b.totalBilled-b.totalPaid)-(a.totalBilled-a.totalPaid))).map(c => {
                    const dues = (c.totalBilled||0)-(c.totalPaid||0);
                    return (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${t.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:700, color:t.text }}>{c.coachingName}</td>
                        <td style={{ padding:"10px 12px", color:t.muted }}>{c.ownerName}</td>
                        <td style={{ padding:"10px 12px", color:t.text, fontWeight:600 }}>₹{(c.totalBilled||0).toLocaleString()}</td>
                        <td style={{ padding:"10px 12px", color:t.green, fontWeight:600 }}>₹{(c.totalPaid||0).toLocaleString()}</td>
                        <td style={{ padding:"10px 12px", color:dues>0?t.red:t.green, fontWeight:700 }}>₹{Math.max(0,dues).toLocaleString()}</td>
                        <td style={{ padding:"10px 12px" }}><Badge status={dues<=0?"paid":dues<500?"partial":"due"} /></td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <input type="number" id={`pt-${c.id}`} defaultValue={c.totalPaid}
                              style={{ width:90, padding:"6px 10px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, fontSize:"0.84rem", color:t.text, fontFamily:"inherit", outline:"none" }}/>
                            <button onClick={() => updatePayment(c.id, document.getElementById(`pt-${c.id}`).value)}
                              style={{ background:t.green, color:"#fff", border:"none", padding:"6px 12px", borderRadius:7, fontWeight:700, fontSize:"0.8rem" }}>Save</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ══ ORDERS TAB ══ */}
        {tab === "Orders" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:20 }}>📦 Orders & Deliveries</h2>
            {/* Add Order Form */}
            <Card style={{ marginBottom:24 }}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:16 }}>➕ Add New Order / Delivery</h3>
              <form onSubmit={addOrder}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Sel label="Client" value={no.clientId} onChange={e => setNo({...no,clientId:e.target.value})} required>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.coachingName}</option>)}
                  </Sel>
                  <Sel label="Type" value={no.type} onChange={e => setNo({...no,type:e.target.value})}>
                    {["MCQ","PPT","Test Paper","Thumbnail","Typing","Poster","SEO","Other"].map(t2 => <option key={t2}>{t2}</option>)}
                  </Sel>
                </div>
                <Inp label="Topic / Description" required value={no.topic} onChange={e => setNo({...no,topic:e.target.value})} placeholder="e.g. Class 10 Hindi Grammar MCQ" />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  <Inp label="Quantity" type="number" value={no.quantity} onChange={e => setNo({...no,quantity:e.target.value})} placeholder="0" />
                  <Inp label="Rate (₹)" type="number" value={no.rate} onChange={e => setNo({...no,rate:e.target.value})} placeholder="0" />
                  <div style={{ paddingTop:20 }}>
                    <div style={{ fontSize:"0.78rem", color:t.muted, marginBottom:4 }}>TOTAL</div>
                    <div style={{ fontSize:"1.2rem", fontWeight:800, color:t.gold }}>₹{(no.quantity*no.rate).toLocaleString()}</div>
                  </div>
                </div>
                <Inp label="Google Drive Link (for delivered file)" value={no.driveLink} onChange={e => setNo({...no,driveLink:e.target.value})} placeholder="https://drive.google.com/..." />
                <Sel label="Status" value={no.status} onChange={e => setNo({...no,status:e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="done">Delivered</option>
                  <option value="new">New Request</option>
                </Sel>
                <Inp label="Notes (optional)" value={no.notes} onChange={e => setNo({...no,notes:e.target.value})} placeholder="Any additional info..." />
                <button type="submit" disabled={loading} style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", padding:"12px 24px", borderRadius:10, fontWeight:800, fontSize:"0.95rem" }}>
                  {loading ? "Saving..." : "Save Order"}
                </button>
              </form>
            </Card>

            {/* Orders List */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {orders.map(o => {
                const client = clients.find(c => c.id === o.clientId);
                return (
                  <Card key={o.id}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, color:t.text, fontSize:"0.93rem" }}>{o.topic}</div>
                        <div style={{ fontSize:"0.76rem", color:t.muted }}>{client?.coachingName || o.clientId}</div>
                      </div>
                      <Badge status={o.status} />
                    </div>
                    <div style={{ display:"flex", gap:10, fontSize:"0.82rem", color:t.muted, marginBottom:10 }}>
                      <span>📂 {o.type}</span>
                      <span>×{o.quantity}</span>
                      <span style={{ color:t.gold, fontWeight:700 }}>₹{o.totalFee?.toLocaleString()}</span>
                    </div>
                    {o.driveLink && (
                      <a href={o.driveLink} target="_blank" style={{ fontSize:"0.82rem", color:t.accent, fontWeight:700, textDecoration:"none" }}>
                        📁 View File →
                      </a>
                    )}
                    <div style={{ display:"flex", gap:8, marginTop:12 }}>
                      <button onClick={() => updateOrderStatus(o.id,"done")}
                        style={{ flex:1, background:"rgba(16,185,129,0.12)", color:t.green, border:`1px solid ${t.green}30`, borderRadius:7, padding:"6px", fontSize:"0.8rem", fontWeight:700 }}>
                        ✓ Mark Done
                      </button>
                      <button onClick={() => updateOrderStatus(o.id,"pending")}
                        style={{ flex:1, background:"rgba(245,158,11,0.1)", color:t.gold, border:`1px solid ${t.gold}30`, borderRadius:7, padding:"6px", fontSize:"0.8rem", fontWeight:700 }}>
                        ⏳ Pending
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}