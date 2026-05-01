// src/pages/admin/ClientDetailPage.jsx — Complete Rewrite
import { useState, useEffect, useCallback } from "react";
import {
  doc, getDoc, updateDoc, collection, getDocs,
  addDoc, deleteDoc, query, where, serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebase/config";
import ChatWidget from "../../components/ui/ChatSystem";
import Invoice from "../../components/ui/Invoice";
import { waOrderStatusUpdate, waFileDelivered, waPaymentReminder } from "../../utils/whatsapp";
import { sendNotification } from "../../hooks/useNotifications";

// ── Mini components ──────────────────────────────────────
const Badge = ({ s, t }) => {
  const m = {
    paid:       ["rgba(16,185,129,.15)", "#10B981", "✓ Paid"],
    partial:    ["rgba(245,158,11,.15)", "#F59E0B", "Partial"],
    due:        ["rgba(239,68,68,.15)",  "#EF4444", "Due ⚠️"],
    done:       ["rgba(16,185,129,.15)", "#10B981", "✅ Done"],
    pending:    ["rgba(245,158,11,.15)", "#F59E0B", "⏳ Pending"],
    new:        ["rgba(99,102,241,.15)", "#818CF8", "🆕 New"],
    inprogress: ["rgba(59,130,246,.15)", "#3B82F6", "🔄 Working"],
    revision:   ["rgba(245,158,11,.15)", "#F59E0B", "📝 Revision"],
    cancelled:  ["rgba(239,68,68,.15)",  "#EF4444", "❌ Cancelled"],
    approved:   ["rgba(16,185,129,.15)", "#10B981", "✓ Verified"],
  };
  const [bg, color, label] = m[s] || m.pending;
  return <span style={{ background:bg, color, padding:"2px 10px", borderRadius:50, fontSize:".72rem", fontWeight:700, whiteSpace:"nowrap" }}>{label}</span>;
};

const Btn = ({ children, variant="primary", onClick, type="button", disabled, style={} }) => {
  const v = {
    primary: { background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14" },
    green:   { background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff" },
    danger:  { background:"rgba(239,68,68,.15)", color:"#EF4444", border:"1px solid rgba(239,68,68,.3)" },
    ghost:   { background:"transparent", border:"1px solid var(--bord)", color:"var(--mut)" },
    accent:  { background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff" },
    wa:      { background:"#25D366", color:"#fff" },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ padding:"8px 16px", borderRadius:9, border:"none", fontWeight:700, fontSize:".84rem", cursor:disabled?"not-allowed":"pointer", opacity:disabled?.6:1, fontFamily:"inherit", transition:"all .15s", ...v[variant], ...style }}>{children}</button>;
};

const Inp = ({ label, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <input {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", boxSizing:"border-box", ...(p.style||{}) }}/>
  </div>
);
const Sel = ({ label, children, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <select {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none" }}>{children}</select>
  </div>
);
const Txt = ({ label, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <textarea {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", resize:"vertical" }}/>
  </div>
);

const TABS = ["📊 Overview","💼 Work","💰 Payments","📁 Files","📦 Orders","💬 Chat","👤 Profile"];

const ORDER_STATUSES = [
  { s:"new",        label:"🆕 New",         col:"rgba(99,102,241,.15)",  tc:"#818CF8" },
  { s:"inprogress", label:"🔄 In Progress", col:"rgba(59,130,246,.15)",  tc:"#3B82F6" },
  { s:"revision",   label:"📝 Revision",    col:"rgba(245,158,11,.15)",  tc:"#F59E0B" },
  { s:"done",       label:"✅ Done",         col:"rgba(16,185,129,.15)",  tc:"#10B981" },
  { s:"cancelled",  label:"❌ Cancelled",    col:"rgba(239,68,68,.15)",   tc:"#EF4444" },
];

export default function ClientDetailPage({ clientId, onBack, t }) {
  const [client, setClient]   = useState(null);
  const [entries, setEntries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [files, setFiles]     = useState([]);
  const [orders, setOrders]   = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [tab, setTab]         = useState("📊 Overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  // Search + filter states
  const [entrySearch, setEntrySearch]   = useState("");
  const [entryType, setEntryType]       = useState("all");
  const [paySearch, setPaySearch]       = useState("");
  const [payMethod, setPayMethod]       = useState("all");
  const [orderSearch, setOrderSearch]   = useState("");
  const [orderStatus, setOrderStatus]   = useState("all");

  // Form states
  const [we, setWe] = useState({ topic:"", type:"MCQ", quantity:"0", rate:"0", notes:"", date:new Date().toISOString().split("T")[0] });
  const [pf, setPf] = useState({ amount:"0", method:"UPI", note:"", date:new Date().toISOString().split("T")[0], verified:true });
  const [ff, setFf] = useState({ title:"", driveLink:"", type:"Google Drive Folder", notes:"" });
  const [of_, setOf] = useState({ topic:"", type:"MCQ", quantity:"0", rate:"0", driveLink:"", status:"new", notes:"" });
  const [prof, setProf] = useState({});

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(""),4000); };

  const fetchAll = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const cSnap = await getDoc(doc(db,"users",clientId));
      if (cSnap.exists()) { const d={id:cSnap.id,...cSnap.data()}; setClient(d); setProf(d); }
      const [eS,pS,fS,oS] = await Promise.all([
        getDocs(query(collection(db,"workEntries"),    where("clientId","==",clientId))),
        getDocs(query(collection(db,"clientPayments"), where("clientId","==",clientId))),
        getDocs(query(collection(db,"clientFiles"),    where("clientId","==",clientId))),
        getDocs(query(collection(db,"orders"),         where("clientId","==",clientId))),
      ]);
      const sort = s => s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      setEntries(sort(eS)); setPayments(sort(pS)); setFiles(sort(fS)); setOrders(sort(oS));
    } catch(e) { flash("❌ "+e.message); }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions ─────────────────────────────────────────────
  const addEntry = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const total = Number(we.quantity)*Number(we.rate);
      await addDoc(collection(db,"workEntries"), { clientId, topic:we.topic, type:we.type, quantity:Number(we.quantity), rate:Number(we.rate), totalFee:total, notes:we.notes, date:we.date, createdAt:serverTimestamp() });
      await updateDoc(doc(db,"users",clientId), { totalBilled:(client?.totalBilled||0)+total });
      sendNotification({ toUserId:clientId, toRole:"client", title:"New Work Added", body:`${we.topic} — ₹${total.toLocaleString()}`, type:"order" });
      flash("✅ Work entry added!");
      setWe({ topic:"", type:"MCQ", quantity:"0", rate:"0", notes:"", date:new Date().toISOString().split("T")[0] });
      fetchAll();
    } catch(err) { flash("❌ "+err.message); }
    setSaving(false);
  };

  const addPayment = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addDoc(collection(db,"clientPayments"), { clientId, amount:Number(pf.amount), method:pf.method, note:pf.note, date:pf.date, verified:pf.verified, createdAt:serverTimestamp() });
      await updateDoc(doc(db,"users",clientId), { totalPaid:(client?.totalPaid||0)+Number(pf.amount) });
      sendNotification({ toUserId:clientId, toRole:"client", title:"Payment Recorded ✅", body:`₹${Number(pf.amount).toLocaleString()} via ${pf.method} — Thank you!`, type:"payment" });
      setInvoice({
        invoiceNo:"DGH-P-"+Date.now().toString().slice(-6), type:"service",
        customerName:client?.coachingName||client?.ownerName||"",
        customerEmail:client?.email||"", customerPhone:client?.phone||"", customerAddress:client?.city||"",
        items:[{ desc:pf.note||"Service Payment", qty:1, rate:Number(pf.amount), amount:Number(pf.amount) }],
        subtotal:Number(pf.amount), total:Number(pf.amount),
        paymentMethod:pf.method, paymentId:pf.note||"", date:pf.date,
        status:pf.verified?"Paid":"Pending",
      });
      flash("✅ Payment recorded!");
      setPf({ amount:"0", method:"UPI", note:"", date:new Date().toISOString().split("T")[0], verified:true });
      fetchAll();
    } catch(err) { flash("❌ "+err.message); }
    setSaving(false);
  };

  const addFile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addDoc(collection(db,"clientFiles"), { clientId, title:ff.title, driveLink:ff.driveLink, type:ff.type, notes:ff.notes, createdAt:serverTimestamp() });
      sendNotification({ toUserId:clientId, toRole:"client", title:"📁 New File Ready!", body:`${ff.title} is available in your portal`, type:"file" });
      flash("✅ File shared!");
      setFf({ title:"", driveLink:"", type:"Google Drive Folder", notes:"" });
      fetchAll();
    } catch(err) { flash("❌ "+err.message); }
    setSaving(false);
  };

  const addOrder = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const total = Number(of_.quantity)*Number(of_.rate);
      await addDoc(collection(db,"orders"), { clientId, clientName:client?.coachingName||"", topic:of_.topic, type:of_.type, quantity:Number(of_.quantity), rate:Number(of_.rate), totalFee:total, driveLink:of_.driveLink, status:of_.status, notes:of_.notes, createdAt:serverTimestamp() });
      flash("✅ Order added!");
      setOf({ topic:"", type:"MCQ", quantity:"0", rate:"0", driveLink:"", status:"new", notes:"" });
      fetchAll();
    } catch(err) { flash("❌ "+err.message); }
    setSaving(false);
  };

  const updateOrderStatus = async (orderId, s, topic) => {
    await updateDoc(doc(db,"orders",orderId), { status:s, updatedAt:serverTimestamp() });
    sendNotification({ toUserId:clientId, toRole:"client", title:"Order Update", body:`"${topic}" is now ${s==="done"?"completed! ✅":s==="inprogress"?"in progress 🔄":s}`, type:"order" });
    waOrderStatusUpdate({ clientPhone:client?.phone, clientName:client?.ownerName||client?.coachingName, orderTopic:topic, status:s });
    fetchAll();
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", flexDirection:"column", gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${t.border}`, borderTopColor:t.gold, animation:"spin 1s linear infinite" }}/>
      <div style={{ color:t.muted, fontSize:".88rem" }}>Loading client data...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!client) return <div style={{ color:t.red, padding:20 }}>Client not found.</div>;

  const dues    = (client.totalBilled||0) - (client.totalPaid||0);
  const paidPct = client.totalBilled>0 ? Math.round((client.totalPaid/client.totalBilled)*100) : 0;
  const totalWork = entries.reduce((s,e)=>s+(e.totalFee||0), 0);
  const joinDate = client.createdAt?.seconds ? new Date(client.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "—";
  const upiLink = amt => `upi://pay?pa=dghelpmate@axl&pn=DG+HelpMate&am=${amt}&cu=INR&tn=${encodeURIComponent("Payment-"+client.coachingName)}`;

  if (invoice) return <Invoice data={invoice} onClose={()=>setInvoice(null)}/>;

  const card = { background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px 20px" };

  // Filtered lists
  const filteredEntries = entries.filter(e => {
    if (entryType!=="all" && e.type!==entryType) return false;
    if (entrySearch && !e.topic?.toLowerCase().includes(entrySearch.toLowerCase())) return false;
    return true;
  });
  const filteredPayments = payments.filter(p => {
    if (payMethod!=="all" && p.method!==payMethod) return false;
    if (paySearch && !(p.note||"").toLowerCase().includes(paySearch.toLowerCase())) return false;
    return true;
  });
  const filteredOrders = orders.filter(o => {
    if (orderStatus!=="all" && o.status!==orderStatus) return false;
    if (orderSearch && !o.topic?.toLowerCase().includes(orderSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight:"100vh", background:t.bg }}>
      <style>{`
        :root{--bg:${t.bg};--card:${t.bgCard};--bg2:${t.bgCard2};--bord:${t.border};--txt:${t.text};--mut:${t.muted};}
        *{box-sizing:border-box;} button,input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;}
        .cdp-hover:hover{background:${t.bgCard2}!important;border-color:${t.gold}!important;}
        @media(max-width:640px){.cdp-2col{grid-template-columns:1fr!important;}}
      `}</style>

      {/* Flash message */}
      {msg && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:msg.startsWith("✅")?"rgba(16,185,129,.15)":"rgba(239,68,68,.15)", border:`1px solid ${msg.startsWith("✅")?t.green:t.red}`, color:msg.startsWith("✅")?t.green:t.red, padding:"10px 28px", borderRadius:50, fontSize:".9rem", fontWeight:700, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,.2)" }}>{msg}</div>}

      {/* ── HERO HEADER ── */}
      <div style={{ background:`linear-gradient(135deg,${t.bgCard} 0%,${t.bg} 100%)`, borderBottom:`1px solid ${t.border}`, padding:"20px 24px 0" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:".84rem", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>
          ← Back to Clients
        </button>

        <div style={{ display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap", marginBottom:20 }}>
          {/* Avatar */}
          <div style={{ position:"relative", flexShrink:0 }}>
            {client.logoUrl
              ? <img src={client.logoUrl} style={{ width:72, height:72, borderRadius:16, objectFit:"cover", border:`3px solid ${t.gold}` }}/>
              : <div style={{ width:72, height:72, borderRadius:16, background:`linear-gradient(135deg,${t.accent},${t.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:"1.8rem", color:"#fff" }}>{(client.coachingName||"C")[0].toUpperCase()}</div>
            }
            <div style={{ position:"absolute", bottom:-4, right:-4, width:18, height:18, borderRadius:"50%", background:client.approved?"#10B981":"#F59E0B", border:`2px solid ${t.bg}` }}/>
          </div>

          {/* Info */}
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 }}>
              <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, margin:0 }}>{client.coachingName}</h2>
              <Badge s={client.role==="client"?"approved":client.role==="pending"?"pending":"approved"} t={t}/>
              {client.userType && <span style={{ fontSize:".72rem", background:"rgba(99,102,241,.15)", color:"#818CF8", padding:"2px 8px", borderRadius:50, fontWeight:700 }}>{client.userType==="student"?"🎓 Student":"🏫 Client"}</span>}
            </div>
            <div style={{ color:t.muted, fontSize:".85rem", marginBottom:8 }}>
              👤 {client.ownerName}
              {client.city && ` · 📍 ${client.city}`}
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {client.phone && <a href={`tel:${client.phone}`} style={{ fontSize:".82rem", color:t.accent, textDecoration:"none", fontWeight:600 }}>📞 {client.phone}</a>}
              {client.email && <a href={`mailto:${client.email}`} style={{ fontSize:".82rem", color:t.accent, textDecoration:"none", fontWeight:600 }}>📧 {client.email}</a>}
              {client.phone && <a href={`https://wa.me/${client.phone.replace(/\D/g,"")}`} target="_blank" style={{ fontSize:".82rem", color:"#25D366", textDecoration:"none", fontWeight:600 }}>💬 WhatsApp</a>}
            </div>
            <div style={{ fontSize:".75rem", color:t.muted, marginTop:6 }}>
              🗓️ Joined: {joinDate}
              {client.ytChannel && <span> · <a href={client.ytChannel} target="_blank" style={{ color:t.accent, textDecoration:"none" }}>📺 YouTube</a></span>}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignSelf:"flex-start" }}>
            {dues>0 && (
              <>
                <a href={upiLink(dues)} style={{ padding:"8px 14px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", borderRadius:9, fontWeight:700, fontSize:".82rem", textDecoration:"none" }}>💳 UPI ₹{dues.toLocaleString()}</a>
                <button onClick={()=>waPaymentReminder({ clientPhone:client.phone, clientName:client.ownerName, dueAmount:dues, coachingName:client.coachingName })} style={{ padding:"8px 14px", background:"#25D366", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:".82rem", cursor:"pointer", fontFamily:"inherit" }}>💬 WA Reminder</button>
              </>
            )}
            <button onClick={()=>setTab("💬 Chat")} style={{ padding:"8px 14px", background:t.bgCard2, border:`1px solid ${t.border}`, color:t.text, borderRadius:9, fontWeight:600, fontSize:".82rem", cursor:"pointer", fontFamily:"inherit" }}>💬 Chat</button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:10, marginBottom:16 }}>
          {[
            { icon:"💰", label:"Total Billed",  val:`₹${(client.totalBilled||0).toLocaleString()}`, color:t.text },
            { icon:"✅", label:"Total Paid",    val:`₹${(client.totalPaid||0).toLocaleString()}`,   color:t.green },
            { icon:"⚠️", label:"Balance Due",   val:`₹${Math.max(0,dues).toLocaleString()}`,       color:dues>0?t.red:t.green },
            { icon:"💼", label:"Work Entries",  val:entries.length,                                 color:t.accent },
            { icon:"📁", label:"Files Shared",  val:files.length,                                  color:t.gold },
            { icon:"📦", label:"Orders",        val:orders.length,                                 color:t.muted },
            { icon:"💳", label:"Payments",      val:payments.length,                               color:t.muted },
          ].map(s=>(
            <div key={s.label} style={{ background:t.bgCard2, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:"1.2rem", marginBottom:2 }}>{s.icon}</div>
              <div style={{ fontSize:"1.1rem", fontWeight:900, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:".65rem", color:t.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Payment progress bar */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:".74rem", color:t.muted, marginBottom:5 }}>
            <span>Payment Progress</span>
            <span style={{ color:t.gold, fontWeight:700 }}>{paidPct}% paid</span>
          </div>
          <div style={{ background:t.bgCard2, borderRadius:50, height:8, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${paidPct}%`, background:`linear-gradient(90deg,${t.green},${t.gold})`, borderRadius:50, transition:"width 1s" }}/>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none", gap:0 }}>
          {TABS.map(tn=>(
            <button key={tn} onClick={()=>setTab(tn)} style={{ background:"none", border:"none", padding:"12px 16px", whiteSpace:"nowrap", fontSize:".84rem", fontWeight:tab===tn?700:400, color:tab===tn?t.gold:t.muted, borderBottom:tab===tn?`3px solid ${t.gold}`:"3px solid transparent", cursor:"pointer", transition:"all .15s" }}>{tn}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"20px 24px", maxWidth:1200 }}>

        {/* ══ OVERVIEW ══ */}
        {tab==="📊 Overview" && (
          <div>
            {/* Timeline / Activity */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))", gap:16, marginBottom:20 }}>

              {/* Client info card */}
              <div style={card}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>👤 Client Details</h3>
                {[
                  ["🏢", "Coaching", client.coachingName],
                  ["👤", "Owner", client.ownerName],
                  ["📧", "Email", client.email],
                  ["📞", "Phone", client.phone],
                  ["📍", "City", client.city||"—"],
                  ["🗓️", "Joined", joinDate],
                  ["🔑", "Role", client.role||"—"],
                  ["✉️", "Email Verified", client.emailVerified?"Yes":"No"],
                ].map(([icon, label, val])=>val&&(
                  <div key={label} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <span style={{ fontSize:".9rem", flexShrink:0 }}>{icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:".7rem", color:t.muted, fontWeight:700 }}>{label}</div>
                      <div style={{ fontSize:".86rem", color:t.text }}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={card}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>⚡ Quick Actions</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <Btn variant="primary" onClick={()=>setTab("💼 Work")} style={{ width:"100%", justifyContent:"flex-start" }}>➕ Add Work Entry</Btn>
                  <Btn variant="green" onClick={()=>setTab("💰 Payments")} style={{ width:"100%", justifyContent:"flex-start" }}>💰 Record Payment</Btn>
                  <Btn variant="accent" onClick={()=>setTab("📁 Files")} style={{ width:"100%", justifyContent:"flex-start" }}>📁 Share Drive File</Btn>
                  <Btn variant="ghost" onClick={()=>setTab("📦 Orders")} style={{ width:"100%", justifyContent:"flex-start" }}>📦 Add / Update Order</Btn>
                  <Btn variant="ghost" onClick={()=>setTab("💬 Chat")} style={{ width:"100%", justifyContent:"flex-start" }}>💬 Chat with Client</Btn>
                  {dues>0 && (
                    <button onClick={()=>waPaymentReminder({ clientPhone:client.phone, clientName:client.ownerName, dueAmount:dues, coachingName:client.coachingName })} style={{ width:"100%", padding:"9px", background:"#25D366", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:".84rem", cursor:"pointer", fontFamily:"inherit" }}>
                      💬 Send ₹{dues.toLocaleString()} WhatsApp Reminder
                    </button>
                  )}
                </div>
              </div>

              {/* Recent work */}
              <div style={card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", margin:0 }}>💼 Recent Work</h3>
                  <span style={{ fontSize:".76rem", color:t.gold, fontWeight:700 }}>₹{totalWork.toLocaleString()} total</span>
                </div>
                {entries.slice(0,5).map(e=>(
                  <div key={e.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:".86rem", color:t.text }}>{e.topic}</div>
                      <div style={{ fontSize:".72rem", color:t.muted }}>{e.type} · ×{e.quantity} · {e.date}</div>
                    </div>
                    <div style={{ fontWeight:700, color:t.gold, flexShrink:0 }}>₹{(e.totalFee||0).toLocaleString()}</div>
                  </div>
                ))}
                {entries.length===0 && <p style={{ color:t.muted, fontSize:".85rem" }}>No entries yet.</p>}
                <button onClick={()=>setTab("💼 Work")} style={{ marginTop:10, background:"none", border:"none", color:t.accent, fontSize:".8rem", fontWeight:700, cursor:"pointer" }}>View all →</button>
              </div>

              {/* Payment summary */}
              <div style={card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", margin:0 }}>💰 Payments</h3>
                  <Badge s={dues<=0?"paid":dues<500?"partial":"due"} t={t}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                  {[["Billed",client.totalBilled||0,t.text],["Paid",client.totalPaid||0,t.green],["Dues",Math.max(0,dues),dues>0?t.red:t.green]].map(([l,v,c])=>(
                    <div key={l} style={{ background:t.bgCard2, borderRadius:9, padding:"10px", textAlign:"center" }}>
                      <div style={{ fontSize:".68rem", color:t.muted, marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:".95rem", fontWeight:900, color:c }}>₹{v.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                {payments.slice(0,4).map(p=>(
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:".88rem", color:t.green }}>₹{(p.amount||0).toLocaleString()}</div>
                      <div style={{ fontSize:".7rem", color:t.muted }}>{p.method} · {p.date}</div>
                    </div>
                    <Badge s={p.verified?"approved":"pending"} t={t}/>
                  </div>
                ))}
                {payments.length===0 && <p style={{ color:t.muted, fontSize:".85rem" }}>No payments yet.</p>}
                <button onClick={()=>setTab("💰 Payments")} style={{ marginTop:10, background:"none", border:"none", color:t.accent, fontSize:".8rem", fontWeight:700, cursor:"pointer" }}>View all →</button>
              </div>

              {/* Active orders */}
              <div style={{ ...card, gridColumn:"span 2" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", margin:0 }}>📦 Active Orders</h3>
                  <button onClick={()=>setTab("📦 Orders")} style={{ background:"none", border:"none", color:t.accent, fontSize:".8rem", fontWeight:700, cursor:"pointer" }}>View all →</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                  {orders.filter(o=>o.status!=="done"&&o.status!=="cancelled").slice(0,6).map(o=>(
                    <div key={o.id} className="cdp-hover" style={{ background:t.bgCard2, borderRadius:10, padding:"12px", border:`1px solid ${t.border}`, transition:"all .15s" }}>
                      <div style={{ fontWeight:700, color:t.text, fontSize:".86rem", marginBottom:4 }}>{o.topic}</div>
                      <div style={{ fontSize:".74rem", color:t.muted, marginBottom:8 }}>{o.type}{o.totalFee>0?` · ₹${o.totalFee.toLocaleString()}`:""}</div>
                      <Badge s={o.status||"new"} t={t}/>
                    </div>
                  ))}
                  {orders.filter(o=>o.status!=="done"&&o.status!=="cancelled").length===0 && (
                    <div style={{ color:t.muted, fontSize:".84rem", padding:"10px 0" }}>No active orders.</div>
                  )}
                </div>
              </div>

              {/* Shared files */}
              <div style={card}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", margin:0 }}>📁 Shared Files</h3>
                  <button onClick={()=>setTab("📁 Files")} style={{ background:"none", border:"none", color:t.accent, fontSize:".8rem", fontWeight:700, cursor:"pointer" }}>+ Add →</button>
                </div>
                {files.slice(0,4).map(f=>(
                  <div key={f.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:".86rem", color:t.text }}>{f.type?.includes("Folder")?"📁":f.type?.includes("PDF")?"📄":"📎"} {f.title}</div>
                      <div style={{ fontSize:".7rem", color:t.muted }}>{f.type}</div>
                    </div>
                    <a href={f.driveLink} target="_blank" style={{ fontSize:".8rem", color:t.accent, fontWeight:700, textDecoration:"none" }}>Open →</a>
                  </div>
                ))}
                {files.length===0 && <p style={{ color:t.muted, fontSize:".85rem" }}>No files shared yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══ WORK ENTRIES ══ */}
        {tab==="💼 Work" && (
          <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }} className="cdp-2col">
            <div style={card}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>➕ Add Work Entry</h3>
              <form onSubmit={addEntry}>
                <Inp label="Topic *" required value={we.topic} onChange={e=>setWe({...we,topic:e.target.value})} placeholder="e.g. Class 10 Hindi MCQ"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Sel label="Type" value={we.type} onChange={e=>setWe({...we,type:e.target.value})}>
                    {["MCQ","PPT","Test Paper","Thumbnail","Typing","Poster","SEO","Video","Bundle","Other"].map(x=><option key={x}>{x}</option>)}
                  </Sel>
                  <Inp label="Date" type="date" value={we.date} onChange={e=>setWe({...we,date:e.target.value})}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Inp label="Quantity" type="number" min="0" value={we.quantity} onChange={e=>setWe({...we,quantity:e.target.value})}/>
                  <Inp label="Rate ₹ per item" type="number" min="0" value={we.rate} onChange={e=>setWe({...we,rate:e.target.value})}/>
                </div>
                <div style={{ background:`${t.gold}12`, border:`1px solid ${t.gold}30`, borderRadius:9, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:".84rem", color:t.muted }}>Total Amount</span>
                  <span style={{ fontWeight:900, color:t.gold, fontSize:"1.1rem" }}>₹{(Number(we.quantity)*Number(we.rate)).toLocaleString()}</span>
                </div>
                <Txt label="Notes (optional)" rows={2} value={we.notes} onChange={e=>setWe({...we,notes:e.target.value})} placeholder="Any details..."/>
                <Btn type="submit" variant="primary" disabled={saving} style={{ width:"100%", padding:"11px" }}>{saving?"Saving...":"✅ Add Work Entry"}</Btn>
              </form>
            </div>

            <div>
              {/* Search + Filter */}
              <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                <input value={entrySearch} onChange={e=>setEntrySearch(e.target.value)} placeholder="🔍 Search topic..." style={{ flex:1, minWidth:160, padding:"8px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".86rem", color:t.text, outline:"none", fontFamily:"inherit" }}/>
                <select value={entryType} onChange={e=>setEntryType(e.target.value)} style={{ padding:"8px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".86rem", color:t.text, outline:"none", fontFamily:"inherit" }}>
                  <option value="all">All Types</option>
                  {["MCQ","PPT","Test Paper","Thumbnail","Typing","Poster","SEO","Video","Bundle","Other"].map(x=><option key={x}>{x}</option>)}
                </select>
                <div style={{ padding:"8px 14px", background:t.bgCard, borderRadius:9, fontSize:".84rem", color:t.gold, fontWeight:700, border:`1px solid ${t.border}` }}>
                  {filteredEntries.length} entries · ₹{filteredEntries.reduce((s,e)=>s+(e.totalFee||0),0).toLocaleString()}
                </div>
              </div>

              {filteredEntries.length===0
                ? <div style={{ ...card, textAlign:"center", padding:"40px", color:t.muted }}><div style={{ fontSize:"2rem", marginBottom:8 }}>💼</div>No entries found.</div>
                : filteredEntries.map(e=>(
                  <div key={e.id} className="cdp-hover" style={{ ...card, marginBottom:10, cursor:"default", transition:"all .15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color:t.text, marginBottom:4 }}>{e.topic}</div>
                        <div style={{ display:"flex", gap:12, fontSize:".75rem", color:t.muted, flexWrap:"wrap" }}>
                          <span>📂 {e.type}</span>
                          <span>×{e.quantity} items</span>
                          <span>@₹{e.rate}/item</span>
                          <span>📅 {e.date}</span>
                        </div>
                        {e.notes && <div style={{ fontSize:".76rem", color:t.muted, fontStyle:"italic", marginTop:4 }}>"{e.notes}"</div>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontWeight:900, color:t.gold, fontSize:"1.05rem" }}>₹{(e.totalFee||0).toLocaleString()}</div>
                        <button onClick={async()=>{ if(!confirm("Delete this entry?"))return; await deleteDoc(doc(db,"workEntries",e.id)); await updateDoc(doc(db,"users",clientId),{totalBilled:Math.max(0,(client.totalBilled||0)-(e.totalFee||0))}); fetchAll(); }} style={{ background:"none", border:"none", color:t.red, fontSize:".74rem", cursor:"pointer", marginTop:4 }}>🗑 Delete</button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══ PAYMENTS ══ */}
        {tab==="💰 Payments" && (
          <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }} className="cdp-2col">
            <div>
              <div style={card}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>➕ Record Payment</h3>
                <form onSubmit={addPayment}>
                  <Inp label="Amount ₹ *" type="number" required min="1" value={pf.amount} onChange={e=>setPf({...pf,amount:e.target.value})}/>
                  <Sel label="Payment Method" value={pf.method} onChange={e=>setPf({...pf,method:e.target.value})}>
                    {["UPI","Cash","Bank Transfer","PhonePe","GPay","Paytm","Razorpay","Other"].map(x=><option key={x}>{x}</option>)}
                  </Sel>
                  <Inp label="Date" type="date" value={pf.date} onChange={e=>setPf({...pf,date:e.target.value})}/>
                  <Inp label="UTR / Transaction Note" value={pf.note} onChange={e=>setPf({...pf,note:e.target.value})} placeholder="UTR number or reference"/>
                  <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12, color:t.muted, fontSize:".87rem", cursor:"pointer" }}>
                    <input type="checkbox" checked={pf.verified} onChange={e=>setPf({...pf,verified:e.target.checked})}/>
                    Mark as verified
                  </label>
                  <Btn type="submit" variant="green" disabled={saving} style={{ width:"100%", padding:"11px" }}>{saving?"Recording...":"✅ Record Payment"}</Btn>
                </form>
              </div>

              {dues>0 && (
                <div style={{ ...card, marginTop:14, background:`${t.gold}08`, border:`1px solid ${t.gold}30` }}>
                  <div style={{ fontWeight:700, color:t.text, marginBottom:10, fontSize:".9rem" }}>📱 Request Payment</div>
                  <div style={{ fontSize:".82rem", color:t.muted, marginBottom:10 }}>Outstanding: <strong style={{ color:t.red }}>₹{dues.toLocaleString()}</strong></div>
                  <a href={upiLink(dues)} style={{ display:"block", textAlign:"center", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", padding:"10px", borderRadius:9, fontWeight:800, textDecoration:"none", marginBottom:8, fontSize:".88rem" }}>💳 UPI Link — ₹{dues.toLocaleString()}</a>
                  <button onClick={()=>waPaymentReminder({ clientPhone:client.phone, clientName:client.ownerName, dueAmount:dues, coachingName:client.coachingName })} style={{ width:"100%", padding:"10px", background:"#25D366", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:".88rem", cursor:"pointer", fontFamily:"inherit" }}>💬 WhatsApp Reminder</button>
                </div>
              )}
            </div>

            <div>
              {/* Summary */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                {[["💰 Billed",client.totalBilled||0,t.text],["✅ Paid",client.totalPaid||0,t.green],["⚠️ Dues",Math.max(0,dues),dues>0?t.red:t.green]].map(([l,v,c])=>(
                  <div key={l} style={{ ...card, textAlign:"center" }}>
                    <div style={{ fontSize:".74rem", color:t.muted, marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:"1.4rem", fontWeight:900, color:c }}>₹{v.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                <input value={paySearch} onChange={e=>setPaySearch(e.target.value)} placeholder="🔍 Search UTR/note..." style={{ flex:1, minWidth:140, padding:"8px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".86rem", color:t.text, outline:"none", fontFamily:"inherit" }}/>
                <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} style={{ padding:"8px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".86rem", color:t.text, outline:"none", fontFamily:"inherit" }}>
                  <option value="all">All Methods</option>
                  {["UPI","Cash","Bank Transfer","PhonePe","GPay","Paytm","Razorpay","Other"].map(x=><option key={x}>{x}</option>)}
                </select>
                <div style={{ padding:"8px 14px", background:t.bgCard, borderRadius:9, fontSize:".84rem", color:t.green, fontWeight:700, border:`1px solid ${t.border}` }}>
                  {filteredPayments.length} payments · ₹{filteredPayments.reduce((s,p)=>s+(p.amount||0),0).toLocaleString()}
                </div>
              </div>

              {filteredPayments.length===0
                ? <div style={{ ...card, textAlign:"center", padding:"40px", color:t.muted }}><div style={{ fontSize:"2rem", marginBottom:8 }}>💳</div>No payments found.</div>
                : filteredPayments.map(p=>(
                  <div key={p.id} className="cdp-hover" style={{ ...card, marginBottom:10, transition:"all .15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                          <span style={{ fontWeight:900, color:t.green, fontSize:"1.1rem" }}>₹{(p.amount||0).toLocaleString()}</span>
                          <Badge s={p.verified?"approved":"pending"} t={t}/>
                        </div>
                        <div style={{ display:"flex", gap:12, fontSize:".75rem", color:t.muted, flexWrap:"wrap" }}>
                          <span>💳 {p.method}</span>
                          <span>📅 {p.date}</span>
                          {p.note && <span>🔖 {p.note}</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                        {!p.verified && <Btn variant="green" onClick={()=>updateDoc(doc(db,"clientPayments",p.id),{verified:true}).then(fetchAll)} style={{ padding:"4px 10px", fontSize:".74rem" }}>✓ Verify</Btn>}
                        <button onClick={()=>setInvoice({
                          invoiceNo:"DGH-P-"+(p.id||"").slice(-6), type:"service",
                          customerName:client.coachingName||client.ownerName||"",
                          customerEmail:client.email||"", customerPhone:client.phone||"", customerAddress:client.city||"",
                          items:[{desc:p.note||"Service Payment",qty:1,rate:p.amount,amount:p.amount}],
                          subtotal:p.amount, total:p.amount, paymentMethod:p.method, paymentId:p.note||"", date:p.date, status:p.verified?"Paid":"Pending",
                        })} style={{ background:"none", border:`1px solid ${t.border}`, color:t.muted, padding:"4px 10px", borderRadius:7, fontSize:".74rem", cursor:"pointer", fontFamily:"inherit" }}>🧾</button>
                        <button onClick={async()=>{ if(!confirm("Delete?"))return; await deleteDoc(doc(db,"clientPayments",p.id)); await updateDoc(doc(db,"users",clientId),{totalPaid:Math.max(0,(client.totalPaid||0)-(p.amount||0))}); fetchAll(); }} style={{ background:"none", border:"none", color:t.red, fontSize:".82rem", cursor:"pointer" }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══ FILES ══ */}
        {tab==="📁 Files" && (
          <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }} className="cdp-2col">
            <div style={card}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>📁 Share Drive Link</h3>
              <form onSubmit={addFile}>
                <Inp label="File Title *" required value={ff.title} onChange={e=>setFf({...ff,title:e.target.value})} placeholder="e.g. Class 10 Hindi MCQ Pack"/>
                <Sel label="File Type" value={ff.type} onChange={e=>setFf({...ff,type:e.target.value})}>
                  {["Google Drive Folder","PDF File","PPT File","Word Doc","ZIP File","Google Sheet","Other"].map(x=><option key={x}>{x}</option>)}
                </Sel>
                <Inp label="Google Drive Link *" required value={ff.driveLink} onChange={e=>setFf({...ff,driveLink:e.target.value})} placeholder="https://drive.google.com/..."/>
                <Txt label="Notes (optional)" rows={2} value={ff.notes} onChange={e=>setFf({...ff,notes:e.target.value})} placeholder="Any instructions..."/>
                <div style={{ background:`${t.accent}10`, borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:".78rem", color:t.muted }}>
                  💡 Google Drive → Share → "Anyone with the link can view"
                </div>
                <Btn type="submit" variant="accent" disabled={saving} style={{ width:"100%", padding:"11px" }}>{saving?"Sharing...":"📤 Share with Client"}</Btn>
              </form>
            </div>
            <div>
              <div style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>Shared Files ({files.length})</div>
              {files.length===0
                ? <div style={{ ...card, textAlign:"center", padding:"40px", color:t.muted }}><div style={{ fontSize:"2rem", marginBottom:8 }}>📁</div>No files shared yet.</div>
                : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
                    {files.map(f=>(
                      <div key={f.id} className="cdp-hover" style={{ ...card, transition:"all .15s" }}>
                        <div style={{ fontSize:"1.8rem", marginBottom:8 }}>{f.type?.includes("Folder")?"📁":f.type?.includes("PDF")?"📄":f.type?.includes("PPT")?"📊":"📎"}</div>
                        <div style={{ fontWeight:700, color:t.text, marginBottom:3, fontSize:".9rem" }}>{f.title}</div>
                        <div style={{ fontSize:".74rem", color:t.muted, marginBottom:f.notes?6:10 }}>{f.type}</div>
                        {f.notes && <div style={{ fontSize:".74rem", color:t.muted, fontStyle:"italic", marginBottom:10 }}>"{f.notes}"</div>}
                        <div style={{ display:"flex", gap:8 }}>
                          <a href={f.driveLink} target="_blank" style={{ flex:1, display:"block", textAlign:"center", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", padding:"7px", borderRadius:8, fontWeight:700, fontSize:".82rem", textDecoration:"none" }}>📂 Open</a>
                          <button onClick={async()=>{ if(!confirm("Remove?"))return; await deleteDoc(doc(db,"clientFiles",f.id)); fetchAll(); }} style={{ background:"rgba(239,68,68,.15)", border:"none", color:"#EF4444", padding:"7px 10px", borderRadius:8, cursor:"pointer", fontSize:".82rem" }}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ══ ORDERS ══ */}
        {tab==="📦 Orders" && (
          <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }} className="cdp-2col">
            <div style={card}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>➕ Add Order</h3>
              <form onSubmit={addOrder}>
                <Inp label="Topic *" required value={of_.topic} onChange={e=>setOf({...of_,topic:e.target.value})} placeholder="e.g. Class 10 MCQ Set"/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Sel label="Type" value={of_.type} onChange={e=>setOf({...of_,type:e.target.value})}>
                    {["MCQ","PPT","Test Paper","Thumbnail","Typing","Poster","SEO","Bundle","Other"].map(x=><option key={x}>{x}</option>)}
                  </Sel>
                  <Sel label="Status" value={of_.status} onChange={e=>setOf({...of_,status:e.target.value})}>
                    {ORDER_STATUSES.map(s=><option key={s.s} value={s.s}>{s.label}</option>)}
                  </Sel>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Inp label="Quantity" type="number" value={of_.quantity} onChange={e=>setOf({...of_,quantity:e.target.value})}/>
                  <Inp label="Rate ₹" type="number" value={of_.rate} onChange={e=>setOf({...of_,rate:e.target.value})}/>
                </div>
                <div style={{ background:`${t.gold}12`, borderRadius:9, padding:"9px 12px", marginBottom:10, display:"flex", justifyContent:"space-between", fontSize:".84rem" }}>
                  <span style={{ color:t.muted }}>Total</span>
                  <span style={{ fontWeight:900, color:t.gold }}>₹{(Number(of_.quantity)*Number(of_.rate)).toLocaleString()}</span>
                </div>
                <Inp label="Drive Link (optional)" value={of_.driveLink} onChange={e=>setOf({...of_,driveLink:e.target.value})} placeholder="https://drive.google.com/..."/>
                <Txt label="Notes" rows={2} value={of_.notes} onChange={e=>setOf({...of_,notes:e.target.value})}/>
                <Btn type="submit" variant="primary" disabled={saving} style={{ width:"100%", padding:"11px" }}>{saving?"Saving...":"📦 Add Order"}</Btn>
              </form>
            </div>

            <div>
              {/* Filters */}
              <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                <input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="🔍 Search orders..." style={{ flex:1, minWidth:160, padding:"8px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".86rem", color:t.text, outline:"none", fontFamily:"inherit" }}/>
                <select value={orderStatus} onChange={e=>setOrderStatus(e.target.value)} style={{ padding:"8px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".86rem", color:t.text, outline:"none", fontFamily:"inherit" }}>
                  <option value="all">All Status</option>
                  {ORDER_STATUSES.map(s=><option key={s.s} value={s.s}>{s.label}</option>)}
                </select>
                <div style={{ padding:"8px 14px", background:t.bgCard, borderRadius:9, fontSize:".84rem", color:t.muted, fontWeight:600, border:`1px solid ${t.border}` }}>
                  {filteredOrders.length} orders
                </div>
              </div>

              {filteredOrders.length===0
                ? <div style={{ ...card, textAlign:"center", padding:"40px", color:t.muted }}><div style={{ fontSize:"2rem", marginBottom:8 }}>📦</div>No orders found.</div>
                : filteredOrders.map(o=>(
                  <div key={o.id} className="cdp-hover" style={{ ...card, marginBottom:12, transition:"all .15s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, color:t.text, fontSize:".92rem", marginBottom:4 }}>{o.topic}</div>
                        <div style={{ display:"flex", gap:10, fontSize:".75rem", color:t.muted, flexWrap:"wrap" }}>
                          <span>📂 {o.type}</span>
                          {o.quantity>0 && <span>×{o.quantity}</span>}
                          {o.totalFee>0 && <span style={{ color:t.gold, fontWeight:700 }}>₹{o.totalFee.toLocaleString()}</span>}
                          {o.createdAt?.seconds && <span>📅 {new Date(o.createdAt.seconds*1000).toLocaleDateString("en-IN")}</span>}
                        </div>
                        {o.notes && <div style={{ fontSize:".75rem", color:t.muted, fontStyle:"italic", marginTop:4 }}>"{o.notes}"</div>}
                      </div>
                      <Badge s={o.status||"new"} t={t}/>
                    </div>

                    {/* Status buttons */}
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                      {ORDER_STATUSES.map(({s,label,col,tc})=>(
                        <button key={s} onClick={()=>updateOrderStatus(o.id,s,o.topic)} style={{
                          padding:"4px 10px", borderRadius:50, border:"none", cursor:"pointer",
                          background:o.status===s?col:t.bgCard2,
                          color:o.status===s?tc:t.muted,
                          fontWeight:o.status===s?700:400,
                          fontSize:".72rem", fontFamily:"inherit",
                          outline:o.status===s?`1px solid ${tc}`:"none",
                        }}>{label}</button>
                      ))}
                    </div>

                    {/* Drive link */}
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input defaultValue={o.driveLink||""} placeholder="📁 Paste drive link & press Enter..."
                        style={{ flex:1, padding:"6px 10px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, fontSize:".78rem", color:t.text, fontFamily:"inherit", outline:"none" }}
                        onBlur={async(e)=>{
                          if(e.target.value!==o.driveLink){
                            await updateDoc(doc(db,"orders",o.id),{ driveLink:e.target.value, status:"done", updatedAt:serverTimestamp() });
                            if(e.target.value){
                              sendNotification({ toUserId:clientId, toRole:"client", title:"📁 File Ready!", body:`Your "${o.topic}" file is ready to download!`, type:"file" });
                              waFileDelivered({ clientPhone:client?.phone, clientName:client?.ownerName||client?.coachingName, fileTitle:o.topic, driveLink:e.target.value });
                            }
                            fetchAll();
                          }
                        }}/>
                      {o.driveLink && <a href={o.driveLink} target="_blank" style={{ padding:"6px 12px", background:t.accent, color:"#fff", borderRadius:8, fontWeight:700, fontSize:".78rem", textDecoration:"none", whiteSpace:"nowrap" }}>📁 Open</a>}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══ CHAT ══ */}
        {tab==="💬 Chat" && (
          <div>
            <h3 style={{ fontWeight:700, color:t.text, marginBottom:14 }}>💬 Chat with {client.coachingName}</h3>
            <div style={{ ...card, height:520 }}>
              <ChatWidget chatId={clientId} isAdmin={true} t={t}/>
            </div>
          </div>
        )}

        {/* ══ PROFILE ══ */}
        {tab==="👤 Profile" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,400px),1fr))", gap:20 }}>
            <div style={card}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>✏️ Edit Client Info</h3>
              {[
                {l:"Coaching Name", k:"coachingName"},
                {l:"Owner Name",    k:"ownerName"},
                {l:"Email",         k:"email"},
                {l:"Phone",         k:"phone"},
                {l:"City",          k:"city"},
                {l:"State",         k:"state"},
                {l:"YouTube Channel",k:"ytChannel"},
                {l:"Website",       k:"website"},
              ].map(({l,k})=>(
                <Inp key={k} label={l} value={prof[k]||""} onChange={e=>setProf({...prof,[k]:e.target.value})}/>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Inp label="Total Billed ₹" type="number" value={prof.totalBilled||0} onChange={e=>setProf({...prof,totalBilled:Number(e.target.value)})}/>
                <Inp label="Total Paid ₹"   type="number" value={prof.totalPaid||0}   onChange={e=>setProf({...prof,totalPaid:Number(e.target.value)})}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", display:"block", marginBottom:4 }}>Role</label>
                  <select value={prof.role||"pending"} onChange={e=>setProf({...prof,role:e.target.value})} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none" }}>
                    {["pending","client","student","admin"].map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", display:"block", marginBottom:4 }}>Approved</label>
                  <select value={prof.approved?"yes":"no"} onChange={e=>setProf({...prof,approved:e.target.value==="yes"})} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none" }}>
                    <option value="yes">✅ Yes</option>
                    <option value="no">⏳ No</option>
                  </select>
                </div>
              </div>
              <Btn variant="primary" onClick={async()=>{ setSaving(true); try{ await updateDoc(doc(db,"users",clientId),prof); flash("✅ Profile saved!"); fetchAll(); }catch(e){flash("❌ "+e.message);} setSaving(false); }} disabled={saving} style={{ width:"100%", padding:"12px" }}>
                {saving?"Saving...":"💾 Save Changes"}
              </Btn>
            </div>

            <div style={card}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>📊 Account Summary</h3>
              {[
                ["🗓️ Joined", joinDate],
                ["📧 Email", client.email],
                ["🔑 Role", client.role],
                ["✉️ Email Verified", client.emailVerified?"✅ Yes":"❌ No"],
                ["✅ Account Approved", client.approved?"✅ Yes":"⏳ Pending"],
                ["🆔 User ID", client.uid||client.id],
                ["💼 Work Entries", entries.length+" entries"],
                ["💰 Total Revenue", `₹${(client.totalBilled||0).toLocaleString()} billed`],
              ].map(([label, val])=>(
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${t.border}40` }}>
                  <span style={{ fontSize:".82rem", color:t.muted }}>{label}</span>
                  <span style={{ fontSize:".82rem", color:t.text, fontWeight:600, maxWidth:200, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}