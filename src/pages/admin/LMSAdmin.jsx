// src/pages/admin/LMSAdmin.jsx — v2 REDESIGNED
// Attractive dashboard cards, course grid, student detail modal, full-featured
import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp, setDoc, getDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "../../firebase/config";
import ImageUpload from "../../components/ui/ImageUpload";
import useAuth from "../../hooks/useAuth";

// ── Shared UI Components ────────────────────────────────────────────────────
const Inp = ({ label, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <input {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", boxSizing:"border-box", ...(p.style||{}) }}/>
  </div>
);
const Txt = ({ label, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <textarea {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
  </div>
);
const Sel = ({ label, children, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <select {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:8, fontSize:".9rem", color:"var(--txt)", fontFamily:"inherit", outline:"none" }}>{children}</select>
  </div>
);
const SBtn = ({ children, variant="primary", ...p }) => {
  const v = {
    primary: { background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14" },
    green:   { background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff" },
    danger:  { background:"rgba(239,68,68,.12)", color:"#EF4444", border:"1px solid rgba(239,68,68,.3)" },
    ghost:   { background:"transparent", border:"1px solid var(--bord)", color:"var(--mut)" },
    accent:  { background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff" },
    purple:  { background:"linear-gradient(135deg,#8B5CF6,#7C3AED)", color:"#fff" },
  };
  return <button {...p} style={{ padding:"8px 16px", borderRadius:8, border:"none", fontWeight:700, fontSize:".85rem", cursor:"pointer", fontFamily:"inherit", ...v[variant], ...(p.style||{}) }}>{children}</button>;
};

const Card = ({ children, t, style={}, onClick, hover=false }) => (
  <div onClick={onClick}
    style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px", cursor:onClick?"pointer":"default", transition:"all .2s", ...style }}
    onMouseEnter={e=>{ if(hover) { e.currentTarget.style.border=`1px solid ${t.accent}`; e.currentTarget.style.transform="translateY(-2px)"; }}}
    onMouseLeave={e=>{ if(hover) { e.currentTarget.style.border=`1px solid ${t.border}`; e.currentTarget.style.transform="translateY(0)"; }}}
  >{children}</div>
);

const StatCard = ({ icon, label, value, color, t, sub }) => (
  <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", right:16, top:16, fontSize:"1.8rem", opacity:.15 }}>{icon}</div>
    <div style={{ fontSize:".72rem", color:t.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:"1.8rem", fontWeight:900, color, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:".72rem", color:t.muted, marginTop:4 }}>{sub}</div>}
  </div>
);

const LMSTABS = ["📊 Dashboard","📚 Courses","✅ Enrollments","👥 Students","🎟️ Coupons","💰 Revenue","💬 Chat"];

export default function LMSAdmin({ t }) {
  const [tab, setTab]           = useState("📊 Dashboard");
  const [courses, setCourses]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [coupons, setCoupons]   = useState([]);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [editCourse, setEditCourse]       = useState(null);
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [showAssignModal, setShowAssignModal]   = useState(false);
  const [allStudentUsers, setAllStudentUsers]   = useState([]);
  const [assignData, setAssignData] = useState({ userId:"", courseId:"", paymentMethod:"offline", amount:"" });
  const [assigning, setAssigning]   = useState(false);
  const [chatStudentId, setChatStudentId] = useState(null);

  // ✅ Student detail modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentUser, setStudentUser]         = useState(null);

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(""),3500); };

  const [newCourse, setNewCourse] = useState({ title:"", subtitle:"", description:"", category:"productivity", price:"", mrp:"", duration:"", thumbnail:"", isMaster:false, isBestseller:false, freeModules:1 });
  const [newCoupon, setNewCoupon] = useState({ code:"", discount:"", active:true, maxUses:"" });

  const fetchAll = async () => {
    try {
      const [cSnap, rSnap, eSnap, coSnap, uSnap] = await Promise.all([
        getDocs(collection(db,"courses")),
        getDocs(query(collection(db,"enrollmentRequests"), where("status","==","pending"))),
        getDocs(collection(db,"enrollments")),
        getDocs(collection(db,"coupons")),
        getDocs(query(collection(db,"users"), where("role","in",["student","client","pending"]))),
      ]);
      setCourses(cSnap.docs.map(d=>({id:d.id,...d.data()})));
      setRequests(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      setEnrollments(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      setCoupons(coSnap.docs.map(d=>({id:d.id,...d.data()})));
      setAllStudentUsers(uSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const totalRevenue = enrollments.reduce((s,e)=>s+(e.amount||0),0);
  const revenuePerCourse = courses.map(c => ({
    ...c,
    enrolled: enrollments.filter(e=>e.courseId===c.id).length,
    revenue:  enrollments.filter(e=>e.courseId===c.id).reduce((s,e)=>s+(e.amount||0),0),
  }));

  // ✅ Student detail open karo
  const openStudentDetail = async (studentData, userId) => {
    setSelectedStudent(studentData);
    if (userId) {
      try {
        const snap = await getDoc(doc(db,"users",userId));
        if (snap.exists()) setStudentUser({id:snap.id,...snap.data()});
        else setStudentUser(null);
      } catch { setStudentUser(null); }
    } else { setStudentUser(null); }
  };

  const addCourse = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const docRef = await addDoc(collection(db,"courses"), {
        ...newCourse, price:Number(newCourse.price), mrp:Number(newCourse.mrp),
        freeModules:Number(newCourse.freeModules)||1,
        modules:0, lectures:0, students:0, rating:0, createdAt:serverTimestamp(),
      });
      flash("✅ Course added! Ab modules add karo.");
      setNewCourse({ title:"", subtitle:"", description:"", category:"productivity", price:"", mrp:"", duration:"", thumbnail:"", isMaster:false, isBestseller:false, freeModules:1 });
      fetchAll();
      setEditCourse({...newCourse, id:docRef.id});
      setShowCourseEditor(true);
    } catch(err) { flash("❌ "+err.message); }
    setSaving(false);
  };

  const approveEnrollment = async (req) => {
    try {
      await addDoc(collection(db,"enrollments"), {
        courseId:req.courseId, userId:req.userId, courseTitle:req.courseTitle,
        studentName:req.studentName, email:req.email, amount:req.amount,
        progress:0, completedLectures:[], enrolledAt:serverTimestamp(),
      });
      await updateDoc(doc(db,"enrollmentRequests",req.id), { status:"approved", approvedAt:serverTimestamp() });
      flash(`✅ ${req.studentName} ka enrollment approve hua!`);
      fetchAll();
    } catch(err) { flash("❌ "+err.message); }
  };

  const rejectEnrollment = async (reqId) => {
    await updateDoc(doc(db,"enrollmentRequests",reqId), { status:"rejected" });
    flash("Enrollment rejected."); fetchAll();
  };

  const addCoupon = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addDoc(collection(db,"coupons"), {
        code:newCoupon.code.toUpperCase(), discount:Number(newCoupon.discount),
        active:true, maxUses:Number(newCoupon.maxUses)||0, usedCount:0, createdAt:serverTimestamp(),
      });
      flash("✅ Coupon created!"); setNewCoupon({ code:"", discount:"", active:true, maxUses:"" }); fetchAll();
    } catch(err) { flash("❌ "+err.message); }
    setSaving(false);
  };

  const assignCourse = async () => {
    if (!assignData.userId || !assignData.courseId) { alert("Please select student and course"); return; }
    setAssigning(true);
    try {
      const course  = courses.find(c=>c.id===assignData.courseId);
      const student = allStudentUsers.find(u=>u.id===assignData.userId);
      const existing = enrollments.find(e=>e.courseId===assignData.courseId && e.userId===assignData.userId);
      if (existing) { alert("Student is already enrolled!"); setAssigning(false); return; }
      await addDoc(collection(db,"enrollments"), {
        courseId:assignData.courseId, userId:assignData.userId,
        courseTitle:course?.title||"", studentName:student?.coachingName||student?.ownerName||student?.email||"",
        email:student?.email||"", amount:Number(assignData.amount)||0,
        paymentMethod:assignData.paymentMethod, assignedByAdmin:true,
        progress:0, completedLectures:[], enrolledAt:serverTimestamp(),
      });
      await addDoc(collection(db,"enrollmentRequests"), {
        courseId:assignData.courseId, userId:assignData.userId,
        courseTitle:course?.title||"", studentName:student?.coachingName||student?.ownerName||student?.email||"",
        email:student?.email||"", amount:Number(assignData.amount)||0,
        paymentMethod:assignData.paymentMethod, assignedByAdmin:true, status:"approved", createdAt:serverTimestamp(),
      });
      flash("✅ Course assigned! Student can access now.");
      setShowAssignModal(false); setAssignData({ userId:"", courseId:"", paymentMethod:"offline", amount:"" }); fetchAll();
    } catch(e) { flash("❌ "+e.message); }
    setAssigning(false);
  };

  const revokeEnrollment = async (enrollmentId) => {
    if (!confirm("Remove this student from the course?")) return;
    await deleteDoc(doc(db,"enrollments",enrollmentId));
    flash("Enrollment removed."); fetchAll();
  };

  return (
    <div style={{ background:t.bg }}>
      <style>{`:root{--bg:${t.bg};--card:${t.bgCard};--bg2:${t.bgCard2};--bord:${t.border};--txt:${t.text};--mut:${t.muted};--gold:${t.gold};--acc:${t.accent};--grn:${t.green};--red:${t.red};}*{box-sizing:border-box;}button,input,select,textarea{font-family:'Plus Jakarta Sans',sans-serif;}
      .lms-courses-grid{display:grid;grid-template-columns:360px 1fr;gap:24px;}
      .lms-coupons-grid{display:grid;grid-template-columns:340px 1fr;gap:24px;}
      .lms-students-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;}
      .lms-chat-grid{display:grid;grid-template-columns:260px 1fr 240px;height:calc(100vh - 240px);}
      .lms-course-form-inner{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .lms-stats-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
      .lms-detail-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .lms-rev-inner{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      @media(max-width:900px){
        .lms-courses-grid{grid-template-columns:1fr!important;}
        .lms-coupons-grid{grid-template-columns:1fr!important;}
        .lms-chat-grid{grid-template-columns:1fr!important;height:auto!important;}
        .lms-chat-right{display:none!important;}
        .lms-chat-left{max-height:280px!important;}
      }
      @media(max-width:600px){
        .lms-students-grid{grid-template-columns:1fr!important;}
        .lms-course-form-inner{grid-template-columns:1fr!important;}
        .lms-stats-4{grid-template-columns:1fr 1fr!important;}
        .lms-detail-info{grid-template-columns:1fr!important;}
        .lms-rev-inner{grid-template-columns:1fr!important;}
      }`}</style>

      {msg && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:msg.startsWith("✅")?"rgba(16,185,129,.15)":"rgba(239,68,68,.15)", border:`1px solid ${msg.startsWith("✅")?t.green:t.red}`, color:msg.startsWith("✅")?t.green:t.red, padding:"10px 24px", borderRadius:50, fontSize:".9rem", fontWeight:700, whiteSpace:"nowrap" }}>{msg}</div>}

      {/* Course Editor Modal */}
      {showCourseEditor && editCourse && (
        <CourseModuleEditor course={editCourse} t={t} onClose={()=>{ setShowCourseEditor(false); setEditCourse(null); fetchAll(); }}/>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          studentEnrollments={selectedStudent}
          studentUser={studentUser}
          t={t}
          onClose={()=>{ setSelectedStudent(null); setStudentUser(null); }}
          onRevoke={revokeEnrollment}
          onChat={(uid)=>{ setSelectedStudent(null); setTab("💬 Chat"); setChatStudentId(uid); }}
        />
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:28, width:"100%", maxWidth:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem" }}>🎓 Manually Assign Course</h3>
              <button onClick={()=>setShowAssignModal(false)} style={{ background:"none", border:"none", color:t.muted, fontSize:"1.3rem", cursor:"pointer" }}>✕</button>
            </div>
            <Sel label="Select User" value={assignData.userId} onChange={e=>setAssignData({...assignData,userId:e.target.value})}>
              <option value="">-- Select User --</option>
              {allStudentUsers.map(u=>(
                <option key={u.id} value={u.id}>{u.coachingName||u.ownerName||u.email} · {u.role}</option>
              ))}
            </Sel>
            <Sel label="Select Course" value={assignData.courseId} onChange={e=>setAssignData({...assignData,courseId:e.target.value})}>
              <option value="">-- Select Course --</option>
              {courses.map(c=><option key={c.id} value={c.id}>{c.title} — ₹{c.price?.toLocaleString()}</option>)}
            </Sel>
            <Sel label="Payment Method" value={assignData.paymentMethod} onChange={e=>setAssignData({...assignData,paymentMethod:e.target.value})}>
              <option value="offline">Cash / Offline</option>
              <option value="upi_manual">UPI (Manual)</option>
              <option value="razorpay">Razorpay</option>
              <option value="free">Free / Complimentary</option>
              <option value="scholarship">Scholarship</option>
            </Sel>
            <Inp label="Amount Received (₹)" type="number" value={assignData.amount} onChange={e=>setAssignData({...assignData,amount:e.target.value})} placeholder="0 for free"/>
            <div style={{ background:`${t.gold}10`, border:`1px solid ${t.gold}25`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:".82rem", color:t.muted }}>
              ℹ️ Student gets <strong style={{ color:t.text }}>instant access</strong> after assignment.
            </div>
            <SBtn variant="green" onClick={assignCourse} disabled={assigning} style={{ width:"100%" }}>
              {assigning?"Assigning...":"✅ Assign — Give Instant Access"}
            </SBtn>
          </div>
        </div>
      )}

      {/* ── ATTRACTIVE TABS ── */}
      <div style={{ background:t.bgCard, borderBottom:`1px solid ${t.border}`, display:"flex", overflowX:"auto", padding:"0 4px", scrollbarWidth:"none", gap:4 }}>
        {LMSTABS.map(tn=>(
          <button key={tn} onClick={()=>setTab(tn)} style={{
            padding:"14px 18px", background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap",
            fontWeight:tab===tn?800:400, fontSize:".84rem",
            color:tab===tn?t.gold:t.muted,
            borderBottom:tab===tn?`3px solid ${t.gold}`:"3px solid transparent",
            transition:"all .15s",
          }}>{tn}</button>
        ))}
      </div>

      <div style={{ padding:"24px 0", maxWidth:1140 }}>

        {/* ══════════ DASHBOARD ══════════ */}
        {tab==="📊 Dashboard" && (
          <div>
            {/* Stats grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:14, marginBottom:28 }}>
              <StatCard icon="📚" label="Total Courses"   value={courses.length}                   color={t.accent} t={t}/>
              <StatCard icon="👥" label="Total Enrolled"  value={enrollments.length}               color={t.green}  t={t} sub={`${allStudentUsers.filter(u=>u.role==="student").length} students`}/>
              <StatCard icon="⏳" label="Pending Requests" value={requests.length}                 color={t.gold}   t={t}/>
              <StatCard icon="💰" label="Total Revenue"   value={`₹${totalRevenue.toLocaleString()}`} color={t.gold} t={t}/>
              <StatCard icon="🎟️" label="Active Coupons"  value={coupons.filter(c=>c.active).length} color={t.muted} t={t}/>
            </div>

            {/* Pending enrollment requests */}
            {requests.length > 0 && (
              <Card t={t} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
                  <div>
                    <h3 style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>⏳ Pending Enrollment Requests</h3>
                    <p style={{ fontSize:".78rem", color:t.muted, marginTop:2 }}>{requests.length} requests waiting</p>
                  </div>
                  <SBtn variant="primary" onClick={()=>setShowAssignModal(true)} style={{ fontSize:".8rem" }}>🎓 Assign Manually</SBtn>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {requests.map(req=>(
                    <div key={req.id} style={{ background:t.bgCard2, borderRadius:12, padding:"14px 16px", border:`1px solid ${t.gold}22` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                        <div>
                          <div style={{ fontWeight:700, color:t.text, marginBottom:2 }}>{req.studentName}</div>
                          <div style={{ fontSize:".82rem", color:t.muted }}>{req.courseTitle}</div>
                          <div style={{ fontSize:".76rem", color:t.muted, marginTop:4 }}>
                            UTR: <strong style={{ color:t.text }}>{req.utrNumber}</strong>
                            {req.amount > 0 && ` · ₹${req.amount?.toLocaleString()}`}
                            {req.couponCode && ` · 🏷️ ${req.couponCode}`}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <SBtn variant="green" onClick={()=>approveEnrollment(req)} style={{ padding:"7px 14px", fontSize:".8rem" }}>✓ Approve</SBtn>
                          <SBtn variant="danger" onClick={()=>rejectEnrollment(req.id)} style={{ padding:"7px 12px", fontSize:".8rem" }}>✕</SBtn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Course revenue cards */}
            <Card t={t}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:16, fontSize:".97rem" }}>📊 Course Performance</h3>
              {revenuePerCourse.sort((a,b)=>b.enrolled-a.enrolled).map(c=>(
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${t.border}` }}>
                  {c.thumbnail
                    ? <img src={c.thumbnail} style={{ width:52, height:38, objectFit:"cover", borderRadius:8, flexShrink:0 }} alt=""/>
                    : <div style={{ width:52, height:38, borderRadius:8, background:`${t.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"1.2rem" }}>🎓</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:t.text, fontSize:".9rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5 }}>
                      <div style={{ flex:1, background:t.bgCard2, borderRadius:50, height:5 }}>
                        <div style={{ height:"100%", width:`${totalRevenue>0?Math.round(c.revenue/totalRevenue*100):0}%`, background:`linear-gradient(90deg,${t.accent},${t.gold})`, borderRadius:50 }}/>
                      </div>
                      <span style={{ fontSize:".74rem", color:t.muted, whiteSpace:"nowrap" }}>{c.enrolled} students</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontWeight:800, color:t.gold, fontSize:".95rem" }}>₹{c.revenue.toLocaleString()}</div>
                    <div style={{ fontSize:".72rem", color:t.muted }}>₹{c.price?.toLocaleString()} each</div>
                  </div>
                </div>
              ))}
              {courses.length===0 && <div style={{ textAlign:"center", color:t.muted, padding:"30px" }}>No courses yet.</div>}
            </Card>
          </div>
        )}

        {/* ══════════ COURSES ══════════ */}
        {tab==="📚 Courses" && (
          <div className="lms-courses-grid">
            {/* Add course form */}
            <div>
              <Card t={t} style={{ position:"sticky", top:20 }}>
                <h3 style={{ fontWeight:800, color:t.text, marginBottom:16, fontSize:"1rem" }}>➕ New Course</h3>
                <form onSubmit={addCourse}>
                  <Inp label="Course Title *" required value={newCourse.title} onChange={e=>setNewCourse({...newCourse,title:e.target.value})} placeholder="e.g. Smart Teachers Master Course"/>
                  <Inp label="Subtitle" value={newCourse.subtitle} onChange={e=>setNewCourse({...newCourse,subtitle:e.target.value})} placeholder="Short tagline"/>
                  <Txt label="Description" rows={3} value={newCourse.description} onChange={e=>setNewCourse({...newCourse,description:e.target.value})}/>
                  <Sel label="Category" value={newCourse.category} onChange={e=>setNewCourse({...newCourse,category:e.target.value})}>
                    {["master","productivity","design","ai","youtube","other"].map(c=><option key={c} value={c}>{c}</option>)}
                  </Sel>
                  <div className="lms-course-form-inner" style={{ gap:10 }}>
                    <Inp label="Price ₹ *" type="number" required value={newCourse.price} onChange={e=>setNewCourse({...newCourse,price:e.target.value})}/>
                    <Inp label="MRP ₹" type="number" value={newCourse.mrp} onChange={e=>setNewCourse({...newCourse,mrp:e.target.value})}/>
                    <Inp label="Duration" value={newCourse.duration} onChange={e=>setNewCourse({...newCourse,duration:e.target.value})} placeholder="10+ hrs"/>
                    <Inp label="Free Modules" type="number" value={newCourse.freeModules} onChange={e=>setNewCourse({...newCourse,freeModules:e.target.value})}/>
                  </div>
                  <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                    <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:".85rem", color:t.muted, cursor:"pointer" }}>
                      <input type="checkbox" checked={newCourse.isMaster} onChange={e=>setNewCourse({...newCourse,isMaster:e.target.checked})}/> Master Course
                    </label>
                    <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:".85rem", color:t.muted, cursor:"pointer" }}>
                      <input type="checkbox" checked={newCourse.isBestseller} onChange={e=>setNewCourse({...newCourse,isBestseller:e.target.checked})}/> Bestseller
                    </label>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:".74rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 }}>Thumbnail</label>
                    <ImageUpload folder="courses" value={newCourse.thumbnail} onUpload={url=>setNewCourse({...newCourse,thumbnail:url})} label="" t={t}/>
                  </div>
                  <SBtn type="submit" variant="primary" disabled={saving} style={{ width:"100%", padding:"11px" }}>
                    {saving?"Creating...":"✅ Create → Add Modules"}
                  </SBtn>
                </form>
              </Card>
            </div>

            {/* Course cards grid */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h3 style={{ fontWeight:700, color:t.text, fontSize:".97rem" }}>All Courses ({courses.length})</h3>
              </div>
              <div style={{ display:"grid", gap:14 }}>
                {courses.map(c=>{
                  const enrolled = enrollments.filter(e=>e.courseId===c.id).length;
                  const revenue  = enrollments.filter(e=>e.courseId===c.id).reduce((s,e)=>s+(e.amount||0),0);
                  return (
                    <div key={c.id} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, overflow:"hidden" }}>
                      <div style={{ display:"flex", gap:0 }}>
                        {/* Thumbnail */}
                        <div style={{ width:110, flexShrink:0, position:"relative" }}>
                          {c.thumbnail
                            ? <img src={c.thumbnail} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/>
                            : <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg,${t.accent}30,${t.gold}20)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>🎓</div>
                          }
                          {c.isMaster && <span style={{ position:"absolute", top:6, left:6, background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", fontSize:".6rem", fontWeight:800, padding:"2px 7px", borderRadius:50 }}>MASTER</span>}
                        </div>
                        {/* Info */}
                        <div style={{ flex:1, padding:"14px 16px" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                            <div>
                              <div style={{ fontWeight:800, color:t.text, fontSize:".95rem" }}>{c.title}</div>
                              <div style={{ fontSize:".76rem", color:t.muted, marginTop:2 }}>{c.category} · {c.lectures||0} lectures · {c.duration||"—"}</div>
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                              <div style={{ fontWeight:800, color:t.gold, fontSize:"1rem" }}>₹{c.price?.toLocaleString()}</div>
                              {c.mrp > c.price && <div style={{ fontSize:".72rem", color:t.muted, textDecoration:"line-through" }}>₹{c.mrp?.toLocaleString()}</div>}
                            </div>
                          </div>
                          {/* Stats row */}
                          <div style={{ display:"flex", gap:12, marginBottom:12 }}>
                            <span style={{ fontSize:".76rem", background:`${t.green}15`, color:t.green, padding:"3px 9px", borderRadius:50, fontWeight:700 }}>👥 {enrolled} enrolled</span>
                            <span style={{ fontSize:".76rem", background:`${t.gold}15`, color:t.gold, padding:"3px 9px", borderRadius:50, fontWeight:700 }}>💰 ₹{revenue.toLocaleString()}</span>
                            {c.isBestseller && <span style={{ fontSize:".76rem", background:"rgba(99,102,241,.15)", color:"#818CF8", padding:"3px 9px", borderRadius:50, fontWeight:700 }}>🔥 Bestseller</span>}
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <SBtn variant="accent" onClick={()=>{ setEditCourse(c); setShowCourseEditor(true); }} style={{ padding:"6px 14px", fontSize:".78rem" }}>✏️ Edit + Modules</SBtn>
                            <SBtn variant="danger" onClick={async()=>{ if(confirm("Delete course?")){ await deleteDoc(doc(db,"courses",c.id)); fetchAll(); }}} style={{ padding:"6px 12px", fontSize:".78rem" }}>🗑</SBtn>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {courses.length===0 && <div style={{ textAlign:"center", color:t.muted, padding:"60px 0" }}><div style={{ fontSize:"3rem", marginBottom:12 }}>📚</div><p>Koi course nahi hai abhi. Upar form se add karo!</p></div>}
            </div>
          </div>
        )}

        {/* ══════════ ENROLLMENTS ══════════ */}
        {tab==="✅ Enrollments" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <h3 style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>All Enrollments ({enrollments.length})</h3>
                <p style={{ fontSize:".78rem", color:t.muted, marginTop:2 }}>Total revenue: ₹{totalRevenue.toLocaleString()}</p>
              </div>
              <SBtn variant="primary" onClick={()=>setShowAssignModal(true)}>+ Assign Course</SBtn>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {enrollments.map(e=>(
                <div key={e.id} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", flexShrink:0 }}>
                        {(e.studentName||e.email||"?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>{e.studentName || e.email}</div>
                        <div style={{ fontSize:".76rem", color:t.muted }}>{e.courseTitle} {e.amount>0 && `· ₹${e.amount?.toLocaleString()}`}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:800, color:e.progress===100?t.green:t.gold }}>{e.progress||0}%</div>
                        <div style={{ width:80, background:t.bgCard2, borderRadius:50, height:5, marginTop:4 }}>
                          <div style={{ height:"100%", width:`${e.progress||0}%`, background:e.progress===100?t.green:`linear-gradient(90deg,${t.accent},${t.gold})`, borderRadius:50 }}/>
                        </div>
                      </div>
                      <button onClick={()=>revokeEnrollment(e.id)} style={{ background:"none", border:"none", color:t.red, cursor:"pointer", fontSize:".8rem", opacity:.6 }} title="Remove">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {enrollments.length===0 && <div style={{ textAlign:"center", color:t.muted, padding:"60px 0" }}><div style={{ fontSize:"3rem", marginBottom:12 }}>✅</div><p>No enrollments yet.</p></div>}
          </div>
        )}

        {/* ══════════ STUDENTS ══════════ */}
        {tab==="👥 Students" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <h3 style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>Student Progress</h3>
                <p style={{ fontSize:".78rem", color:t.muted, marginTop:2 }}>Click karo student pe — poora data dekhne ke liye</p>
              </div>
              <SBtn variant="primary" onClick={()=>setShowAssignModal(true)}>🎓 Assign Course</SBtn>
            </div>
            <div className="lms-students-grid">
              {(() => {
                const studentMap = {};
                enrollments.forEach(e => {
                  const key = e.userId || e.email;
                  if (!studentMap[key]) studentMap[key] = { name:e.studentName||e.email, email:e.email, userId:e.userId, courses:[] };
                  studentMap[key].courses.push(e);
                });
                return Object.values(studentMap).map((student, si) => {
                  const avg = student.courses.length > 0
                    ? Math.round(student.courses.reduce((s,c)=>s+(c.progress||0),0)/student.courses.length)
                    : 0;
                  const completed = student.courses.filter(c=>c.progress===100).length;
                  const userInfo = allStudentUsers.find(u=>u.id===student.userId);
                  return (
                    <div key={si}
                      style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"16px", cursor:"pointer", transition:"all .2s" }}
                      onClick={()=>openStudentDetail(student, student.userId)}
                      onMouseEnter={e=>{ e.currentTarget.style.border=`1px solid ${t.accent}`; e.currentTarget.style.transform="translateY(-2px)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.border=`1px solid ${t.border}`; e.currentTarget.style.transform="translateY(0)"; }}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                        {userInfo?.photoUrl
                          ? <img src={userInfo.photoUrl} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", border:`2px solid ${t.accent}` }} alt=""/>
                          : <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", flexShrink:0 }}>
                              {(student.name||"?")[0].toUpperCase()}
                            </div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{student.name}</div>
                          <div style={{ fontSize:".74rem", color:t.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{student.email}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontWeight:900, color:avg===100?t.green:t.gold, fontSize:"1.1rem" }}>{avg}%</div>
                          <div style={{ fontSize:".68rem", color:t.muted }}>avg</div>
                        </div>
                      </div>
                      {/* Progress bars */}
                      {student.courses.slice(0,2).map((c,i)=>(
                        <div key={i} style={{ marginBottom:6 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontSize:".72rem", color:t.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%" }}>{c.courseTitle||c.courseId}</span>
                            <span style={{ fontSize:".72rem", color:c.progress===100?t.green:t.gold, fontWeight:700, flexShrink:0 }}>{c.progress||0}%</span>
                          </div>
                          <div style={{ background:t.bgCard2, borderRadius:50, height:4 }}>
                            <div style={{ height:"100%", width:`${c.progress||0}%`, background:c.progress===100?t.green:`linear-gradient(90deg,${t.accent},${t.gold})`, borderRadius:50 }}/>
                          </div>
                        </div>
                      ))}
                      {student.courses.length > 2 && <div style={{ fontSize:".72rem", color:t.muted, marginTop:4 }}>+{student.courses.length-2} more courses</div>}
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:10, borderTop:`1px solid ${t.border}` }}>
                        <span style={{ fontSize:".74rem", color:t.muted }}>{student.courses.length} course{student.courses.length>1?"s":""}</span>
                        <span style={{ fontSize:".74rem", color:t.green, fontWeight:700 }}>{completed} completed</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {enrollments.length===0 && <div style={{ textAlign:"center", color:t.muted, padding:"60px 0" }}><div style={{ fontSize:"3rem", marginBottom:12 }}>👥</div><p>No students enrolled yet.</p></div>}
          </div>
        )}

        {/* ══════════ COUPONS ══════════ */}
        {tab==="🎟️ Coupons" && (
          <div className="lms-coupons-grid">
            <Card t={t} style={{ position:"sticky", top:20 }}>
              <h3 style={{ fontWeight:800, color:t.text, marginBottom:16, fontSize:".97rem" }}>➕ Create Coupon</h3>
              <form onSubmit={addCoupon}>
                <Inp label="Coupon Code *" required value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon,code:e.target.value.toUpperCase()})} placeholder="DGHELPMATE20"/>
                <Inp label="Discount %" type="number" required min="1" max="100" value={newCoupon.discount} onChange={e=>setNewCoupon({...newCoupon,discount:e.target.value})} placeholder="20"/>
                <Inp label="Max Uses (0=unlimited)" type="number" value={newCoupon.maxUses} onChange={e=>setNewCoupon({...newCoupon,maxUses:e.target.value})} placeholder="0"/>
                <SBtn type="submit" variant="primary" disabled={saving} style={{ width:"100%", padding:"11px" }}>{saving?"Creating...":"Create Coupon 🎟️"}</SBtn>
              </form>
            </Card>
            <div>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14 }}>All Coupons ({coupons.length})</h3>
              <div style={{ display:"grid", gap:10 }}>
                {coupons.map(c=>(
                  <div key={c.id} style={{ background:t.bgCard, border:`1px solid ${c.active?t.border:"rgba(239,68,68,.2)"}`, borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:900, color:t.text, fontSize:"1.1rem", letterSpacing:".06em", fontFamily:"monospace" }}>{c.code}</div>
                      <div style={{ fontSize:".78rem", color:t.muted, marginTop:3 }}>
                        {c.discount}% off · Used: {c.usedCount||0}{c.maxUses?`/${c.maxUses}`:""}
                        {c.description && ` · ${c.description}`}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <button onClick={()=>updateDoc(doc(db,"coupons",c.id),{active:!c.active}).then(fetchAll)}
                        style={{ padding:"5px 14px", borderRadius:7, border:"none", background:c.active?`${t.green}18`:`${t.red}18`, color:c.active?t.green:t.red, fontWeight:700, fontSize:".78rem", cursor:"pointer" }}>
                        {c.active?"● Active":"○ Off"}
                      </button>
                      <button onClick={()=>deleteDoc(doc(db,"coupons",c.id)).then(fetchAll)} style={{ background:"none", border:"none", color:t.red, cursor:"pointer", fontSize:".85rem", opacity:.7 }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
              {coupons.length===0 && <div style={{ textAlign:"center", color:t.muted, padding:"40px" }}>No coupons yet.</div>}
            </div>
          </div>
        )}

        {/* ══════════ REVENUE ══════════ */}
        {tab==="💰 Revenue" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
              <StatCard icon="💰" label="Total Revenue"  value={`₹${totalRevenue.toLocaleString()}`} color={t.gold}  t={t}/>
              <StatCard icon="👥" label="Total Students" value={enrollments.length}                   color={t.green} t={t}/>
              <StatCard icon="📚" label="Active Courses"  value={courses.length}                      color={t.accent} t={t}/>
              <StatCard icon="📊" label="Avg per Student" value={enrollments.length>0?`₹${Math.round(totalRevenue/enrollments.length).toLocaleString()}`:"₹0"} color={t.muted} t={t}/>
            </div>
            <Card t={t}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:16 }}>Revenue by Course</h3>
              {revenuePerCourse.sort((a,b)=>b.revenue-a.revenue).map(c=>(
                <div key={c.id} style={{ padding:"14px 0", borderBottom:`1px solid ${t.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:600, color:t.text }}>{c.title}</div>
                      <div style={{ fontSize:".76rem", color:t.muted }}>₹{c.price?.toLocaleString()} × {c.enrolled} students</div>
                    </div>
                    <div style={{ fontWeight:800, color:t.gold }}>₹{c.revenue.toLocaleString()}</div>
                  </div>
                  <div style={{ background:t.bgCard2, borderRadius:50, height:7 }}>
                    <div style={{ height:"100%", width:`${totalRevenue>0?Math.round(c.revenue/totalRevenue*100):0}%`, background:`linear-gradient(90deg,${t.accent},${t.gold})`, borderRadius:50 }}/>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ══════════ CHAT ══════════ */}
        {tab==="💬 Chat" && (
          <LMSChatPanel t={t} enrollments={enrollments} allStudentUsers={allStudentUsers} defaultStudentId={chatStudentId}/>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: Student Detail Modal — click pe poora data
// ═══════════════════════════════════════════════════════════════
function StudentDetailModal({ studentEnrollments, studentUser, t, onClose, onRevoke, onChat }) {
  const { name, email, userId, courses } = studentEnrollments;
  const avgProgress = courses.length > 0 ? Math.round(courses.reduce((s,c)=>s+(c.progress||0),0)/courses.length) : 0;
  const completed   = courses.filter(c=>c.progress===100).length;
  const totalPaid   = courses.reduce((s,c)=>s+(c.amount||0),0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.78)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, width:"100%", maxWidth:660, maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header gradient */}
        <div style={{ background:`linear-gradient(135deg,${t.accent}20,${t.gold}10)`, borderBottom:`1px solid ${t.border}`, padding:"20px 24px", borderRadius:"20px 20px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              {studentUser?.photoUrl
                ? <img src={studentUser.photoUrl} style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover", border:`3px solid ${t.accent}` }} alt=""/>
                : <div style={{ width:56, height:56, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:"1.2rem", flexShrink:0 }}>
                    {(name||"?")[0].toUpperCase()}
                  </div>
              }
              <div>
                <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.15rem", marginBottom:3 }}>{name}</h2>
                <div style={{ fontSize:".78rem", color:t.muted }}>{email}</div>
                <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:".68rem", fontWeight:700, padding:"2px 9px", borderRadius:50, background:`${t.accent}20`, color:t.accent }}>🎓 Student</span>
                  {studentUser?.googleSignIn && <span style={{ fontSize:".68rem", fontWeight:700, padding:"2px 9px", borderRadius:50, background:"rgba(66,133,244,.15)", color:"#4285F4" }}>G Google</span>}
                  {studentUser?.isAlsoClient && <span style={{ fontSize:".68rem", fontWeight:700, padding:"2px 9px", borderRadius:50, background:`${t.green}15`, color:t.green }}>🔄 Dual Role</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:t.muted, fontSize:"1.3rem", cursor:"pointer" }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {/* Stats */}
          <div className="lms-stats-4" style={{ marginBottom:20 }}>
            {[
              ["Courses", courses.length, t.accent],
              ["Completed", completed, t.green],
              ["Avg Progress", `${avgProgress}%`, t.gold],
              ["Total Paid", `₹${totalPaid.toLocaleString()}`, t.gold],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:t.bgCard2, borderRadius:12, padding:"12px", textAlign:"center" }}>
                <div style={{ fontWeight:900, color:c, fontSize:"1.2rem" }}>{v}</div>
                <div style={{ fontSize:".68rem", color:t.muted, marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* User info if available */}
          {studentUser && (
            <div className="lms-detail-info" style={{ marginBottom:20 }}>
              {[
                ["📱 Phone", studentUser.phone||"—"],
                ["🏙️ City",  studentUser.city||"—"],
                ["🏫 Name",  studentUser.ownerName||studentUser.coachingName||"—"],
                ["📅 Joined", studentUser.createdAt?.toDate?.()?.toLocaleDateString("en-IN")||"—"],
              ].map(([k,v])=>(
                <div key={k} style={{ background:t.bgCard2, borderRadius:9, padding:"9px 12px" }}>
                  <div style={{ fontSize:".68rem", color:t.muted }}>{k}</div>
                  <div style={{ fontSize:".85rem", fontWeight:600, color:t.text, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Course enrollments */}
          <h4 style={{ fontWeight:700, color:t.text, marginBottom:12, fontSize:".9rem" }}>📚 Enrolled Courses ({courses.length})</h4>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {courses.map((c,i)=>(
              <div key={i} style={{ background:t.bgCard2, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, color:t.text, fontSize:".88rem" }}>{c.courseTitle||c.courseId}</div>
                    <div style={{ fontSize:".72rem", color:t.muted }}>
                      {c.completedLectures?.length||0} lectures
                      {c.paymentMethod && ` · ${c.paymentMethod}`}
                      {c.amount > 0 && ` · ₹${c.amount.toLocaleString()}`}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:900, color:c.progress===100?t.green:t.gold }}>{c.progress||0}%</span>
                    {c.progress===100 && <span>🏆</span>}
                    <button onClick={()=>onRevoke(c.id)} style={{ background:"none", border:"none", color:t.red, cursor:"pointer", opacity:.6, fontSize:".78rem" }} title="Remove">✕</button>
                  </div>
                </div>
                <div style={{ background:t.bg, borderRadius:50, height:6 }}>
                  <div style={{ height:"100%", width:`${c.progress||0}%`, background:c.progress===100?t.green:`linear-gradient(90deg,${t.accent},${t.gold})`, borderRadius:50 }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", paddingTop:14, borderTop:`1px solid ${t.border}` }}>
            <SBtn variant="accent" onClick={()=>onChat(userId)} style={{ flex:1 }}>💬 Chat with Student</SBtn>
            {studentUser?.phone && (
              <a href={`https://wa.me/91${studentUser.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                style={{ padding:"8px 16px", background:"#25D36620", border:"1px solid #25D36640", borderRadius:8, color:"#25D366", fontWeight:700, fontSize:".85rem", textDecoration:"none" }}>
                📱 WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LMS Chat Panel
// ═══════════════════════════════════════════════════════════════
function LMSChatPanel({ t, enrollments, allStudentUsers, defaultStudentId }) {
  const [chats, setChats]       = useState([]);
  const [clients, setClients]   = useState({});
  const [selectedId, setSelectedId] = useState(defaultStudentId||null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const { user }                = useAuth();
  const bottomRef               = useRef();

  useEffect(() => {
    const unsub = onSnapshot(collection(db,"chats"), async (snap) => {
      const list = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.lastTime?.seconds||0)-(a.lastTime?.seconds||0));
      setChats(list);
      const cData = {};
      for (const chat of list) {
        try {
          const roomId = chat.clientId || chat.id;
          if (!cData[roomId]) {
            const uSnap = await getDoc(doc(db,"users",roomId));
            cData[roomId] = uSnap.exists() ? {id:uSnap.id,...uSnap.data()} : { id:roomId, coachingName:chat.studentName||chat.clientName||roomId.substring(0,8), email:"", role:chat.isStudent?"student":"client" };
          }
        } catch {}
      }
      setClients(cData);
    });
    return ()=>unsub();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const q = collection(db,"chats",selectedId,"messages");
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.timestamp?.seconds||0)-(b.timestamp?.seconds||0));
      setMessages(msgs);
      setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
    });
    updateDoc(doc(db,"chats",selectedId),{unreadAdmin:0}).catch(()=>{});
    return ()=>unsub();
  }, [selectedId]);

  const sendMsg = async () => {
    if (!text.trim()||!selectedId||!user) return;
    setSending(true);
    try {
      await addDoc(collection(db,"chats",selectedId,"messages"), { text:text.trim(), senderId:user.uid, senderName:"DG HelpMate", senderRole:"admin", timestamp:serverTimestamp(), read:false });
      await setDoc(doc(db,"chats",selectedId), { clientId:selectedId, lastMessage:text.trim(), lastTime:serverTimestamp(), lastSender:"admin", unreadClient:1, unreadAdmin:0 }, {merge:true});
      setText("");
    } catch(e) { console.error(e); }
    setSending(false);
  };

  const selectedClient = clients[selectedId] || allStudentUsers?.find(u=>u.id===selectedId);
  const studentEnrollments = enrollments?.filter(e=>e.userId===selectedId)||[];

  return (
    <div className="lms-chat-grid" style={{ background:t.bgCard, borderRadius:16, overflow:"hidden", border:`1px solid ${t.border}` }}>
      {/* Chat list */}
      <div className="lms-chat-left" style={{ borderRight:`1px solid ${t.border}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${t.border}`, fontWeight:700, fontSize:".88rem", color:t.text, background:t.bgCard2 }}>
          💬 Conversations
          {chats.some(c=>c.unreadAdmin>0) && <span style={{ marginLeft:8, background:t.red, color:"#fff", borderRadius:50, padding:"2px 8px", fontSize:".7rem", fontWeight:800 }}>{chats.filter(c=>c.unreadAdmin>0).length}</span>}
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {chats.length===0 && <div style={{ color:t.muted, fontSize:".82rem", padding:"20px 16px" }}>No chats yet.</div>}
          {chats.map(chat=>{
            const cl = clients[chat.clientId||chat.id];
            const name = cl?.ownerName||cl?.coachingName||cl?.email||(chat.clientId||"").substring(0,8);
            const isSelected = selectedId===(chat.clientId||chat.id);
            return (
              <div key={chat.id} onClick={()=>setSelectedId(chat.clientId||chat.id)}
                style={{ padding:"11px 14px", cursor:"pointer", borderBottom:`1px solid ${t.border}`, background:isSelected?`${t.accent}15`:t.bgCard, borderLeft:isSelected?`3px solid ${t.accent}`:"3px solid transparent" }}>
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:".85rem", flexShrink:0 }}>
                    {name[0]?.toUpperCase()||"?"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, color:t.text, fontSize:".85rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
                    <div style={{ fontSize:".72rem", color:t.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{chat.lastMessage||"No messages"}</div>
                  </div>
                  {chat.unreadAdmin>0 && <div style={{ background:t.red, color:"#fff", borderRadius:50, padding:"2px 7px", fontSize:".68rem", fontWeight:800, flexShrink:0 }}>{chat.unreadAdmin}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div style={{ display:"flex", flexDirection:"column" }}>
        {selectedId ? (
          <>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${t.border}`, background:t.bgCard2, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff" }}>
                {(selectedClient?.ownerName||selectedClient?.coachingName||"?")[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, color:t.text, fontSize:".88rem" }}>{selectedClient?.ownerName||selectedClient?.coachingName||"—"}</div>
                <div style={{ fontSize:".7rem", color:t.green }}>● Active</div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:8 }}>
              {messages.length===0 && <div style={{ textAlign:"center", color:t.muted, padding:"40px 0" }}>💬 No messages yet</div>}
              {messages.map(msg=>{
                const isMe = msg.senderRole==="admin";
                return (
                  <div key={msg.id} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start", gap:8, alignItems:"flex-end" }}>
                    {!isMe && <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:".7rem", flexShrink:0 }}>{(selectedClient?.ownerName||"S")[0].toUpperCase()}</div>}
                    <div style={{ maxWidth:"70%" }}>
                      <div style={{ padding:"9px 13px", borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px", background:isMe?`linear-gradient(135deg,${t.accent},#4F46E5)`:t.bgCard2, color:isMe?"#fff":t.text, fontSize:".87rem", lineHeight:1.5 }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize:".65rem", color:t.muted, marginTop:3, textAlign:isMe?"right":"left" }}>{msg.timestamp?.toDate?.()?.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})||""}</div>
                    </div>
                    {isMe && <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#F59E0B,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:".62rem", color:"#070B14", flexShrink:0 }}>DG</div>}
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>
            <div style={{ padding:"10px 12px", borderTop:`1px solid ${t.border}`, display:"flex", gap:8 }}>
              <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder="Message..."
                style={{ flex:1, padding:"9px 14px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:50, fontSize:".87rem", color:t.text, outline:"none" }}/>
              <button onClick={sendMsg} disabled={!text.trim()||sending}
                style={{ padding:"9px 18px", background:text.trim()?`linear-gradient(135deg,${t.accent},#4F46E5)`:t.border, border:"none", borderRadius:50, color:"#fff", fontWeight:700, cursor:text.trim()?"pointer":"default" }}>
                {sending?"...":"➤"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:t.muted }}>
            <div style={{ fontSize:"2.5rem" }}>💬</div>
            <p style={{ fontSize:".88rem" }}>Select a chat from the left</p>
          </div>
        )}
      </div>

      {/* Right: student details */}
      <div className="lms-chat-right" style={{ borderLeft:`1px solid ${t.border}`, overflowY:"auto", padding:14 }}>
        {selectedClient ? (
          <>
            <div style={{ textAlign:"center", marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${t.border}` }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},#818CF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:"1.1rem", color:"#fff", margin:"0 auto 8px" }}>
                {(selectedClient.ownerName||selectedClient.coachingName||"?")[0]?.toUpperCase()}
              </div>
              <div style={{ fontWeight:700, color:t.text, fontSize:".88rem" }}>{selectedClient.ownerName||selectedClient.coachingName||"—"}</div>
              <div style={{ fontSize:".72rem", color:t.muted }}>{selectedClient.email||""}</div>
              <span style={{ fontSize:".68rem", fontWeight:700, padding:"2px 8px", borderRadius:50, background:`${t.accent}18`, color:t.accent, marginTop:6, display:"inline-block" }}>{selectedClient.role||"user"}</span>
            </div>
            {[[" Phone",selectedClient.phone],["City",selectedClient.city],["Coaching",selectedClient.coachingName]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${t.border}`, fontSize:".8rem" }}>
                <span style={{ color:t.muted }}>{k}</span><span style={{ color:t.text, fontWeight:600 }}>{v}</span>
              </div>
            ))}
            {selectedClient.phone && (
              <a href={`https://wa.me/91${selectedClient.phone?.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:10, padding:"7px", background:"#25D36620", border:"1px solid #25D36640", borderRadius:8, color:"#25D366", fontWeight:700, fontSize:".8rem", textDecoration:"none" }}>
                💬 WhatsApp
              </a>
            )}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:".7rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Courses ({studentEnrollments.length})</div>
              {studentEnrollments.map(e=>(
                <div key={e.id} style={{ background:t.bg, borderRadius:8, padding:"8px 10px", marginBottom:6 }}>
                  <div style={{ fontWeight:600, color:t.text, fontSize:".8rem", marginBottom:4 }}>{e.courseTitle}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ flex:1, background:t.bgCard2, borderRadius:50, height:4 }}>
                      <div style={{ height:"100%", width:`${e.progress||0}%`, background:`linear-gradient(90deg,${t.accent},${t.gold})`, borderRadius:50 }}/>
                    </div>
                    <span style={{ fontSize:".72rem", fontWeight:700, color:t.gold }}>{e.progress||0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:t.muted, flexDirection:"column", gap:8 }}>
            <div style={{ fontSize:"1.8rem" }}>👤</div>
            <p style={{ fontSize:".82rem" }}>Select a chat</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CourseModuleEditor — Full module/lecture/material editor
// (Logic same as before, UI slightly improved)
// ═══════════════════════════════════════════════════════════════
function CourseModuleEditor({ course, t, onClose }) {
  const [modules, setModules]   = useState([]);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [courseData, setCourseData] = useState({
    ...course,
    includesText: (course.includes||[]).join("\n"),
    forWhomText:  (course.forWhom||[]).join("\n"),
    notForText:   (course.notFor||[]).join("\n"),
    faqText:      (course.faq||[]).map(f=>"Q: "+f.q+"\nA: "+f.a).join("\n---\n"),
  });
  const [newMod, setNewMod]       = useState({ title:"", description:"", order:0 });
  const [expandedMod, setExpandedMod] = useState(null);
  const [newLec, setNewLec]       = useState({});
  const [newMat, setNewMat]       = useState({});

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(""),3000); };

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db,"courseModules"), where("courseId","==",course.id)));
      setModules(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0)));
    };
    load();
  }, [course.id]);

  const parseFaq = (text) => {
    const blocks = text.split("---").filter(Boolean);
    return blocks.map(block => {
      const lines = block.trim().split("\n").filter(Boolean);
      const q = lines.find(l=>l.startsWith("Q:"))?.slice(2).trim()||"";
      const a = lines.find(l=>l.startsWith("A:"))?.slice(2).trim()||"";
      return { q, a };
    }).filter(item=>item.q && item.a);
  };

  const saveCourseInfo = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,"courses",course.id), {
        title:courseData.title, subtitle:courseData.subtitle, description:courseData.description,
        price:Number(courseData.price), mrp:Number(courseData.mrp), duration:courseData.duration,
        isMaster:courseData.isMaster||false, isBestseller:courseData.isBestseller||false,
        freeModules:Number(courseData.freeModules)||1, thumbnail:courseData.thumbnail||"",
        includes:(courseData.includesText||"").split("\n").filter(Boolean),
        introVideo:courseData.introVideo||"",
        forWhom:(courseData.forWhomText||"").split("\n").filter(Boolean),
        notFor:(courseData.notForText||"").split("\n").filter(Boolean),
        faq:parseFaq(courseData.faqText||""),
        rating:Number(courseData.rating)||4.8,
        students:Number(courseData.students)||0,
        language:courseData.language||"Hindi",
        level:courseData.level||"Beginner",
        whatsappGroup:courseData.whatsappGroup||"",
      });
      flash("✅ Course info saved!");
    } catch(e) { flash("❌ "+e.message); }
    setSaving(false);
  };

  const addModule = async () => {
    if (!newMod.title.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db,"courseModules"), {
        courseId:course.id, title:newMod.title, description:newMod.description,
        order:modules.length, lectures:[], materials:[], createdAt:serverTimestamp(),
      });
      setModules([...modules, {id:ref.id, courseId:course.id, title:newMod.title, description:newMod.description, order:modules.length, lectures:[], materials:[]}]);
      setNewMod({title:"",description:"",order:0}); flash("✅ Module added!");
    } catch(e) { flash("❌ "+e.message); }
    setSaving(false);
  };

  const addLecture = async (modId, modIdx) => {
    const lec = newLec[modId];
    if (!lec?.title?.trim()) return;
    setSaving(true);
    try {
      const mod = modules[modIdx];
      let updatedLectures;
      if (lec.editIdx !== undefined && lec.editIdx !== null) {
        updatedLectures = [...(mod.lectures||[])];
        updatedLectures[lec.editIdx] = { ...updatedLectures[lec.editIdx], title:lec.title, videoId:lec.videoId||"", duration:lec.duration||"" };
        flash("✅ Lecture updated!");
      } else {
        updatedLectures = [...(mod.lectures||[]), { title:lec.title, videoId:lec.videoId||"", duration:lec.duration||"", description:lec.description||"" }];
        flash("✅ Lecture added!");
      }
      await updateDoc(doc(db,"courseModules",modId), { lectures:updatedLectures });
      const updMods = [...modules];
      updMods[modIdx] = {...mod, lectures:updatedLectures};
      setModules(updMods);
      setNewLec({...newLec,[modId]:{title:"",videoId:"",duration:"",description:"",editIdx:null}});
    } catch(e) { flash("❌ "+e.message); }
    setSaving(false);
  };

  const deleteLecture = async (modId, modIdx, lecIdx) => {
    const mod = modules[modIdx];
    const updated = (mod.lectures||[]).filter((_,i)=>i!==lecIdx);
    await updateDoc(doc(db,"courseModules",modId), {lectures:updated});
    const updMods = [...modules];
    updMods[modIdx] = {...mod, lectures:updated};
    setModules(updMods);
  };

  const addMaterial = async (modId, modIdx) => {
    const mat = newMat[modId];
    if (!mat?.title?.trim()) return;
    const mod = modules[modIdx];
    const updatedMats = [...(mod.materials||[]), { title:mat.title, type:mat.type||"PDF", url:mat.url||"", imageUrl:mat.imageUrl||"" }];
    await updateDoc(doc(db,"courseModules",modId), {materials:updatedMats});
    const updMods = [...modules];
    updMods[modIdx] = {...mod, materials:updatedMats};
    setModules(updMods);
    setNewMat({...newMat,[modId]:{title:"",type:"PDF",url:"",imageUrl:""}});
    flash("✅ Material added!");
  };

  const deleteModule = async (modId) => {
    if (!confirm("Delete this module?")) return;
    await deleteDoc(doc(db,"courseModules",modId));
    setModules(modules.filter(m=>m.id!==modId));
    flash("Module deleted.");
  };

  const inp = (v, onChange, ph) => (
    <input value={v||""} onChange={onChange} placeholder={ph}
      style={{ flex:1, padding:"8px 10px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, fontSize:".85rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box", minWidth:0 }}/>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.78)", zIndex:9999, overflowY:"auto" }}>
      <div style={{ maxWidth:900, margin:"20px auto", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:"clamp(16px,4vw,28px)" }}>
        <style>{`:root{--bg:${t.bg};--bord:${t.border};--txt:${t.text};--mut:${t.muted};}*{box-sizing:border-box;}input,select,textarea,button{font-family:'Plus Jakarta Sans',sans-serif;}`}</style>

        {msg && <div style={{ position:"sticky", top:0, zIndex:10, background:msg.startsWith("✅")?"rgba(16,185,129,.15)":"rgba(239,68,68,.15)", border:`1px solid ${msg.startsWith("✅")?t.green:t.red}`, color:msg.startsWith("✅")?t.green:t.red, padding:"8px 16px", borderRadius:8, marginBottom:14, fontSize:".88rem", fontWeight:700 }}>{msg}</div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.15rem" }}>✏️ {course.title}</h2>
            <p style={{ fontSize:".76rem", color:t.muted, marginTop:3 }}>Modules: {modules.length} · Edit course content</p>
          </div>
          <button onClick={onClose} style={{ background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:9, padding:"7px 16px", color:t.muted, cursor:"pointer", fontWeight:600 }}>← Close</button>
        </div>

        {/* Course Info */}
        <details style={{ marginBottom:20 }} open>
          <summary style={{ fontWeight:700, color:t.text, cursor:"pointer", padding:"12px 16px", fontSize:".95rem", background:t.bgCard2, borderRadius:10, listStyle:"none", display:"flex", justifyContent:"space-between" }}>
            <span>📝 Course Info & Settings</span><span style={{ color:t.muted, fontSize:".8rem" }}>Click to expand</span>
          </summary>
          <div style={{ paddingTop:16, display:"flex", flexDirection:"column", gap:0 }}>
            <div className="lms-course-form-inner" style={{ gap:12 }}>
              <div style={{ gridColumn:"1/-1" }}><Inp label="Title" value={courseData.title} onChange={e=>setCourseData({...courseData,title:e.target.value})}/></div>
              <Inp label="Subtitle" value={courseData.subtitle} onChange={e=>setCourseData({...courseData,subtitle:e.target.value})}/>
              <Sel label="Category" value={courseData.category||"productivity"} onChange={e=>setCourseData({...courseData,category:e.target.value})}>
                {["master","productivity","design","ai","youtube","other"].map(c=><option key={c} value={c}>{c}</option>)}
              </Sel>
              <Inp label="Price ₹" type="number" value={courseData.price} onChange={e=>setCourseData({...courseData,price:e.target.value})}/>
              <Inp label="MRP ₹" type="number" value={courseData.mrp} onChange={e=>setCourseData({...courseData,mrp:e.target.value})}/>
              <Inp label="Duration" value={courseData.duration} onChange={e=>setCourseData({...courseData,duration:e.target.value})}/>
              <Inp label="Free Modules" type="number" value={courseData.freeModules} onChange={e=>setCourseData({...courseData,freeModules:e.target.value})}/>
            </div>
            <Txt label="Description" rows={3} value={courseData.description} onChange={e=>setCourseData({...courseData,description:e.target.value})}/>
            <Txt label="What's Included (ek per line)" rows={5} value={courseData.includesText||""} onChange={e=>setCourseData({...courseData,includesText:e.target.value})} placeholder={"25+ AI Tools\nPPT Templates\nCertificate\nWhatsApp Support"}/>
            <div style={{ display:"flex", gap:16, marginBottom:12 }}>
              <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:".87rem", color:t.muted, cursor:"pointer" }}><input type="checkbox" checked={courseData.isMaster||false} onChange={e=>setCourseData({...courseData,isMaster:e.target.checked})}/> Master Course</label>
              <label style={{ display:"flex", gap:6, alignItems:"center", fontSize:".87rem", color:t.muted, cursor:"pointer" }}><input type="checkbox" checked={courseData.isBestseller||false} onChange={e=>setCourseData({...courseData,isBestseller:e.target.checked})}/> Bestseller</label>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <Inp label="Intro Video URL (YouTube)" value={courseData.introVideo||""} onChange={e=>setCourseData({...courseData,introVideo:e.target.value})} placeholder="https://youtu.be/VIDEO_ID"/>
                <Inp label="WhatsApp Group Link" value={courseData.whatsappGroup||""} onChange={e=>setCourseData({...courseData,whatsappGroup:e.target.value})} placeholder="https://chat.whatsapp.com/..."/>
              </div>
              <Inp label="Rating (e.g. 4.9)" type="number" value={courseData.rating||4.8} onChange={e=>setCourseData({...courseData,rating:e.target.value})}/>
              <Inp label="Students Count" type="number" value={courseData.students||0} onChange={e=>setCourseData({...courseData,students:e.target.value})}/>
              <Sel label="Language" value={courseData.language||"Hindi"} onChange={e=>setCourseData({...courseData,language:e.target.value})}>
                {["Hindi","English","Hindi + English"].map(l=><option key={l}>{l}</option>)}
              </Sel>
              <Sel label="Level" value={courseData.level||"Beginner"} onChange={e=>setCourseData({...courseData,level:e.target.value})}>
                {["Beginner","Intermediate","Advanced","All Levels"].map(l=><option key={l}>{l}</option>)}
              </Sel>
            </div>
            <div className="lms-rev-inner" style={{ gap:12 }}>
              <Txt label="For Whom (ek per line)" rows={4} value={courseData.forWhomText||""} onChange={e=>setCourseData({...courseData,forWhomText:e.target.value})} placeholder={"Coaching teachers\nYouTube educators"}/>
              <Txt label="NOT For (ek per line)" rows={4} value={courseData.notForText||""} onChange={e=>setCourseData({...courseData,notForText:e.target.value})} placeholder={"Advanced developers"}/>
            </div>
            <Txt label="FAQ (Q: question\nA: answer\n--- per question)" rows={8} value={courseData.faqText||""} onChange={e=>setCourseData({...courseData,faqText:e.target.value})} placeholder={"Q: Course kab milega?\nA: Payment ke turant baad.\n---\nQ: Certificate milega?\nA: Haan, 100% complete karne par."}/>
            <ImageUpload folder="courses" value={courseData.thumbnail} onUpload={url=>setCourseData({...courseData,thumbnail:url})} label="Course Thumbnail" t={t}/>
            <button onClick={saveCourseInfo} disabled={saving} style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", padding:"11px 24px", borderRadius:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginTop:4 }}>
              {saving?"Saving...":"💾 Save Course Info"}
            </button>
          </div>
        </details>

        {/* Modules */}
        <div style={{ marginBottom:16 }}>
          <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", marginBottom:14 }}>📚 Modules & Lectures ({modules.length} modules)</h3>
          {modules.map((mod, mIdx) => (
            <div key={mod.id} style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:12, marginBottom:12 }}>
              <div style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
                onClick={()=>setExpandedMod(expandedMod===mod.id?null:mod.id)}>
                <div>
                  <div style={{ fontWeight:700, color:t.text }}>Chapter {mIdx+1}: {mod.title}</div>
                  <div style={{ fontSize:".74rem", color:t.muted, marginTop:2 }}>{mod.lectures?.length||0} lectures · {mod.materials?.length||0} materials</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={e=>{e.stopPropagation();deleteModule(mod.id);}} style={{ background:"none", border:"none", color:t.red, cursor:"pointer", opacity:.6 }}>🗑</button>
                  <span style={{ color:t.muted, fontSize:".85rem" }}>{expandedMod===mod.id?"▲":"▼"}</span>
                </div>
              </div>

              {expandedMod===mod.id && (
                <div style={{ padding:"0 16px 16px" }}>
                  {/* Lectures */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>🎬 Lectures</div>
                    {(mod.lectures||[]).map((lec,lIdx)=>(
                      <div key={lIdx} style={{ background:t.bgCard, borderRadius:10, marginBottom:8, padding:"10px 12px", display:"flex", gap:10, alignItems:"center" }}>
                        <div style={{ width:30, height:30, borderRadius:7, background:`${t.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ color:t.accent, fontSize:".8rem" }}>▶</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:".86rem", color:t.text }}>{lec.title}</div>
                          <div style={{ fontSize:".72rem", color:t.muted }}>{lec.videoId?"🎬 Video ID set":"⚠️ No video"} {lec.duration?`· ⏱ ${lec.duration}`:""}</div>
                        </div>
                        <button onClick={()=>setNewLec({...newLec,[mod.id]:{title:lec.title,videoId:lec.videoId||"",duration:lec.duration||"",editIdx:lIdx}})} style={{ background:`${t.gold}18`, border:`1px solid ${t.gold}30`, color:t.gold, borderRadius:7, padding:"4px 9px", fontSize:".74rem", fontWeight:700, cursor:"pointer" }}>Edit</button>
                        <button onClick={()=>deleteLecture(mod.id,mIdx,lIdx)} style={{ background:"rgba(239,68,68,.1)", border:"none", color:t.red, borderRadius:7, padding:"4px 9px", fontSize:".74rem", cursor:"pointer" }}>✕</button>
                      </div>
                    ))}

                    {/* Add/edit lecture */}
                    <div style={{ background:newLec[mod.id]?.editIdx!=null?`${t.gold}08`:t.bgCard, borderRadius:10, padding:"14px", marginTop:8, border:`1px dashed ${newLec[mod.id]?.editIdx!=null?t.gold:t.border}` }}>
                      <div style={{ fontSize:".74rem", fontWeight:700, color:newLec[mod.id]?.editIdx!=null?t.gold:t.muted, marginBottom:10, display:"flex", justifyContent:"space-between" }}>
                        <span>{newLec[mod.id]?.editIdx!=null?"✏️ Edit Lecture":"+ Add Lecture"}</span>
                        {newLec[mod.id]?.editIdx!=null && <button onClick={()=>setNewLec({...newLec,[mod.id]:{title:"",videoId:"",duration:"",editIdx:null}})} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:".74rem" }}>Cancel</button>}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {inp(newLec[mod.id]?.title, e=>setNewLec({...newLec,[mod.id]:{...newLec[mod.id],title:e.target.value}}), "Lecture title *")}
                        {inp(newLec[mod.id]?.videoId, e=>setNewLec({...newLec,[mod.id]:{...newLec[mod.id],videoId:e.target.value}}), "YouTube URL or Video ID")}
                        {inp(newLec[mod.id]?.duration, e=>setNewLec({...newLec,[mod.id]:{...newLec[mod.id],duration:e.target.value}}), "Duration (e.g. 15 min)")}
                      </div>
                      <button onClick={()=>addLecture(mod.id,mIdx)} disabled={saving} style={{ marginTop:10, background:newLec[mod.id]?.editIdx!=null?`linear-gradient(135deg,${t.gold},#F97316)`:`linear-gradient(135deg,${t.accent},#4F46E5)`, color:newLec[mod.id]?.editIdx!=null?"#070B14":"#fff", border:"none", padding:"8px 18px", borderRadius:8, fontWeight:700, fontSize:".83rem", cursor:"pointer" }}>
                        {saving?"Saving...":(newLec[mod.id]?.editIdx!=null?"💾 Update":"+ Add Lecture")}
                      </button>
                    </div>
                  </div>

                  {/* Materials */}
                  <div>
                    <div style={{ fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>📎 Materials</div>
                    {(mod.materials||[]).map((mat,mati)=>(
                      <div key={mati} style={{ display:"flex", gap:10, alignItems:"center", padding:"7px 10px", background:t.bgCard, borderRadius:8, marginBottom:6 }}>
                        <span>{mat.type==="PDF"?"📄":mat.type==="Image"?"🖼️":"📎"}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:".84rem", color:t.text }}>{mat.title}</div>
                          <div style={{ fontSize:".72rem", color:t.muted }}>{mat.type}</div>
                        </div>
                        {mat.url && <a href={mat.url} target="_blank" rel="noreferrer" style={{ fontSize:".74rem", color:t.accent, fontWeight:700 }}>Open</a>}
                      </div>
                    ))}
                    <div style={{ background:t.bgCard, borderRadius:10, padding:"12px", marginTop:8, border:`1px dashed ${t.border}` }}>
                      <div style={{ fontSize:".74rem", fontWeight:700, color:t.muted, marginBottom:8 }}>+ Add Material</div>
                      <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                        {inp(newMat[mod.id]?.title, e=>setNewMat({...newMat,[mod.id]:{...newMat[mod.id],title:e.target.value}}), "Material title *")}
                        <select value={newMat[mod.id]?.type||"PDF"} onChange={e=>setNewMat({...newMat,[mod.id]:{...newMat[mod.id],type:e.target.value}})} style={{ padding:"8px 10px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, color:t.text, outline:"none" }}>
                          {["PDF","Image","Template","PPT","Word Doc","Canva Link","Other"].map(x=><option key={x}>{x}</option>)}
                        </select>
                      </div>
                      {inp(newMat[mod.id]?.url, e=>setNewMat({...newMat,[mod.id]:{...newMat[mod.id],url:e.target.value}}), "Drive/Download URL")}
                      <div style={{ margin:"8px 0" }}>
                        <ImageUpload folder="course-materials" value={newMat[mod.id]?.imageUrl||""} onUpload={url=>setNewMat({...newMat,[mod.id]:{...newMat[mod.id],imageUrl:url}})} label="Upload preview image" t={t}/>
                      </div>
                      <button onClick={()=>addMaterial(mod.id,mIdx)} style={{ background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff", border:"none", padding:"7px 16px", borderRadius:7, fontWeight:700, fontSize:".82rem", cursor:"pointer" }}>+ Add</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add new module */}
          <div style={{ background:t.bg, border:`2px dashed ${t.border}`, borderRadius:12, padding:"16px" }}>
            <div style={{ fontSize:".8rem", fontWeight:700, color:t.muted, marginBottom:10 }}>+ NEW MODULE / CHAPTER</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <input value={newMod.title} onChange={e=>setNewMod({...newMod,title:e.target.value})} placeholder="Chapter title e.g. Module 1 – Introduction"
                style={{ flex:1, padding:"9px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:8, fontSize:".9rem", color:t.text, fontFamily:"inherit", outline:"none", minWidth:200 }}/>
              <button onClick={addModule} disabled={saving} style={{ padding:"9px 20px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer" }}>+ Add Module</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}