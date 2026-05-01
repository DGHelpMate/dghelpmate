// src/pages/client/ClientPortal.jsx
// Coaching Owner Portal — for teachers who hire DG HelpMate services
import { useState, useEffect } from "react";
import {
  collection, query, where, updateDoc, doc,
  addDoc, serverTimestamp, onSnapshot, getDoc, getDocs, orderBy
} from "firebase/firestore";
import { db } from "../../firebase/config";
import useAuth from "../../hooks/useAuth";
import ChatWidget from "../../components/ui/ChatSystem";
import { ClientPaymentBox } from "../../components/ui/PaymentSystem";
import Invoice from "../../components/ui/Invoice";
import { sendAdminNotification } from "../../hooks/useNotifications";
import NotificationBell from "../../components/ui/NotificationBell";
import { lazy, Suspense } from "react";
const BundlesPage   = lazy(() => import("../Bundles"));
const MaterialsPage = lazy(() => import("../OtherPages").then(m => ({ default: m.Materials })));
const ServicesPage  = lazy(() => import("../Services"));

const TABS = ["Dashboard","My Work","Request Work","Chat","Payments","Store","My Purchases","Profile"];
const EMOJIS = { "Dashboard":"🏠","My Work":"📁","Request Work":"➕","Chat":"💬","Payments":"💳","Store":"🛒","My Purchases":"🛍️","Profile":"👤" };

const SERVICE_TYPES = [
  { id:"ppt",       icon:"📊", label:"PPT / Smart Board Slides",    desc:"Professional presentation design" },
  { id:"thumbnail", icon:"🖼️", label:"YouTube Thumbnail",           desc:"Eye-catching thumbnails" },
  { id:"mcq",       icon:"📋", label:"MCQ / Question Bank",         desc:"Chapter-wise MCQ creation" },
  { id:"typing",    icon:"⌨️", label:"Typing Work (Hindi/English)", desc:"Fast typing & formatting" },
  { id:"youtube",   icon:"▶️", label:"YouTube Channel Management",  desc:"SEO, description, tags" },
  { id:"pdf",       icon:"📄", label:"PDF / Notes Creation",        desc:"Study material design" },
  { id:"poster",    icon:"🎨", label:"Poster / Banner Design",      desc:"Social media graphics" },
  { id:"other",     icon:"💼", label:"Other Work",                  desc:"Describe your requirement" },
];

const StatusBadge = ({ status }) => {
  const map = {
    new:        { bg:"rgba(99,102,241,.15)",  color:"#818CF8", label:"🆕 New" },
    pending:    { bg:"rgba(245,158,11,.15)",  color:"#F59E0B", label:"⏳ In Review" },
    inprogress: { bg:"rgba(59,130,246,.15)",  color:"#3B82F6", label:"🔄 In Progress" },
    revision:   { bg:"rgba(245,158,11,.15)",  color:"#F59E0B", label:"📝 Revision" },
    done:       { bg:"rgba(16,185,129,.15)",  color:"#10B981", label:"✅ Delivered" },
    cancelled:  { bg:"rgba(239,68,68,.15)",   color:"#EF4444", label:"❌ Cancelled" },
    paid:       { bg:"rgba(16,185,129,.15)",  color:"#10B981", label:"✓ Paid" },
  };
  const s = map[status] || map.pending;
  return <span style={{ background:s.bg, color:s.color, padding:"3px 10px", borderRadius:50, fontSize:".73rem", fontWeight:700, whiteSpace:"nowrap" }}>{s.label}</span>;
};

export default function ClientPortal({ t, dark, toggleTheme, setPage, showSwitchBtn=false, switchLabel="🎓 Switch to Student Mode", onSwitch }) {
  const { user, profile, logout } = useAuth();
  const [tab,         setTab]         = useState("Dashboard");
  const [invoice,     setInvoice]     = useState(null);
  const [orders,      setOrders]      = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [dues,        setDues]        = useState(0);
  const [flash,       setFlash_]      = useState("");
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [purchases, setPurchases] = useState([]);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [storePage, setStorePage] = useState(null); // "bundles" | "materials" | "services" | null
  const [photoUploading, setPhotoUploading] = useState(false);
  const [logoUploading, setLogoUploading]   = useState(false);

  // Request work form
  const [reqType,     setReqType]     = useState("");
  const [reqTopic,    setReqTopic]    = useState("");
  const [reqDesc,     setReqDesc]     = useState("");
  const [reqDeadline, setReqDeadline] = useState("");
  const [reqSending,  setReqSending]  = useState(false);

  // Profile edit
  const [editProfile, setEditProfile] = useState(false);
  const [prof,        setProf]        = useState({ coachingName:"", ownerName:"", phone:"", city:"", subject:"", youtube:"" });

  const flashMsg = (m) => { setFlash_(m); setTimeout(()=>setFlash_(""),3000); };

  useEffect(() => {
    if (!user) return;
    setProf({
      coachingName: profile?.coachingName||"",
      ownerName:    profile?.ownerName||"",
      phone:        profile?.phone||"",
      city:         profile?.city||"",
      subject:      profile?.subject||"",
      youtube:      profile?.youtube||"",
    });

    // Orders realtime
    const unsub1 = onSnapshot(
      query(collection(db,"orders"), where("clientId","==",user.uid)),
      snap => {
        const data = snap.docs.map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
        setOrders(data);
        setNewOrderCount(data.filter(o=>o.status==="done"&&!o.seenByClient).length);
        const totalDues = data.reduce((s,o)=>s+((o.totalAmount||0)-(o.paidAmount||0)),0);
        setDues(Math.max(0,totalDues));
      }
    );

    // Client files
    const unsub2 = onSnapshot(
      query(collection(db,"clientFiles"), where("clientId","==",user.uid)),
      snap => setSharedFiles(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)))
    );

    // Payments
    const unsub3 = onSnapshot(
      query(collection(db,"clientPayments"), where("clientId","==",user.uid)),
      snap => setPayments(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)))
    );

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db,"purchases"), where("userId","==",user.uid)))
      .then(snap => setPurchases(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))))
      .catch(()=>{});
  }, [user]);

  const uploadPhoto = async (file, field) => {
    // Validate file
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { flashMsg("❌ File too large! Max 5MB."); return; }
    if (!file.type.startsWith("image/")) { flashMsg("❌ Only image files allowed!"); return; }

    const setter = field==="photoUrl" ? setPhotoUploading : setLogoUploading;
    setter(true);
    flashMsg("⏳ Uploading...");
    try {
      const { ref: sRef, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
      const { storage } = await import("../../firebase/config");

      // Compress image before upload
      const compressed = await new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = field === "logoUrl" ? 200 : 400;
          const ratio = Math.min(maxSize/img.width, maxSize/img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(resolve, "image/jpeg", 0.85);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });

      const r = sRef(storage, `profiles/${user.uid}/${field}_${Date.now()}.jpg`);
      const task = uploadBytesResumable(r, compressed);

      await new Promise((resolve, reject) => {
        task.on("state_changed",
          (snap) => {
            const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
            flashMsg(`⏳ Uploading... ${pct}%`);
          },
          reject,
          resolve
        );
      });

      const downloadUrl = await getDownloadURL(r);
      await updateDoc(doc(db,"users",user.uid), { [field]: downloadUrl });
      setProf(p=>({...p,[field]:downloadUrl}));
      flashMsg("✅ " + (field==="logoUrl" ? "Logo" : "Photo") + " updated!");
    } catch(e) {
      console.error("Upload error:", e);
      if (e.code === "storage/unauthorized") {
        flashMsg("❌ Permission denied — check Firebase Storage rules");
      } else if (e.message?.includes("CORS")) {
        flashMsg("❌ CORS error — will work in production. Use URL for now.");
      } else {
        flashMsg("❌ Upload failed: " + (e.message||"Unknown error"));
      }
    }
    setter(false);
  };

  const saveProfile = async () => {
    try {
      await updateDoc(doc(db,"users",user.uid), prof);
      flashMsg("✅ Profile updated!");
      setEditProfile(false);
    } catch { flashMsg("❌ Update failed"); }
  };

  const submitRequest = async () => {
    if (!reqType || !reqTopic.trim()) { flashMsg("❌ Select work type and enter topic"); return; }
    setReqSending(true);
    try {
      const svc = SERVICE_TYPES.find(s=>s.id===reqType);
      await addDoc(collection(db,"orders"), {
        clientId:    user.uid,
        clientName:  profile?.coachingName||profile?.ownerName||"",
        itemType:    "service",
        serviceType: reqType,
        serviceLabel: svc?.label||reqType,
        topic:       reqTopic.trim(),
        description: reqDesc.trim(),
        deadline:    reqDeadline,
        status:      "new",
        totalAmount: 0,
        paidAmount:  0,
        createdAt:   serverTimestamp(),
      });
      sendAdminNotification({
        title: `📥 New Work Request!`,
        body:  `${profile?.coachingName||"Teacher"}: ${svc?.label} — "${reqTopic.trim()}"`,
        type:  "order",
      });
      setReqType(""); setReqTopic(""); setReqDesc(""); setReqDeadline("");
      flashMsg("✅ Request sent! We'll respond within 2 hours.");
      setTab("My Work");
    } catch { flashMsg("❌ Failed to send. Try again."); }
    setReqSending(false);
  };

  const inp = {
    width:"100%", padding:"10px 12px", background:t.bg,
    border:`1px solid ${t.border}`, borderRadius:9,
    fontSize:".9rem", color:t.text, fontFamily:"inherit",
    outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{ minHeight:"100vh", background:t.bg, fontFamily:"inherit" }}>
      <style>{`
        @keyframes cp-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cp-spin{to{transform:rotate(360deg)}}
        @keyframes cp-prog{from{width:0%}to{width:100%}}

        /* ── Upload overlay ── */
        .cp-upload-overlay{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;border-radius:inherit;z-index:5;}
        .cp-spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:cp-spin .7s linear infinite;}

        /* ── Mobile ── */
        /* ── Desktop header ── */
        .cp-header{display:flex;align-items:center;justify-content:space-between;padding:0 18px;height:62px;position:sticky;top:0;z-index:50;}
        .cp-header-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;margin:0 12px;}
        .cp-header-tabs::-webkit-scrollbar{display:none;}
        .cp-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0;}
        .cp-content{padding:22px 24px;}
        .cp-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
        .cp-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .cp-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
        .cp-qa-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
        .cp-profile-grid{display:grid;grid-template-columns:2fr 1fr;gap:18px;}
        .cp-profile-det{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;}
        .cp-card-hover{transition:transform .2s,box-shadow .2s;}
        .cp-card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3);}

        /* ── Mobile nav bottom bar ── */
        .cp-mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;overflow-x:auto;scrollbar-width:none;}
        .cp-mob-nav::-webkit-scrollbar{display:none;}

        @media(max-width:768px){
          .cp-desk{display:none!important;}
          .cp-mob{display:flex!important;}
          .cp-mob-nav{display:flex!important;}
          .cp-content{padding:12px 10px 80px!important;}
          .cp-header{padding:0 12px;height:56px;}
          .cp-header-tabs{display:none!important;}
          .cp-stat-grid{grid-template-columns:1fr 1fr!important;gap:10px!important;}
          .cp-grid-2{grid-template-columns:1fr!important;}
          .cp-grid-3{grid-template-columns:1fr 1fr!important;}
          .cp-qa-grid{grid-template-columns:1fr 1fr!important;}
          .cp-profile-grid{grid-template-columns:1fr!important;}
          .cp-profile-det{grid-template-columns:1fr!important;}
          .cp-full{flex-direction:column!important;}
          .cp-hide-sm{display:none!important;}
        }
        @media(min-width:769px){
          .cp-mob{display:none!important;}
          .cp-mob-nav{display:none!important;}
        }
        @media(max-width:900px) and (min-width:769px){
          .cp-profile-grid{grid-template-columns:1fr!important;}
          .cp-stat-grid{grid-template-columns:1fr 1fr 1fr!important;}
        }
      `}</style>

      {/* Flash */}
      {flash && (
        <div style={{ position:"fixed", top:80, left:"50%", transform:"translateX(-50%)", background:flash.startsWith("✅")?"#10B981":"#EF4444", color:"#fff", padding:"10px 22px", borderRadius:10, fontWeight:700, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 4px 20px rgba(0,0,0,.3)" }}>
          {flash}
        </div>
      )}

      {/* Invoice modal */}
      {invoice && <Invoice order={invoice} profile={profile} onClose={()=>setInvoice(null)} t={t}/>}

      {/* ── NAVBAR ── */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:t.bg+"ee", backdropFilter:"blur(20px)", borderBottom:`1px solid ${t.border}` }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 clamp(16px,4%,40px)", display:"flex", alignItems:"center", justifyContent:"space-between", height:58, width:"100%", boxSizing:"border-box" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#F59E0B,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:".9rem", color:"#070B14", flexShrink:0 }}>
              {profile?.coachingName?.[0]||"C"}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:".88rem", color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{profile?.coachingName||"Coaching Portal"}</div>
              <div style={{ fontSize:".68rem", color:t.gold, fontWeight:600 }}>Coaching Owner</div>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="cp-desk cp-header-tabs" style={{ display:"flex", gap:4, alignItems:"center" }}>
            {TABS.map(t2=>(
              <button key={t2} onClick={()=>setTab(t2)} style={{ padding:"7px 13px", borderRadius:9, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:".8rem", fontWeight:600, background:tab===t2?"linear-gradient(135deg,#F59E0B,#F97316)":t.bgCard, color:tab===t2?"#070B14":t.muted, transition:"all .15s", position:"relative" }}>
                {t2==="My Work" && newOrderCount>0 && <span style={{ position:"absolute", top:-4, right:-4, background:"#EF4444", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:".62rem", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>{newOrderCount}</span>}
                {EMOJIS[t2]||""} {t2}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={toggleTheme} title="Toggle theme" style={{width:34,height:34,borderRadius:8,border:`1px solid ${t.border}`,background:t.bgCard,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"1rem",flexShrink:0}}>
              {dark?"☀️":"🌙"}
            </button>
            <NotificationBell t={t}/>

            <button onClick={logout} style={{ padding:"6px 12px", background:"none", border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".78rem" }} className="cp-desk">Logout</button>
            <button onClick={logout} style={{ padding:"6px 10px", background:"none", border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".78rem", display:"none" }} className="cp-mob">Exit</button>

          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="cp-mob-nav" style={{ background:t.bgCard, borderTop:`1px solid ${t.border}` }}>
          {TABS.map(tb=>(
            <button key={tb} onClick={()=>setTab(tb)} style={{ flex:"0 0 auto", padding:"9px 12px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:".6rem", fontWeight:tab===tb?700:400, color:tab===tb?t.gold:t.muted, borderTop:tab===tb?`2px solid ${t.gold}`:"2px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", gap:2, position:"relative", minWidth:52 }}>
              <span style={{ fontSize:".95rem" }}>{EMOJIS[tb]||"📋"}</span>
              <span style={{ whiteSpace:"nowrap" }}>{tb.split(" ")[0]}</span>
              {tb==="My Work" && newOrderCount>0 && <span style={{ position:"absolute", top:5, right:6, background:"#EF4444", color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:".55rem", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>{newOrderCount}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="cp-content" style={{ maxWidth:1100, margin:"0 auto", padding:"clamp(16px,3%,28px) clamp(12px,3%,28px)" }}>

        {/* ── DASHBOARD ── */}
        {/* ══ EMBEDDED STORE PAGES ══ */}
        {storePage && (
          <div style={{animation:"cp-fade .3s ease"}}>
            <button onClick={()=>setStorePage(null)}
              style={{display:"flex",alignItems:"center",gap:8,background:"none",border:`1px solid ${t.border}`,color:t.muted,padding:"7px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",fontSize:".84rem",marginBottom:20}}>
              ← Back to Portal
            </button>
            <Suspense fallback={<div style={{textAlign:"center",padding:60,color:t.muted}}>⏳ Loading...</div>}>
              {storePage==="bundles"   && <BundlesPage t={t}/>}
              {storePage==="materials" && <MaterialsPage t={t}/>}
              {storePage==="services"  && <ServicesPage t={t}/>}
            </Suspense>
          </div>
        )}

        {!storePage && tab==="Dashboard" && (
          <div>
            <h2 style={{ fontWeight:900, fontSize:"1.3rem", color:t.text, marginBottom:6 }}>
              👋 Welcome, {profile?.ownerName||profile?.coachingName||"Teacher"}!
            </h2>
            <p style={{ color:t.muted, marginBottom:24, fontSize:".88rem" }}>
              DG HelpMate is your digital assistant — PPT, thumbnails, MCQ, YouTube & more.
            </p>

            {/* Quick stats */}
            <div className="cp-stat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
              {[
                { icon:"📦", label:"Total Orders", value:orders.length, color:t.accent },
                { icon:"🔄", label:"In Progress", value:orders.filter(o=>o.status==="inprogress").length, color:"#3B82F6" },
                { icon:"✅", label:"Delivered", value:orders.filter(o=>o.status==="done").length, color:"#10B981" },
                { icon:"💰", label:"Dues", value:dues>0?`₹${dues.toLocaleString()}`:"Clear ✓", color:dues>0?"#EF4444":t.green },
              ].map(s=>(
                <div key={s.label} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"16px 18px" }}>
                  <div style={{ fontSize:"1.4rem", marginBottom:8 }}>{s.icon}</div>
                  <div style={{ fontSize:"clamp(1.3rem,4vw,1.7rem)", fontWeight:900, color:s.color, marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:".78rem", color:t.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:20 }}>
              <h3 style={{ fontWeight:800, color:t.text, fontSize:".95rem", marginBottom:16 }}>⚡ Quick Actions</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                {[
                  { icon:"➕", label:"Request Work", action:()=>setTab("Request Work") },
                  { icon:"📁", label:"My Files", action:()=>setTab("My Work") },
                  { icon:"💬", label:"Chat with Us", action:()=>setTab("💬 Chat") },
                  { icon:"💳", label:"Make Payment", action:()=>setTab("Payments") },
                ].map(a=>(
                  <button key={a.label} onClick={a.action}
                    style={{ padding:"14px 10px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:12, cursor:"pointer", fontFamily:"inherit", textAlign:"center", transition:"all .15s" }}
                    onMouseOver={e=>{ e.currentTarget.style.borderColor=t.gold; e.currentTarget.style.background=`${t.gold}08`; }}
                    onMouseOut={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.bg; }}>
                    <div style={{ fontSize:"1.5rem", marginBottom:6 }}>{a.icon}</div>
                    <div style={{ fontSize:".8rem", fontWeight:700, color:t.text }}>{a.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent orders */}
            {orders.length > 0 && (
              <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <h3 style={{ fontWeight:800, color:t.text, fontSize:".95rem", margin:0 }}>📦 Recent Orders</h3>
                  <button onClick={()=>setTab("My Work")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontSize:".8rem", fontWeight:700, fontFamily:"inherit" }}>View all →</button>
                </div>
                {orders.slice(0,4).map(o=>(
                  <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <div>
                      <div style={{ fontWeight:600, color:t.text, fontSize:".87rem" }}>{o.serviceLabel||o.topic||o.itemName||"Order"}</div>
                      <div style={{ fontSize:".73rem", color:t.muted, marginTop:2 }}>{o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString("en-IN") : ""}</div>
                    </div>
                    <StatusBadge status={o.status}/>
                  </div>
                ))}
              </div>
            )}

            {/* Payment dues */}
            {dues > 0 && (
              <div style={{ marginTop:16 }}>
                <ClientPaymentBox duesAmount={dues} clientName={profile?.coachingName||"Client"} clientId={user?.uid} t={t}/>
              </div>
            )}
          </div>
        )}

        {/* ── MY WORK (files + orders) ── */}
        {!storePage && tab==="My Work" && (
          <div>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", marginBottom:20 }}>📁 My Work</h2>

            {/* Delivered files */}
            {sharedFiles.length > 0 && (
              <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:20 }}>
                <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", marginBottom:14 }}>📥 Delivered Files</h3>
                <div style={{ display:"grid", gap:10 }}>
                  {sharedFiles.map(f=>(
                    <div key={f.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:11 }}>
                      <span style={{ fontSize:"1.4rem" }}>
                        {(f.type||"").toLowerCase().includes("pdf")?"📄":(f.type||"").toLowerCase().includes("ppt")?"📊":"📁"}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, color:t.text, fontSize:".87rem" }}>{f.title||f.fileName||"File"}</div>
                        <div style={{ fontSize:".72rem", color:t.muted, marginTop:2 }}>{f.type||""} · {f.createdAt?.seconds ? new Date(f.createdAt.seconds*1000).toLocaleDateString("en-IN") : ""}</div>
                      </div>
                      {f.fileUrl && (
                        <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                          style={{ padding:"7px 14px", background:`linear-gradient(135deg,${t.accent},#4F46E5)`, color:"#fff", borderRadius:8, fontWeight:700, fontSize:".8rem", textDecoration:"none", flexShrink:0 }}>
                          ↓ Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All orders */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px" }}>
              <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", marginBottom:14 }}>📦 All Orders</h3>
              {orders.length===0 ? (
                <div style={{ textAlign:"center", padding:"30px", color:t.muted }}>
                  <div style={{ fontSize:"2.5rem", marginBottom:10 }}>📦</div>
                  <p>No orders yet. Request work to get started!</p>
                  <button onClick={()=>setTab("Request Work")} style={{ marginTop:8, padding:"10px 22px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>+ Request Work</button>
                </div>
              ) : (
                orders.map(o=>(
                  <div key={o.id} style={{ padding:"14px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:"1.1rem" }}>{SERVICE_TYPES.find(s=>s.id===o.serviceType)?.icon||"📋"}</span>
                          <div style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>{o.serviceLabel||o.topic||"Order"}</div>
                        </div>
                        <div style={{ fontSize:".78rem", color:t.muted }}>{o.topic}</div>
                        {o.deadline && <div style={{ fontSize:".73rem", color:t.muted, marginTop:2 }}>📅 Deadline: {o.deadline}</div>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <StatusBadge status={o.status}/>
                        <button onClick={()=>setInvoice(o)} style={{ padding:"5px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".75rem" }}>Invoice</button>
                      </div>
                    </div>
                    {o.driveLink && (
                      <a href={o.driveLink} target="_blank" rel="noopener noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"6px 14px", background:"#10B98115", border:"1px solid #10B98130", borderRadius:8, color:"#10B981", fontWeight:700, fontSize:".8rem", textDecoration:"none" }}>
                        ↓ Download Delivered File
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── REQUEST WORK ── */}
        {!storePage && tab==="Request Work" && (
          <div style={{ maxWidth:640 }}>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", marginBottom:6 }}>➕ Request New Work</h2>
            <p style={{ color:t.muted, fontSize:".85rem", marginBottom:20 }}>Tell us what you need — we'll get back to you within 2 hours!</p>

            {/* Service type grid */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:16 }}>
              <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:12 }}>What do you need? *</label>
              <div className="cp-qa-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {SERVICE_TYPES.map(s=>(
                  <button key={s.id} onClick={()=>setReqType(s.id)}
                    style={{ padding:"12px 10px", background:reqType===s.id?`linear-gradient(135deg,${t.accent}20,${t.accent}08)`:"none", border:`1.5px solid ${reqType===s.id?t.accent:t.border}`, borderRadius:12, cursor:"pointer", fontFamily:"inherit", textAlign:"center", transition:"all .15s" }}>
                    <div style={{ fontSize:"1.4rem", marginBottom:5 }}>{s.icon}</div>
                    <div style={{ fontSize:".76rem", fontWeight:700, color:reqType===s.id?t.accent:t.text, lineHeight:1.3 }}>{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Topic / Title *</label>
                <input value={reqTopic} onChange={e=>setReqTopic(e.target.value)} placeholder="e.g. Chapter 5 Biology PPT" style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Details (optional)</label>
                <textarea value={reqDesc} onChange={e=>setReqDesc(e.target.value)} rows={3} placeholder="Any specific requirements, style, number of slides, etc."
                  style={{ ...inp, resize:"vertical" }}/>
              </div>
              <div>
                <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Deadline (optional)</label>
                <input type="date" value={reqDeadline} onChange={e=>setReqDeadline(e.target.value)} style={inp}/>
              </div>
              <button onClick={submitRequest} disabled={reqSending||!reqType||!reqTopic.trim()}
                style={{ padding:"13px", background:reqType&&reqTopic.trim()?"linear-gradient(135deg,#F59E0B,#F97316)":t.border, color:reqType&&reqTopic.trim()?"#070B14":t.muted, border:"none", borderRadius:11, fontWeight:800, fontSize:".95rem", cursor:reqType&&reqTopic.trim()?"pointer":"not-allowed", fontFamily:"inherit", transition:"all .2s" }}>
                {reqSending?"Sending...":"📤 Send Request"}
              </button>
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {!storePage && tab==="Chat" && (
          <div style={{ maxWidth:700, margin:"0 auto" }}>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", marginBottom:16 }}>💬 Chat with DG HelpMate</h2>
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, overflow:"hidden", height:"calc(100vh - 200px)", minHeight:400, display:"flex", flexDirection:"column" }}>
              <div style={{ flex:1, overflow:"hidden" }}>
                <ChatWidget chatId={user?.uid} isAdmin={false} t={t}/>
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ── */}
        {!storePage && tab==="Payments" && (
          <div style={{ maxWidth:640 }}>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", marginBottom:20 }}>💳 Payments</h2>
            {dues > 0 && (
              <div style={{ marginBottom:20 }}>
                <ClientPaymentBox duesAmount={dues} clientName={profile?.coachingName||"Client"} clientId={user?.uid} t={t}/>
              </div>
            )}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px" }}>
              <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", marginBottom:14 }}>Payment History</h3>
              {payments.length===0 ? (
                <p style={{ color:t.muted, fontSize:".86rem" }}>No payments yet.</p>
              ) : (
                payments.map(p=>(
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${t.border}40` }}>
                    <div>
                      <div style={{ fontWeight:600, color:t.text, fontSize:".87rem" }}>₹{(p.amount||0).toLocaleString()}</div>
                      <div style={{ fontSize:".73rem", color:t.muted, marginTop:2 }}>{p.createdAt?.seconds ? new Date(p.createdAt.seconds*1000).toLocaleDateString("en-IN") : ""} · {p.method||"Online"}</div>
                    </div>
                    <StatusBadge status="paid"/>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {/* ══ STORE ══ */}
        {!storePage && tab==="Store" && (
          <div style={{ animation:"cp-fade .3s ease" }}>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", marginBottom:6 }}>🛒 DG HelpMate Store</h2>
            <p style={{ color:t.muted, fontSize:".86rem", marginBottom:24 }}>Browse and purchase bundles, materials & services. Files delivered instantly to My Purchases.</p>

            {/* Store cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,240px),1fr))", gap:16, marginBottom:28 }}>
              {[
                { icon:"📦", title:"Content Bundles", desc:"MCQ banks, PPT sets & more — General or Custom Branded", color:"#6366F1", page:"bundles", badge:"HOT" },
                { icon:"📂", title:"Digital Materials", desc:"Free & premium PPTs, PDFs, Word templates, Canva designs", color:"#10B981", page:"materials", badge:"FREE" },
                { icon:"🛠️", title:"Services", desc:"MCQ creation, PPT design, thumbnails, typing & more", color:"#F59E0B", page:"services", badge:null },
              ].map(item => (
                <div key={item.page}
                  onClick={() => setStorePage(item.page)}
                  style={{ background:t.bgCard, border:`1px solid ${item.color}30`, borderRadius:16, overflow:"hidden", cursor:"pointer", transition:"transform .2s, box-shadow .2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,.3)`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{ height:4, background:`linear-gradient(90deg,${item.color},${item.color}80)` }}/>
                  <div style={{ padding:"20px 18px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ width:48, height:48, borderRadius:12, background:`${item.color}18`, border:`1px solid ${item.color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem" }}>
                        {item.icon}
                      </div>
                      {item.badge && (
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:".65rem", fontWeight:800,
                          background: item.badge==="FREE"?"rgba(16,185,129,.2)":"rgba(239,68,68,.2)",
                          color: item.badge==="FREE"?"#10B981":"#EF4444" }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight:800, fontSize:".98rem", color:t.text, marginBottom:6 }}>{item.title}</div>
                    <div style={{ fontSize:".8rem", color:t.muted, lineHeight:1.55, marginBottom:16 }}>{item.desc}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:".76rem", color:item.color, fontWeight:700 }}>Browse →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent purchases quick view */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontWeight:700, color:t.text, fontSize:".92rem" }}>🛍️ Recent Purchases</div>
                <button onClick={()=>setTab("My Purchases")} style={{ background:"none", border:"none", color:t.accent, cursor:"pointer", fontFamily:"inherit", fontSize:".8rem", fontWeight:700 }}>View all →</button>
              </div>
              {purchases.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0", color:t.muted, fontSize:".86rem" }}>
                  No purchases yet. Browse the store above!
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {purchases.slice(0,3).map(p => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:t.bgCard2, borderRadius:9, gap:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                        <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{p.itemType==="bundle"?"📦":"📂"}</span>
                        <span style={{ fontSize:".83rem", color:t.text, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.itemName}</span>
                      </div>
                      <span style={{ padding:"3px 9px", borderRadius:20, fontSize:".68rem", fontWeight:700, flexShrink:0,
                        background: p.status==="completed"?"rgba(16,185,129,.15)":"rgba(245,158,11,.15)",
                        color: p.status==="completed"?t.green:t.gold }}>
                        {p.status==="completed"?"✅ Ready":"⏳"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!storePage && tab==="My Purchases" && (
          <div style={{ maxWidth:700 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem" }}>🛍️ My Purchases</h2>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:t.muted }}>🔍</span>
                <input value={purchaseSearch} onChange={e=>setPurchaseSearch(e.target.value)} placeholder="Search purchases..."
                  style={{ padding:"8px 12px 8px 36px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".84rem", color:t.text, fontFamily:"inherit", outline:"none", width:220 }}/>
              </div>
            </div>
            {purchases.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 20px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16 }}>
                <div style={{ fontSize:"3rem", marginBottom:14 }}>🛍️</div>
                <div style={{ fontWeight:700, color:t.text, marginBottom:8 }}>No purchases yet</div>
                <div style={{ fontSize:".86rem", color:t.muted }}>Buy bundles or materials from our store — they'll appear here instantly.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {purchases.filter(p => !purchaseSearch || p.itemName?.toLowerCase().includes(purchaseSearch.toLowerCase())).map(p => (
                  <div key={p.id} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"16px 18px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                          <span style={{ fontSize:"1.2rem" }}>{p.itemType==="bundle"?"📦":"📂"}</span>
                          <span style={{ fontWeight:700, color:t.text, fontSize:".92rem" }}>{p.itemName}</span>
                        </div>
                        <div style={{ fontSize:".76rem", color:t.muted }}>
                          {p.itemType==="bundle" ? "Content Bundle" : "Digital Material"} · ₹{p.amount?.toLocaleString()} · {p.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "Recently"}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                        <span style={{ padding:"4px 10px", borderRadius:20, fontSize:".72rem", fontWeight:700,
                          background: p.status==="completed"?"rgba(16,185,129,.15)":"rgba(245,158,11,.15)",
                          color: p.status==="completed"?t.green:t.gold }}>
                          {p.status==="completed"?"✅ Delivered":"⏳ Processing"}
                        </span>
                        {p.status==="completed" && (p.files||[]).length > 0 && (
                          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                            {p.files.map((f,i) => (
                              <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                style={{ padding:"5px 12px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", borderRadius:7, fontWeight:700, fontSize:".76rem", textDecoration:"none" }}>
                                ↓ {f.name || "Download"}
                              </a>
                            ))}
                          </div>
                        )}
                        {p.status==="pending_branding" && (
                          <a href={`https://wa.me/919241653369?text=Hi! I paid for ${p.itemName}. Payment ID: ${p.paymentId}. Please share branding details.`} target="_blank" rel="noreferrer"
                            style={{ padding:"5px 12px", background:"#25D36618", border:"1px solid #25D36635", borderRadius:7, color:"#25D366", fontWeight:700, fontSize:".76rem", textDecoration:"none" }}>
                            💬 Share Branding Details
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!storePage && tab==="Profile" && (
          <div style={{ maxWidth:640, animation:"cp-fade .3s ease" }}>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", marginBottom:20 }}>👤 My Profile</h2>

            {/* ── Hero card with cover ── */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:18, overflow:"hidden", marginBottom:14 }}>
              {/* Cover strip */}
              <div style={{ height:80, background:`linear-gradient(135deg,${t.accent}50,${t.gold}35)`, position:"relative" }}>
                <div style={{ position:"absolute", inset:0, opacity:.08, backgroundImage:`linear-gradient(${t.accent} 1px,transparent 1px),linear-gradient(90deg,${t.accent} 1px,transparent 1px)`, backgroundSize:"24px 24px" }}/>
              </div>

              <div style={{ padding:"0 20px 20px" }}>
                {/* Avatar + Logo row */}
                <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginTop:-36, marginBottom:14 }}>

                  {/* Profile photo */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    {prof.photoUrl
                      ? <img src={prof.photoUrl} alt="" style={{ width:72,height:72,borderRadius:"50%",objectFit:"cover",border:`3px solid ${t.bgCard}` }}/>
                      : <div style={{ width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"1.8rem",color:"#070B14",border:`3px solid ${t.bgCard}` }}>
                          {prof.coachingName?.[0]?.toUpperCase()||"C"}
                        </div>
                    }
                    <label style={{ position:"absolute",bottom:2,right:2,width:26,height:26,borderRadius:"50%",background:photoUploading?t.muted:t.accent,display:"flex",alignItems:"center",justifyContent:"center",cursor:photoUploading?"not-allowed":"pointer",border:`2px solid ${t.bgCard}`,transition:"background .2s" }}>
                      {photoUploading ? <div className="cp-spinner" style={{width:12,height:12,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff"}}/> : <span style={{fontSize:13}}>📷</span>}
                      <input type="file" accept="image/*" disabled={photoUploading} style={{display:"none"}} onChange={e=>e.target.files[0]&&uploadPhoto(e.target.files[0],"photoUrl")}/>
                    </label>
                  </div>

                  {/* Coaching logo */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ position:"relative" }}>
                      {prof.logoUrl
                        ? <img src={prof.logoUrl} alt="" style={{ width:56,height:56,borderRadius:10,objectFit:"contain",background:t.bgCard2,border:`1px solid ${t.border}`,padding:4 }}/>
                        : <div style={{ width:56,height:56,borderRadius:10,background:t.bgCard2,border:`1px dashed ${t.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",opacity:.5 }}>🏫</div>
                      }
                      <label style={{ position:"absolute",bottom:-4,right:-4,width:22,height:22,borderRadius:"50%",background:logoUploading?t.muted:t.gold,display:"flex",alignItems:"center",justifyContent:"center",cursor:logoUploading?"not-allowed":"pointer",border:`2px solid ${t.bgCard}`,transition:"background .2s" }}>
                        {logoUploading ? <div style={{width:10,height:10,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"cp-spin .7s linear infinite"}}/> : <span style={{fontSize:11}}>+</span>}
                        <input type="file" accept="image/*" disabled={logoUploading} style={{display:"none"}} onChange={e=>e.target.files[0]&&uploadPhoto(e.target.files[0],"logoUrl")}/>
                      </label>
                    </div>
                    <div style={{ fontSize:".6rem", color:t.muted }}>Logo</div>
                  </div>
                </div>

                {/* Name info */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontWeight:800, fontSize:"1.15rem", color:t.text }}>{prof.coachingName||"Your Coaching"}</div>
                  <div style={{ fontSize:".82rem", color:t.muted, marginTop:2 }}>{user?.email}</div>
                  {prof.ownerName && <div style={{ fontSize:".78rem", color:t.muted }}>👤 {prof.ownerName}</div>}
                  <div style={{ fontSize:".72rem", color:t.gold, fontWeight:600, marginTop:4 }}>Coaching Owner</div>
                </div>

                {/* Edit form */}
                {editProfile ? (
                  <div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                      {[
                        {label:"Coaching Name",key:"coachingName",placeholder:"Your coaching name",col:"1/-1"},
                        {label:"Owner Name",key:"ownerName",placeholder:"Your full name"},
                        {label:"Phone / WhatsApp",key:"phone",placeholder:"+91 XXXXX XXXXX"},
                        {label:"City",key:"city",placeholder:"e.g. Patna"},
                        {label:"State",key:"state",placeholder:"e.g. Bihar"},
                        {label:"Address",key:"address",placeholder:"Full address (optional)",col:"1/-1"},
                        {label:"Subjects Taught",key:"subject",placeholder:"e.g. Science, Maths, SSC",col:"1/-1"},
                        {label:"YouTube Channel",key:"youtube",placeholder:"https://youtube.com/@...",col:"1/-1"},
                        {label:"Website",key:"website",placeholder:"https://yourcoaching.com (optional)",col:"1/-1"},
                      ].map(f=>(
                        <div key={f.key} style={{gridColumn:f.col||"auto"}}>
                          <label style={{fontSize:".7rem",fontWeight:700,color:t.muted,textTransform:"uppercase",letterSpacing:".05em",display:"block",marginBottom:4}}>{f.label}</label>
                          <input value={prof[f.key]||""} onChange={e=>setProf({...prof,[f.key]:e.target.value})} placeholder={f.placeholder} style={inp}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={saveProfile} style={{flex:1,padding:"10px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:9,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Save Changes</button>
                      <button onClick={()=>setEditProfile(false)} style={{padding:"10px 18px",background:"none",border:`1px solid ${t.border}`,borderRadius:9,color:t.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setEditProfile(true)} style={{padding:"7px 16px",background:`${t.accent}18`,border:`1px solid ${t.accent}30`,borderRadius:8,color:t.accent,fontWeight:600,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit"}}>
                    ✏️ Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* ── Details card ── */}
            {!editProfile && (
              <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px", marginBottom:14 }}>
                <div style={{ fontSize:".7rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>Coaching Details</div>
                <div className="cp-profile-det" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
                  {[
                    ["📞","Phone",prof.phone],
                    ["📍","City",prof.city],
                    ["🗺️","State",prof.state],
                    ["📚","Subjects",prof.subject],
                    ["🌐","Address",prof.address],
                    ["▶️","YouTube",prof.youtube],
                    ["🔗","Website",prof.website],
                  ].filter(([,,v])=>v).map(([icon,label,val])=>(
                    <div key={label} style={{ padding:"8px 0", borderBottom:`1px solid ${t.border}30` }}>
                      <div style={{ fontSize:".68rem", color:t.muted, marginBottom:2 }}>{icon} {label}</div>
                      <div style={{ fontSize:".84rem", color:t.text, fontWeight:600, wordBreak:"break-all" }}>
                        {val.startsWith("http")
                          ? <a href={val} target="_blank" rel="noreferrer" style={{ color:t.accent, textDecoration:"none" }}>{val.replace("https://","").slice(0,30)}{val.length>35?"...":""}</a>
                          : val
                        }
                      </div>
                    </div>
                  ))}
                </div>
                {![prof.phone,prof.city,prof.subject].some(Boolean) && (
                  <div style={{ textAlign:"center", padding:"10px 0", color:t.muted, fontSize:".84rem" }}>
                    Profile details not added yet. Click Edit Profile to add.
                  </div>
                )}
              </div>
            )}

            {/* ── Actions ── */}
            {!editProfile && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <a href={`https://wa.me/919241653369?text=Hi! I am ${prof.coachingName||"a client"} and need help.`} target="_blank" rel="noreferrer"
                  style={{display:"block",textAlign:"center",background:"#25D366",color:"#fff",padding:"11px",borderRadius:10,fontWeight:700,textDecoration:"none"}}>
                  💬 WhatsApp Support
                </a>
                {showSwitchBtn && onSwitch && (
                  <button onClick={onSwitch} style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#8B5CF6,#6366F1)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:".9rem",marginBottom:4}}>
                    {switchLabel}
                  </button>
                )}
                <button onClick={logout} style={{width:"100%",padding:"10px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,color:"#EF4444",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}