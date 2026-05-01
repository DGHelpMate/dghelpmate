// src/pages/courses/CourseCatalog.jsx — Netflix-style, HTML design se inspired
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Logo, GlowBg, Spinner } from "../../components/ui/UI";
import useAuth from "../../hooks/useAuth";

const DEFAULT_COURSES = [
  { id:"master-course", title:"Smart Teachers Mastery Course", subtitle:"Complete Digital Teaching Bundle", description:"Master PPT designing, fast typing, thumbnail creation, AI tools, YouTube branding, video editing, and monetization.", category:"Digital Skills", price:9999, mrp:49999, thumbnail:"", modules:8, lectures:35, duration:"30+ hrs", isMaster:true, isBestseller:true, rating:4.9, students:120, freeModules:1, includes:["25+ AI Tools","PPT Templates","Canva Kit","Certificate","WhatsApp Support"] },
  { id:"fast-typing", title:"Fast Typing for Teachers", subtitle:"Type 200 WPM with AI", description:"Voice typing, keyboard shortcuts — type at lightning speed.", category:"Productivity", price:499, mrp:1999, thumbnail:"", modules:3, lectures:10, duration:"4 hrs", rating:4.7, students:45, freeModules:1 },
  { id:"ppt-designing", title:"PPT for Smart Board", subtitle:"Beautiful slides in minutes", description:"Create professional Smart Board presentations using PowerPoint and Canva.", category:"Design", price:699, mrp:2999, thumbnail:"", modules:3, lectures:12, duration:"5 hrs", isBestseller:true, rating:4.8, students:67, freeModules:1 },
  { id:"ai-tools", title:"AI Tools for Teachers", subtitle:"ChatGPT, Canva AI & More", description:"Learn 15+ AI tools that save 3 hours daily.", category:"Digital Skills", price:799, mrp:3999, thumbnail:"", modules:4, lectures:18, duration:"7 hrs", isBestseller:true, rating:4.9, students:89, freeModules:1 },
  { id:"youtube-coaching", title:"YouTube for Coaching", subtitle:"Grow to 10K subscribers", description:"Thumbnails, SEO, video editing, monetization — complete YouTube roadmap.", category:"YouTube", price:999, mrp:4999, thumbnail:"", modules:5, lectures:22, duration:"10 hrs", rating:4.6, students:34, freeModules:1 },
  { id:"mcq-creator", title:"MCQ Bank Creator Pro", subtitle:"Professional question banks", description:"Create 1000+ MCQs fast using AI tools and templates.", category:"MCQ", price:399, mrp:999, thumbnail:"", modules:3, lectures:12, duration:"4 hrs", rating:4.6, students:28, freeModules:1 },
];

const CATS = [
  ["all","🎯 All"],["Digital Skills","💻 Digital"],["YouTube","📺 YouTube"],
  ["Design","🎨 Design"],["Productivity","⚡ Speed"],["MCQ","📝 MCQ"],
];

const EMOJIS = {"Digital Skills":"💻","YouTube":"📺","Design":"🎨","Productivity":"⚡","MCQ":"📝","master":"🏆"};

export default function CourseCatalog({ openCourse, setPage, t }) {
  const { user } = useAuth();
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [enrollments, setEnrollments] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db,"courses"));
        const data = snap.docs.map(d=>({id:d.id,...d.data()}));
        setCourses(data.length > 0 ? data : DEFAULT_COURSES);
        if (user) {
          const eSnap = await getDocs(collection(db,"enrollments"));
          const mine = {};
          eSnap.docs.forEach(d=>{ const x=d.data(); if(x.userId===user.uid) mine[x.courseId]={...x,id:d.id}; });
          setEnrollments(mine);
        }
      } catch { setCourses(DEFAULT_COURSES); }
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = courses.filter(c =>
    (filter==="all" || c.category===filter) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()))
  );
  const master = filtered.find(c=>c.isMaster);
  const mini   = filtered.filter(c=>!c.isMaster);

  if (loading) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"60vh"}}>
      <Spinner size={40} color={t.gold}/>
    </div>
  );

  return (
    <div style={{background:t.bg,minHeight:"100vh"}}>
      <style>{`
        @keyframes cc-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .cc-card{transition:transform .22s,box-shadow .22s,border-color .22s!important;}
        .cc-card:hover{transform:translateY(-5px) scale(1.01)!important;box-shadow:0 18px 45px rgba(0,0,0,.45)!important;border-color:rgba(245,158,11,.3)!important;}
        .cc-card:hover .cc-play-btn{opacity:1!important;transform:translate(-50%,-50%) scale(1)!important;}
        .cc-enroll-btn{transition:filter .18s,transform .18s!important;}
        .cc-enroll-btn:hover{filter:brightness(1.1)!important;transform:translateY(-1px)!important;}
        .filter-pill{transition:all .15s!important;}
        .filter-pill:hover{border-color:rgba(99,102,241,.5)!important;}
        @media(max-width:640px){
          .cc-featured-card{ grid-template-columns:1fr!important; }
          .cc-featured-thumb{ min-height:200px!important; aspect-ratio:16/9; }
        }
        @media(max-width:500px){
          .cc-mini-grid{ grid-template-columns:1fr!important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{position:"relative",padding:"clamp(64px,8vw,80px) clamp(16px,5%,60px) 48px",overflow:"hidden",background:`linear-gradient(135deg,${t.bgCard2} 0%,${t.bg} 100%)`}}>
        <GlowBg color={t.accent} size={400} top={-120} right={-80}/>
        <GlowBg color={t.gold}   size={200} bottom={-60} left={-60}/>
        <div style={{position:"relative",zIndex:1,maxWidth:700,animation:"cc-up .6s ease both"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.3)",borderRadius:50,padding:"5px 16px",fontSize:".77rem",fontWeight:700,color:t.gold,marginBottom:18,letterSpacing:".06em"}}>
            🎓 DG HelpMate Learning Platform
          </div>
          <h1 style={{fontSize:"clamp(1.8rem,5vw,3rem)",fontWeight:800,color:t.text,lineHeight:1.12,marginBottom:14}}>
            Become a{" "}
            <span style={{background:"linear-gradient(135deg,#F59E0B,#F97316)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Digital Teacher
            </span>
          </h1>
          <p style={{fontSize:"clamp(.9rem,2vw,1.05rem)",color:t.muted,lineHeight:1.75,marginBottom:28,maxWidth:520}}>
            Learn from Bihar's #1 Education Content Expert. Practical courses — real results.
          </p>
          {/* Search */}
          <div style={{display:"flex",alignItems:"center",gap:10,background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:50,padding:"10px 18px",maxWidth:380}}>
            <span style={{color:t.muted,fontSize:".95rem",flexShrink:0}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search courses..."
              style={{flex:1,background:"none",border:"none",outline:"none",fontSize:".92rem",color:t.text,fontFamily:"inherit"}}/>
          </div>
        </div>
      </section>

      {/* ── FILTER PILLS ── */}
      <div style={{padding:"16px clamp(16px,5%,60px)",borderBottom:`1px solid ${t.border}`,display:"flex",gap:8,overflowX:"auto",alignItems:"center"}}>
        {CATS.map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)}
            className="filter-pill"
            style={{padding:"7px 18px",borderRadius:50,border:`1px solid ${filter===id?t.accent:t.border}`,background:filter===id?t.accentBg:"transparent",color:filter===id?t.accent:t.muted,fontWeight:filter===id?700:500,fontSize:".83rem",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
            {label}
          </button>
        ))}
        <div style={{marginLeft:"auto",fontSize:".8rem",color:t.muted,whiteSpace:"nowrap",flexShrink:0}}>
          {filtered.length} course{filtered.length!==1?"s":""}
        </div>
      </div>

      <div style={{padding:"28px clamp(16px,5%,60px) 80px"}}>

        {/* ── MASTER COURSE (Featured) ── */}
        {master && (
          <div style={{marginBottom:48,animation:"cc-up .5s ease both"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:3,height:18,background:`linear-gradient(${t.gold},${t.saffron||"#F97316"})`,borderRadius:2}}/>
              <span style={{fontSize:".78rem",fontWeight:700,color:t.gold,textTransform:"uppercase",letterSpacing:".1em"}}>🔥 Featured Course</span>
            </div>
            <div className="cc-card" onClick={()=>openCourse(master.id)}
              className="cc-featured-card" style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:20,overflow:"hidden",cursor:"pointer",display:"grid",gridTemplateColumns:"clamp(160px,38%,420px) 1fr"}}>
            <style>{`@media(max-width:640px){.cc-featured-card{grid-template-columns:1fr!important;}.cc-featured-thumb{min-height:200px!important;}}`}</style>
              {/* Thumb */}
              <div className="cc-featured-thumb" style={{position:"relative",background:`linear-gradient(135deg,${t.bgCard2},${t.bg})`,minHeight:280,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {master.thumbnail
                  ? <img src={master.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/>
                  : <div style={{fontSize:"5rem",opacity:.2}}>🎓</div>
                }
                {/* Play button */}
                <div className="cc-play-btn" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%) scale(.8)",width:56,height:56,borderRadius:"50%",background:"rgba(245,158,11,.9)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"all .2s",backdropFilter:"blur(4px)"}}>
                  <span style={{fontSize:"1.2rem",marginLeft:3}}>▶</span>
                </div>
                {/* Badges */}
                <div style={{position:"absolute",top:14,left:14,display:"flex",flexDirection:"column",gap:6}}>
                  <span style={{background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",padding:"3px 12px",borderRadius:50,fontSize:".72rem",fontWeight:800}}>⭐ BESTSELLER</span>
                  <span style={{background:"rgba(99,102,241,.8)",color:"#fff",padding:"3px 12px",borderRadius:50,fontSize:".72rem",fontWeight:700}}>MASTER COURSE</span>
                </div>
                {/* Progress if enrolled */}
                {enrollments[master.id] && (
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 14px",background:"rgba(7,11,20,.75)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:".73rem",color:"#fff",marginBottom:4,fontWeight:600}}>
                      <span>Your Progress</span><span style={{color:t.gold}}>{enrollments[master.id].progress||0}%</span>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,.15)",borderRadius:50}}>
                      <div style={{height:"100%",width:`${enrollments[master.id].progress||0}%`,background:`linear-gradient(90deg,${t.green},${t.gold})`,borderRadius:50}}/>
                    </div>
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{padding:"clamp(18px,3vw,32px)"}}>
                <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                  <span style={{background:`${t.accent}18`,color:t.accent,border:`1px solid ${t.accent}30`,padding:"3px 10px",borderRadius:50,fontSize:".72rem",fontWeight:700}}>Digital Skills</span>
                  <span style={{background:`${t.green}18`,color:t.green,border:`1px solid ${t.green}25`,padding:"3px 10px",borderRadius:50,fontSize:".72rem",fontWeight:700}}>Most Popular</span>
                </div>
                <h2 style={{fontWeight:800,fontSize:"clamp(1.1rem,2.5vw,1.6rem)",color:t.text,lineHeight:1.25,marginBottom:8}}>{master.title}</h2>
                <p style={{color:t.muted,fontSize:".88rem",lineHeight:1.65,marginBottom:16}}>{master.description?.substring(0,110)}...</p>

                <div style={{display:"flex",gap:16,fontSize:".8rem",color:t.muted,marginBottom:16,flexWrap:"wrap"}}>
                  <span>⭐ {master.rating} rating</span>
                  <span>👥 {master.students}+ students</span>
                  <span>📚 {master.modules} modules</span>
                  <span>🎬 {master.lectures} lectures</span>
                  <span>⏱️ {master.duration}</span>
                </div>

                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
                  {(master.includes||[]).map(item=>(
                    <span key={item} style={{fontSize:".73rem",background:t.bgCard2,border:`1px solid ${t.border}`,padding:"4px 10px",borderRadius:50,color:t.muted,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{color:t.green,fontSize:".7rem"}}>✓</span> {item}
                    </span>
                  ))}
                </div>

                <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
                  <div>
                    <div style={{fontSize:".82rem",color:t.muted,textDecoration:"line-through"}}>₹{master.mrp?.toLocaleString()}</div>
                    <div style={{fontSize:"2.2rem",fontWeight:900,color:t.gold,lineHeight:1}}>₹{master.price?.toLocaleString()}</div>
                    <div style={{fontSize:".75rem",color:t.green,fontWeight:700}}>🎉 Save ₹{(master.mrp-master.price)?.toLocaleString()}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button className="cc-enroll-btn" style={{padding:"12px 28px",background:enrollments[master.id]?"linear-gradient(135deg,#10B981,#059669)":"linear-gradient(135deg,#F59E0B,#F97316)",color:enrollments[master.id]?"#fff":"#070B14",border:"none",borderRadius:11,fontWeight:800,fontSize:".97rem",cursor:"pointer",fontFamily:"inherit"}}>
                      {enrollments[master.id]?"▶ Continue Learning":"🚀 Enroll Now"}
                    </button>
                    <div style={{fontSize:".72rem",color:t.muted,textAlign:"center"}}>✅ 7-day refund guarantee</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MINI COURSES ── */}
        {mini.length > 0 && (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:3,height:18,background:`linear-gradient(${t.accent},#4F46E5)`,borderRadius:2}}/>
              <span style={{fontSize:".78rem",fontWeight:700,color:t.muted,textTransform:"uppercase",letterSpacing:".1em"}}>
                {filter==="all"?"Quick Skill Courses":CATS.find(c=>c[0]===filter)?.[1]} ({mini.length})
              </span>
              <div style={{flex:1,height:1,background:t.border}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,240px),1fr))",gap:18}}>
              {mini.map((c,i) => {
                const disc = c.mrp ? Math.round((1-c.price/c.mrp)*100) : 0;
                const enr  = enrollments[c.id];
                const emoji = EMOJIS[c.category] || "📚";
                return (
                  <div key={c.id} className="cc-card" onClick={()=>openCourse(c.id)}
                    style={{background:t.bgCard,border:`1px solid ${t.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer",animation:`cc-up .${4+i}s ease both`}}>
                    {/* Thumbnail */}
                    <div style={{position:"relative",height:148,background:`linear-gradient(135deg,${t.bgCard2},${t.bg})`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {c.thumbnail
                        ? <img src={c.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/>
                        : <div style={{fontSize:"3.5rem",opacity:.18}}>{emoji}</div>
                      }
                      {/* Play overlay */}
                      <div className="cc-play-btn" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%) scale(.8)",width:44,height:44,borderRadius:"50%",background:"rgba(245,158,11,.9)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"all .2s"}}>
                        <span style={{fontSize:"1rem",marginLeft:2}}>▶</span>
                      </div>
                      {/* Badges */}
                      {disc>0 && <div style={{position:"absolute",top:10,right:10,background:"#EF4444",color:"#fff",padding:"2px 8px",borderRadius:50,fontSize:".7rem",fontWeight:800}}>-{disc}% OFF</div>}
                      {c.isBestseller && <div style={{position:"absolute",top:10,left:10,background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",padding:"2px 8px",borderRadius:50,fontSize:".68rem",fontWeight:800}}>⭐ BEST</div>}
                      {/* Progress bar */}
                      {enr && (
                        <div style={{position:"absolute",bottom:0,left:0,right:0,height:4,background:"rgba(255,255,255,.1)"}}>
                          <div style={{height:"100%",width:`${enr.progress||0}%`,background:t.green}}/>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div style={{padding:"14px 14px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <span style={{fontSize:".68rem",fontWeight:700,color:t.accent,textTransform:"uppercase",letterSpacing:".06em"}}>{c.category}</span>
                        <span style={{fontSize:".7rem",color:t.gold,marginLeft:"auto"}}>★ {c.rating||4.5}</span>
                      </div>
                      <h3 style={{fontWeight:700,fontSize:".92rem",color:t.text,lineHeight:1.3,marginBottom:4}}>{c.title}</h3>
                      <p style={{fontSize:".77rem",color:t.muted,marginBottom:10}}>{c.subtitle}</p>
                      <div style={{display:"flex",gap:10,fontSize:".73rem",color:t.muted,marginBottom:12}}>
                        <span>🎬 {c.lectures} lectures</span>
                        <span>⏱️ {c.duration}</span>
                        <span>👥 {c.students||0}+</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div>
                          {c.mrp && <div style={{fontSize:".72rem",color:t.muted,textDecoration:"line-through"}}>₹{c.mrp?.toLocaleString()}</div>}
                          <div style={{fontSize:"1.15rem",fontWeight:900,color:t.gold}}>₹{c.price?.toLocaleString()}</div>
                        </div>
                        <button className="cc-enroll-btn" style={{
                          padding:"7px 14px",border:"none",borderRadius:9,fontWeight:700,fontSize:".8rem",cursor:"pointer",fontFamily:"inherit",
                          background:enr?"rgba(16,185,129,.12)":"linear-gradient(135deg,#F59E0B,#F97316)",
                          color:enr?t.green:"#070B14",
                          outline:enr?`1px solid ${t.green}25`:"none",
                        }}>
                          {enr?"▶ Continue":"Enroll →"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{textAlign:"center",padding:"60px 0",color:t.muted}}>
            <div style={{fontSize:"3rem",marginBottom:12}}>🔍</div>
            <p>No courses found. Try a different search.</p>
          </div>
        )}

        {/* ── BOTTOM CTA ── */}
        <div style={{marginTop:56,background:`linear-gradient(135deg,${t.accentBg},${t.bgCard})`,border:`1px solid ${t.accent}25`,borderRadius:20,padding:"clamp(24px,4vw,40px)",textAlign:"center"}}>
          <h3 style={{fontWeight:800,fontSize:"clamp(1.2rem,3vw,1.6rem)",color:t.text,marginBottom:10}}>Looking for a specific topic?</h3>
          <p style={{color:t.muted,fontSize:".9rem",marginBottom:22}}>WhatsApp us — custom courses & 1-on-1 mentoring available</p>
          <a href="https://wa.me/919241653369?text=Custom%20course%20ke%20liye%20poochna%20tha" target="_blank"
            style={{display:"inline-flex",alignItems:"center",gap:8,background:"#25D366",color:"#fff",padding:"12px 28px",borderRadius:12,fontWeight:800,textDecoration:"none",fontSize:".95rem"}}>
            💬 WhatsApp for Custom Training
          </a>
        </div>
      </div>
    </div>
  );
}