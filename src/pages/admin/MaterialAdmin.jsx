// src/pages/admin/MaterialAdmin.jsx — Full Material Management Panel
import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, onSnapshot, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase/config";

const CATEGORIES = ["PPT Templates","PDF Notes","Word Templates","Canva Templates","MCQ Sets","Other"];
const FORMATS    = ["PDF","PPTX","DOCX","Canva","ZIP","MP4","Other"];

const EMPTY = {
  title:"", category:"PDF Notes", format:"PDF", type:"free",
  price:"", originalPrice:"", description:"", cover:"",
  fileUrl:"", driveId:"", tags:"", active:true,
};

export default function MaterialAdmin({ t }) {
  const [items, setItems]       = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("list");
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [uploading, setUploading] = useState("");
  const [search, setSearch]     = useState("");

  const showMsg = (m) => { setMsg(m); setTimeout(()=>setMsg(""), 3500); };

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db,"materials"), orderBy("createdAt","desc")),
      snap => { setItems(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (tab !== "orders") return;
    getDocs(query(collection(db,"purchases"), where("itemType","==","material"), orderBy("createdAt","desc")))
      .then(snap => setOrders(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(()=>{});
  }, [tab]);

  const startEdit = (item) => {
    setForm({ ...item, tags: (item.tags||[]).join(", "), price: item.price||"", originalPrice: item.originalPrice||"" });
    setEditId(item.id);
    setTab("form");
  };

  const resetForm = () => { setForm(EMPTY); setEditId(null); };

  const handleSave = async () => {
    if (!form.title.trim()) { showMsg("❌ Title required!"); return; }
    if (form.type === "paid" && !form.price) { showMsg("❌ Price required for paid items!"); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        price: form.price ? Number(form.price) : 0,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
        updatedAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db,"materials",editId), data);
        showMsg("✅ Material updated!");
      } else {
        await addDoc(collection(db,"materials"), { ...data, downloads:0, createdAt:serverTimestamp() });
        showMsg("✅ Material created!");
      }
      resetForm();
      setTab("list");
    } catch(e) { showMsg("❌ Error: " + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    await deleteDoc(doc(db,"materials",id));
    showMsg("✅ Deleted!");
  };

  const handleToggle = async (id, current) => {
    await updateDoc(doc(db,"materials",id),{ active:!current });
    setItems(prev=>prev.map(i=>i.id===id?{...i,active:!current}:i));
  };

  const uploadCover = async (file) => {
    if (!file) return;
    setUploading("cover");
    try {
      const r = ref(storage, `materials/covers/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setForm(f=>({...f, cover:url}));
      showMsg("✅ Cover uploaded!");
    } catch(e) { showMsg("❌ Upload failed: " + e.message); }
    setUploading("");
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading("file");
    try {
      const r = ref(storage, `materials/files/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      setForm(f=>({...f, fileUrl:url}));
      showMsg("✅ File uploaded!");
    } catch(e) { showMsg("❌ Upload failed: " + e.message); }
    setUploading("");
  };

  const inp  = { width:"100%", padding:"10px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".88rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl  = { fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 };
  const card = { background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px" };

  const FORMAT_COLORS = { PDF:"#EF4444", PPTX:"#F59E0B", DOCX:"#3B82F6", Canva:"#8B5CF6" };
  const filteredItems = items.filter(i=>!search||i.title.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: items.length,
    free: items.filter(i=>i.type==="free").length,
    paid: items.filter(i=>i.type==="paid").length,
    totalDownloads: items.reduce((s,i)=>s+(i.downloads||0),0),
  };

  return (
    <div style={{ padding:24, maxWidth:1000, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:4 }}>📂 Material Manager</h2>
          <p style={{ color:t.muted, fontSize:".86rem" }}>Manage free & premium digital study materials</p>
        </div>
        <button onClick={()=>{ resetForm(); setTab("form"); }}
          style={{ padding:"10px 20px", background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Add Material
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        {[["📂","Total",stats.total,t.accent],["🆓","Free",stats.free,"#10B981"],["💎","Premium",stats.paid,t.gold],["⬇","Downloads",stats.totalDownloads,"#A78BFA"]].map(([icon,label,val,color])=>(
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
        {[["list","📂 Materials"],["orders","🛒 Orders"],["form", editId?"✏️ Edit":"➕ Add"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ if(id!=="form") resetForm(); setTab(id); }}
            style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${tab===id?"#10B981":t.border}`, background:tab===id?"rgba(16,185,129,.12)":"none", color:tab===id?"#10B981":t.muted, fontWeight:tab===id?700:400, cursor:"pointer", fontFamily:"inherit", fontSize:".84rem" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LIST ── */}
      {tab === "list" && (
        <div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search materials..."
            style={{ ...inp, maxWidth:360, marginBottom:16 }}/>

          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>No materials yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredItems.map(item => (
                <div key={item.id} style={{ ...card, display:"flex", alignItems:"center", gap:14, opacity:item.active?1:.6, flexWrap:"wrap" }}>
                  {/* Cover thumb */}
                  <div style={{ width:52, height:52, borderRadius:9, overflow:"hidden", flexShrink:0, background:t.bgCard2, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {item.cover
                      ? <img src={item.cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <span style={{ fontSize:"1.5rem", opacity:.4 }}>{{ PDF:"📄", PPTX:"📊", DOCX:"📝", Canva:"🎨" }[item.format]||"📁"}</span>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>{item.title}</span>
                      <span style={{ padding:"2px 7px", borderRadius:10, fontSize:".65rem", fontWeight:700, background:item.type==="free"?"rgba(16,185,129,.15)":"rgba(245,158,11,.15)", color:item.type==="free"?"#10B981":t.gold }}>
                        {item.type==="free"?"FREE":"PAID"}
                      </span>
                    </div>
                    <div style={{ fontSize:".74rem", color:t.muted }}>
                      {item.category} ·
                      <span style={{ color:FORMAT_COLORS[item.format]||t.accent, fontWeight:600, marginLeft:4 }}>{item.format}</span>
                      {item.type==="paid" && <span style={{ marginLeft:8, color:t.gold, fontWeight:700 }}>₹{item.price}</span>}
                      <span style={{ marginLeft:8 }}>⬇ {item.downloads||0}</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>handleToggle(item.id,item.active)}
                      style={{ padding:"5px 11px", borderRadius:7, border:`1px solid ${item.active?"rgba(16,185,129,.3)":"rgba(239,68,68,.3)"}`, background:item.active?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)", color:item.active?t.green:"#EF4444", fontWeight:700, fontSize:".73rem", cursor:"pointer", fontFamily:"inherit" }}>
                      {item.active?"Active":"Off"}
                    </button>
                    <button onClick={()=>startEdit(item)}
                      style={{ padding:"5px 11px", borderRadius:7, border:`1px solid ${t.border}`, background:t.bgCard2, color:t.muted, fontWeight:700, fontSize:".73rem", cursor:"pointer", fontFamily:"inherit" }}>
                      Edit
                    </button>
                    <button onClick={()=>handleDelete(item.id,item.title)}
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
            <div style={{ textAlign:"center", padding:40, color:t.muted }}>No material purchases yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {orders.map(o => (
                <div key={o.id} style={{ ...card }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>{o.itemName}</div>
                      <div style={{ fontSize:".74rem", color:t.muted, marginTop:3 }}>
                        👤 {o.userName} · 📧 {o.userEmail} · 💳 {o.paymentId?.slice(0,20)}...
                      </div>
                      <div style={{ fontSize:".72rem", color:t.muted, marginTop:2 }}>
                        {o.createdAt?.toDate?.()?.toLocaleDateString("en-IN","") || "Recently"}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontWeight:800, color:t.gold }}>₹{o.amount?.toLocaleString()}</span>
                      <span style={{ padding:"4px 10px", borderRadius:20, fontSize:".7rem", fontWeight:700, background:"rgba(16,185,129,.15)", color:t.green }}>
                        ✅ Delivered
                      </span>
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
            {editId ? "Edit Material" : "Add New Material"}
          </h3>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Title *</label>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Class 10 Science Notes PDF" style={inp}/>
            </div>
            <div>
              <label style={lbl}>Category *</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Format *</label>
              <select value={form.format} onChange={e=>setForm({...form,format:e.target.value})} style={inp}>
                {FORMATS.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Type *</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>
                <option value="free">Free (no payment needed)</option>
                <option value="paid">Premium (paid)</option>
              </select>
            </div>
            {form.type === "paid" && (
              <>
                <div>
                  <label style={lbl}>Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="e.g. 199" style={inp}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>Original Price (₹) — for strikethrough</label>
                  <input type="number" value={form.originalPrice} onChange={e=>setForm({...form,originalPrice:e.target.value})} placeholder="e.g. 399" style={inp}/>
                </div>
              </>
            )}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Description</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="What's in this material? Who is it for?" style={{...inp,resize:"vertical"}}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Tags (comma separated)</label>
              <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="e.g. PDF, Hindi, Class 10, Grammar" style={inp}/>
            </div>
          </div>

          {/* Cover image upload */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Cover Image</label>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <label style={{ padding:"8px 16px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", fontSize:".84rem", color:t.muted }}>
                {uploading==="cover" ? "Uploading..." : "📷 Upload Cover"}
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>e.target.files[0]&&uploadCover(e.target.files[0])}/>
              </label>
              <span style={{ fontSize:".78rem", color:t.muted }}>— or —</span>
              <input value={form.cover} onChange={e=>setForm({...form,cover:e.target.value})} placeholder="Paste image URL..." style={{...inp, flex:1, minWidth:200}}/>
              {form.cover && <img src={form.cover} alt="" style={{ height:48, borderRadius:6, border:`1px solid ${t.border}` }}/>}
            </div>
          </div>

          {/* File upload */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>File URL (for delivery)</label>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <label style={{ padding:"8px 16px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", fontSize:".84rem", color:t.muted }}>
                {uploading==="file" ? "Uploading..." : "📁 Upload File"}
                <input type="file" style={{ display:"none" }} onChange={e=>e.target.files[0]&&uploadFile(e.target.files[0])}/>
              </label>
              <span style={{ fontSize:".78rem", color:t.muted }}>— or paste Google Drive link —</span>
            </div>
            <input value={form.fileUrl} onChange={e=>setForm({...form,fileUrl:e.target.value})} placeholder="https://drive.google.com/file/d/.../view" style={{...inp, marginTop:8}}/>
            <div style={{ fontSize:".74rem", color:t.muted, marginTop:4 }}>
              For Google Drive: Share the file → Copy link → Paste here
            </div>
          </div>

          {/* Active */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <input type="checkbox" id="active" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} style={{ width:16, height:16 }}/>
            <label htmlFor="active" style={{ fontSize:".88rem", color:t.text, cursor:"pointer" }}>Active (visible on website)</label>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"11px 28px", background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Saving..." : editId ? "Update Material" : "Add Material"}
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