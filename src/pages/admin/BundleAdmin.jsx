// src/pages/admin/BundleAdmin.jsx — Full Bundle Management Panel
import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, where, onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";

const EMPTY_BUNDLE = {
  title: "", category: "Class 10", type: "general",
  price: "", originalPrice: "", description: "",
  features: [""], cover: "", files: [], active: true,
};

const CATEGORIES = ["Class 10", "Class 11", "Class 12", "Competitive", "Custom", "Other"];

export default function BundleAdmin({ t }) {
  const [bundles, setBundles]     = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("bundles"); // bundles | orders | add
  const [form, setForm]           = useState(EMPTY_BUNDLE);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState("");

  // Load bundles
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "bundles"), orderBy("createdAt", "desc")),
      snap => { setBundles(snap.docs.map(d => ({ id:d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  // Load orders/purchases
  useEffect(() => {
    if (tab !== "orders") return;
    getDocs(query(collection(db, "purchases"), where("itemType","==","bundle"), orderBy("createdAt","desc")))
      .then(snap => setOrders(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
      .catch(()=>{});
  }, [tab]);

  const showMsg = (m) => { setMsg(m); setTimeout(()=>setMsg(""), 3000); };

  const startEdit = (b) => {
    setForm({ ...b, features: b.features?.length ? b.features : [""] });
    setEditId(b.id);
    setTab("add");
  };

  const resetForm = () => { setForm(EMPTY_BUNDLE); setEditId(null); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.price) { showMsg("❌ Title and price required!"); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        features: form.features.filter(f => f.trim()),
        updatedAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "bundles", editId), data);
        showMsg("✅ Bundle updated!");
      } else {
        await addDoc(collection(db, "bundles"), { ...data, sales: 0, rating: 5.0, createdAt: serverTimestamp() });
        showMsg("✅ Bundle created!");
      }
      resetForm();
      setTab("bundles");
    } catch(e) { showMsg("❌ Error: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    await deleteDoc(doc(db, "bundles", id));
    showMsg("✅ Deleted!");
  };

  const handleToggle = async (id, current) => {
    await updateDoc(doc(db, "bundles", id), { active: !current });
    setBundles(prev => prev.map(b => b.id===id ? {...b, active:!current} : b));
  };

  const uploadCover = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = ref(storage, `bundles/covers/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setForm(f => ({ ...f, cover: url }));
      showMsg("✅ Cover uploaded!");
    } catch(e) { showMsg("❌ Upload failed"); }
    setUploading(false);
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const r = ref(storage, `bundles/files/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      const newFile = { name: file.name, url, size: (file.size/1024).toFixed(0)+"KB" };
      setForm(f => ({ ...f, files: [...(f.files||[]), newFile] }));
      showMsg("✅ File uploaded!");
    } catch(e) { showMsg("❌ Upload failed"); }
    setUploading(false);
  };

  const markDelivered = async (orderId) => {
    await updateDoc(doc(db, "purchases", orderId), { status: "completed", deliveredAt: serverTimestamp() });
    setOrders(prev => prev.map(o => o.id===orderId ? {...o, status:"completed"} : o));
    showMsg("✅ Marked as delivered!");
  };

  const inp = { width:"100%", padding:"10px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".88rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl = { fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 };

  const filteredBundles = bundles.filter(b => !search || b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding:24, maxWidth:1000, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:4 }}>📦 Bundle Manager</h2>
          <p style={{ color:t.muted, fontSize:".86rem" }}>Create, edit and manage content bundles</p>
        </div>
        <button onClick={()=>{ resetForm(); setTab("add"); }}
          style={{ padding:"10px 20px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + New Bundle
        </button>
      </div>

      {msg && (
        <div style={{ padding:"10px 16px", borderRadius:9, marginBottom:16, fontSize:".86rem", background:msg.startsWith("✅")?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)", color:msg.startsWith("✅")?t.green:"#EF4444", border:`1px solid ${msg.startsWith("✅")?"rgba(16,185,129,.25)":"rgba(239,68,68,.25)"}` }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
        {[["bundles","📦 Bundles"],["orders","🛒 Orders"],["add", editId?"✏️ Edit Bundle":"➕ Add Bundle"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ if(id!=="add"){resetForm();} setTab(id); }}
            style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${tab===id?t.gold:t.border}`, background:tab===id?`${t.gold}15`:"none", color:tab===id?t.gold:t.muted, fontWeight:tab===id?700:400, cursor:"pointer", fontFamily:"inherit", fontSize:".84rem" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BUNDLES LIST ── */}
      {tab === "bundles" && (
        <div>
          <div style={{ marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search bundles..."
              style={{ ...inp, maxWidth:360 }}/>
          </div>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>Loading...</div>
          ) : filteredBundles.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>No bundles yet. Create your first bundle!</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filteredBundles.map(b => (
                <div key={b.id} style={{ background:t.bgCard, border:`1px solid ${b.active?t.border:t.border+"55"}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14, opacity:b.active?1:.6, flexWrap:"wrap" }}>
                  <div style={{ width:44, height:44, borderRadius:9, background:b.type==="custom"?"rgba(245,158,11,.15)":"rgba(99,102,241,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem", flexShrink:0 }}>
                    {b.type==="custom"?"🎨":"📚"}
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ fontWeight:700, color:t.text, fontSize:".92rem" }}>{b.title}</div>
                    <div style={{ fontSize:".74rem", color:t.muted, marginTop:2 }}>
                      {b.category} · {b.type==="custom"?"Custom Branding":"General"} · {b.sales||0} sold
                    </div>
                  </div>
                  <div style={{ fontWeight:800, color:t.gold, fontSize:"1rem", minWidth:70, textAlign:"center" }}>₹{b.price?.toLocaleString()}</div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>handleToggle(b.id,b.active)}
                      style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${b.active?"rgba(16,185,129,.3)":"rgba(239,68,68,.3)"}`, background:b.active?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)", color:b.active?t.green:"#EF4444", fontWeight:700, fontSize:".76rem", cursor:"pointer", fontFamily:"inherit" }}>
                      {b.active?"Active":"Inactive"}
                    </button>
                    <button onClick={()=>startEdit(b)}
                      style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${t.border}`, background:t.bgCard2, color:t.muted, fontWeight:700, fontSize:".76rem", cursor:"pointer", fontFamily:"inherit" }}>
                      Edit
                    </button>
                    <button onClick={()=>handleDelete(b.id, b.title)}
                      style={{ padding:"6px 10px", borderRadius:7, border:"1px solid rgba(239,68,68,.25)", background:"rgba(239,68,68,.1)", color:"#EF4444", fontWeight:700, fontSize:".76rem", cursor:"pointer", fontFamily:"inherit" }}>
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
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>No bundle orders yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {orders.map(o => (
                <div key={o.id} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700, color:t.text, fontSize:".92rem" }}>{o.itemName}</div>
                      <div style={{ fontSize:".76rem", color:t.muted, marginTop:3 }}>
                        👤 {o.userName} · 📧 {o.userEmail} · 💳 {o.paymentId}
                      </div>
                      <div style={{ fontSize:".74rem", color:t.muted, marginTop:2 }}>
                        {o.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "Just now"}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ fontWeight:800, color:t.gold }}>₹{o.amount?.toLocaleString()}</div>
                      <div style={{ padding:"4px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700,
                        background: o.status==="completed" ? "rgba(16,185,129,.15)" : o.status==="pending_branding" ? "rgba(245,158,11,.15)" : "rgba(99,102,241,.15)",
                        color: o.status==="completed" ? t.green : o.status==="pending_branding" ? t.gold : t.accent,
                      }}>
                        {o.status === "completed" ? "✅ Delivered" : o.status === "pending_branding" ? "⏳ Pending Branding" : o.status}
                      </div>
                      {o.status !== "completed" && (
                        <button onClick={()=>markDelivered(o.id)}
                          style={{ padding:"6px 12px", background:"rgba(16,185,129,.15)", border:"1px solid rgba(16,185,129,.3)", borderRadius:7, color:t.green, fontWeight:700, fontSize:".76rem", cursor:"pointer", fontFamily:"inherit" }}>
                          Mark Delivered
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

      {/* ── ADD / EDIT FORM ── */}
      {tab === "add" && (
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:24 }}>
          <h3 style={{ fontWeight:700, color:t.text, marginBottom:20, fontSize:"1rem" }}>
            {editId ? "Edit Bundle" : "Create New Bundle"}
          </h3>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Bundle Title *</label>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Class 10 Science MCQ Bundle" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Category *</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Type *</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                <option value="general">General (instant delivery)</option>
                <option value="custom">Custom Branding (24hr delivery)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Price (₹) *</label>
              <input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="e.g. 799" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Original Price (₹) — for strikethrough</label>
              <input type="number" value={form.originalPrice} onChange={e=>setForm({...form,originalPrice:e.target.value})} placeholder="e.g. 1499" style={inp}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Description</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="What's in this bundle? Who is it for?" style={{...inp, resize:"vertical"}}/>
            </div>
          </div>

          {/* Features */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Features (what's included)</label>
            {form.features.map((f,i) => (
              <div key={i} style={{ display:"flex", gap:8, marginBottom:7 }}>
                <input value={f} onChange={e=>{ const fs=[...form.features]; fs[i]=e.target.value; setForm({...form,features:fs}); }} placeholder={`Feature ${i+1}...`} style={{...inp, flex:1}}/>
                <button onClick={()=>{ const fs=form.features.filter((_,j)=>j!==i); setForm({...form,features:fs.length?fs:[""]}); }}
                  style={{ padding:"8px 12px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, color:"#EF4444", cursor:"pointer", fontFamily:"inherit" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setForm({...form,features:[...form.features,""]})}
              style={{ padding:"7px 14px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".82rem" }}>
              + Add Feature
            </button>
          </div>

          {/* Cover image */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Cover Image</label>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <label style={{ padding:"8px 16px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", fontSize:".84rem", color:t.muted }}>
                {uploading ? "Uploading..." : "Upload Cover"}
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>e.target.files[0]&&uploadCover(e.target.files[0])}/>
              </label>
              {form.cover && <img src={form.cover} alt="" style={{ height:48, borderRadius:6, border:`1px solid ${t.border}` }}/>}
              {form.cover && <button onClick={()=>setForm({...form,cover:""})} style={{ padding:"4px 10px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.25)", borderRadius:6, color:"#EF4444", cursor:"pointer", fontFamily:"inherit", fontSize:".8rem" }}>Remove</button>}
            </div>
          </div>

          {/* Bundle files */}
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Bundle Files (for instant delivery)</label>
            <label style={{ display:"inline-block", padding:"8px 16px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", fontSize:".84rem", color:t.muted, marginBottom:10 }}>
              {uploading ? "Uploading..." : "+ Upload File"}
              <input type="file" style={{ display:"none" }} onChange={e=>e.target.files[0]&&uploadFile(e.target.files[0])}/>
            </label>
            {(form.files||[]).map((f,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:t.bgCard2, borderRadius:8, marginBottom:6 }}>
                <span style={{ flex:1, fontSize:".83rem", color:t.text }}>📄 {f.name} ({f.size})</span>
                <button onClick={()=>setForm({...form,files:form.files.filter((_,j)=>j!==i)})}
                  style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:".9rem" }}>✕</button>
              </div>
            ))}
          </div>

          {/* Active toggle */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <input type="checkbox" id="active" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} style={{ width:16, height:16 }}/>
            <label htmlFor="active" style={{ fontSize:".88rem", color:t.text, cursor:"pointer" }}>Active (visible on website)</label>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"11px 28px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Saving..." : editId ? "Update Bundle" : "Create Bundle"}
            </button>
            <button onClick={()=>{ resetForm(); setTab("bundles"); }}
              style={{ padding:"11px 20px", background:"none", border:`1px solid ${t.border}`, borderRadius:10, color:t.muted, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}