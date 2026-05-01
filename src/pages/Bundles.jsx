// src/pages/Bundles.jsx — v3 Firebase-powered, General + Custom branding
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../firebase/config";
import { openRazorpay } from "../utils/razorpay";
import PostPaymentModal from "../components/ui/PostPaymentModal";
import useAuth from "../hooks/useAuth";

// ── Fallback static bundles if Firebase is empty ──────────────────────────────
const STATIC_BUNDLES = [
  { id:"s1", title:"Class 10 Science MCQ Bundle", category:"Class 10", type:"general", price:799, originalPrice:1499, cover:"", features:["900+ MCQs","PDF Format","Board Pattern","Chapter-wise","Answer Key Included"], description:"Complete Science MCQ bank for Class 10 — Physics, Chemistry, Biology. Board exam pattern with chapter-wise sorting and answer keys.", rating:4.9, sales:120, active:true },
  { id:"s2", title:"Class 10 Hindi Complete Bundle", category:"Class 10", type:"general", price:599, originalPrice:1200, cover:"", features:["800+ MCQs","Grammar + Literature","PDF Format","Board Pattern","Answer Key"], description:"Complete Hindi MCQ bank covering Kshitij, Sparsh, Kritika, Sanchayan — grammar and literature both.", rating:4.8, sales:95, active:true },
  { id:"s3", title:"Class 12 Political Science Bundle", category:"Class 12", type:"general", price:899, originalPrice:1600, cover:"", features:["800+ MCQs","All Chapters","PDF Format","Board + CUET Ready","Answer Key"], description:"Complete Political Science MCQ bank for Class 12 — Indian Politics, Contemporary World Politics, all chapters covered.", rating:4.9, sales:78, active:true },
  { id:"s4", title:"GK / GS Competitive Bundle", category:"Competitive", type:"general", price:1299, originalPrice:2500, cover:"", features:["1500+ MCQs","SSC/Railway Pattern","Current Affairs","PDF Format","Answer Key"], description:"Comprehensive GK/GS MCQ bank for SSC, Railway, BPSC, UPSC Prelims. Covers History, Geography, Polity, Science, Economy.", rating:4.9, sales:200, active:true },
  { id:"s5", title:"Custom Branding — Class 10 Science", category:"Class 10", type:"custom", price:1499, originalPrice:2500, cover:"", features:["900+ MCQs","Your Coaching Logo","Your Coaching Name","Custom Color Scheme","PDF + Print Ready","WhatsApp Delivered"], description:"Same premium Science MCQ bank — but branded with YOUR coaching name, logo & colors. Students will see YOUR brand.", rating:5.0, sales:45, active:true },
  { id:"s6", title:"Custom Branding — Full Subject Bundle", category:"Custom", type:"custom", price:2999, originalPrice:5000, cover:"", features:["Subject of Your Choice","Any Class/Exam","Your Logo & Name","Custom Watermark","Unlimited Revisions","Express Delivery"], description:"Order any subject bundle and get it completely branded for your coaching institute. Your logo, name, colors — fully customized.", rating:5.0, sales:32, active:true },
];

const CATEGORIES = ["All", "Class 10", "Class 12", "Competitive", "Custom"];

function StarRating({ rating }) {
  return (
    <span style={{ color: "#F59E0B", fontSize: ".78rem", fontWeight: 700 }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))} {rating}
    </span>
  );
}

function BundleDetailModal({ bundle, t, onClose, onBuy }) {
  const disc = bundle.originalPrice ? Math.round((1 - bundle.price / bundle.originalPrice) * 100) : 0;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, maxWidth:560, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
        {/* Cover */}
        <div style={{ height:180, background:`linear-gradient(135deg,${bundle.type==="custom"?"#F59E0B":"#6366F1"}40,${bundle.type==="custom"?"#F97316":"#8B5CF6"}20)`, borderRadius:"20px 20px 0 0", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
          {bundle.cover
            ? <img src={bundle.cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ fontSize:"4rem", opacity:.3 }}>{bundle.type==="custom"?"🎨":"📚"}</div>
          }
          {bundle.type==="custom" && (
            <div style={{ position:"absolute", top:14, right:14, background:"#F59E0B", color:"#070B14", padding:"4px 12px", borderRadius:20, fontSize:".72rem", fontWeight:800 }}>
              CUSTOM BRANDING
            </div>
          )}
          {disc > 0 && (
            <div style={{ position:"absolute", top:14, left:14, background:"#EF4444", color:"#fff", padding:"4px 10px", borderRadius:20, fontSize:".72rem", fontWeight:800 }}>
              -{disc}% OFF
            </div>
          )}
          <button onClick={onClose} style={{ position:"absolute", top:14, right: bundle.type==="custom"?120:14, background:"rgba(0,0,0,.5)", border:"none", color:"#fff", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:"1.1rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ padding:"22px 24px" }}>
          <div style={{ fontSize:".72rem", color: bundle.type==="custom" ? t.gold : t.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>
            {bundle.category} · {bundle.type==="custom" ? "Custom Branding" : "General"}
          </div>
          <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:t.text, marginBottom:8, lineHeight:1.3 }}>{bundle.title}</h2>

          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
            <StarRating rating={bundle.rating || 5}/>
            <span style={{ fontSize:".78rem", color:t.muted }}>{bundle.sales || 0}+ sold</span>
          </div>

          <p style={{ fontSize:".88rem", color:t.muted, lineHeight:1.7, marginBottom:18 }}>{bundle.description}</p>

          {/* Features */}
          <div style={{ background:t.bgCard2, borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
            <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>What's Included</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px" }}>
              {(bundle.features || []).map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:".84rem", color:t.text }}>
                  <span style={{ color:"#10B981", flexShrink:0 }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Custom branding note */}
          {bundle.type === "custom" && (
            <div style={{ background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.25)", borderRadius:10, padding:"12px 14px", marginBottom:18 }}>
              <div style={{ fontWeight:700, color:t.gold, fontSize:".84rem", marginBottom:4 }}>🎨 Custom Branding Process</div>
              <div style={{ fontSize:".8rem", color:t.muted, lineHeight:1.6 }}>
                1. Pay & order placed<br/>
                2. Share your coaching logo + name on WhatsApp<br/>
                3. Branded PDF delivered within 24 hours<br/>
                4. Access from your Client Portal
              </div>
            </div>
          )}

          {/* Price + CTA */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div>
              {bundle.originalPrice && <div style={{ fontSize:".82rem", color:t.muted, textDecoration:"line-through" }}>₹{bundle.originalPrice.toLocaleString()}</div>}
              <div style={{ fontSize:"2rem", fontWeight:900, color:t.gold, lineHeight:1 }}>₹{bundle.price?.toLocaleString()}</div>
              {disc > 0 && <div style={{ fontSize:".76rem", color:"#10B981", fontWeight:700 }}>You save ₹{(bundle.originalPrice - bundle.price).toLocaleString()}</div>}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <a href={`https://wa.me/919241653369?text=Hi! I want to buy: ${bundle.title}. Price: ₹${bundle.price}`} target="_blank" rel="noreferrer"
                style={{ padding:"11px 16px", background:"#25D36620", border:"1px solid #25D36640", borderRadius:10, color:"#25D366", fontWeight:700, textDecoration:"none", fontSize:".86rem" }}>
                💬 WhatsApp
              </a>
              <button onClick={() => onBuy(bundle)}
                style={{ padding:"11px 24px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:800, fontSize:".92rem", cursor:"pointer", fontFamily:"inherit" }}>
                ⚡ Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BundleCard({ bundle, t, onView, onBuy }) {
  const disc = bundle.originalPrice ? Math.round((1 - bundle.price / bundle.originalPrice) * 100) : 0;
  const isCustom = bundle.type === "custom";

  return (
    <div
      onClick={() => onView(bundle)}
      style={{
        background: t.bgCard, border: `1px solid ${isCustom ? "rgba(245,158,11,.3)" : t.border}`,
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        transition: "transform .2s, box-shadow .2s",
        position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Top bar */}
      <div style={{ height:4, background: isCustom ? "linear-gradient(90deg,#F59E0B,#F97316)" : "linear-gradient(90deg,#6366F1,#8B5CF6)" }}/>

      {/* Cover */}
      <div style={{ height:130, background: isCustom ? "rgba(245,158,11,.08)" : "rgba(99,102,241,.08)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {bundle.cover
          ? <img src={bundle.cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          : <div style={{ fontSize:"3rem", opacity:.25 }}>{isCustom ? "🎨" : "📚"}</div>
        }
        {isCustom && (
          <div style={{ position:"absolute", top:10, right:10, background:"#F59E0B", color:"#070B14", padding:"3px 10px", borderRadius:20, fontSize:".65rem", fontWeight:800 }}>
            CUSTOM BRAND
          </div>
        )}
        {disc > 0 && (
          <div style={{ position:"absolute", top:10, left:10, background:"#EF4444", color:"#fff", padding:"3px 8px", borderRadius:20, fontSize:".65rem", fontWeight:800 }}>
            -{disc}%
          </div>
        )}
      </div>

      <div style={{ padding:"16px" }}>
        <div style={{ fontSize:".68rem", color: isCustom ? "#F59E0B" : t.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:5 }}>
          {bundle.category}
        </div>
        <h3 style={{ fontWeight:800, fontSize:".95rem", color:t.text, marginBottom:6, lineHeight:1.35 }}>{bundle.title}</h3>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <StarRating rating={bundle.rating || 5}/>
          <span style={{ fontSize:".72rem", color:t.muted }}>{bundle.sales || 0}+ sold</span>
        </div>

        {/* Top 3 features */}
        <div style={{ marginBottom:12 }}>
          {(bundle.features || []).slice(0, 3).map(f => (
            <div key={f} style={{ fontSize:".78rem", color:t.muted, display:"flex", gap:6, marginBottom:4 }}>
              <span style={{ color:"#10B981", flexShrink:0 }}>✓</span>{f}
            </div>
          ))}
        </div>

        <div style={{ paddingTop:12, borderTop:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            {bundle.originalPrice && <div style={{ fontSize:".72rem", color:t.muted, textDecoration:"line-through" }}>₹{bundle.originalPrice.toLocaleString()}</div>}
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:t.gold, lineHeight:1 }}>₹{bundle.price?.toLocaleString()}</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onBuy(bundle); }}
            style={{ padding:"8px 16px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:9, fontWeight:800, fontSize:".82rem", cursor:"pointer", fontFamily:"inherit" }}>
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Bundles({ t }) {
  const { user, profile } = useAuth();
  const [bundles, setBundles]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("All");
  const [search, setSearch]         = useState("");
  const [viewBundle, setViewBundle] = useState(null);
  const [buyBundle, setBuyBundle]   = useState(null);
  const [modalData, setModalData]   = useState(null);
  const [paying, setPaying]         = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "bundles"), where("active", "==", true)))
      .then(snap => {
        if (snap.docs.length > 0) {
          setBundles(snap.docs.map(d => ({ id:d.id, ...d.data() })));
        } else {
          setBundles(STATIC_BUNDLES);
        }
      })
      .catch(() => setBundles(STATIC_BUNDLES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bundles.filter(b => {
    const matchCat = activeTab === "All" || b.category === activeTab;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.description||"").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const general = filtered.filter(b => b.type === "general");
  const custom  = filtered.filter(b => b.type === "custom");

  const handleBuy = async (bundle) => {
    setViewBundle(null);
    setPaying(true);
    await openRazorpay({
      amount: bundle.price,
      name: bundle.title,
      description: bundle.type === "custom" ? "Custom Branding Bundle — DG HelpMate" : "Content Bundle — DG HelpMate",
      prefillName:  profile?.ownerName || profile?.coachingName || "",
      prefillEmail: user?.email || "",
      prefillPhone: profile?.phone || "",
      onSuccess: async (paymentId) => {
        setPaying(false);
        // Save purchase to Firestore
        try {
          await addDoc(collection(db, "purchases"), {
            userId:      user?.uid || "guest",
            userName:    profile?.ownerName || profile?.coachingName || "Guest",
            userEmail:   user?.email || "",
            itemId:      bundle.id,
            itemType:    "bundle",
            itemName:    bundle.title,
            amount:      bundle.price,
            paymentId,
            bundleType:  bundle.type,
            status:      bundle.type === "custom" ? "pending_branding" : "completed",
            files:       bundle.type === "custom" ? [] : (bundle.files || []),
            createdAt:   serverTimestamp(),
          });
          // Increment sales count
          if (!bundle.id.startsWith("s")) {
            await updateDoc(doc(db, "bundles", bundle.id), { sales: increment(1) });
          }
        } catch(e) { console.error(e); }
        setModalData({ paymentId, amount: bundle.price, itemName: bundle.title });
      },
      onFailure: (err) => {
        setPaying(false);
        if (err !== "dismissed") alert("Payment failed. Please try again or WhatsApp us.");
      },
    });
  };

  return (
    <div style={{ background:t.bg, minHeight:"100vh" }}>

      {/* ── Hero ── */}
      <div style={{ padding:"64px 5% 50px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle at 15% 50%,${t.gold}12 0%,transparent 50%),radial-gradient(circle at 85% 20%,${t.accent}10 0%,transparent 45%)` }}/>
        <div style={{ position:"relative", zIndex:1, maxWidth:720 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", background:`${t.gold}18`, border:`1px solid ${t.gold}30`, borderRadius:20, fontSize:".76rem", fontWeight:700, color:t.gold, marginBottom:18, letterSpacing:".06em" }}>
            📦 CONTENT BUNDLES · READY TO USE
          </div>
          <h1 style={{ fontSize:"clamp(1.8rem,5vw,3rem)", fontWeight:900, color:t.text, marginBottom:14, lineHeight:1.2 }}>
            Premium Content Bundles<br/>
            <span style={{ color:t.gold }}>General & Custom Branded</span>
          </h1>
          <p style={{ fontSize:"1rem", color:t.muted, lineHeight:1.7, marginBottom:28, maxWidth:580 }}>
            Ready-made MCQ banks, PPTs & study material. Buy general bundles instantly or get them custom-branded with your coaching logo, name & colors.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
            {[["📚","10,000+ MCQs in stock"],["⚡","Instant delivery after payment"],["🎨","Custom branding in 24hrs"],["⭐","4.9/5 average rating"]].map(([icon,txt])=>(
              <div key={txt} style={{ display:"flex", alignItems:"center", gap:8, fontSize:".84rem", color:t.muted }}>
                <span>{icon}</span><span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div style={{ padding:"0 5% 28px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
          <div style={{ position:"relative", flex:"1 1 260px" }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:t.muted, fontSize:"1rem" }}>🔍</span>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search bundles..."
              style={{ width:"100%", padding:"10px 14px 10px 40px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, fontSize:".88rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=t.gold}
              onBlur={e=>e.target.style.borderColor=t.border}
            />
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={()=>setActiveTab(cat)}
                style={{ padding:"8px 16px", borderRadius:20, border:"none", fontFamily:"inherit", fontSize:".82rem", fontWeight:600, cursor:"pointer", transition:"all .2s",
                  background: activeTab===cat ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard,
                  color: activeTab===cat ? "#070B14" : t.muted,
                  outline: activeTab===cat ? "none" : `1px solid ${t.border}`,
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:"0 5% 60px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:t.muted }}>
            <div style={{ fontSize:"2rem", marginBottom:10 }}>⏳</div>Loading bundles...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:t.muted }}>
            <div style={{ fontSize:"3rem", marginBottom:14 }}>📦</div>
            <div style={{ fontWeight:700, color:t.text, marginBottom:8 }}>No bundles found</div>
            <div style={{ fontSize:".88rem" }}>Try a different search or <a href="https://wa.me/919241653369" target="_blank" rel="noreferrer" style={{ color:"#25D366", fontWeight:700 }}>WhatsApp us</a> for custom orders.</div>
          </div>
        ) : (
          <>
            {/* General bundles */}
            {general.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, padding:"12px 18px", background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"rgba(99,102,241,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>📚</div>
                  <div>
                    <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>General Bundles</div>
                    <div style={{ fontSize:".76rem", color:t.muted }}>Ready-to-use, instant download after payment</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:18 }}>
                  {general.map(b => <BundleCard key={b.id} bundle={b} t={t} onView={setViewBundle} onBuy={handleBuy}/>)}
                </div>
              </div>
            )}

            {/* Custom branding bundles */}
            {custom.length > 0 && (
              <div style={{ marginBottom:48 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, padding:"12px 18px", background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)", borderRadius:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"rgba(245,158,11,.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>🎨</div>
                  <div>
                    <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>Custom Branding Bundles <span style={{ fontSize:".72rem", background:"#F59E0B", color:"#070B14", padding:"2px 8px", borderRadius:20, marginLeft:8, verticalAlign:"middle" }}>PREMIUM</span></div>
                    <div style={{ fontSize:".76rem", color:t.muted }}>Same content — but branded with YOUR coaching logo & name. Delivered in 24hrs.</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:18 }}>
                  {custom.map(b => <BundleCard key={b.id} bundle={b} t={t} onView={setViewBundle} onBuy={handleBuy}/>)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom CTA */}
        <div style={{ background:`linear-gradient(135deg,${t.accent}18,${t.gold}10)`, border:`1px solid ${t.border}`, borderRadius:20, padding:"32px 28px", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:20 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:"1.15rem", color:t.text, marginBottom:8 }}>Need something not listed here?</h3>
            <div style={{ fontSize:".85rem", color:t.muted, lineHeight:1.6 }}>
              We create custom MCQ banks for any subject, class or exam pattern.<br/>
              Bulk orders get special discounts. WhatsApp us for a quote.
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <a href="https://wa.me/919241653369?text=Hi! I need a custom bundle quote." target="_blank" rel="noreferrer"
              style={{ padding:"11px 22px", background:"#25D366", color:"#fff", borderRadius:12, fontWeight:700, fontSize:".88rem", textDecoration:"none" }}>
              💬 WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {viewBundle && (
        <BundleDetailModal bundle={viewBundle} t={t} onClose={()=>setViewBundle(null)} onBuy={handleBuy}/>
      )}

      {/* Payment success modal */}
      {modalData && (
        <PostPaymentModal
          paymentId={modalData.paymentId} amount={modalData.amount}
          itemName={modalData.itemName} itemType="bundle"
          onClose={()=>setModalData(null)} t={t}
        />
      )}

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