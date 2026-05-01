// src/pages/courses/CourseDetail.jsx
// Hero: Video (left) + Info+CTA (right) — ek connected unit
// Details: single column neeche

import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Spinner } from "../../components/ui/UI";
import { openRazorpay } from "../../utils/razorpay";
import useAuth from "../../hooks/useAuth";

function ytId(url) {
  if (!url) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : url.trim();
}

const DEFAULTS = {
  "master-course":    { title:"Smart Teachers Mastery Course", subtitle:"Complete Digital Teaching Bundle", description:"Master PPT designing, fast typing, thumbnail creation, AI tools, YouTube branding, video editing, and monetization. Everything a modern teacher needs.", category:"Digital Skills", price:9999, mrp:49999, modules:8, lectures:35, duration:"30+ hrs", rating:4.9, students:120, isBestseller:true, includes:["25+ AI Tools Training","20+ PPT Template Pack","Canva Template Kit","Completion Certificate","2 Months WhatsApp Support","Lifetime Access"], curriculum:["Module 1 — Introduction (FREE Preview)","Module 2 — PPT Designing","Module 3 — AI Tools","Module 4 — YouTube Growth","Module 5 — Fast Typing","Module 6 — Thumbnail Design","Module 7 — Video Editing","Module 8 — Monetization"] },
  "fast-typing":      { title:"Fast Typing for Teachers", subtitle:"Type 200 WPM with AI", description:"Voice typing, keyboard shortcuts, AI autocomplete — type at lightning speed and save 2 hours every day.", category:"Productivity", price:499, mrp:1999, modules:3, lectures:10, duration:"4 hrs", rating:4.7, students:45, curriculum:["Module 1 — Voice Typing (FREE)","Module 2 — Keyboard Shortcuts","Module 3 — AI Tools"] },
  "ppt-designing":    { title:"PPT for Smart Board", subtitle:"Beautiful slides in 10 minutes", description:"Create professional Smart Board presentations using PowerPoint and Canva.", category:"Design", price:699, mrp:2999, modules:3, lectures:12, duration:"5 hrs", rating:4.8, students:67, isBestseller:true, curriculum:["Module 1 — Basics (FREE)","Module 2 — Canva Templates","Module 3 — Smart Board Design"] },
  "ai-tools":         { title:"AI Tools for Teachers", subtitle:"ChatGPT, Canva AI & 15+ tools", description:"Learn 15+ AI tools that save 3 hours daily.", category:"Digital Skills", price:799, mrp:3999, modules:4, lectures:18, duration:"7 hrs", rating:4.9, students:89, isBestseller:true, curriculum:["Module 1 — ChatGPT (FREE)","Module 2 — Canva AI","Module 3 — Voice & Writing","Module 4 — Automation"] },
  "youtube-coaching": { title:"YouTube for Coaching", subtitle:"0 to 10K subscribers roadmap", description:"Thumbnails, SEO, video editing, monetization — complete YouTube roadmap.", category:"YouTube", price:999, mrp:4999, modules:5, lectures:22, duration:"10 hrs", rating:4.6, students:34, curriculum:["Module 1 — Channel Setup (FREE)","Module 2 — Thumbnails","Module 3 — SEO","Module 4 — Editing","Module 5 — Monetization"] },
  "mcq-creator":      { title:"MCQ Bank Creator Pro", subtitle:"1000 questions fast with AI", description:"Create 1000+ MCQs fast using AI tools and templates.", category:"MCQ", price:399, mrp:999, modules:3, lectures:12, duration:"4 hrs", rating:4.6, students:28, curriculum:["Module 1 — MCQ Structure (FREE)","Module 2 — AI Tools","Module 3 — Export"] },
};

const CAT_COLOR = { "Digital Skills":"#6366F1","YouTube":"#EF4444","Design":"#EC4899","Productivity":"#10B981","MCQ":"#F59E0B" };

export default function CourseDetail({ courseId, setPage, t }) {
  const { user }                    = useAuth();
  const [course, setCourse]         = useState(null);
  const [modules, setModules]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [paying, setPaying]         = useState(false);
  const [coupon, setCoupon]         = useState("");
  const [couponMsg, setCouponMsg]   = useState("");
  const [finalPrice, setFinalPrice] = useState(null);
  const [openMod, setOpenMod]       = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db,"courses",courseId));
        const def  = DEFAULTS[courseId] || {};
        const base = snap.exists() ? { ...def, id:snap.id, ...snap.data() } : (def.title ? { id:courseId, ...def } : null);
        setCourse(base);
        if (base) {
          const mSnap = await getDocs(query(collection(db,"courseModules"), where("courseId","==",courseId)));
          if (mSnap.docs.length > 0)
            setModules(mSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.order||0)-(b.order||0)));
        }
      } catch {
        const def = DEFAULTS[courseId];
        if (def) setCourse({ id:courseId, ...def });
      }
      setLoading(false);
    };
    load();
  }, [courseId]);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponMsg("⏳ Checking...");
    try {
      const snap = await getDocs(query(collection(db,"coupons"), where("code","==",coupon.trim().toUpperCase())));
      if (snap.empty) { setCouponMsg("❌ Invalid coupon code"); return; }
      const cd = snap.docs[0].data();
      if (!cd.active) { setCouponMsg("❌ Coupon expired hai"); return; }
      const basePrice = Number(course.price) || 0;
      const discPct   = Number(cd.discount)  || 0;
      const disc      = Math.round(basePrice * (1 - discPct / 100));
      setFinalPrice(disc);  // disc=0 bhi sahi se set hoga
      setCouponMsg(`✅ ${discPct}% off! New price: ₹${disc.toLocaleString()}`);
    } catch(e) { console.error("Coupon error:", e); setCouponMsg("❌ Error checking coupon. Dobara try karo."); }
  };

  const handlePay = async () => {
    setPaying(true);
    await openRazorpay({
      amount: finalPrice !== null ? finalPrice : course.price, name: course.title,
      onSuccess: () => { setShowModal(false); setPaying(false); alert("🎉 Payment successful! Login to access your course."); setPage("login"); },
      onFailure: () => setPaying(false),
    });
    setPaying(false);
  };

  const handleEnroll = () => { if (!user) { setPage("login"); return; } setShowModal(true); };

  if (loading) return (
    <div style={{ display:"flex",justifyContent:"center",alignItems:"center",height:"70vh" }}>
      <Spinner size={44} color={t.gold}/>
    </div>
  );
  if (!course) return (
    <div style={{ textAlign:"center",padding:"100px 20px",color:t.muted }}>
      <div style={{ fontSize:"3rem",marginBottom:12 }}>😕</div>
      <h2 style={{ color:t.text,marginBottom:12 }}>Course not found</h2>
      <button onClick={()=>setPage("courses")} style={{ padding:"10px 24px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>← All Courses</button>
    </div>
  );

  const vid      = ytId(course.introVideo||"");
  const disc     = course.mrp ? Math.round((1-course.price/course.mrp)*100) : 0;
  const catClr   = CAT_COLOR[course.category]||t.accent;
  const curriculum = modules.length > 0
    ? modules.map(m=>({ name:m.title||m.name, lectures:m.lectures||[], free:m.isFree||false }))
    : (course.curriculum||[]).map((name,i)=>({ name, lectures:[], free:i===0 }));

  return (
    <div style={{ background:t.bg, minHeight:"100vh" }}>
      <style>{`
        @keyframes cd-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .cd-btn:hover  { filter:brightness(1.08); transform:translateY(-1px); }
        .cd-btn        { transition:all .15s !important; }
        .cd-mod:hover  { background:${t.bgCard2||t.bgCard} !important; }
        @media(max-width:860px){
          .cd-hero { flex-direction:column !important; }
          .cd-video-col { width:100% !important; }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(160deg,${t.bgCard2||t.bgCard} 0%,${t.bgCard} 100%)`, borderBottom:`1px solid ${t.border}` }}>
        <div className="cd-hero" style={{ maxWidth:1100, margin:"0 auto", padding:"clamp(18px,4%,36px) clamp(16px,4%,40px)", display:"flex", gap:"clamp(18px,3%,32px)", alignItems:"flex-start" }}>

          {/* LEFT — Video */}
          <div className="cd-video-col" style={{ width:"55%", flexShrink:0 }}>
            <button onClick={()=>setPage("courses")} style={{ background:"none",border:"none",color:t.muted,cursor:"pointer",fontFamily:"inherit",fontSize:".82rem",marginBottom:14,display:"flex",alignItems:"center",gap:6,padding:0 }}>
              ← All Courses
            </button>

            {/* Video box */}
            <div style={{ borderRadius:12, overflow:"hidden", background:"#000", boxShadow:"0 8px 28px rgba(0,0,0,.45)", position:"relative" }}>
              {vid ? (
                <div style={{ position:"relative", aspectRatio:"16/9" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white&controls=1`}
                    style={{ width:"100%",height:"100%",border:"none",display:"block" }}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                  {/* Blockers */}
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:44,zIndex:8,background:"linear-gradient(to bottom,rgba(0,0,0,.55),transparent)",cursor:"default" }} onContextMenu={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}/>
                  <div style={{ position:"absolute",top:0,right:0,width:"28%",height:44,zIndex:9,cursor:"default" }} onContextMenu={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}/>
                  <div style={{ position:"absolute",bottom:0,left:0,right:0,height:44,zIndex:8,background:"linear-gradient(to top,rgba(0,0,0,.65),transparent)",cursor:"default" }} onContextMenu={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}/>
                  <div style={{ position:"absolute",bottom:8,right:12,color:"rgba(255,255,255,.3)",fontSize:".6rem",fontWeight:800,userSelect:"none",pointerEvents:"none",zIndex:10 }}>© DG HelpMate</div>
                </div>
              ) : (
                <div style={{ position:"relative",aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0F1629,#1A2440)" }}>
                  {course.thumbnail
                    ? <img src={course.thumbnail} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}/>
                    : <div style={{ fontSize:"5rem",opacity:.15 }}>🎓</div>
                  }
                </div>
              )}
            </div>

            {vid && (
              <div style={{ marginTop:8,display:"flex",alignItems:"center",gap:6,color:t.muted,fontSize:".75rem" }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:t.green,display:"inline-block" }}/>
                Free intro video — unmute with the speaker icon
              </div>
            )}
          </div>

          {/* RIGHT — Info + CTA */}
          <div style={{ flex:1, minWidth:0 }}>
            {/* Badges */}
            <div style={{ display:"flex",gap:7,flexWrap:"wrap",marginBottom:12 }}>
              <span style={{ background:`${catClr}20`,color:catClr,border:`1px solid ${catClr}35`,padding:"3px 11px",borderRadius:50,fontSize:".72rem",fontWeight:700 }}>{course.category}</span>
              {course.isBestseller && <span style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",padding:"3px 11px",borderRadius:50,fontSize:".72rem",fontWeight:800 }}>⭐ BESTSELLER</span>}
              {disc>0 && <span style={{ background:"#EF444420",color:"#EF4444",border:"1px solid #EF444430",padding:"3px 11px",borderRadius:50,fontSize:".72rem",fontWeight:800 }}>-{disc}% OFF</span>}
            </div>

            <h1 style={{ fontSize:"clamp(1.1rem,2.8vw,1.65rem)",fontWeight:900,color:t.text,lineHeight:1.2,marginBottom:8 }}>{course.title}</h1>
            <p style={{ color:t.muted,fontSize:".86rem",lineHeight:1.7,marginBottom:12 }}>{course.description}</p>

            {/* Stats */}
            <div style={{ display:"flex",gap:12,color:t.muted,fontSize:".78rem",marginBottom:12,flexWrap:"wrap" }}>
              <span>⭐ <strong style={{ color:t.gold }}>{course.rating}</strong></span>
              <span>👥 <strong style={{ color:t.text }}>{course.students}+</strong> students</span>
              <span>📚 <strong style={{ color:t.text }}>{course.modules}</strong> modules</span>
              <span>🎬 <strong style={{ color:t.text }}>{course.lectures}</strong> lectures</span>
              <span>⏱️ {course.duration}</span>
            </div>

            <div style={{ fontSize:".76rem",color:t.muted,marginBottom:18 }}>
              By <strong style={{ color:t.gold }}>Govardhan Pandit</strong> — Founder, DG HelpMate
            </div>

            {/* Price card */}
            <div style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,padding:"16px 18px" }}>
              <div style={{ display:"flex",alignItems:"flex-end",gap:10,marginBottom:4 }}>
                <div style={{ fontSize:"1.9rem",fontWeight:900,color:t.gold,lineHeight:1 }}>₹{course.price?.toLocaleString()}</div>
                {course.mrp && <div style={{ fontSize:".85rem",color:t.muted,textDecoration:"line-through",paddingBottom:2 }}>₹{course.mrp?.toLocaleString()}</div>}
              </div>
              {disc>0 && <div style={{ fontSize:".76rem",color:t.green,fontWeight:700,marginBottom:12 }}>🎉 ₹{(course.mrp-course.price)?.toLocaleString()} ki bachat!</div>}

              <button className="cd-btn" onClick={handleEnroll} style={{ width:"100%",padding:"12px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:10,fontWeight:900,fontSize:".95rem",cursor:"pointer",fontFamily:"inherit",marginBottom:8 }}>
                🚀 Enroll Now
              </button>
              <a href="https://wa.me/919241653369?text=Course%20ke%20baare%20mein%20poochna%20tha" target="_blank" rel="noreferrer"
                style={{ display:"block",textAlign:"center",padding:"9px",background:"#25D36615",border:"1px solid #25D36635",borderRadius:9,color:"#25D366",fontWeight:700,fontSize:".83rem",textDecoration:"none",marginBottom:12 }}>
                💬 Ask on WhatsApp First
              </a>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                {["♾️ Lifetime","📱 Mobile+Desktop","🏆 Certificate","🔄 7-day refund"].map(f=>(
                  <span key={f} style={{ fontSize:".72rem",color:t.muted,background:t.bgCard2||t.bg,padding:"2px 9px",borderRadius:50,border:`1px solid ${t.border}` }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DETAILS ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"clamp(16px,4%,32px) clamp(16px,4%,40px)", animation:"cd-up .4s ease" }}>

        {/* What's included */}
        {(course.includes||[]).length > 0 && (
          <div style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,padding:"20px",marginBottom:18 }}>
            <h2 style={{ fontWeight:800,fontSize:".98rem",color:t.text,marginBottom:14 }}>✅ What You'll Get</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:9 }}>
              {course.includes.map((item,i) => (
                <div key={i} style={{ display:"flex",alignItems:"flex-start",gap:8,fontSize:".84rem",color:t.muted }}>
                  <span style={{ color:t.green,fontWeight:700,flexShrink:0 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Curriculum */}
        {curriculum.length > 0 && (
          <div style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",marginBottom:18 }}>
            <div style={{ padding:"16px 20px",borderBottom:`1px solid ${t.border}` }}>
              <h2 style={{ fontWeight:800,fontSize:".98rem",color:t.text,margin:0 }}>📚 Course Curriculum</h2>
              <div style={{ fontSize:".76rem",color:t.muted,marginTop:3 }}>{curriculum.length} modules · {course.lectures} lectures · {course.duration}</div>
            </div>
            {curriculum.map((mod,mi) => (
              <div key={mi} style={{ borderBottom:mi<curriculum.length-1?`1px solid ${t.border}`:"none" }}>
                <button className="cd-mod" onClick={()=>setOpenMod(openMod===mi?-1:mi)}
                  style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 20px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"background .15s" }}>
                  <div style={{ width:30,height:30,borderRadius:"50%",flexShrink:0,background:mod.free||mi===0?`${t.green}20`:`${catClr}15`,border:`1.5px solid ${mod.free||mi===0?t.green:catClr}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem",fontWeight:700,color:mod.free||mi===0?t.green:catClr }}>
                    {mod.free||mi===0?"🆓":(mi+1)}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:".87rem",color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{mod.name}</div>
                    {mod.lectures.length>0 && <div style={{ fontSize:".72rem",color:t.muted,marginTop:1 }}>{mod.lectures.length} lectures</div>}
                  </div>
                  {mod.free||mi===0
                    ? <span style={{ fontSize:".7rem",fontWeight:700,color:t.green,flexShrink:0 }}>FREE</span>
                    : <span style={{ color:t.muted,transform:openMod===mi?"rotate(180deg)":"rotate(0)",transition:"transform .2s",flexShrink:0 }}>▾</span>}
                </button>
                {openMod===mi && mod.lectures.length>0 && (
                  <div style={{ background:t.bgCard2||t.bg,borderTop:`1px solid ${t.border}` }}>
                    {mod.lectures.map((lec,li) => (
                      <div key={li} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 20px 9px 36px",borderBottom:li<mod.lectures.length-1?`1px solid ${t.border}`:"none" }}>
                        <span style={{ color:t.muted,fontSize:".75rem" }}>▶</span>
                        <span style={{ fontSize:".82rem",color:t.muted,flex:1 }}>{lec.title||`Lecture ${li+1}`}</span>
                        {lec.duration && <span style={{ fontSize:".72rem",color:t.muted,flexShrink:0 }}>{lec.duration}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructor */}
        <div style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:14,padding:"20px",marginBottom:18 }}>
          <h2 style={{ fontWeight:800,fontSize:".98rem",color:t.text,marginBottom:14 }}>👨‍🏫 About the Instructor</h2>
          <div style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#F59E0B,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"1.3rem",color:"#070B14" }}>G</div>
            <div>
              <div style={{ fontWeight:800,color:t.text,marginBottom:2 }}>Govardhan Pandit</div>
              <div style={{ fontSize:".78rem",color:t.gold,fontWeight:600,marginBottom:8 }}>Founder — DG HelpMate | 2.5+ years experience</div>
              <p style={{ fontSize:".83rem",color:t.muted,lineHeight:1.7,margin:0 }}>Bihar's #1 Education Content Creator. Empowered 26+ coaching institutes digitally. MSME Registered.</p>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div style={{ background:`${t.green}10`,border:`1px solid ${t.green}25`,borderRadius:14,padding:"16px 20px",display:"flex",gap:14,alignItems:"center",marginBottom:32 }}>
          <span style={{ fontSize:"2rem",flexShrink:0 }}>🛡️</span>
          <div>
            <div style={{ fontWeight:800,color:t.text,fontSize:".93rem",marginBottom:2 }}>7-Day Money Back Guarantee</div>
            <div style={{ fontSize:".81rem",color:t.muted,lineHeight:1.6 }}>Not satisfied within 7 days — full refund, no questions asked.</div>
          </div>
        </div>
      </div>

      {/* ── ENROLL MODAL ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)",padding:16 }}
          onClick={()=>!paying&&setShowModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:20,width:"100%",maxWidth:440,padding:"26px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
              <h3 style={{ fontWeight:900,color:t.text,fontSize:"1.05rem" }}>Course Enrollment</h3>
              <button onClick={()=>!paying&&setShowModal(false)} style={{ background:"none",border:"none",color:t.muted,fontSize:"1.4rem",cursor:"pointer",lineHeight:1 }}>✕</button>
            </div>
            <div style={{ background:t.bgCard2||t.bg,borderRadius:11,padding:"12px 14px",marginBottom:16 }}>
              <div style={{ fontWeight:700,color:t.text,marginBottom:5,fontSize:".93rem" }}>{course.title}</div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                {course.mrp && <span style={{ fontSize:".8rem",color:t.muted,textDecoration:"line-through" }}>₹{course.mrp?.toLocaleString()}</span>}
                <span style={{ fontSize:"1.7rem",fontWeight:900,color:t.gold }}>₹{(finalPrice !== null ? finalPrice : course.price)?.toLocaleString()}</span>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:".74rem",fontWeight:700,color:t.muted,textTransform:"uppercase",letterSpacing:".05em",display:"block",marginBottom:5 }}>Coupon Code (optional)</label>
              <div style={{ display:"flex",gap:8 }}>
                <input value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setCouponMsg("");setFinalPrice(null);}}
                  placeholder="e.g. DG20"
                  style={{ flex:1,padding:"9px 12px",background:t.bg,border:`1px solid ${t.border}`,borderRadius:8,fontSize:".86rem",color:t.text,fontFamily:"inherit",outline:"none" }}/>
                <button onClick={applyCoupon} style={{ padding:"9px 14px",background:t.accent,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit" }}>Apply</button>
              </div>
              {couponMsg && <div style={{ marginTop:5,fontSize:".78rem",color:couponMsg.startsWith("✅")?t.green:"#EF4444" }}>{couponMsg}</div>}
            </div>
            <div style={{ background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:11,padding:"14px",marginBottom:14,textAlign:"center" }}>
              <div style={{ fontSize:"1.7rem",fontWeight:900,color:t.gold }}>₹{(finalPrice !== null ? finalPrice : course.price)?.toLocaleString()}</div>
              <div style={{ fontSize:".76rem",color:t.muted,marginTop:3 }}>UPI · Card · NetBanking · Wallet</div>
            </div>
            <button onClick={handlePay} disabled={paying} style={{ width:"100%",padding:"13px",background:paying?t.border:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:11,fontWeight:900,fontSize:".97rem",cursor:paying?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:8 }}>
              {paying?"⏳ Processing...":`⚡ Pay ₹${(finalPrice !== null ? finalPrice : course.price)?.toLocaleString()} via Razorpay`}
            </button>
            <p style={{ textAlign:"center",fontSize:".74rem",color:t.muted }}>🔒 100% Secure · 7-day refund guarantee</p>
          </div>
        </div>
      )}
    </div>
  );
}