// src/pages/Materials.jsx — v2 Firebase-powered Digital Store
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../firebase/config";
import { openRazorpay } from "../utils/razorpay";
import PostPaymentModal from "../components/ui/PostPaymentModal";
import useAuth from "../hooks/useAuth";
import { SecTitle, Btn, GlowBg } from "../components/ui/UI";

// ── Static fallback ───────────────────────────────────────────────────────────
const STATIC = [
  { id:"m1", title:"Minimal Dark PPT Theme", category:"PPT Templates", type:"free", price:0, cover:"", fileUrl:"https://drive.google.com/file/d/1PPTThemeID1/view", format:"PPTX", description:"Professional dark theme PPT for Science & Maths subjects. Used by 200+ teachers.", downloads:342, tags:["PPT","Template","Dark"], active:true },
  { id:"m2", title:"Science Slide Template", category:"PPT Templates", type:"free", price:0, cover:"", fileUrl:"https://drive.google.com/file/d/1PPTThemeID2/view", format:"PPTX", description:"Colorful Science PPT template with diagram placeholders and chapter structure.", downloads:218, tags:["PPT","Science","Template"], active:true },
  { id:"m3", title:"Class 10 Hindi Grammar Notes", category:"PDF Notes", type:"free", price:0, cover:"", fileUrl:"https://drive.google.com/file/d/1PDFNoteID1/view", format:"PDF", description:"Complete Hindi Grammar notes for Class 10 — Vyakaran, Sandhi, Samas covered.", downloads:567, tags:["PDF","Hindi","Class 10"], active:true },
  { id:"m4", title:"Class 10 Science MCQ Set", category:"PDF Notes", type:"free", price:0, cover:"", fileUrl:"https://drive.google.com/file/d/1PDFNoteID2/view", format:"PDF", description:"100 important MCQs for Class 10 Science — Physics, Chemistry, Biology combined.", downloads:489, tags:["PDF","Science","MCQ","Class 10"], active:true },
  { id:"m5", title:"GK Quick Revision Sheet", category:"PDF Notes", type:"free", price:0, cover:"", fileUrl:"https://drive.google.com/file/d/1PDFNoteID3/view", format:"PDF", description:"One-page GK revision sheet for competitive exams — History, Geography, Polity.", downloads:723, tags:["PDF","GK","Competitive"], active:true },
  { id:"m6", title:"Test Paper Format Template", category:"Word Templates", type:"free", price:0, cover:"", fileUrl:"https://drive.google.com/file/d/1WordDocID1/view", format:"DOCX", description:"Ready-to-use test paper template with school header, marks, and MCQ+subjective sections.", downloads:312, tags:["DOCX","Template","Test"], active:true },
  { id:"m7", title:"YouTube Thumbnail Template", category:"Canva Templates", type:"free", price:0, cover:"", fileUrl:"https://www.canva.com/design/1CanvaID1/view", format:"Canva", description:"High-click YouTube thumbnail template for coaching channels — 3 color variants.", downloads:445, tags:["Canva","YouTube","Thumbnail"], active:true },
  { id:"m8", title:"Premium Science PPT Bundle (100 Slides)", category:"PPT Templates", type:"paid", price:299, originalPrice:599, cover:"", fileUrl:"", format:"PPTX", description:"100 professionally designed Science slides covering full Class 10 curriculum. Custom branding included.", downloads:89, tags:["PPT","Science","Premium","Class 10"], active:true },
  { id:"m9", title:"Complete Hindi Vyakaran Notes (PDF)", category:"PDF Notes", type:"paid", price:199, originalPrice:399, cover:"", fileUrl:"", format:"PDF", description:"30-page comprehensive Hindi Grammar notes with examples, exercises and answer key.", downloads:134, tags:["PDF","Hindi","Premium"], active:true },
  { id:"m10", title:"Coaching Poster Mega Pack (50 Designs)", category:"Canva Templates", type:"paid", price:499, originalPrice:999, cover:"", fileUrl:"", format:"Canva", description:"50 premium Canva poster designs — festivals, admissions, results, motivational. Edit with your logo.", downloads:67, tags:["Canva","Poster","Premium"], active:true },
];

const CATEGORIES = ["All", "PPT Templates", "PDF Notes", "Word Templates", "Canva Templates"];
const FORMATS = ["All Formats", "PDF", "PPTX", "DOCX", "Canva"];
const FORMAT_COLORS = { PDF:"#EF4444", PPTX:"#F59E0B", DOCX:"#3B82F6", Canva:"#8B5CF6" };
const FORMAT_BG    = { PDF:"rgba(239,68,68,.12)", PPTX:"rgba(245,158,11,.12)", DOCX:"rgba(59,130,246,.12)", Canva:"rgba(139,92,246,.12)" };

function MaterialCard({ item, t, onView, onBuy }) {
  const isFree = item.type === "free";
  const disc   = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  return (
    <div
      onClick={() => onView(item)}
      style={{
        background: t.bgCard, borderRadius: 18, overflow: "hidden",
        border: `1px solid ${isFree ? "rgba(16,185,129,.2)" : t.border}`,
        cursor: "pointer", transition: "transform .2s, box-shadow .2s",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Cover */}
      <div style={{ height: 160, position: "relative", overflow: "hidden", background: `linear-gradient(135deg,${FORMAT_BG[item.format] || "rgba(99,102,241,.1)"},${t.bgCard2})`, flexShrink: 0 }}>
        {item.cover
          ? <img src={item.cover} alt={item.title} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : (
            <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
              <div style={{ fontSize:"3rem", opacity:.35 }}>
                {{ PDF:"📄", PPTX:"📊", DOCX:"📝", Canva:"🎨" }[item.format] || "📁"}
              </div>
              <div style={{ fontSize:".72rem", color:t.muted, fontWeight:600 }}>{item.format}</div>
            </div>
          )
        }
        {/* Badges */}
        <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:6 }}>
          {isFree
            ? <span style={{ background:"rgba(16,185,129,.9)", color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:".65rem", fontWeight:800 }}>FREE</span>
            : <span style={{ background:"rgba(245,158,11,.9)", color:"#070B14", padding:"3px 10px", borderRadius:20, fontSize:".65rem", fontWeight:800 }}>PREMIUM</span>
          }
          {disc > 0 && <span style={{ background:"rgba(239,68,68,.9)", color:"#fff", padding:"3px 8px", borderRadius:20, fontSize:".65rem", fontWeight:800 }}>-{disc}%</span>}
        </div>
        {/* Format pill */}
        <div style={{ position:"absolute", bottom:10, right:10, background:FORMAT_COLORS[item.format] || t.accent, color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:".65rem", fontWeight:800 }}>
          {item.format}
        </div>
      </div>

      <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", flex:1 }}>
        <div style={{ fontSize:".7rem", color:t.muted, fontWeight:600, marginBottom:5 }}>{item.category}</div>
        <h3 style={{ fontWeight:800, fontSize:".9rem", color:t.text, marginBottom:6, lineHeight:1.35, flex:1 }}>{item.title}</h3>
        <p style={{ fontSize:".78rem", color:t.muted, lineHeight:1.5, marginBottom:10 }}>
          {item.description?.slice(0, 80)}{item.description?.length > 80 ? "..." : ""}
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:".72rem", color:t.muted }}>
          <span>⬇ {item.downloads || 0} downloads</span>
          {(item.tags || []).slice(0,2).map(tag => (
            <span key={tag} style={{ padding:"2px 8px", background:t.bgCard2, borderRadius:20, border:`1px solid ${t.border}` }}>{tag}</span>
          ))}
        </div>

        <div style={{ paddingTop:10, borderTop:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {isFree
            ? <span style={{ fontSize:"1.1rem", fontWeight:900, color:"#10B981" }}>FREE</span>
            : (
              <div>
                {item.originalPrice && <div style={{ fontSize:".72rem", color:t.muted, textDecoration:"line-through" }}>₹{item.originalPrice}</div>}
                <div style={{ fontSize:"1.2rem", fontWeight:900, color:t.gold }}>₹{item.price}</div>
              </div>
            )
          }
          <button
            onClick={e => { e.stopPropagation(); isFree ? window.open(item.fileUrl,"_blank") : onBuy(item); }}
            style={{
              padding:"7px 16px",
              background: isFree ? "rgba(16,185,129,.15)" : "linear-gradient(135deg,#F59E0B,#F97316)",
              border: isFree ? "1px solid rgba(16,185,129,.35)" : "none",
              color: isFree ? "#10B981" : "#070B14",
              borderRadius: 9, fontWeight:800, fontSize:".8rem", cursor:"pointer", fontFamily:"inherit",
            }}>
            {isFree ? "⬇ Download" : "⚡ Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MaterialDetailModal({ item, t, onClose, onBuy }) {
  const isFree = item.type === "free";
  const disc   = item.originalPrice ? Math.round((1 - item.price / item.originalPrice) * 100) : 0;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.bgCard, borderRadius:22, maxWidth:580, width:"100%", maxHeight:"92vh", overflowY:"auto", border:`1px solid ${t.border}` }}>
        {/* Cover */}
        <div style={{ height:220, position:"relative", overflow:"hidden", background:`linear-gradient(135deg,${FORMAT_BG[item.format]||"rgba(99,102,241,.15)"},${t.bgCard2})`, borderRadius:"22px 22px 0 0", flexShrink:0 }}>
          {item.cover
            ? <img src={item.cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"5rem", opacity:.2 }}>
                {{ PDF:"📄", PPTX:"📊", DOCX:"📝", Canva:"🎨" }[item.format] || "📁"}
              </div>
          }
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, background:"rgba(0,0,0,.5)", border:"none", color:"#fff", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:"1.1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          <div style={{ position:"absolute", top:14, left:14, display:"flex", gap:8 }}>
            {isFree
              ? <span style={{ background:"rgba(16,185,129,.9)", color:"#fff", padding:"4px 12px", borderRadius:20, fontSize:".72rem", fontWeight:800 }}>FREE DOWNLOAD</span>
              : <span style={{ background:"rgba(245,158,11,.9)", color:"#070B14", padding:"4px 12px", borderRadius:20, fontSize:".72rem", fontWeight:800 }}>PREMIUM</span>
            }
            {disc > 0 && <span style={{ background:"rgba(239,68,68,.9)", color:"#fff", padding:"4px 10px", borderRadius:20, fontSize:".72rem", fontWeight:800 }}>-{disc}% OFF</span>}
          </div>
          <div style={{ position:"absolute", bottom:14, right:14, background:FORMAT_COLORS[item.format]||t.accent, color:"#fff", padding:"4px 12px", borderRadius:20, fontSize:".72rem", fontWeight:800 }}>
            {item.format}
          </div>
        </div>

        <div style={{ padding:"22px 24px" }}>
          <div style={{ fontSize:".72rem", color:t.muted, fontWeight:600, marginBottom:6 }}>{item.category}</div>
          <h2 style={{ fontWeight:900, fontSize:"1.25rem", color:t.text, marginBottom:10, lineHeight:1.3 }}>{item.title}</h2>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, fontSize:".78rem", color:t.muted }}>
            <span>⬇ {item.downloads || 0} downloads</span>
            <span>📁 {item.format} format</span>
          </div>
          <p style={{ fontSize:".88rem", color:t.muted, lineHeight:1.7, marginBottom:18 }}>{item.description}</p>

          {/* Tags */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:20 }}>
            {(item.tags || []).map(tag => (
              <span key={tag} style={{ padding:"4px 12px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:20, fontSize:".74rem", color:t.muted }}>{tag}</span>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, paddingTop:16, borderTop:`1px solid ${t.border}` }}>
            {isFree
              ? <span style={{ fontSize:"1.5rem", fontWeight:900, color:"#10B981" }}>FREE</span>
              : (
                <div>
                  {item.originalPrice && <div style={{ fontSize:".82rem", color:t.muted, textDecoration:"line-through" }}>₹{item.originalPrice}</div>}
                  <div style={{ fontSize:"1.8rem", fontWeight:900, color:t.gold, lineHeight:1 }}>₹{item.price}</div>
                  {disc > 0 && <div style={{ fontSize:".76rem", color:"#10B981", fontWeight:700 }}>Save ₹{item.originalPrice - item.price}</div>}
                </div>
              )
            }
            <div style={{ display:"flex", gap:10 }}>
              {!isFree && (
                <a href={`https://wa.me/919241653369?text=Hi! I want to buy: ${item.title} for ₹${item.price}`} target="_blank" rel="noreferrer"
                  style={{ padding:"11px 16px", background:"#25D36620", border:"1px solid #25D36640", borderRadius:10, color:"#25D366", fontWeight:700, textDecoration:"none", fontSize:".86rem" }}>
                  💬 WhatsApp
                </a>
              )}
              <button
                onClick={() => { isFree ? window.open(item.fileUrl,"_blank") : onBuy(item); }}
                style={{ padding:"11px 24px", background: isFree?"rgba(16,185,129,.15)":"linear-gradient(135deg,#F59E0B,#F97316)", border: isFree?"1px solid rgba(16,185,129,.35)":"none", color: isFree?"#10B981":"#070B14", borderRadius:10, fontWeight:800, fontSize:".92rem", cursor:"pointer", fontFamily:"inherit" }}>
                {isFree ? "⬇ Free Download" : "⚡ Buy Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Materials({ t }) {
  const { user, profile } = useAuth();
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [format, setFormat]       = useState("All Formats");
  const [typeFilter, setTypeFilter] = useState("All"); // All | free | paid
  const [viewItem, setViewItem]   = useState(null);
  const [modalData, setModalData] = useState(null);
  const [paying, setPaying]       = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    getDocs(query(collection(db, "materials"), where("active","==",true)))
      .then(snap => {
        if (snap.docs.length > 0) setItems(snap.docs.map(d=>({id:d.id,...d.data()})));
        else setItems(STATIC);
      })
      .catch(() => setItems(STATIC))
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (item) => {
    setViewItem(null);
    setPaying(true);
    await openRazorpay({
      amount: item.price,
      name: item.title,
      description: "Digital Material — DG HelpMate",
      prefillName:  profile?.ownerName || "",
      prefillEmail: user?.email || "",
      prefillPhone: profile?.phone || "",
      onSuccess: async (paymentId) => {
        setPaying(false);
        try {
          await addDoc(collection(db,"purchases"), {
            userId:    user?.uid || "guest",
            userName:  profile?.ownerName || "Guest",
            userEmail: user?.email || "",
            itemId:    item.id,
            itemType:  "material",
            itemName:  item.title,
            amount:    item.price,
            paymentId,
            status:    "completed",
            files:     item.fileUrl ? [{ name: item.title, url: item.fileUrl }] : [],
            createdAt: serverTimestamp(),
          });
          if (!item.id.startsWith("m")) {
            await updateDoc(doc(db,"materials",item.id),{ downloads: increment(1) });
          }
        } catch(e) { console.error(e); }
        setModalData({ paymentId, amount: item.price, itemName: item.title });
      },
      onFailure: (err) => {
        setPaying(false);
        if (err !== "dismissed") alert("Payment failed. Please try again.");
      },
    });
  };

  const filtered = items.filter(item => {
    const matchSearch   = !search || item.title.toLowerCase().includes(search.toLowerCase()) || (item.description||"").toLowerCase().includes(search.toLowerCase()) || (item.tags||[]).some(tag=>tag.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = category === "All" || item.category === category;
    const matchFormat   = format === "All Formats" || item.format === format;
    const matchType     = typeFilter === "All" || item.type === typeFilter;
    return matchSearch && matchCategory && matchFormat && matchType;
  });

  const freeItems = filtered.filter(i => i.type === "free");
  const paidItems = filtered.filter(i => i.type === "paid");

  const stats = { total: items.length, free: items.filter(i=>i.type==="free").length, paid: items.filter(i=>i.type==="paid").length, downloads: items.reduce((s,i)=>s+(i.downloads||0),0) };

  return (
    <div style={{ background:t.bg, minHeight:"100vh" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Hero ── */}
      <div style={{ padding:"64px 5% 50px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle at 10% 60%,rgba(16,185,129,.1) 0%,transparent 50%),radial-gradient(circle at 90% 20%,${t.accent}10 0%,transparent 45%)` }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 16px", background:"rgba(16,185,129,.15)", border:"1px solid rgba(16,185,129,.3)", borderRadius:20, fontSize:".76rem", fontWeight:700, color:"#10B981", marginBottom:18, letterSpacing:".06em" }}>
            📂 FREE + PREMIUM DIGITAL RESOURCES
          </div>
          <h1 style={{ fontSize:"clamp(1.8rem,5vw,3rem)", fontWeight:900, color:t.text, marginBottom:14, lineHeight:1.2 }}>
            Digital Materials for<br/><span style={{ color:"#10B981" }}>Smart Teachers</span>
          </h1>
          <p style={{ fontSize:"1rem", color:t.muted, maxWidth:560, lineHeight:1.7, marginBottom:32 }}>
            Download free PPTs, PDFs, Word templates & Canva designs. Or unlock premium materials with instant delivery to your account.
          </p>

          {/* Stats */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
            {[["📂",stats.total+"+ Materials"],["🆓",stats.free+" Free"],["💎",stats.paid+" Premium"],["⬇",stats.downloads.toLocaleString()+"+ Downloads"]].map(([icon,txt])=>(
              <div key={txt} style={{ display:"flex", alignItems:"center", gap:8, fontSize:".86rem", color:t.muted }}>
                <span>{icon}</span><span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div style={{ padding:"0 5% 28px", position:"sticky", top:64, zIndex:50, background:t.bg+"f0", backdropFilter:"blur(12px)", paddingTop:12, paddingBottom:16 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
          {/* Search */}
          <div style={{ position:"relative", flex:"1 1 260px" }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:"1rem" }}>🔍</span>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search materials, tags..."
              style={{ width:"100%", padding:"10px 14px 10px 42px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, fontSize:".88rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor="#10B981"}
              onBlur={e=>e.target.style.borderColor=t.border}
            />
          </div>

          {/* Free/Paid toggle */}
          <div style={{ display:"flex", background:t.bgCard2, borderRadius:10, padding:3, border:`1px solid ${t.border}` }}>
            {[["All","All"],["free","Free"],["paid","Premium"]].map(([v,l])=>(
              <button key={v} onClick={()=>setTypeFilter(v)}
                style={{ padding:"6px 14px", borderRadius:8, border:"none", fontFamily:"inherit", fontSize:".8rem", fontWeight:600, cursor:"pointer", transition:"all .2s",
                  background: typeFilter===v ? (v==="free"?"#10B981":v==="paid"?"linear-gradient(135deg,#F59E0B,#F97316)":"linear-gradient(135deg,#6366F1,#8B5CF6)") : "transparent",
                  color: typeFilter===v ? (v==="paid"?"#070B14":"#fff") : t.muted,
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Category */}
          <select value={category} onChange={e=>setCategory(e.target.value)}
            style={{ padding:"9px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, fontSize:".84rem", color:t.text, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>

          {/* Format */}
          <select value={format} onChange={e=>setFormat(e.target.value)}
            style={{ padding:"9px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, fontSize:".84rem", color:t.text, fontFamily:"inherit", outline:"none", cursor:"pointer" }}>
            {FORMATS.map(f=><option key={f} value={f}>{f}</option>)}
          </select>

          {(search||category!=="All"||format!=="All Formats"||typeFilter!=="All") && (
            <button onClick={()=>{setSearch("");setCategory("All");setFormat("All Formats");setTypeFilter("All");}}
              style={{ padding:"9px 14px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, color:"#EF4444", fontWeight:700, fontSize:".82rem", cursor:"pointer", fontFamily:"inherit" }}>
              ✕ Clear
            </button>
          )}
        </div>
        {filtered.length > 0 && (
          <div style={{ marginTop:8, fontSize:".76rem", color:t.muted }}>
            Showing {filtered.length} of {items.length} materials
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div style={{ padding:"0 5% 60px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:t.muted }}>
            <div style={{ fontSize:"2rem", marginBottom:10 }}>⏳</div>Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ fontSize:"3rem", marginBottom:14 }}>🔍</div>
            <div style={{ fontWeight:700, color:t.text, marginBottom:8 }}>No materials found</div>
            <div style={{ fontSize:".88rem", color:t.muted }}>Try different search terms or clear filters.</div>
          </div>
        ) : (
          <>
            {/* Free section */}
            {freeItems.length > 0 && typeFilter !== "paid" && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, padding:"12px 18px", background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", borderRadius:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"rgba(16,185,129,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>🆓</div>
                  <div>
                    <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>Free Materials</div>
                    <div style={{ fontSize:".76rem", color:t.muted }}>{freeItems.length} items · Download instantly, no payment needed</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,250px),1fr))", gap:18 }}>
                  {freeItems.map(item => <MaterialCard key={item.id} item={item} t={t} onView={setViewItem} onBuy={handleBuy}/>)}
                </div>
              </div>
            )}

            {/* Paid section */}
            {paidItems.length > 0 && typeFilter !== "free" && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, padding:"12px 18px", background:`${t.gold}10`, border:`1px solid ${t.gold}25`, borderRadius:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:`${t.gold}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>💎</div>
                  <div>
                    <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>Premium Materials <span style={{ fontSize:".68rem", background:t.gold, color:"#070B14", padding:"2px 8px", borderRadius:20, marginLeft:8, verticalAlign:"middle" }}>INSTANT DELIVERY</span></div>
                    <div style={{ fontSize:".76rem", color:t.muted }}>{paidItems.length} items · Files delivered to your account after payment</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,250px),1fr))", gap:18 }}>
                  {paidItems.map(item => <MaterialCard key={item.id} item={item} t={t} onView={setViewItem} onBuy={handleBuy}/>)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <div style={{ background:`linear-gradient(135deg,rgba(16,185,129,.12),${t.accent}08)`, border:`1px solid ${t.border}`, borderRadius:20, padding:"32px 28px", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:20 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:"1.15rem", color:t.text, marginBottom:8 }}>Need custom study materials?</h3>
            <div style={{ fontSize:".85rem", color:t.muted }}>We create MCQ sets, PPTs and notes for your specific syllabus and class.</div>
          </div>
          <a href="https://wa.me/919241653369?text=Hi! I need custom study materials." target="_blank" rel="noreferrer"
            style={{ padding:"12px 24px", background:"#25D366", color:"#fff", borderRadius:12, fontWeight:700, fontSize:".9rem", textDecoration:"none" }}>
            💬 Request Custom Material
          </a>
        </div>
      </div>

      {/* Modals */}
      {viewItem && <MaterialDetailModal item={viewItem} t={t} onClose={()=>setViewItem(null)} onBuy={handleBuy}/>}
      {modalData && <PostPaymentModal paymentId={modalData.paymentId} amount={modalData.amount} itemName={modalData.itemName} itemType="material" onClose={()=>setModalData(null)} t={t}/>}
      {paying && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:t.bgCard, borderRadius:16, padding:"32px 40px", textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:12 }}>⏳</div>
            <div style={{ color:t.text, fontWeight:700 }}>Opening payment gateway...</div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────

export function Blog({ t }) {
  return (
    <div style={{ padding: "64px 5% 80px", background: t.bg }}>
      <SecTitle t={t} tag="Blog" h="Teachers' Problems & Digital Solutions"
        sub="Practical guides, stories, and tips for modern coaching institutes." />
      <div className="grid-mobile-1" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 22,
      }}>
        {POSTS.map(({ emoji, title, cat, date, desc }) => (
          <div key={title} className="card-hover" style={{
            background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{
              height: 120, background: t.bgCard2,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem",
            }}>{emoji}</div>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  background: t.accentBg, color: t.accent,
                  padding: "3px 10px", borderRadius: 50, fontSize: "0.72rem", fontWeight: 700,
                }}>{cat}</span>
                <span style={{ fontSize: "0.74rem", color: t.muted }}>{date}</span>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "0.97rem", color: t.text, marginBottom: 8, lineHeight: 1.4 }}>{title}</h3>
              <p style={{ fontSize: "0.85rem", color: t.muted, lineHeight: 1.6 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const MILESTONES = [
  { year:"2022", title:"Started Freelancing",       desc:"Began helping local coaching institutes with PPT and typing work from Arwal, Bihar." },
  { year:"2023", title:"DG HelpMate Founded",       desc:"Officially launched DG HelpMate. First 5 regular clients on board." },
  { year:"2024", title:"Scaled to 15+ Clients",     desc:"Expanded to thumbnails, SEO, and channel management. Revenue crossed ₹1 lakh." },
  { year:"2025", title:"MSME Registered ✅",        desc:"Officially registered. Now serving 26+ active clients. Smart Teachers Course launched." },
];

export function About({ t }) {
  return (
    <div style={{ background: t.bg }}>
      {/* Hero Section */}
      <section style={{
        padding: "64px 5% 80px",
        background: t.bg === "#070B14" ? "linear-gradient(150deg,#070B14,#0F1629)" : "linear-gradient(150deg,#EEF2FF,#F8FAFF)",
        overflow: "hidden"
      }}>
        <div className="stack-mobile" style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          
          {/* LEFT SIDE: Founder Profile & Info */}
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "center", flex: "1 1 500px" }}>
            
            {/* Founder Image */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                padding: 6,
                background: `linear-gradient(135deg, ${t.accent}, #F59E0B)`,
                borderRadius: "50%",
                boxShadow: `0 20px 40px ${t.accent}40`,
                display: "inline-block"
              }}>
                <div style={{
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  border: `4px solid ${t.bg}`,
                  overflow: "hidden",
                  background: t.bgCard,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <img
                    src="/images/govardhan.jpg"
                    alt="Govardhan"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = "<div style='font-size: 4rem;'>👨‍💻</div>";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Founder Text & Stats */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{
                display: "inline-block", background: t.accentBg, color: t.accent,
                border: `1px solid ${t.accent}30`, padding: "5px 14px", borderRadius: 50,
                fontSize: "0.72rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12,
              }}>Founder & CEO</div>
              <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, color: t.text, marginBottom: 14 }}>
                Govardhan Pandit
              </h1>
              <p style={{ fontSize: "1rem", color: t.muted, lineHeight: 1.75, maxWidth: 520, marginBottom: 22 }}>
                Hello! I'm Govardhan Pandit — on a mission to digitally empower Smart Board teachers across India.
                For 2.5+ years, I've helped coaching institutes with professional content creation, teaching digital tools,
                and building DG HelpMate into Bihar's most trusted education content company. MSME Registered since 2025.
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {[["2.5+","Years Exp",t.gold],["26+","Clients",t.green],["500+","Projects",t.accent]].map(([n,l,c]) => (
                  <div key={n} style={{ textAlign: "center", padding: "14px 20px", background: t.bgCard, borderRadius: 12, border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: "1.7rem", fontWeight: 900, color: c }}>{n}</div>
                    <div style={{ fontSize: "0.78rem", color: t.muted }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Attractive Image Gallery */}
          <div style={{ flex: "1 1 350px", display: "flex", justifyContent: "center", position: "relative" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16, transform: "translateY(20px)" }}>
                <img 
                  src="/images/gallery1.jpg" 
                  alt="Work Example 1" 
                  style={{ width: 170, height: 240, objectFit: "cover", borderRadius: 24, boxShadow: `0 15px 35px ${t.accent}20`, border: `2px solid ${t.border}` }}
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=80" }} 
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, transform: "translateY(-20px)" }}>
                <img 
                  src="/images/gallery2.jpg" 
                  alt="Work Example 2" 
                  style={{ width: 150, height: 160, objectFit: "cover", borderRadius: 24, boxShadow: `0 15px 35px ${t.accent}20`, border: `2px solid ${t.border}` }}
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80" }} 
                />
                <img 
                  src="/images/gallery3.jpg" 
                  alt="Work Example 3" 
                  style={{ width: 150, height: 160, objectFit: "cover", borderRadius: 24, boxShadow: `0 15px 35px ${t.accent}20`, border: `2px solid ${t.border}` }}
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80" }} 
                />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 🔥 COMPACT MODERN SECTION: Mission / Vision / Company */}
      <section style={{ padding: "80px 5%", background: t.bgCard2, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: "5%", width: "90%", height: "1px", background: `linear-gradient(90deg, transparent, ${t.border}, transparent)` }} />
        
        <div className="grid-mobile-1" style={{
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", // Size chota kar diya
          gap: 16, // Gap kam kar diya
          maxWidth: 1000, margin: "0 auto",
        }}>
          {[
            { icon:"🎯", h:"Our Mission", p:"To make every teacher in India a Self-Reliant Digital Educator — free from operator dependency." },
            { icon:"💡", h:"Our Vision",  p:"A future where every coaching has its own YouTube channel, branded content, and earns from digital products." },
            { icon:"🏢", h:"Company Details", p:"DG HelpMate · MSME (2025)\nRampur Chauram, Arwal, Bihar\nServing Bihar & Jharkhand" },
            { icon:"📞", h:"Get In Touch", p:"+91 92416 53369\nsupport@dghelpmate.com\nMon–Sat (9AM–9PM)" },
          ].map(({ icon, h, p }) => (
            <div key={h} className="card-hover" style={{ 
              background: `linear-gradient(145deg, ${t.bgCard}, ${t.bg})`, 
              border: `1px solid ${t.border}`, 
              borderRadius: 16, // Radius kam kiya
              padding: "20px", // Padding compact ki
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Subtle background glow */}
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: t.accent, filter: "blur(50px)", opacity: 0.15 }} />
              
              <div style={{ 
                width: 44, height: 44, borderRadius: 12, // Icon box chota kiya
                background: `linear-gradient(135deg, ${t.accentBg}, ${t.bgCard})`,
                border: `1px solid ${t.accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: "1.3rem", marginBottom: 14,
              }}>
                {icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text, marginBottom: 8 }}>{h}</h3> {/* Font size adjusted */}
              <p style={{ fontSize: "0.85rem", color: t.muted, lineHeight: 1.6, whiteSpace: "pre-line" }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🔥 COMPACT MODERN SECTION: Timeline */}
      <section style={{ padding: "80px 5%", background: t.bg }}>
        <SecTitle t={t} tag="Our Journey" h="From Freelancer to MSME Company" center />
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          
          {MILESTONES.map(({ year, title, desc }, i) => (
            <div key={year} style={{ display: "flex", gap: 16, marginBottom: i === MILESTONES.length - 1 ? 0 : 24 }}> {/* Spacing kam ki */}
              
              {/* Line and Circle */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", // Circle chota kiya
                  background: `linear-gradient(135deg, ${t.accent}, ${t.gold})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "0.75rem", color: "#fff", flexShrink: 0,
                  boxShadow: `0 0 0 4px ${t.accentBg}`,
                  zIndex: 2
                }}>{year}</div>
                {i < MILESTONES.length - 1 && (
                  <div style={{ 
                    width: 2, flex: 1, // Line patli ki
                    background: `linear-gradient(to bottom, ${t.accent}60, transparent)`, 
                    marginTop: 6, borderRadius: 2 
                  }} />
                )}
              </div>

              {/* Content Card */}
              <div className="card-hover" style={{ 
                flex: 1, 
                background: t.bgCard, 
                border: `1px solid ${t.border}`, 
                borderRadius: 14, // Radius kam kiya
                padding: "16px 20px", // Padding compact ki
                position: "relative", 
                top: -4, // Align fix
              }}>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text, marginBottom: 4 }}>{title}</h4> {/* Fonts adjusted */}
                <p style={{ fontSize: "0.85rem", color: t.muted, lineHeight: 1.55 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function Contact({ t }) {
  return (
    <div style={{ padding: "64px 5% 80px", background: t.bg }}>
      <SecTitle t={t} tag="Contact Us" h="Let's Talk About Your Needs"
        sub="WhatsApp, email, or phone — quick response guaranteed. Usually within 2 hours." />

      <div className="stack-mobile" style={{ display: "flex", gap: 48, flexWrap: "wrap", maxWidth: 960 }}>
        {/* Info */}
        <div style={{ flex: "0 0 280px" }}>
          {[
            ["📞","Phone / WhatsApp","+91 92416 53369","tel:+919241653369"],
            ["✉️","Email","support@dghelpmate.com","mailto:support@dghelpmate.com"],
            ["📍","Location","Rampur Chauram, Arwal, Bihar — 804423",null],
            ["🕐","Working Hours","Mon – Sat · 9AM – 9PM",null],
          ].map(([icon,label,val,href]) => (
            <div key={label} style={{ display: "flex", gap: 14, marginBottom: 22 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 11, background: t.accentBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", flexShrink: 0,
              }}>{icon}</div>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{label}</div>
                {href
                  ? <a href={href} style={{ fontSize: "0.95rem", fontWeight: 600, color: t.gold, textDecoration: "none" }}>{val}</a>
                  : <div style={{ fontSize: "0.95rem", fontWeight: 600, color: t.text }}>{val}</div>}
              </div>
            </div>
          ))}
          <a href="https://wa.me/919241653369" target="_blank" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "#25D366", color: "#fff", padding: "13px",
            borderRadius: 11, fontWeight: 800, fontSize: "0.97rem",
            textDecoration: "none", marginTop: 8,
          }}>
            💬 Chat Instantly on WhatsApp
          </a>
        </div>

        {/* Form */}
        <div style={{
          flex: 1, minWidth: 280, background: t.bgCard,
          border: `1px solid ${t.border}`, borderRadius: 18, padding: "28px",
        }}>
          <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: t.text, marginBottom: 20 }}>Send a Message</h3>
          <form action="https://formsubmit.co/support@dghelpmate.com" method="POST">
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            {[
              { name:"name",  placeholder:"Your Name",             type:"text" },
              { name:"email", placeholder:"Email Address",         type:"email" },
              { name:"phone", placeholder:"WhatsApp Number",       type:"tel" },
            ].map(({ name, placeholder, type }) => (
              <input key={name} type={type} name={name} placeholder={placeholder} required style={{
                width: "100%", padding: "12px 14px", marginBottom: 12,
                background: t.bg, border: `1px solid ${t.border}`,
                borderRadius: 10, fontSize: "0.92rem", color: t.text,
                fontFamily: "'Plus Jakarta Sans',sans-serif", outline: "none",
              }} />
            ))}
            <select name="service" style={{
              width: "100%", padding: "12px 14px", marginBottom: 12,
              background: t.bg, border: `1px solid ${t.border}`,
              borderRadius: 10, fontSize: "0.92rem", color: t.muted,
              fontFamily: "'Plus Jakarta Sans',sans-serif", outline: "none",
            }}>
              <option value="">Select Service Needed</option>
              <option>MCQ / Question Bank</option>
              <option>PPT Notes & Slides</option>
              <option>Test Papers</option>
              <option>Thumbnail / Poster</option>
              <option>Smart Teachers Course</option>
              <option>Channel Management</option>
              <option>Other</option>
            </select>
            <textarea name="message" rows={4} placeholder="Tell us about your requirement..." required style={{
              width: "100%", padding: "12px 14px", marginBottom: 18,
              background: t.bg, border: `1px solid ${t.border}`,
              borderRadius: 10, fontSize: "0.92rem", color: t.text,
              fontFamily: "'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical",
            }} />
            <button type="submit" style={{
              width: "100%", padding: "13px",
              background: "linear-gradient(135deg,#F59E0B,#F97316)",
              color: "#070B14", fontWeight: 800, fontSize: "1rem",
              border: "none", borderRadius: 10, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>Send Message 🚀</button>
          </form>
        </div>
      </div>
    </div>
  );
}