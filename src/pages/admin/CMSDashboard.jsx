// src/pages/admin/CMSDashboard.jsx — v2 with separate Students tab + dual role grant
import { useState, useEffect } from "react";
import ImageUpload from "../../components/ui/ImageUpload";
import ClientDetailPage from "./ClientDetailPage";
import SiteContentEditor from "./SiteContentEditor";
import LMSAdmin from "./LMSAdmin";
import { AdminPaymentVerifier } from "../../components/ui/PaymentSystem";
import NotificationBell from "../../components/ui/NotificationBell";
import { AdminChatList } from "../../components/ui/ChatSystem";
import { Logo } from "../../components/ui/UI";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, setDoc, getDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../firebase/config";
import useAuth from "../../hooks/useAuth";
import BlogAdmin from "./BlogAdmin";
import BundleAdmin from "./BundleAdmin";
import MaterialAdmin from "./MaterialAdmin";
import ServiceAdmin from "./ServiceAdmin";
import AnalyticsDashboard from "./AnalyticsDashboard";
import CouponManager from "./CouponManager";
import NotificationPanel from "./NotificationPanel";
import AdminChatPanel from "./AdminChatPanel";
import ClientsPage from "./ClientsPage";
import QuizManager from "./QuizManager";

const css = (t) => `
  :root{--bg:${t.bg};--card:${t.bgCard};--bg2:${t.bgCard2};--bord:${t.border};--txt:${t.text};--mut:${t.muted};--gold:${t.gold};--acc:${t.accent};--grn:${t.green};--red:${t.red};}
  *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--txt);}button{font-family:inherit;cursor:pointer;}
  @media(max-width:768px){
    .admin-sidebar{transform:translateX(-100%);transition:transform .3s!important;}
    .admin-sidebar.open{transform:translateX(0)!important;}
    .admin-main{margin-left:0!important;padding:14px 12px!important;padding-top:68px!important;}
    .admin-overlay{display:block!important;}
  }
  @media(min-width:769px){
    .admin-sidebar{transform:none!important;}
    .admin-ham{display:none!important;}
    .admin-overlay{display:none!important;}
  }
  .cms-testi-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:24px;}
  .cms-student-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
  .cms-detail-info{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .cms-detail-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  @media(max-width:700px){
    .cms-testi-grid{grid-template-columns:1fr!important;}
    .cms-student-grid{grid-template-columns:1fr!important;}
    .cms-detail-info{grid-template-columns:1fr!important;}
    .cms-detail-stats{grid-template-columns:1fr 1fr!important;}
  }
`;

const Inp = ({ label, ...p }) => (
  <div style={{ marginBottom:13 }}>
    {label && <label style={{ fontSize:".77rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>}
    <input {...p} style={{ width:"100%", padding:"10px 13px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:".91rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", ...p.style }} />
  </div>
);

const Textarea = ({ label, ...p }) => (
  <div style={{ marginBottom:13 }}>
    {label && <label style={{ fontSize:".77rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>}
    <textarea {...p} style={{ width:"100%", padding:"10px 13px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:".91rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", resize:"vertical", ...p.style }} />
  </div>
);

const Sel = ({ label, children, ...p }) => (
  <div style={{ marginBottom:13 }}>
    {label && <label style={{ fontSize:".77rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>}
    <select {...p} style={{ width:"100%", padding:"10px 13px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:".91rem", color:"var(--txt)", fontFamily:"inherit", outline:"none" }}>{children}</select>
  </div>
);

const CardBox = ({ children, style={} }) => (
  <div style={{ background:"var(--card)", border:"1px solid var(--bord)", borderRadius:14, padding:"20px 18px", ...style }}>{children}</div>
);

const Btn = ({ children, variant="primary", onClick, type="button", disabled, style={} }) => {
  const v = {
    primary: { background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14" },
    green:   { background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff" },
    danger:  { background:"linear-gradient(135deg,#EF4444,#DC2626)", color:"#fff" },
    ghost:   { background:"transparent", border:"1px solid var(--bord)", color:"var(--mut)" },
    accent:  { background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff" },
    purple:  { background:"linear-gradient(135deg,#8B5CF6,#7C3AED)", color:"#fff" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ padding:"9px 18px", borderRadius:9, border:"none", fontWeight:700, fontSize:".88rem", transition:"opacity .2s", opacity:disabled?.5:1, ...v[variant], ...style }}>
      {children}
    </button>
  );
};

const Badge = ({ s }) => {
  const m = { paid:{bg:"rgba(16,185,129,.15)",c:"#10B981",l:"Paid"}, due:{bg:"rgba(239,68,68,.15)",c:"#EF4444",l:"Due"}, pending:{bg:"rgba(245,158,11,.15)",c:"#F59E0B",l:"Pending"}, done:{bg:"rgba(16,185,129,.15)",c:"#10B981",l:"Done"}, approved:{bg:"rgba(16,185,129,.15)",c:"#10B981",l:"Approved"}, "pending-approval":{bg:"rgba(245,158,11,.15)",c:"#F59E0B",l:"Pending"}, published:{bg:"rgba(16,185,129,.15)",c:"#10B981",l:"Published"}, draft:{bg:"rgba(148,163,184,.15)",c:"#94A3B8",l:"Draft"} };
  const d = m[s]||m.pending;
  return <span style={{ background:d.bg, color:d.c, padding:"2px 10px", borderRadius:50, fontSize:".72rem", fontWeight:700 }}>{d.l}</span>;
};

// ✅ NEW: Tabs mein "👨‍🎓 Students" alag tab add kiya
const TABS = ["📊 Dashboard","📈 Analytics","🔔 Notifications","💬 Chats","👥 Clients","👨‍🎓 Students","🌐 Website Editor","✏️ Blog","🛍️ Bundles","📂 Materials","🛠️ Services","💬 Testimonials","🎓 LMS Courses","📋 Orders","📋 Quizzes","🏷️ Coupons","🖼️ Media","⚙️ Settings"];

export default function CMSDashboard({ t }) {
  const { logout, profile }     = useAuth();
  const [tab, setTab]           = useState("📊 Dashboard");
  const [clients, setClients]   = useState([]);    // ✅ sirf clients
  const [students, setStudents] = useState([]);    // ✅ sirf students (alag)
  const [allUsers, setAllUsers] = useState([]);    // ✅ sab users combined (ClientsPage ke liye)
  const [orders, setOrders]     = useState([]);
  const [blogs, setBlogs]       = useState([]);
  const [bundles, setBundles]   = useState([]);
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [courses, setCourses]   = useState([]);
  const [enrollReqs, setEnrollReqs] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [pendingUsers, setPendingUsers] = useState([]);
  const [msg, setMsg]           = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [chatClientId, setChatClientId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading]   = useState(false);

  // ✅ Student detail modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(""),3500); };

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchClients = async () => {
    const s = await getDocs(collection(db,"users"));
    const all = s.docs.map(d=>({id:d.id,...d.data()}));
    // ✅ Clients aur students alag alag
    setClients(all.filter(u => u.role==="client" || u.role==="pending"));
    setStudents(all.filter(u => u.role==="student"));
    setAllUsers(all.filter(u => u.role==="client" || u.role==="student" || u.role==="pending"));
    setPendingUsers(all.filter(u => u.role==="pending" || u.approved===false));
  };
  const fetchOrders = async () => {
    const s = await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
    setOrders(s.docs.map(d=>({id:d.id,...d.data()})));
  };
  const fetchBlogs = async () => {
    try { const s = await getDocs(collection(db,"blogs")); setBlogs(s.docs.map(d=>({id:d.id,...d.data()}))); } catch {}
  };
  const fetchBundles = async () => {
    try { const s = await getDocs(collection(db,"bundles")); setBundles(s.docs.map(d=>({id:d.id,...d.data()}))); } catch {}
  };
  const fetchServices = async () => {
    try { const s = await getDocs(collection(db,"services")); setServices(s.docs.map(d=>({id:d.id,...d.data()}))); } catch {}
  };
  const fetchTestimonials = async () => {
    try { const s = await getDocs(collection(db,"testimonials")); setTestimonials(s.docs.map(d=>({id:d.id,...d.data()}))); } catch {}
  };
  const fetchCourses = async () => {
    try { const s = await getDocs(collection(db,"courses")); setCourses(s.docs.map(d=>({id:d.id,...d.data()}))); } catch {}
  };
  const fetchEnrollReqs = async () => {
    try { const s = await getDocs(query(collection(db,"enrollmentRequests"),orderBy("createdAt","desc"))); setEnrollReqs(s.docs.map(d=>({id:d.id,...d.data()}))); } catch {}
  };
  const fetchSettings = async () => {
    try { const s = await getDoc(doc(db,"siteSettings","main")); if(s.exists()) setSiteSettings(s.data()); } catch {}
  };

  useEffect(() => { fetchClients();fetchOrders();fetchBlogs();fetchBundles();fetchServices();fetchTestimonials();fetchCourses();fetchEnrollReqs();fetchSettings(); }, []);

  const totalBilled = clients.filter(c=>c.role==="client").reduce((s,c)=>s+(c.totalBilled||0),0);
  const totalPaid   = clients.filter(c=>c.role==="client").reduce((s,c)=>s+(c.totalPaid||0),0);
  const totalDues   = clients.filter(c=>c.role==="client").reduce((s,c)=>s+Math.max(0,(c.totalBilled||0)-(c.totalPaid||0)),0);

  // ── Approve user ───────────────────────────────────────────────────────────
  const approveUser = async (uid, role) => {
    await updateDoc(doc(db,"users",uid), { role, approved:true });
    flash(`✅ User approved as ${role}`);
    fetchClients();
  };

  // ✅ NEW: Grant dual role (client ko student bhi banao ya vice versa)
  const grantDualRole = async (uid, currentRole) => {
    if (currentRole === "client") {
      await updateDoc(doc(db,"users",uid), { isAlsoStudent: true });
      flash("✅ Client ko Student access bhi de diya! Ab wo dono portals use kar sakta hai.");
    } else if (currentRole === "student") {
      await updateDoc(doc(db,"users",uid), { isAlsoClient: true });
      flash("✅ Student ko Client access bhi de diya! Ab wo dono portals use kar sakta hai.");
    }
    fetchClients();
  };

  // ✅ NEW: Revoke dual role
  const revokeDualRole = async (uid, currentRole) => {
    if (currentRole === "client") {
      await updateDoc(doc(db,"users",uid), { isAlsoStudent: false });
      flash("✅ Client ka Student access hata diya.");
    } else if (currentRole === "student") {
      await updateDoc(doc(db,"users",uid), { isAlsoClient: false });
      flash("✅ Student ka Client access hata diya.");
    }
    fetchClients();
  };

  // ✅ NEW: Student ka poora data load karo
  const openStudentDetail = async (student, userId) => {
    // student object se id lo — ClientsPage se aata hai to .id ho sakta hai ya nahi bhi
    const uid = userId || student.id || student.uid;
    // StudentDetailModal ko sahi format chahiye: {name, email, userId, courses:[]}
    const studentForModal = student.courses
      ? student  // already correct format (from LMSAdmin Students tab)
      : {
          name: student.ownerName || student.coachingName || student.email || "Unknown",
          email: student.email || "",
          userId: uid,
          courses: [],
        };
    setSelectedStudent(studentForModal);
    setLoadingStudentDetail(true);
    try {
      const snap = await getDocs(collection(db,"enrollments"));
      const enrs = snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(e => e.userId === uid);
      setStudentEnrollments(enrs);
      // Update courses in modal
      setSelectedStudent(prev => prev ? {...prev, courses: enrs} : prev);
    } catch(e) { console.error(e); }
    setLoadingStudentDetail(false);
  };

  // ── Add client ─────────────────────────────────────────────────────────────
  const [nc, setNc] = useState({ coachingName:"", ownerName:"", email:"", phone:"", password:"", city:"", totalBilled:0, totalPaid:0 });
  const addClient = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, nc.email, nc.password);
      await setDoc(doc(db,"users",cred.user.uid), { uid:cred.user.uid, role:"client", coachingName:nc.coachingName, ownerName:nc.ownerName, email:nc.email, phone:nc.phone, city:nc.city, totalBilled:Number(nc.totalBilled), totalPaid:Number(nc.totalPaid), approved:true, logoUrl:"", createdAt:serverTimestamp(), isAlsoStudent:false, isAlsoClient:false });
      flash("✅ Client added!"); setNc({coachingName:"",ownerName:"",email:"",phone:"",password:"",city:"",totalBilled:0,totalPaid:0}); fetchClients();
    } catch(err) { flash("❌ "+err.message); }
    setLoading(false);
  };

  // ── Blog ────────────────────────────────────────────────────────────────────
  const [blog, setBlog] = useState({ title:"", category:"AI & Tools", content:"", status:"draft", emoji:"📚", summary:"", tags:"", coverCard:"", coverLandscape:"", resources:"", views:0 });
  const [editBlogId, setEditBlogId] = useState(null);
  const saveBlog = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editBlogId) { await updateDoc(doc(db,"blogs",editBlogId), { ...blog, updatedAt:serverTimestamp() }); flash("✅ Blog updated!"); }
      else { await addDoc(collection(db,"blogs"), { ...blog, createdAt:serverTimestamp() }); flash("✅ Blog published!"); }
      setBlog({title:"",category:"AI & Tools",content:"",status:"draft",emoji:"📚"}); setEditBlogId(null); fetchBlogs();
    } catch(err) { flash("❌ "+err.message); }
    setLoading(false);
  };
  const deleteBlog = async (id) => { if(!confirm("Delete?")) return; await deleteDoc(doc(db,"blogs",id)); fetchBlogs(); flash("🗑️ Deleted"); };

  // ── Testimonial ─────────────────────────────────────────────────────────────
  const [testi, setTesti]         = useState({ name:"", org:"", quote:"", stars:5 });
  const [editTestiId, setEditTestiId] = useState(null);  // null = add mode, id = edit mode

  const saveTesti = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editTestiId) {
        // ── UPDATE existing testimonial ──
        await updateDoc(doc(db,"testimonials", editTestiId), {
          name: testi.name,
          org:  testi.org,
          quote: testi.quote,
          stars: testi.stars,
          updatedAt: serverTimestamp(),
        });
        flash("✅ Testimonial updated!");
        setEditTestiId(null);
      } else {
        // ── ADD new testimonial ──
        await addDoc(collection(db,"testimonials"), {
          ...testi, approved:true, source:"manual", createdAt:serverTimestamp()
        });
        flash("✅ Testimonial added!");
      }
      setTesti({name:"", org:"", quote:"", stars:5});
      fetchTestimonials();
    }
    catch(err) { flash("❌ "+err.message); }
    setLoading(false);
  };

  // ── Enrollment approval ─────────────────────────────────────────────────────
  const approveEnrollment = async (req) => {
    await addDoc(collection(db,"enrollments"), { userId:req.userId, courseId:req.courseId, enrolledAt:serverTimestamp() });
    await updateDoc(doc(db,"enrollmentRequests",req.id), { status:"approved" });
    flash(`✅ Access granted to ${req.email} for ${req.courseTitle}`);
    fetchEnrollReqs();
  };

  // ── Payment update ──────────────────────────────────────────────────────────
  const updatePayment = async (uid, paid, billed) => {
    await updateDoc(doc(db,"users",uid), { totalPaid:Number(paid), totalBilled:Number(billed) });
    fetchClients(); flash("✅ Payment updated!");
  };

  // ── Site settings ───────────────────────────────────────────────────────────
  const saveSettings = async () => {
    await setDoc(doc(db,"siteSettings","main"), { ...siteSettings, updatedAt:serverTimestamp() }, { merge:true });
    flash("✅ Settings saved!");
  };

  return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex" }}>
      {/* Mobile top bar */}
      <div className="admin-ham" style={{ position:"fixed", top:0, left:0, right:0, zIndex:101, background:t.bgCard, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", height:58 }}>
        <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ width:38, height:38, borderRadius:9, border:`1px solid ${t.border}`, background:t.bgCard2, fontSize:"1.1rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:t.text }}>
          {sidebarOpen?"✕":"☰"}
        </button>
        <Logo t={t} size={28} showText={true}/>
        <NotificationBell t={t}/>
      </div>
      <style>{css(t)}</style>
      {msg && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999,
          background:msg.startsWith("✅")?"rgba(16,185,129,.15)":"rgba(239,68,68,.15)",
          border:`1px solid ${msg.startsWith("✅")?t.green:t.red}`,
          color:msg.startsWith("✅")?t.green:t.red,
          padding:"10px 24px", borderRadius:50, fontSize:".9rem", fontWeight:700, whiteSpace:"nowrap" }}>
          {msg}
        </div>
      )}

      {/* Mobile overlay */}
      <div className="admin-overlay" onClick={()=>setSidebarOpen(false)} style={{ display:"none", position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:99 }}/>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <div className={`admin-sidebar${sidebarOpen?" open":""}`} style={{ width:220, background:t.bgCard, borderRight:`1px solid ${t.border}`, position:"fixed", top:0, bottom:0, left:0, overflowY:"auto", padding:"16px 0", zIndex:100 }}>
        <div style={{ padding:"12px 16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Logo t={t} size={32} showText={false}/>
            <div>
              <div style={{ fontWeight:800, fontSize:".88rem", color:t.text }}>Admin Panel</div>
              <div style={{ fontSize:".68rem", color:t.muted }}>DG HelpMate</div>
            </div>
          </div>
        </div>
        {TABS.map(tabName => (
          <button key={tabName} onClick={() => { setTab(tabName); setSidebarOpen(false); }} style={{
            display:"block", width:"100%", textAlign:"left", background:tab===tabName?t.accentBg:"none",
            border:"none", padding:"11px 18px",
            color: tab===tabName ? t.gold : t.muted,
            fontWeight: tab===tabName ? 700 : 400,
            fontSize:".87rem", borderLeft: tab===tabName ? `3px solid ${t.gold}` : "3px solid transparent",
            transition:"all .15s",
          }}>{tabName}</button>
        ))}
        <div style={{ padding:"16px 12px", marginTop:16, borderTop:`1px solid ${t.border}` }}>
          <button onClick={logout} style={{ width:"100%", padding:"9px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:9, color:t.muted, fontSize:".84rem", fontWeight:600 }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="admin-main" style={{ marginLeft:220, flex:1, padding:"24px 28px", paddingTop:"clamp(70px,10vw,24px)" }}>

        {tab === "📈 Analytics" && <AnalyticsDashboard t={t}/>}
        {tab === "🔔 Notifications" && <NotificationPanel t={t}/>}
        {tab === "💬 Chats" && <AdminChatPanel t={t}/>}

        {/* ══ DASHBOARD ══ */}
        {tab === "📊 Dashboard" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.5rem", color:t.text, marginBottom:22 }}>👋 Welcome, {profile?.ownerName||"Admin"}!</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:28 }}>
              {[
                {l:"Active Clients", v:clients.filter(c=>c.role==="client").length, c:t.accent,   i:"👥"},
                {l:"Students",       v:students.length,                             c:"#8B5CF6",   i:"🎓"},
                {l:"Total Billed",   v:`₹${totalBilled.toLocaleString()}`,          c:t.gold,      i:"💰"},
                {l:"Total Received", v:`₹${totalPaid.toLocaleString()}`,            c:t.green,     i:"✅"},
                {l:"Total Dues",     v:`₹${totalDues.toLocaleString()}`,            c:t.red,       i:"⚠️"},
                {l:"Pending Approvals",v:pendingUsers.length,                       c:t.saffron,   i:"⏳"},
                {l:"Blog Posts",     v:blogs.length,                                c:t.accent,    i:"✏️"},
                {l:"Enrollment Reqs",v:enrollReqs.filter(r=>r.status==="pending").length, c:t.gold, i:"📩"},
              ].map(({l,v,c,i})=>(
                <CardBox key={l}>
                  <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{i}</div>
                  <div style={{ fontSize:".75rem", color:t.muted, marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:"1.5rem", fontWeight:900, color:c }}>{v}</div>
                </CardBox>
              ))}
            </div>

            {/* Pending Approvals */}
            {pendingUsers.length > 0 && (
              <CardBox style={{ marginBottom:20 }}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:14 }}>⏳ Pending User Approvals</h3>
                {pendingUsers.map(u => (
                  <div key={u.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${t.border}`, flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontWeight:700, color:t.text }}>{u.ownerName||u.coachingName}</div>
                      <div style={{ fontSize:".78rem", color:t.muted }}>{u.email} · {u.phone}</div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      <Btn variant="green"  onClick={() => approveUser(u.id,"client")}  style={{ padding:"6px 14px", fontSize:".8rem" }}>✅ Approve Client</Btn>
                      <Btn variant="accent" onClick={() => approveUser(u.id,"student")} style={{ padding:"6px 14px", fontSize:".8rem" }}>🎓 Approve Student</Btn>
                      <Btn variant="danger" onClick={() => deleteDoc(doc(db,"users",u.id)).then(fetchClients)} style={{ padding:"6px 12px", fontSize:".8rem" }}>✕</Btn>
                    </div>
                  </div>
                ))}
              </CardBox>
            )}

            <CardBox style={{ marginBottom:20 }}>
              <AdminPaymentVerifier t={t} onVerified={fetchClients} />
            </CardBox>

            <CardBox style={{ marginBottom:20 }}>
              <AdminChatList t={t} onSelectChat={(id) => { setSelectedClientId(id); setTab("👥 Clients"); }} />
            </CardBox>

            {enrollReqs.filter(r=>r.status==="pending").length > 0 && (
              <CardBox>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:14 }}>📩 Course Enrollment Requests</h3>
                {enrollReqs.filter(r=>r.status==="pending").map(req => (
                  <div key={req.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${t.border}`, flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ fontWeight:700, color:t.text }}>{req.email}</div>
                      <div style={{ fontSize:".78rem", color:t.muted }}>{req.courseTitle} · ₹{req.amount} · UTR: {req.utrNumber}</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn variant="green"  onClick={() => approveEnrollment(req)}  style={{ padding:"6px 14px", fontSize:".8rem" }}>✓ Approve</Btn>
                      <Btn variant="danger" onClick={() => updateDoc(doc(db,"enrollmentRequests",req.id),{status:"rejected"}).then(fetchEnrollReqs)} style={{ padding:"6px 12px", fontSize:".8rem" }}>Reject</Btn>
                    </div>
                  </div>
                ))}
              </CardBox>
            )}
          </div>
        )}

        {/* ══ CLIENT DETAIL PAGE ══ */}
        {selectedClientId && (
          <ClientDetailPage clientId={selectedClientId} onBack={() => setSelectedClientId(null)} t={t}/>
        )}

        {/* ══ CLIENTS ══ */}
        {!selectedClientId && tab === "👥 Clients" && (
          <ClientsPage
            clients={clients} t={t} loading={loading}
            nc={nc} setNc={setNc} addClient={addClient}
            updatePayment={updatePayment}
            onSelect={(id)=>setSelectedClientId(id)}
            onStudentSelect={(id, studentObj) => openStudentDetail(studentObj, id)}
            fetchClients={fetchClients}
            onGrantDualRole={(uid) => grantDualRole(uid, "client")}
            onRevokeDualRole={(uid) => revokeDualRole(uid, "client")}
          />
        )}

        {/* ══ STUDENTS (ALAG TAB) ══ */}
        {tab === "👨‍🎓 Students" && (
          <StudentsPage
            students={students} t={t}
            onOpenDetail={openStudentDetail}
            onGrantDualRole={(uid) => grantDualRole(uid, "student")}
            onRevokeDualRole={(uid) => revokeDualRole(uid, "student")}
            fetchStudents={fetchClients}
            flash={flash}
          />
        )}

        {/* ══ STUDENT DETAIL MODAL ══ */}
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            enrollments={studentEnrollments}
            loading={loadingStudentDetail}
            t={t}
            onClose={() => { setSelectedStudent(null); setStudentEnrollments([]); }}
            onGrantDualRole={() => grantDualRole(selectedStudent.id, "student")}
            onRevokeDualRole={() => revokeDualRole(selectedStudent.id, "student")}
            flash={flash}
            fetchStudents={fetchClients}
          />
        )}

        {/* ══ BLOG ══ */}
        {tab === "✏️ Blog" && <BlogAdmin t={t}/>}

        {/* ══ TESTIMONIALS ══ */}
        {tab === "💬 Testimonials" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text }}>💬 Testimonials Manager</h2>
              <div style={{ fontSize:".82rem", color:t.muted }}>{testimonials.length} testimonials</div>
            </div>
            <div className="cms-testi-grid" style={{}}>

              {/* ── ADD / EDIT FORM ── */}
              <CardBox style={{ position:"sticky", top:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h3 style={{ fontWeight:700, color:t.text, fontSize:".97rem" }}>
                    {editTestiId ? "✏️ Edit Testimonial" : "➕ Add Testimonial"}
                  </h3>
                  {editTestiId && (
                    <button onClick={()=>{ setEditTestiId(null); setTesti({name:"",org:"",quote:"",stars:5}); }}
                      style={{ background:"none", border:`1px solid ${t.border}`, borderRadius:7, padding:"4px 12px", color:t.muted, cursor:"pointer", fontSize:".78rem" }}>
                      ✕ Cancel Edit
                    </button>
                  )}
                </div>
                <form onSubmit={saveTesti}>
                  <Inp label="Client Name *" required value={testi.name} onChange={e=>setTesti({...testi,name:e.target.value})} placeholder="e.g. SVM Classes Official" />
                  <Inp label="Organization / Location" value={testi.org} onChange={e=>setTesti({...testi,org:e.target.value})} placeholder="e.g. Bihar · 160+ orders" />
                  <Textarea label="Quote / Review *" required rows={4} value={testi.quote} onChange={e=>setTesti({...testi,quote:e.target.value})} placeholder="What did they say?" />
                  <Sel label="Stars" value={testi.stars} onChange={e=>setTesti({...testi,stars:Number(e.target.value)})}>
                    {[5,4,3,2,1].map(n=><option key={n} value={n}>{"★".repeat(n)} ({n} Stars)</option>)}
                  </Sel>
                  <Btn type="submit" variant={editTestiId?"accent":"primary"} disabled={loading} style={{ width:"100%", padding:"11px" }}>
                    {loading ? "Saving..." : editTestiId ? "💾 Update Testimonial" : "➕ Add Testimonial"}
                  </Btn>
                </form>
              </CardBox>

              {/* ── LIST ── */}
              <div>
                {testimonials.length === 0 && (
                  <div style={{ textAlign:"center", color:t.muted, padding:"40px", background:t.bgCard, borderRadius:14, border:`1px solid ${t.border}` }}>
                    <div style={{ fontSize:"2rem", marginBottom:8 }}>💬</div>
                    <p>Koi testimonial nahi hai abhi. Upar form se add karo!</p>
                  </div>
                )}
                {testimonials.map(tst=>(
                  <CardBox key={tst.id} style={{ marginBottom:12, border:editTestiId===tst.id?`2px solid ${t.accent}`:`1px solid ${t.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        {/* Stars */}
                        <div style={{ color:t.gold, fontSize:".9rem", marginBottom:4 }}>{"★".repeat(tst.stars||5)}<span style={{ color:t.muted, fontSize:".72rem", marginLeft:6 }}>({tst.stars||5}/5)</span></div>
                        {/* Name + Org */}
                        <div style={{ fontWeight:800, color:t.text, fontSize:".95rem" }}>{tst.name}</div>
                        {tst.org && <div style={{ fontSize:".76rem", color:t.muted, marginTop:2 }}>{tst.org}</div>}
                        {/* Quote */}
                        <div style={{ fontSize:".84rem", color:t.muted, marginTop:8, lineHeight:1.6, fontStyle:"italic",
                          background:t.bgCard2, padding:"8px 12px", borderRadius:8, borderLeft:`3px solid ${t.gold}` }}>
                          "{tst.quote?.substring(0,120)}{tst.quote?.length>120?"...":""}"
                        </div>
                        {/* Source + Date */}
                        <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:".68rem", background:tst.source==="manual"?`${t.accent}18`:`${t.green}15`, color:tst.source==="manual"?t.accent:t.green, padding:"2px 8px", borderRadius:50, fontWeight:700 }}>
                            {tst.source==="manual"?"Manual":"Auto"}
                          </span>
                          {tst.approved && <span style={{ fontSize:".68rem", background:`${t.green}15`, color:t.green, padding:"2px 8px", borderRadius:50, fontWeight:700 }}>✓ Approved</span>}
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                        <Btn variant="accent" onClick={()=>{
                          setEditTestiId(tst.id);
                          setTesti({ name:tst.name||"" , org:tst.org||"", quote:tst.quote||"", stars:tst.stars||5 });
                          // Scroll to form
                          window.scrollTo({top:0, behavior:"smooth"});
                        }} style={{ padding:"5px 12px", fontSize:".76rem" }}>✏️ Edit</Btn>
                        <Btn variant="danger" onClick={async()=>{
                          if(!confirm("Delete this testimonial?")) return;
                          await deleteDoc(doc(db,"testimonials",tst.id));
                          if(editTestiId===tst.id){ setEditTestiId(null); setTesti({name:"",org:"",quote:"",stars:5}); }
                          fetchTestimonials(); flash("🗑️ Deleted");
                        }} style={{ padding:"5px 12px", fontSize:".76rem" }}>🗑 Del</Btn>
                      </div>
                    </div>
                  </CardBox>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ LMS COURSES ══ */}
        {!selectedClientId && tab === "🎓 LMS Courses" && <LMSAdmin t={t}/>}

        {/* ══ ORDERS ══ */}
        {tab === "📋 Orders" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:20 }}>Orders & Deliveries</h2>
            <CardBox style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".87rem" }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${t.border}` }}>
                    {["Topic","Client","Type","Amount","Status","Action"].map(h=>(
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:t.muted, fontWeight:700, fontSize:".76rem", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o=>{
                    const client = allUsers.find(c=>c.id===o.clientId);
                    return (
                      <tr key={o.id} style={{ borderBottom:`1px solid ${t.border}` }}>
                        <td style={{ padding:"10px 12px", fontWeight:600, color:t.text }}>{o.topic}</td>
                        <td style={{ padding:"10px 12px", color:t.muted }}>{client?.coachingName||o.clientId?.substring(0,8)}</td>
                        <td style={{ padding:"10px 12px", color:t.muted }}>{o.type}</td>
                        <td style={{ padding:"10px 12px", color:t.gold, fontWeight:700 }}>₹{o.totalFee?.toLocaleString()}</td>
                        <td style={{ padding:"10px 12px" }}><Badge s={o.status} /></td>
                        <td style={{ padding:"10px 12px" }}>
                          <select value={o.status} onChange={async e=>{ await updateDoc(doc(db,"orders",o.id),{status:e.target.value}); fetchOrders(); }}
                            style={{ padding:"5px 8px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, color:t.text, fontSize:".8rem", fontFamily:"inherit", outline:"none" }}>
                            <option value="pending">Pending</option>
                            <option value="done">Done</option>
                            <option value="new">New</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBox>
          </div>
        )}

        {!selectedClientId && tab === "🌐 Website Editor" && <SiteContentEditor t={t}/>}

        {tab === "⚙️ Settings" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:20 }}>Site Settings</h2>
            <div style={{ maxWidth:560 }}>
              <CardBox style={{ marginBottom:20 }}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:16 }}>🏠 Homepage Settings</h3>
                <Inp label="Hero Heading" value={siteSettings.heroHeading||""} onChange={e=>setSiteSettings({...siteSettings,heroHeading:e.target.value})} placeholder="Your Coaching's Digital Partner" />
                <Inp label="Hero Subtitle" value={siteSettings.heroSubtitle||""} onChange={e=>setSiteSettings({...siteSettings,heroSubtitle:e.target.value})} />
                <Inp label="Active Clients Count" value={siteSettings.clientCount||"26+"} onChange={e=>setSiteSettings({...siteSettings,clientCount:e.target.value})} />
                <Inp label="Total MCQs Delivered" value={siteSettings.mcqCount||"50K+"} onChange={e=>setSiteSettings({...siteSettings,mcqCount:e.target.value})} />
                <Inp label="Projects Done" value={siteSettings.projectCount||"500+"} onChange={e=>setSiteSettings({...siteSettings,projectCount:e.target.value})} />
              </CardBox>
              <CardBox style={{ marginBottom:20 }}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:16 }}>📞 Contact Info</h3>
                <Inp label="WhatsApp Number" value={siteSettings.whatsapp||"919241653369"} onChange={e=>setSiteSettings({...siteSettings,whatsapp:e.target.value})} />
                <Inp label="Email" value={siteSettings.email||"support@dghelpmate.in"} onChange={e=>setSiteSettings({...siteSettings,email:e.target.value})} />
                <Inp label="Address" value={siteSettings.address||""} onChange={e=>setSiteSettings({...siteSettings,address:e.target.value})} />
              </CardBox>
              <CardBox style={{ marginBottom:20 }}>
                <h3 style={{ fontWeight:700, color:t.text, marginBottom:16 }}>🎓 Course Settings</h3>
                <Inp label="Master Course Price ₹" type="number" value={siteSettings.masterCoursePrice||9999} onChange={e=>setSiteSettings({...siteSettings,masterCoursePrice:e.target.value})} />
                <Inp label="UPI Payment ID" value={siteSettings.upiId||"dghelpmate@axl"} onChange={e=>setSiteSettings({...siteSettings,upiId:e.target.value})} />
                <Inp label="UPI Phone Number" value={siteSettings.upiPhone||"+91 92416 53369"} onChange={e=>setSiteSettings({...siteSettings,upiPhone:e.target.value})} />
              </CardBox>
              <Btn variant="primary" onClick={saveSettings} style={{ width:"100%", padding:"13px", fontSize:"1rem" }}>
                💾 Save All Settings
              </Btn>
            </div>
          </div>
        )}

        {tab === "📋 Quizzes" && <QuizManager t={t}/>}
        {tab === "🏷️ Coupons" && <CouponManager t={t}/>}

        {tab === "🖼️ Media" && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:20 }}>Media & Images Guide</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:18 }}>
              {[
                { title:"Website Logo", path:"public/images/logo.png", desc:"Navbar, footer, login page mein dikhega", size:"200×200px recommended" },
                { title:"Govardhan Photo", path:"public/images/govardhan.jpg", desc:"About page pe dikhegi aapki photo", size:"400×400px recommended" },
                { title:"Course Thumbnails", path:"public/images/courses/[name].jpg", desc:"Har course ka alag thumbnail", size:"800×450px (16:9)" },
                { title:"Blog Images", path:"Firebase Storage", desc:"Blog ke liye images Firebase Storage mein upload karo", size:"Any size" },
                { title:"Bundle Images", path:"Firebase Storage URL", desc:"Bundle cards ke liye URL paste karo", size:"Any size" },
              ].map(({ title, path, desc, size }) => (
                <CardBox key={title}>
                  <div style={{ fontWeight:700, color:t.text, marginBottom:8 }}>{title}</div>
                  <div style={{ fontSize:".8rem", background:t.bgCard2, padding:"6px 10px", borderRadius:7, fontFamily:"monospace", color:t.accent, marginBottom:8 }}>{path}</div>
                  <div style={{ fontSize:".83rem", color:t.muted, marginBottom:4 }}>{desc}</div>
                  <div style={{ fontSize:".75rem", color:t.gold }}>{size}</div>
                </CardBox>
              ))}
            </div>
          </div>
        )}

        {tab === "🛍️ Bundles"   && <BundleAdmin t={t}/>}
        {tab === "📂 Materials" && <MaterialAdmin t={t}/>}
        {tab === "🛠️ Services"  && <ServiceAdmin t={t}/>}
      </div>

      {/* Mobile tab bar */}
      <div className="hide-desktop" style={{ position:"fixed", bottom:0, left:0, right:0, background:t.bgCard, borderTop:`1px solid ${t.border}`, display:"flex", overflowX:"auto", zIndex:100 }}>
        {TABS.slice(0,6).map(tabName => (
          <button key={tabName} onClick={() => setTab(tabName)} style={{
            flex:"0 0 auto", padding:"10px 14px", fontSize:".7rem", fontWeight:tab===tabName?700:400,
            color:tab===tabName?t.gold:t.muted, background:tab===tabName?t.accentBg:"none", border:"none",
            borderTop:tab===tabName?`2px solid ${t.gold}`:"2px solid transparent",
          }}>{tabName.split(" ")[0]}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: Students Page — alag, attractive, full data on click
// ═══════════════════════════════════════════════════════════════
function StudentsPage({ students, t, onOpenDetail, onGrantDualRole, onRevokeDualRole, fetchStudents, flash }) {
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState("name");

  const filtered = students
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (s.ownerName||"").toLowerCase().includes(q) ||
             (s.coachingName||"").toLowerCase().includes(q) ||
             (s.email||"").toLowerCase().includes(q) ||
             (s.phone||"").toLowerCase().includes(q);
    })
    .sort((a,b) => {
      if (sort==="recent") return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
      return (a.ownerName||a.coachingName||"").localeCompare(b.ownerName||b.coachingName||"");
    });

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text }}>👨‍🎓 Students</h2>
          <p style={{ fontSize:".82rem", color:t.muted, marginTop:4 }}>{students.length} registered students</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        {[
          ["Total Students", students.length, "#8B5CF6"],
          ["Dual Role", students.filter(s=>s.isAlsoClient).length, t.green],
          ["Pure Students", students.filter(s=>!s.isAlsoClient).length, t.accent],
          ["Google Sign In", students.filter(s=>s.googleSignIn).length, t.gold],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:".72rem", color:t.muted, marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:"1.6rem", fontWeight:900, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search students..."
          style={{ flex:1, minWidth:200, padding:"9px 14px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".88rem", color:t.text, outline:"none" }}
        />
        <select value={sort} onChange={e=>setSort(e.target.value)}
          style={{ padding:"9px 14px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".85rem", color:t.text, outline:"none" }}>
          <option value="name">Sort: Name</option>
          <option value="recent">Sort: Recent</option>
        </select>
      </div>

      {/* Student Cards Grid */}
      <div className="cms-student-grid" style={{}}>
        {filtered.map(s => {
          const name = s.ownerName || s.coachingName || s.email || "Unknown";
          const initials = name.slice(0,2).toUpperCase();
          return (
            <div key={s.id}
              style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"18px", cursor:"pointer", transition:"all .2s", position:"relative" }}
              onClick={() => onOpenDetail(s)}
              onMouseEnter={e=>e.currentTarget.style.border=`1px solid #8B5CF6`}
              onMouseLeave={e=>e.currentTarget.style.border=`1px solid ${t.border}`}
            >
              {/* Dual role badge */}
              {s.isAlsoClient && (
                <div style={{ position:"absolute", top:12, right:12, background:"rgba(16,185,129,.15)", color:"#10B981", fontSize:".65rem", fontWeight:700, padding:"3px 8px", borderRadius:50, border:"1px solid rgba(16,185,129,.3)" }}>
                  🔄 Dual Role
                </div>
              )}

              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                {s.photoUrl
                  ? <img src={s.photoUrl} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", border:"2px solid #8B5CF6" }} alt=""/>
                  : <div style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#8B5CF6,#6366F1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:"1rem", flexShrink:0 }}>{initials}</div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, color:t.text, fontSize:".95rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
                  <div style={{ fontSize:".75rem", color:t.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.email}</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {[
                  ["📱", s.phone || "—"],
                  ["🏙️", s.city || "—"],
                  ["📅", s.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"],
                  ["🔑", s.googleSignIn ? "Google" : "Email"],
                ].map(([icon, val]) => (
                  <div key={icon} style={{ background:t.bgCard2, borderRadius:8, padding:"6px 10px", fontSize:".78rem", color:t.muted, display:"flex", alignItems:"center", gap:5 }}>
                    <span>{icon}</span><span style={{ color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center" }}>
                <button onClick={e=>{ e.stopPropagation(); onOpenDetail(s); }}
                  style={{ flex:1, padding:"7px 0", background:"linear-gradient(135deg,#8B5CF6,#6366F1)", border:"none", borderRadius:8, color:"#fff", fontWeight:700, fontSize:".8rem", cursor:"pointer" }}>
                  👁 View Full Profile
                </button>
                {s.isAlsoClient
                  ? <button onClick={e=>{ e.stopPropagation(); onRevokeDualRole(s.id); }}
                      style={{ padding:"7px 12px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)", borderRadius:8, color:"#EF4444", fontWeight:700, fontSize:".75rem", cursor:"pointer" }}>
                      ✕ Revoke Client
                    </button>
                  : <button onClick={e=>{ e.stopPropagation(); onGrantDualRole(s.id); }}
                      style={{ padding:"7px 12px", background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.3)", borderRadius:8, color:"#10B981", fontWeight:700, fontSize:".75rem", cursor:"pointer" }}>
                      + Client Access
                    </button>
                }
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign:"center", color:t.muted, padding:"60px 0" }}>
          <div style={{ fontSize:"3rem", marginBottom:12 }}>👨‍🎓</div>
          <p>Koi student nahi mila.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: Student Detail Modal — poora data ek jagah
// ═══════════════════════════════════════════════════════════════
function StudentDetailModal({ student, enrollments, loading, t, onClose, onGrantDualRole, onRevokeDualRole, flash, fetchStudents }) {
  const name = student.ownerName || student.coachingName || student.email || "Unknown";
  const initials = name.slice(0,2).toUpperCase();
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((s,e)=>s+(e.progress||0),0)/enrollments.length)
    : 0;
  const completed = enrollments.filter(e=>e.progress===100).length;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#8B5CF620,#6366F110)`, borderBottom:`1px solid ${t.border}`, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderRadius:"20px 20px 0 0" }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            {student.photoUrl
              ? <img src={student.photoUrl} style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", border:"3px solid #8B5CF6" }} alt=""/>
              : <div style={{ width:60, height:60, borderRadius:"50%", background:"linear-gradient(135deg,#8B5CF6,#6366F1)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:"1.3rem" }}>{initials}</div>
            }
            <div>
              <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.2rem", marginBottom:4 }}>{name}</h2>
              <div style={{ fontSize:".8rem", color:t.muted }}>{student.email}</div>
              <div style={{ display:"flex", gap:8, marginTop:6 }}>
                <span style={{ fontSize:".7rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:"rgba(139,92,246,.15)", color:"#8B5CF6" }}>🎓 Student</span>
                {student.isAlsoClient && <span style={{ fontSize:".7rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:"rgba(16,185,129,.15)", color:"#10B981" }}>🔄 + Client</span>}
                {student.googleSignIn && <span style={{ fontSize:".7rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:"rgba(66,133,244,.15)", color:"#4285F4" }}>G Google</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:t.muted, fontSize:"1.3rem", cursor:"pointer", padding:4 }}>✕</button>
        </div>

        <div style={{ padding:"20px 24px" }}>

          {/* Contact Info */}
          <div className="cms-detail-info" style={{ marginBottom:20 }}>
            {[
              ["📱 Phone", student.phone || "—"],
              ["🏙️ City", student.city || "—"],
              ["📅 Joined", student.createdAt?.toDate?.()?.toLocaleDateString("en-IN","dd MMM yyyy") || "—"],
              ["🔑 Login", student.googleSignIn ? "Google Sign In" : "Email/Password"],
              ["🏫 Coaching", student.coachingName || "—"],
              ["🆔 Ref Code", student.referralCode || "—"],
            ].map(([k,v]) => (
              <div key={k} style={{ background:t.bgCard2, borderRadius:10, padding:"10px 14px" }}>
                <div style={{ fontSize:".7rem", color:t.muted, marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:".88rem", fontWeight:600, color:t.text }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Course Progress Stats */}
          <div className="cms-detail-stats" style={{ marginBottom:20 }}>
            {[
              ["Enrolled", enrollments.length, "#8B5CF6"],
              ["Completed", completed, t.green],
              ["Avg Progress", `${avgProgress}%`, t.gold],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:t.bgCard2, borderRadius:12, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:"1.6rem", fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:".72rem", color:t.muted, marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Enrolled Courses */}
          <div style={{ marginBottom:20 }}>
            <h3 style={{ fontWeight:700, color:t.text, marginBottom:12, fontSize:".95rem" }}>📚 Enrolled Courses ({enrollments.length})</h3>
            {loading ? (
              <div style={{ textAlign:"center", color:t.muted, padding:"20px" }}>Loading...</div>
            ) : enrollments.length === 0 ? (
              <div style={{ textAlign:"center", color:t.muted, padding:"20px", background:t.bgCard2, borderRadius:12 }}>Koi enrollment nahi hai abhi.</div>
            ) : enrollments.map(e => (
              <div key={e.id} style={{ background:t.bgCard2, borderRadius:12, padding:"12px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>{e.courseTitle || e.courseId}</div>
                    <div style={{ fontSize:".74rem", color:t.muted }}>
                      {e.completedLectures?.length||0} lectures done
                      {e.paymentMethod && ` · ${e.paymentMethod}`}
                      {e.amount > 0 && ` · ₹${e.amount.toLocaleString()}`}
                    </div>
                  </div>
                  <span style={{ fontWeight:900, fontSize:"1rem", color:e.progress===100?t.green:t.gold }}>{e.progress||0}%</span>
                </div>
                <div style={{ background:t.bg, borderRadius:50, height:6 }}>
                  <div style={{ height:"100%", width:`${e.progress||0}%`, background:e.progress===100?t.green:`linear-gradient(90deg,#8B5CF6,#6366F1)`, borderRadius:50, transition:"width .3s" }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", paddingTop:16, borderTop:`1px solid ${t.border}` }}>
            {student.phone && (
              <a href={`https://wa.me/91${student.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                style={{ padding:"9px 18px", background:"#25D36620", border:"1px solid #25D36640", borderRadius:9, color:"#25D366", fontWeight:700, fontSize:".85rem", textDecoration:"none" }}>
                💬 WhatsApp
              </a>
            )}
            {student.isAlsoClient
              ? <button onClick={()=>{ onRevokeDualRole(); onClose(); fetchStudents(); }}
                  style={{ padding:"9px 18px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, color:"#EF4444", fontWeight:700, fontSize:".85rem", cursor:"pointer" }}>
                  ✕ Revoke Client Access
                </button>
              : <button onClick={()=>{ onGrantDualRole(); onClose(); fetchStudents(); }}
                  style={{ padding:"9px 18px", background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.3)", borderRadius:9, color:"#10B981", fontWeight:700, fontSize:".85rem", cursor:"pointer" }}>
                  + Grant Client Access (Dual Role)
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}