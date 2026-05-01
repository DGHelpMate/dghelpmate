// src/pages/admin/ServiceAdmin.jsx — Full Service Management Panel
import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, onSnapshot, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";

const CATEGORIES = ["Content Creation","Design Services","Digital & Channel"];
const EMPTY = {
  category:"Content Creation", color:"#6366F1",
  icon:"❓", title:"", badge:"", desc:"", fullDesc:"",
  pricing:[["",""]],
  quickPay:[{label:"",amount:""}],
  timeline:"", process:["","","",""],
  requirements:["","","",""],
  requireDocs:true,
  demoImages:[], demoUrl:"",
  rating:5.0, active:true,
};
const CAT_COLORS = {"Content Creation":"#6366F1","Design Services":"#F59E0B","Digital & Channel":"#10B981"};

export default function ServiceAdmin({ t }) {
  const [services, setServices] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("list");
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [uploading, setUploading] = useState("");
  const [search, setSearch]     = useState("");

  const showMsg = (m) => { setMsg(m); setTimeout(()=>setMsg(""),3500); };

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db,"services"), orderBy("createdAt","desc")),
      snap => { setServices(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (tab !== "orders") return;
    getDocs(query(collection(db,"purchases"), where("itemType","==","service"), orderBy("createdAt","desc")))
      .then(snap => setOrders(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(()=>{});
  }, [tab]);

  const startEdit = (s) => {
    setForm({
      ...s,
      pricing: s.pricing?.length ? s.pricing : [["",""]],
      quickPay: s.quickPay?.length ? s.quickPay.map(p=>({...p,amount:String(p.amount)})) : [{label:"",amount:""}],
      process: s.process?.length ? s.process : ["","","",""],
      requirements: s.requirements?.length ? s.requirements : ["","",""],
      demoImages: s.demoImages || [],
    });
    setEditId(s.id);
    setTab("form");
  };

  const resetForm = () => { setForm({...EMPTY}); setEditId(null); };

  const handleSave = async () => {
    if (!form.title.trim()) { showMsg("❌ Title required!"); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        color: CAT_COLORS[form.category] || form.color,
        pricing: form.pricing.filter(([l])=>l.trim()),
        quickPay: form.quickPay.filter(p=>p.label.trim()).map(p=>({...p, amount:Number(p.amount)})),
        process: form.process.filter(s=>s.trim()),
        requirements: form.requirements.filter(r=>r.trim()),
        updatedAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db,"services",editId), data);
        showMsg("✅ Service updated!");
      } else {
        await addDoc(collection(db,"services"), { ...data, orders:0, reviews:0, rating:5.0, createdAt:serverTimestamp() });
        showMsg("✅ Service created!");
      }
      resetForm(); setTab("list");
    } catch(e) { showMsg("❌ Error: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    await deleteDoc(doc(db,"services",id));
    showMsg("✅ Deleted!");
  };

  const handleToggle = async (id, current) => {
    await updateDoc(doc(db,"services",id),{active:!current});
    setServices(prev=>prev.map(s=>s.id===id?{...s,active:!current}:s));
  };

  const uploadDemoImage = async (file) => {
    if (!file) return;
    setUploading("demo");
    try {
      const r = ref(storage, `services/demos/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setForm(f=>({...f, demoImages:[...(f.demoImages||[]), url]}));
      showMsg("✅ Demo image uploaded!");
    } catch(e) { showMsg("❌ Upload failed"); }
    setUploading("");
  };

  const markComplete = async (orderId) => {
    await updateDoc(doc(db,"purchases",orderId),{status:"completed",completedAt:serverTimestamp()});
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:"completed"}:o));
    showMsg("✅ Marked as completed!");
  };

  const inp  = { width:"100%", padding:"9px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, fontSize:".86rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl  = { fontSize:".7rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 };
  const card = { background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px" };

  const filteredSvcs = services.filter(s=>!search||s.title.toLowerCase().includes(search.toLowerCase()));

  const stats = { total:services.length, active:services.filter(s=>s.active).length, orders:orders.length };

  return (
    <div style={{ padding:24, maxWidth:1000, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:4 }}>🛠️ Service Manager</h2>
          <p style={{ color:t.muted, fontSize:".86rem" }}>Manage services, demos, pricing & orders</p>
        </div>
        <button onClick={()=>{ resetForm(); setTab("form"); }}
          style={{ padding:"10px 20px", background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Add Service
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[["🛠️","Total Services",services.length,t.accent],["✅","Active",services.filter(s=>s.active).length,"#10B981"],["📋","Orders",orders.length,t.gold]].map(([icon,label,val,color])=>(
          <div key={label} style={{ ...card, textAlign:"center" }}>
            <div style={{ fontSize:"1.5rem", fontWeight:900, color }}>{val}</div>
            <div style={{ fontSize:".74rem", color:t.muted, marginTop:2 }}>{icon} {label}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ padding:"10px 16px", borderRadius:9, marginBottom:16, fontSize:".86rem", background:msg.startsWith("✅")?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)", color:msg.startsWith("✅")?t.green:"#EF4444", border:`1px solid ${msg.startsWith("✅")?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}` }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {[["list","🛠️ Services"],["orders","📋 Orders"],["form",editId?"✏️ Edit":"➕ Add"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ if(id!=="form") resetForm(); setTab(id); }}
            style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${tab===id?"#6366F1":t.border}`, background:tab===id?"rgba(99,102,241,.12)":"none", color:tab===id?"#6366F1":t.muted, fontWeight:tab===id?700:400, cursor:"pointer", fontFamily:"inherit", fontSize:".84rem" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LIST ── */}
      {tab === "list" && (
        <div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search services..."
            style={{ ...inp, maxWidth:360, marginBottom:16 }}/>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>Loading...</div>
          ) : filteredSvcs.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>No services yet. Add your first service!</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredSvcs.map(s => (
                <div key={s.id} style={{ ...card, display:"flex", alignItems:"center", gap:14, opacity:s.active?1:.6, flexWrap:"wrap" }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:`${CAT_COLORS[s.category]||s.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>
                    {s.icon}
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                      <span style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>{s.title}</span>
                      {s.badge && <span style={{ padding:"1px 7px", borderRadius:10, fontSize:".63rem", fontWeight:700, background:`${CAT_COLORS[s.category]||s.color}18`, color:CAT_COLORS[s.category]||s.color }}>{s.badge}</span>}
                    </div>
                    <div style={{ fontSize:".74rem", color:t.muted }}>
                      {s.category} · ⏱ {s.timeline}
                      {s.demoUrl && <span style={{ marginLeft:8, color:"#6366F1", fontWeight:600 }}>🌐 Demo</span>}
                      {(s.demoImages||[]).length > 0 && <span style={{ marginLeft:8, color:t.gold, fontWeight:600 }}>🖼 {s.demoImages.length} images</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>handleToggle(s.id,s.active)}
                      style={{ padding:"5px 11px", borderRadius:7, border:`1px solid ${s.active?"rgba(16,185,129,.3)":"rgba(239,68,68,.3)"}`, background:s.active?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)", color:s.active?t.green:"#EF4444", fontWeight:700, fontSize:".73rem", cursor:"pointer", fontFamily:"inherit" }}>
                      {s.active?"Active":"Off"}
                    </button>
                    <button onClick={()=>startEdit(s)}
                      style={{ padding:"5px 11px", borderRadius:7, border:`1px solid ${t.border}`, background:t.bgCard2, color:t.muted, fontWeight:700, fontSize:".73rem", cursor:"pointer", fontFamily:"inherit" }}>
                      Edit
                    </button>
                    <button onClick={()=>handleDelete(s.id,s.title)}
                      style={{ padding:"5px 9px", borderRadius:7, border:"1px solid rgba(239,68,68,.25)", background:"rgba(239,68,68,.1)", color:"#EF4444", cursor:"pointer", fontFamily:"inherit", fontSize:".76rem" }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>No service orders yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {orders.map(o => (
                <div key={o.id} style={{ ...card }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:t.text, fontSize:".9rem", marginBottom:3 }}>{o.itemName}</div>
                      <div style={{ fontSize:".74rem", color:t.muted }}>
                        👤 {o.userName} · 📧 {o.userEmail}
                      </div>
                      {o.note && <div style={{ fontSize:".76rem", color:t.muted, marginTop:4, padding:"5px 9px", background:t.bgCard2, borderRadius:6 }}>💬 {o.note}</div>}
                      {(o.uploadedFiles||[]).length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                          {o.uploadedFiles.map((f,i) => (
                            <a key={i} href={f.url} target="_blank" rel="noreferrer"
                              style={{ padding:"3px 10px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:20, fontSize:".72rem", color:t.accent, textDecoration:"none" }}>
                              📎 {f.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                      <span style={{ fontWeight:800, color:t.gold }}>₹{o.amount?.toLocaleString()}</span>
                      <span style={{ padding:"4px 10px", borderRadius:20, fontSize:".7rem", fontWeight:700,
                        background: o.status==="completed"?"rgba(16,185,129,.15)":"rgba(245,158,11,.15)",
                        color: o.status==="completed"?t.green:t.gold }}>
                        {o.status==="completed"?"✅ Done":"⏳ Pending"}
                      </span>
                      {o.status !== "completed" && (
                        <button onClick={()=>markComplete(o.id)}
                          style={{ padding:"5px 12px", background:"rgba(16,185,129,.15)", border:"1px solid rgba(16,185,129,.3)", borderRadius:7, color:t.green, fontWeight:700, fontSize:".74rem", cursor:"pointer", fontFamily:"inherit" }}>
                          ✓ Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FORM ── */}
      {tab === "form" && (
        <div style={{ ...card }}>
          <h3 style={{ fontWeight:700, color:t.text, marginBottom:20, fontSize:"1rem" }}>
            {editId ? "Edit Service" : "Add New Service"}
          </h3>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Service Title *</label>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. MCQ / Question Bank" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Icon (emoji)</label>
              <input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="❓" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Badge (optional)</label>
              <input value={form.badge} onChange={e=>setForm({...form,badge:e.target.value})} placeholder="Most Popular / High Demand" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Category *</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value,color:CAT_COLORS[e.target.value]})} style={inp}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Delivery Timeline</label>
              <input value={form.timeline} onChange={e=>setForm({...form,timeline:e.target.value})} placeholder="e.g. 2–5 working days" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Short Description</label>
              <input value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="One line description" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Demo Website URL</label>
              <input value={form.demoUrl} onChange={e=>setForm({...form,demoUrl:e.target.value})} placeholder="https://thumbnails.dghelpmate.com" style={inp}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Full Description</label>
              <textarea value={form.fullDesc} onChange={e=>setForm({...form,fullDesc:e.target.value})} rows={3} placeholder="Detailed description shown in modal..." style={{...inp,resize:"vertical"}}/>
            </div>
          </div>

          {/* Pricing rows */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Pricing Table</label>
            {form.pricing.map(([label,price],i)=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, marginBottom:7 }}>
                <input value={label} onChange={e=>{ const p=[...form.pricing]; p[i]=[e.target.value,p[i][1]]; setForm({...form,pricing:p}); }} placeholder="Label" style={inp}/>
                <input value={price} onChange={e=>{ const p=[...form.pricing]; p[i]=[p[i][0],e.target.value]; setForm({...form,pricing:p}); }} placeholder="₹price" style={inp}/>
                <button onClick={()=>setForm({...form,pricing:form.pricing.filter((_,j)=>j!==i)})} style={{ padding:"8px 12px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, color:"#EF4444", cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,pricing:[...form.pricing,["",""]]})}
              style={{ padding:"6px 14px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".82rem" }}>
              + Add Row
            </button>
          </div>

          {/* Quick pay packages */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Quick Pay Packages</label>
            {form.quickPay.map((pkg,i)=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 120px auto", gap:8, marginBottom:7 }}>
                <input value={pkg.label} onChange={e=>{ const q=[...form.quickPay]; q[i]={...q[i],label:e.target.value}; setForm({...form,quickPay:q}); }} placeholder="Package name" style={inp}/>
                <input type="number" value={pkg.amount} onChange={e=>{ const q=[...form.quickPay]; q[i]={...q[i],amount:e.target.value}; setForm({...form,quickPay:q}); }} placeholder="Amount ₹" style={inp}/>
                <button onClick={()=>setForm({...form,quickPay:form.quickPay.filter((_,j)=>j!==i)})} style={{ padding:"8px 12px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, color:"#EF4444", cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,quickPay:[...form.quickPay,{label:"",amount:""}]})}
              style={{ padding:"6px 14px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".82rem" }}>
              + Add Package
            </button>
          </div>

          {/* Process steps */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Process Steps (How it works)</label>
            {form.process.map((step,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:7, alignItems:"center" }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(99,102,241,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".78rem", fontWeight:900, color:"#6366F1", flexShrink:0 }}>{i+1}</div>
                <input value={step} onChange={e=>{ const p=[...form.process]; p[i]=e.target.value; setForm({...form,process:p}); }} placeholder={`Step ${i+1}...`} style={{...inp,flex:1}}/>
                <button onClick={()=>setForm({...form,process:form.process.filter((_,j)=>j!==i)})} style={{ padding:"8px 12px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, color:"#EF4444", cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,process:[...form.process,""]})}
              style={{ padding:"6px 14px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".82rem" }}>
              + Add Step
            </button>
          </div>

          {/* Requirements */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>What Client Needs to Provide</label>
            {form.requirements.map((req,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:7 }}>
                <input value={req} onChange={e=>{ const r=[...form.requirements]; r[i]=e.target.value; setForm({...form,requirements:r}); }} placeholder={`Requirement ${i+1}...`} style={{...inp,flex:1}}/>
                <button onClick={()=>setForm({...form,requirements:form.requirements.filter((_,j)=>j!==i)})} style={{ padding:"8px 12px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, color:"#EF4444", cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,requirements:[...form.requirements,""]})}
              style={{ padding:"6px 14px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".82rem" }}>
              + Add Requirement
            </button>
          </div>

          {/* Demo images upload */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Demo Sample Images</label>
            <label style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", fontSize:".84rem", color:t.muted, marginBottom:10 }}>
              {uploading==="demo" ? "Uploading..." : "🖼 Upload Demo Image"}
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>e.target.files[0]&&uploadDemoImage(e.target.files[0])}/>
            </label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {(form.demoImages||[]).map((img,i)=>(
                <div key={i} style={{ position:"relative", width:80, height:60, borderRadius:8, overflow:"hidden", border:`1px solid ${t.border}` }}>
                  <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  <button onClick={()=>setForm({...form,demoImages:form.demoImages.filter((_,j)=>j!==i)})}
                    style={{ position:"absolute", top:2, right:2, background:"rgba(0,0,0,.6)", border:"none", color:"#fff", width:18, height:18, borderRadius:"50%", cursor:"pointer", fontSize:".7rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Require docs toggle */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <input type="checkbox" id="reqDocs" checked={form.requireDocs} onChange={e=>setForm({...form,requireDocs:e.target.checked})} style={{ width:16, height:16 }}/>
            <label htmlFor="reqDocs" style={{ fontSize:".88rem", color:t.text, cursor:"pointer" }}>Allow document upload when ordering (syllabus, notes etc.)</label>
          </div>

          {/* Active */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <input type="checkbox" id="active" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} style={{ width:16, height:16 }}/>
            <label htmlFor="active" style={{ fontSize:".88rem", color:t.text, cursor:"pointer" }}>Active (visible on website)</label>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"11px 28px", background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Saving..." : editId ? "Update Service" : "Create Service"}
            </button>
            <button onClick={()=>{ resetForm(); setTab("list"); }}
              style={{ padding:"11px 20px", background:"none", border:`1px solid ${t.border}`, borderRadius:10, color:t.muted, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}