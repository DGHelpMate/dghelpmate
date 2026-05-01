// src/pages/student/StudentPortal.jsx — v3.0 FULLY SELF-CONTAINED
// ✅ Apna video player (YouTube embed, secure)
// ✅ Apna curriculum sidebar
// ✅ Real-time progress (onSnapshot)
// ✅ Mark as done + progress tracking
// ✅ Smart sections (In Progress → Not Started → Completed)
// ✅ Achievements (10 badges)
// ✅ Certificates (downloadable)
// ✅ Support (WhatsApp, Email, FAQ)
// ✅ Fully responsive — NO LMSApp dependency

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, onSnapshot, orderBy,
  updateDoc, doc, getDocs, addDoc,
  serverTimestamp, getDoc, setDoc, deleteDoc,
} from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import CourseDetail from "../courses/CourseDetail";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import useAuth from "../../hooks/useAuth";
import NotificationBell from "../../components/ui/NotificationBell";
import { Logo } from "../../components/ui/UI";
import { openRazorpay } from "../../utils/razorpay";
import { sendAdminNotification } from "../../hooks/useNotifications";

// ─── YouTube ID extractor ─────────────────────────────────────────────────────
function ytId(input) {
  if (!input) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = input.match(p); if (m) return m[1]; }
  return input.trim();
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: "When will I get course access?",    a: "Your enrollment activates immediately after payment. Go to the Courses tab to start learning." },
  { q: "When will I get my certificate?",   a: "Complete 100% of the course — your certificate will be available in the Certificates tab." },
  { q: "Is it lifetime access?",            a: "Yes! Once enrolled, you have lifetime access. Videos never expire." },
  { q: "What is the refund policy?",        a: "You can request a refund within 7 days of purchase — just WhatsApp us." },
  { q: "How can I ask doubts?",             a: "Use the Support tab — WhatsApp button is there. 24hr reply guaranteed." },
  { q: "Does it work on mobile?",           a: "Absolutely! Works perfectly on both Android and iPhone." },
];

// ─── Achievements ─────────────────────────────────────────────────────────────
function getAchievements(enrollments) {
  const total     = enrollments.length;
  const done      = enrollments.filter(e => e.progress === 100).length;
  const lectures  = enrollments.reduce((s, e) => s + (e.completedLectures?.length || 0), 0);
  const avg       = total > 0 ? Math.round(enrollments.reduce((s,e) => s+(e.progress||0),0)/total) : 0;
  return [
    { id:"fe",  icon:"🎓", label:"First Step",       desc:"First course enrolled!",        unlocked: total>=1 },
    { id:"3c",  icon:"📚", label:"Knowledge Seeker", desc:"3 courses enrolled!",           unlocked: total>=3 },
    { id:"5c",  icon:"🌟", label:"Star Student",     desc:"5 courses enrolled!",           unlocked: total>=5 },
    { id:"fc",  icon:"🏆", label:"Course Champion",  desc:"Pehla course 100% kiya!",          unlocked: done>=1  },
    { id:"3d",  icon:"🔥", label:"On Fire",          desc:"3 courses completed!",         unlocked: done>=3  },
    { id:"10l", icon:"⚡", label:"Fast Learner",     desc:"10 lectures completed!",       unlocked: lectures>=10 },
    { id:"50l", icon:"🚀", label:"Rocket Learner",   desc:"50 lectures completed!",       unlocked: lectures>=50 },
    { id:"h50", icon:"💪", label:"Halfway Hero",     desc:"Average progress 50%+!",           unlocked: avg>=50  },
    { id:"h90", icon:"💎", label:"Perfectionist",    desc:"Average progress 90%+!",           unlocked: avg>=90  },
    { id:"all", icon:"👑", label:"Grand Master",     desc:"All enrolled courses completed!",  unlocked: total>0 && done===total },
  ];
}

// ─── Theme computed inside component (see below) ──────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function StudentPortal({ t, dark, toggleTheme, setPage, showSwitchBtn=false, switchLabel="🏢 Switch to Client Mode", onSwitch }) {
  const { user, profile, logout } = useAuth();

  // ─── Dynamic theme — supports dark + light mode ────────────────────────────
  const T = {
    bg:     t?.bg      || "#070B14",
    bg2:    t?.bgCard  || "#0F1629",
    bg3:    t?.bgCard2 || "#151E35",
    bg4:    t?.bgCard2 || "#1A2440",
    border: t?.border  || "rgba(255,255,255,0.07)",
    border2:t?.border  || "rgba(255,255,255,0.13)",
    gold:   t?.gold    || "#F59E0B",
    saffron:t?.saffron || "#F97316",
    accent: t?.accent  || "#6366F1",
    text:   t?.text    || "#F1F5F9",
    muted:  t?.muted   || "#8892A4",
    green:  t?.green   || "#10B981",
    red:    t?.red     || "#EF4444",
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [enrollments, setEnrollments] = useState([]);   // array
  const [courses,     setCourses]     = useState([]);   // Firebase courses
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("courses");

  // Player state
  const [activeCourse,   setActiveCourse]   = useState(null);  // full course obj with chapters
  const [activeLecture,  setActiveLecture]  = useState(null);
  const [activeChapIdx,  setActiveChapIdx]  = useState(0);
  const [playerTab,      setPlayerTab]      = useState("overview");
  const [noteText,       setNoteText]       = useState("");
  const [noteSaving,     setNoteSaving]     = useState(false);
  const [notesSaved,     setNotesSaved]     = useState(false);
  const [allNotes,       setAllNotes]       = useState({});  // {lectureId: noteText}
  const [markingDone,    setMarkingDone]    = useState(false);

  // Enroll modal
  const [enrollModal,    setEnrollModal]    = useState(false);
  const [enrollTarget,   setEnrollTarget]   = useState(null);
  const [coupon,         setCoupon]         = useState("");
  const [couponMsg,      setCouponMsg]      = useState("");
  const [finalPrice,     setFinalPrice]     = useState(null);

  // Support
  const [faqOpen,        setFaqOpen]        = useState(null);
  const [chatInput,      setChatInput]      = useState("");
  const [chatMsgs,       setChatMsgs]       = useState([]);
  const [chatSending,    setChatSending]    = useState(false);
  const chatEndRef = useRef();

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName,  setEditName]  = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Course detail view (inside portal)
  const [viewCourseId, setViewCourseId] = useState(null);

  // Badge popup
  const [newBadge, setNewBadge] = useState(null);

  // Toast
  const [toasts, setToasts] = useState([]);
  const toast = (msg, type="success") => {
    const id = Date.now();
    setToasts(p => [...p, {id, msg, type}]);
    setTimeout(() => setToasts(p => p.filter(x=>x.id!==id)), 3500);
  };

  // ── Real-time enrollments ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,"enrollments"), where("userId","==",user.uid));
    const unsub = onSnapshot(q, async snap => {
      const raw = snap.docs.map(d => ({id:d.id,...d.data()}));

      // Enrich with course thumbnail
      const enriched = await Promise.all(raw.map(async enr => {
        if (enr.thumbnail) return enr;
        try {
          const cs = await getDoc(doc(db,"courses",enr.courseId));
          if (cs.exists()) {
            const cd = cs.data();
            return {...enr, thumbnail: cd.thumbnail||cd.image||cd.imageUrl||"", courseTitle: enr.courseTitle||cd.title||""};
          }
        } catch(_) {}
        return enr;
      }));

      setEnrollments(prev => {
        // Badge unlock check
        if (prev.length > 0) {
          const pa = getAchievements(prev);
          const na = getAchievements(enriched);
          const just = na.find(n => n.unlocked && !pa.find(p=>p.id===n.id&&p.unlocked));
          if (just) { setNewBadge(just); setTimeout(()=>setNewBadge(null),3500); }
        }
        return enriched;
      });
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  // ── Load Firebase courses ─────────────────────────────────────────────────
  useEffect(() => {
    getDocs(collection(db,"courses"))
      .then(snap => { if (snap.docs.length>0) setCourses(snap.docs.map(d=>({id:d.id,...d.data()}))); })
      .catch(()=>{});
  }, []);

  // ── Chat messages ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || tab!=="support") return;
    const q = query(collection(db,"chats",user.uid,"messages"), orderBy("timestamp","asc"));
    const unsub = onSnapshot(q, snap => {
      setChatMsgs(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return unsub;
  }, [user, tab]);

  // ✅ FIX: Scroll sirf tab==='support' ho aur chat box already visible ho tab karo
  // Tab switch hone pe page scroll nahi hona chahiye — sirf chat box ke andar scroll
  const [chatInitialized, setChatInitialized] = useState(false);
  useEffect(() => {
    if (tab !== "support") { setChatInitialized(false); return; }
    if (chatMsgs.length === 0) return;
    if (!chatInitialized) {
      // Pehli baar messages load — sirf chat box ke andar scroll karo, page scroll nahi
      setChatInitialized(true);
      // Small delay taaki DOM render ho jaye
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
      }, 100);
      return;
    }
    // Naya message aaya — smooth scroll
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatMsgs, tab]);

  // ── Load notes for active lecture ──────────────────────────────────────────
  useEffect(() => {
    if (!activeLecture?.id || !user) return;
    const saved = allNotes[activeLecture.id] || "";
    setNoteText(saved);
    setNotesSaved(false);
    // If not in memory, try Firestore
    if (!allNotes[activeLecture.id]) {
      getDoc(doc(db,"studentNotes",`${user.uid}_${activeLecture.id}`)).then(snap => {
        if (snap.exists()) {
          const text = snap.data().text || "";
          setNoteText(text);
          setAllNotes(prev => ({...prev, [activeLecture.id]: text}));
        }
      }).catch(()=>{});
    }
  }, [activeLecture?.id]);

  // ── Open a course (load modules from Firebase) ────────────────────────────
  const openCourse = async (courseId) => {
    // Check enrollment
    const enr = enrollments.find(e=>e.courseId===courseId);
    const c   = courses.find(x=>x.id===courseId) || {id:courseId, title: enr?.courseTitle||"Course", chapters:[]};

    if (!enr) {
      setEnrollTarget(c); setEnrollModal(true); return;
    }

    // Load courseModules from Firebase
    try {
      const modSnap = await getDocs(query(collection(db,"courseModules"), where("courseId","==",courseId)));
      let chapters = [];
      if (modSnap.docs.length > 0) {
        chapters = modSnap.docs
          .map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>(a.order||0)-(b.order||0))
          .map(mod => ({
            id: mod.id, name: mod.title,
            lectures: (mod.lectures||[]).map((lec,i) => ({
              id: lec.id||`${mod.id}-${i}`,
              title: lec.title,
              ytId: ytId(lec.videoId||""),
              duration: lec.duration||"",
              materials: mod.materials||[],
              free: false,
            })),
          }));
      } else if (c.chapters?.length > 0) {
        chapters = c.chapters;
      }
      const courseWithChapters = {...c, chapters};
      setActiveCourse(courseWithChapters);
      if (chapters[0]?.lectures?.[0]) {
        setActiveLecture(chapters[0].lectures[0]);
        setActiveChapIdx(0);
      }
      setPlayerTab("overview");
      window.scrollTo(0,0);
    } catch(err) {
      console.error("Module load error:", err);
      setActiveCourse({...c});
    }
  };

  // ── Mark lecture done ─────────────────────────────────────────────────────
  const markDone = async () => {
    if (!activeLecture || !activeCourse || markingDone) return;
    const enr = enrollments.find(e=>e.courseId===activeCourse.id);
    if (!enr) return;
    const completed = [...(enr.completedLectures||[])];
    if (completed.includes(activeLecture.id)) return;
    setMarkingDone(true);
    completed.push(activeLecture.id);
    const total = (activeCourse.chapters||[]).reduce((s,c)=>s+(c.lectures?.length||0),0)||1;
    const pct   = Math.min(100,Math.round(completed.length/total*100));
    try {
      await updateDoc(doc(db,"enrollments",enr.id),{completedLectures:completed,progress:pct});
      toast("✅ Lecture complete! "+pct+"% done");
      if (pct===100) setTimeout(()=>toast("🏆 Course 100% complete! Check your certificate!"),1200);
    } catch(e) { toast("Error saving. Try again.","error"); }
    setMarkingDone(false);
  };

  // ── Coupon ────────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponMsg("⏳ Checking...");
    try {
      const snap = await getDocs(query(collection(db,"coupons"), where("code","==",coupon.trim().toUpperCase())));
      if (snap.empty) { setCouponMsg("❌ Invalid coupon code"); return; }
      const cd = snap.docs[0].data();
      if (!cd.active) { setCouponMsg("❌ Coupon expired hai"); return; }
      const basePrice  = Number(enrollTarget?.price) || 0;
      const discPct    = Number(cd.discount) || 0;
      const discounted = Math.round(basePrice * (1 - discPct / 100));
      setFinalPrice(discounted);
      setCouponMsg(`✅ ${discPct}% off! New price: ₹${discounted.toLocaleString()}`);
    } catch(e) { console.error("Coupon error:", e); setCouponMsg("❌ Error checking coupon. Dobara try karo."); }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const submitPayment = async () => {
    if (!user || !enrollTarget) return;
    await openRazorpay({
      amount: finalPrice !== null ? finalPrice : enrollTarget.price,
      name: enrollTarget.title,
      description: "Course Enrollment — DG HelpMate",
      prefillName: profile?.ownerName||profile?.coachingName||"",
      prefillEmail: user.email||"",
      onSuccess: async (paymentId) => {
        try {
          await addDoc(collection(db,"enrollmentRequests"),{
            courseId:enrollTarget.id, userId:user.uid, courseTitle:enrollTarget.title,
            studentName:profile?.ownerName||profile?.coachingName||user.email,
            email:user.email, amount:enrollTarget.price,
            razorpayPaymentId:paymentId, couponCode:coupon,
            status:"approved", createdAt:serverTimestamp(),
          });
          await addDoc(collection(db,"enrollments"),{
            courseId:enrollTarget.id, userId:user.uid, courseTitle:enrollTarget.title,
            studentName:profile?.ownerName||profile?.coachingName||user.email,
            email:user.email, amount:enrollTarget.price,
            progress:0, completedLectures:[], enrolledAt:serverTimestamp(),
          });
          toast("🎉 Enrolled successfully! Check your WhatsApp.");
          sendAdminNotification({ title:"New Enrollment!", body:`${profile?.ownerName||"Student"} enrolled in ${enrollTarget.title}`, type:"payment" });

          // WhatsApp Group auto-invite if course has group link
          if (enrollTarget.whatsappGroup) {
            setTimeout(() => {
              toast(`💬 Join the course WhatsApp group!`);
              window.open(enrollTarget.whatsappGroup, "_blank");
            }, 2000);
          }

          // ── WhatsApp auto-invite — course group link bhejo ──────────────
          const waMsg = encodeURIComponent(
            `🎉 *DG HelpMate mein Welcome to DG HelpMate!*\n\n` +
            `Hi ${profile?.ownerName||"Student"},\n\n` +
            `*${enrollTarget.title}* enrollment successful!\n\n` +
            `✅ Apna course access karo: https://dghelpmate.com\n\n` +
            `📱 Login to Student Portal → Go to Courses tab\n\n` +
            `Reply here if you have any questions! 🙏\n— DG HelpMate Team`
          );
          if (profile?.phone) {
            const phone = profile.phone.replace(/\D/g,"");
            const fullPhone = phone.startsWith("91") ? phone : "91"+phone;
            setTimeout(() => window.open(`https://wa.me/${fullPhone}?text=${waMsg}`, "_blank"), 1500);
          }

          setEnrollModal(false); setCoupon(""); setFinalPrice(null); setCouponMsg("");
        } catch(e) { toast("Payment done but record error. PaymentID:"+paymentId,"error"); }
      },
      onFailure: (err) => { if (err!=="dismissed") toast("Payment failed. Try again.","error"); },
    });
  };

  // ── Send chat ─────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim()||!user||chatSending) return;
    setChatSending(true);
    const txt = chatInput.trim();
    setChatInput("");
    try {
      await addDoc(collection(db,"chats",user.uid,"messages"),{
        text:txt, senderId:user.uid,
        senderName:profile?.ownerName||profile?.coachingName||"Student",
        senderRole:"student", timestamp:serverTimestamp(), read:false,
      });
      await setDoc(doc(db,"chats",user.uid),{
        clientId:user.uid, studentName:profile?.ownerName||profile?.coachingName||"Student",
        lastMessage:txt, lastTime:serverTimestamp(), lastSender:"student",
        unreadAdmin:1, unreadClient:0, isStudent:true,
      },{merge:true});
    } catch(e) { console.error(e); }
    setChatSending(false);
  };

  // ── Save Lecture Note ─────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!activeLecture?.id || !user) return;
    setNoteSaving(true);
    try {
      await setDoc(doc(db,"studentNotes",`${user.uid}_${activeLecture.id}`), {
        userId:     user.uid,
        lectureId:  activeLecture.id,
        courseId:   activeCourse?.id || "",
        lectureName: activeLecture.title || "",
        text:       noteText,
        updatedAt:  serverTimestamp(),
      });
      setAllNotes(prev => ({...prev, [activeLecture.id]: noteText}));
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch(e) { toast("Failed to save note","error"); }
    setNoteSaving(false);
  };

  // ── Upload Profile Photo ─────────────────────────────────────────────────
  const uploadPhoto = async (file) => {
    if (!file || !user) return;
    setPhotoUploading(true);
    try {
      const storageRef = ref(storage, `students/${user.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db,"users",user.uid), { photoUrl: url });
      toast("✅ Photo updated!");
    } catch(e) { toast("Photo upload failed. Try again.","error"); }
    setPhotoUploading(false);
  };

  // ── Save Profile ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!editName.trim()) { toast("Name cannot be empty","error"); return; }
    setProfileSaving(true);
    try {
      await updateDoc(doc(db,"users",user.uid), {
        ownerName:    editName.trim(),
        coachingName: editName.trim(),
        phone:        editPhone.trim(),
      });
      setEditingProfile(false);
      toast("✅ Profile updated!");
    } catch(e) { toast("Update failed. Try again.","error"); }
    setProfileSaving(false);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const achievements  = getAchievements(enrollments);
  const unlockedCount = achievements.filter(a=>a.unlocked).length;
  const totalLectures = enrollments.reduce((s,e)=>s+(e.completedLectures?.length||0),0);
  const completedList = enrollments.filter(e=>e.progress===100);
  const avgProg       = enrollments.length>0 ? Math.round(enrollments.reduce((s,e)=>s+(e.progress||0),0)/enrollments.length) : 0;
  const inProgress    = enrollments.filter(e=>(e.progress||0)>0 && e.progress<100);
  const notStarted    = enrollments.filter(e=>!e.progress||e.progress===0);

  const TABS = [["courses","🎓","Courses"],["browse","🔍","Browse"],["achievements","🏅","Badges"],["certificates","📜","Certs"],["support","💬","Support"],["profile","👤","Profile"]];

  const activeEnr = activeCourse ? enrollments.find(e=>e.courseId===activeCourse.id) : null;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Plus Jakarta Sans',Inter,sans-serif"}}>
      <style>{`
        @keyframes sp-slide{from{opacity:0;transform:translateX(-50%) translateY(-60px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes sp-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sp-in{from{opacity:0}to{opacity:1}}
        .sp-card{transition:transform .2s,box-shadow .2s;}
        .sp-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.45);}
        .sp-faq:hover{background:rgba(255,255,255,.04)!important;}
        .sp-lec:hover{background:rgba(255,255,255,.04)!important;}
        /* ── Base layout ── */
        .sp-content{padding:20px 22px;}
        .sp-header-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;}
        .sp-header-tabs::-webkit-scrollbar{display:none;}
        .sp-mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:100;overflow-x:auto;scrollbar-width:none;}
        .sp-mob-nav::-webkit-scrollbar{display:none;}
        @media(max-width:640px){
          .sp-desk{display:none!important;}
          .sp-mob{display:flex!important;}
          .sp-mob-nav{display:flex!important;}
          .sp-content{padding:12px 10px 76px!important;}
          .sp-header-tabs{display:none!important;}
          .sp-player-layout{flex-direction:column!important;}
          .sp-curriculum{width:100%!important;max-height:280px!important;border-left:none!important;border-top:1px solid rgba(255,255,255,.07)!important;}
          .sp-browse-grid{grid-template-columns:1fr!important;}
          .sp-stats-grid{grid-template-columns:1fr 1fr!important;}
          .sp-pg{grid-template-columns:1fr!important;}
          .sp-sg{grid-template-columns:repeat(3,1fr)!important;}
          .sp-eg{grid-template-columns:1fr!important;}
        }
        @media(min-width:641px){
          .sp-mob{display:none!important;}
          .sp-mob-nav{display:none!important;}
        }
        ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:10px;}
      `}</style>

      {/* Toast */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:"11px 18px",borderRadius:12,fontWeight:600,fontSize:".88rem",
            background:t.type==="error"?"rgba(239,68,68,.95)":"rgba(16,185,129,.95)",color:"#fff",
            boxShadow:"0 4px 20px rgba(0,0,0,.4)",animation:"sp-fade .3s ease",whiteSpace:"nowrap"}}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Badge popup */}
      {newBadge && (
        <div style={{position:"fixed",top:76,left:"50%",zIndex:9998,
          background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",
          padding:"13px 24px",borderRadius:14,fontWeight:800,fontSize:".95rem",
          display:"flex",alignItems:"center",gap:10,
          boxShadow:"0 8px 32px rgba(245,158,11,.5)",
          animation:"sp-slide .4s ease",whiteSpace:"nowrap"}}>
          <span style={{fontSize:"1.5rem"}}>{newBadge.icon}</span>
          Badge Unlock! {newBadge.label}
        </div>
      )}

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <div style={{position:"sticky",top:0,zIndex:100,background:T.bg+"ee",backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.border}`}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4%,40px)",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,width:"100%",boxSizing:"border-box"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Logo t={t} size={30}/>
            <div style={{width:1,height:18,background:T.border,flexShrink:0,opacity:.4}}/>
            <div style={{fontSize:".72rem",color:T.muted,fontWeight:500}}>Student Portal</div>
          </div>
          {/* Desktop tabs */}
          <div className="sp-desk sp-header-tabs" style={{display:"flex",gap:6,alignItems:"center"}}>
            {/* Back from player */}
            {activeCourse && (
              <button onClick={()=>{setActiveCourse(null);setActiveLecture(null);setTab("courses");}}
                style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg4,color:T.muted,fontSize:".8rem",cursor:"pointer",marginRight:4}}>
                ← Back
              </button>
            )}
            {TABS.map(([id,,label])=>(
              <button key={id} onClick={()=>{setTab(id);setActiveCourse(null);setActiveLecture(null);window.scrollTo({top:0,behavior:"instant"});}}
                style={{padding:"6px 15px",borderRadius:50,border:"none",fontFamily:"inherit",fontSize:".82rem",
                  fontWeight:tab===id&&!activeCourse?700:500,cursor:"pointer",
                  background:tab===id&&!activeCourse?"linear-gradient(135deg,#F59E0B,#F97316)":T.bg4,
                  color:tab===id&&!activeCourse?"#070B14":T.muted,
                  outline:tab===id&&!activeCourse?"none":`1px solid ${T.border}`,transition:"all .15s"}}>
                {label}
              </button>
            ))}
            <button onClick={toggleTheme} title="Toggle theme" style={{width:34,height:34,borderRadius:8,border:`1px solid ${T.border}`,background:T.bg4,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"1rem",flexShrink:0}}>
              {dark?"☀️":"🌙"}
            </button>
            <NotificationBell t={t}/>

            <button onClick={logout} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg4,color:T.muted,fontSize:".8rem",cursor:"pointer"}}>Logout</button>
          </div>
          {/* Mobile right */}
          <div className="sp-mob" style={{display:"flex",gap:8,alignItems:"center"}}>
            {activeCourse && (
              <button onClick={()=>{setActiveCourse(null);setActiveLecture(null);}}
                style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg4,color:T.muted,fontSize:".8rem",cursor:"pointer"}}>←</button>
            )}
            <NotificationBell t={t}/>
            <button onClick={logout} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg4,color:T.muted,fontSize:".8rem",cursor:"pointer"}}>Exit</button>

          </div>
        </div>
        <div className="sp-mob-nav" style={{background:T.bg2,borderTop:`1px solid ${T.border}`}}>
          {TABS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>{setTab(id);window.scrollTo({top:0,behavior:'instant'});}} style={{flex:"0 0 auto",padding:"8px 10px",background:"none",border:"none",cursor:"pointer",
              fontSize:".58rem",fontFamily:"inherit",fontWeight:tab===id?700:400,color:tab===id?T.gold:T.muted,
              borderTop:tab===id?`2px solid ${T.gold}`:"2px solid transparent",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:46}}>
              <span style={{fontSize:"1rem"}}>{icon}</span>
              <span style={{whiteSpace:"nowrap"}}>{label}</span>
            </button>
          ))}
        </div>
      </div>{/* ══ COURSE DETAIL VIEW ══════════════════════════════════════════════ */}
      {viewCourseId && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:T.bg,overflowY:"auto"}}>
          <div style={{background:T.bgCard||T.bg2,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:201}}>
            <button onClick={()=>setViewCourseId(null)}
              style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontFamily:"inherit",fontSize:".9rem",display:"flex",alignItems:"center",gap:6,padding:0}}>
              ← Back to Portal
            </button>
          </div>
          <CourseDetail courseId={viewCourseId} setPage={(p)=>{ if(p==="login") logout(); else setViewCourseId(null); }} t={T}/>
        </div>
      )}

      {/* ══ VIDEO PLAYER VIEW ═══════════════════════════════════════════════ */}
      {activeCourse && (
        <div style={{display:"flex",height:"calc(100vh - 58px)",overflow:"hidden",animation:"sp-in .25s ease"}}
          className="sp-player-layout">

          {/* Left: Video + Info */}
          <div style={{flex:1,overflowY:"auto",minWidth:0}}>
            {/* Video */}
            <div style={{background:"#000",position:"relative",userSelect:"none",WebkitUserSelect:"none"}}
              onContextMenu={e=>e.preventDefault()}>
              {activeLecture?.ytId ? (
                <div style={{position:"relative",aspectRatio:"16/9"}}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${activeLecture.ytId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&fs=1&controls=1&color=white`}
                    style={{width:"100%",height:"100%",border:"none",display:"block"}}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen/>
                  {/* Top blocker */}
                  <div style={{position:"absolute",top:0,left:0,right:0,height:54,zIndex:8,cursor:"default",background:"linear-gradient(to bottom,rgba(0,0,0,.7),transparent)"}} onContextMenu={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}/>
                  {/* Top-right YT logo blocker */}
                  <div style={{position:"absolute",top:0,right:0,width:"28%",height:52,zIndex:9}} onContextMenu={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}/>
                  {/* Bottom blocker */}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:52,zIndex:8,background:"linear-gradient(to top,rgba(0,0,0,.8),transparent)"}} onContextMenu={e=>e.preventDefault()} onClick={e=>e.stopPropagation()}/>
                  {/* Watermark */}
                  <div style={{position:"absolute",bottom:10,right:12,color:"rgba(255,255,255,.4)",fontSize:".66rem",fontWeight:800,pointerEvents:"none",zIndex:10,letterSpacing:".05em"}}>© DG HelpMate</div>
                </div>
              ) : (
                <div style={{aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg3,flexDirection:"column",gap:12,color:T.muted}}>
                  <span style={{fontSize:"3rem"}}>▶️</span>
                  <span style={{fontSize:".9rem"}}>{activeLecture?"Video coming soon":"← Select a lecture"}</span>
                </div>
              )}
            </div>

            {/* Player info */}
            <div style={{padding:"clamp(12px,4%,22px)"}}>
              <h2 style={{fontSize:"1.1rem",fontWeight:800,marginBottom:8,color:T.text}}>
                {activeLecture?.title || activeCourse.title}
              </h2>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",color:T.muted,fontSize:".82rem",marginBottom:16}}>
                <span>📚 {activeCourse.title}</span>
                {activeLecture?.duration && <span>⏱️ {activeLecture.duration}</span>}
                {activeEnr && <span style={{color:T.gold,fontWeight:700}}>{activeEnr.progress||0}% complete</span>}
              </div>

              {/* Player tabs */}
              <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
                {[["overview","Overview"],["notes","📓 Notes"],["materials","Materials"]].map(([pt,label])=>(
                  <button key={pt} onClick={()=>setPlayerTab(pt)} style={{padding:"9px 16px",fontSize:".86rem",fontWeight:600,color:playerTab===pt?T.gold:T.muted,cursor:"pointer",border:"none",borderBottom:playerTab===pt?`2px solid ${T.gold}`:"2px solid transparent",background:"none",fontFamily:"inherit",transition:"all .15s"}}>
                    {label}
                  </button>
                ))}
              </div>

              {playerTab==="overview" && (
                <div>
                  {activeLecture && activeEnr && !activeEnr.completedLectures?.includes(activeLecture.id) && (
                    <button onClick={markDone} disabled={markingDone}
                      style={{padding:"10px 22px",background:`linear-gradient(135deg,${T.accent},#4F46E5)`,color:"#fff",border:"none",borderRadius:10,fontWeight:700,cursor:markingDone?"not-allowed":"pointer",fontFamily:"inherit",fontSize:".88rem",marginBottom:12,opacity:markingDone?.7:1}}>
                      {markingDone?"Saving...":"✅ Mark as Completed"}
                    </button>
                  )}
                  {activeLecture && activeEnr?.completedLectures?.includes(activeLecture.id) && (
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",background:"rgba(16,185,129,.12)",border:`1px solid ${T.green}40`,borderRadius:10,color:T.green,fontWeight:700,fontSize:".88rem",marginBottom:12}}>
                      ✅ Completed!
                    </div>
                  )}
                  <p style={{color:T.muted,lineHeight:1.7,fontSize:".88rem"}}>
                    {activeLecture ? `${activeCourse.chapters?.[activeChapIdx]?.name||""} — ${activeLecture.title}` : "Select a lecture from the curriculum to begin."}
                  </p>
                </div>
              )}

              {playerTab==="materials" && (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(activeLecture?.materials||[]).length>0 ? activeLecture.materials.map((m,i)=>{
                    const tl = (m.type||m.name||"").toLowerCase();
                    const ic = tl.includes("pdf")?"📄":tl.includes("ppt")?"📊":tl.includes("doc")?"📝":"📎";
                    const lk = m.url||m.imageUrl||m.fileUrl||"";
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.bg3,border:`1px solid ${T.border}`,borderRadius:11}}>
                        <span style={{fontSize:"1.4rem"}}>{ic}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:".87rem",fontWeight:600,color:T.text}}>{m.title||m.name||"Material"}</div>
                          <div style={{fontSize:".73rem",color:T.muted}}>{m.type||"File"}</div>
                        </div>
                        {lk ? <a href={lk} target="_blank" rel="noopener noreferrer" style={{padding:"7px 14px",background:`linear-gradient(135deg,${T.accent},#4F46E5)`,color:"#fff",borderRadius:8,fontWeight:700,fontSize:".8rem",textDecoration:"none",flexShrink:0}}>↓ Download</a>
                             : <span style={{fontSize:".75rem",color:T.muted}}>No link</span>}
                      </div>
                    );
                  }) : (
                    <div style={{textAlign:"center",padding:"30px",color:T.muted}}>
                      <div style={{fontSize:"2rem",marginBottom:8}}>📂</div>
                      <p style={{fontSize:".87rem"}}>No materials for this lecture.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── NOTES TAB ──────────────────────────────────────────── */}
              {playerTab==="notes" && (
                <div>
                  {!activeLecture ? (
                    <div style={{textAlign:"center",padding:"30px",color:T.muted}}>
                      <div style={{fontSize:"2rem",marginBottom:8}}>📓</div>
                      <p style={{fontSize:".87rem"}}>Select a lecture to take notes.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{fontSize:".8rem",color:T.muted,fontWeight:600}}>
                          📓 Notes — {activeLecture.title}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {notesSaved && (
                            <span style={{fontSize:".75rem",color:T.green,fontWeight:700,animation:"sp-fade .3s ease"}}>
                              ✅ Saved!
                            </span>
                          )}
                          <button onClick={saveNote} disabled={noteSaving||!noteText.trim()}
                            style={{padding:"6px 16px",background:noteText.trim()?`linear-gradient(135deg,${T.accent},#4F46E5)`:`${T.border}`,color:noteText.trim()?"#fff":T.muted,border:"none",borderRadius:8,fontWeight:700,fontSize:".8rem",cursor:noteText.trim()?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .2s"}}>
                            {noteSaving?"Saving...":"💾 Save"}
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={noteText}
                        onChange={e=>{setNoteText(e.target.value);setNotesSaved(false);}}
                        onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="s"){e.preventDefault();saveNote();}}}
                        placeholder={`Write your notes for "${activeLecture.title}" here...

Tip: Ctrl+S to save quickly`}
                        style={{
                          width:"100%", minHeight:220, padding:"14px",
                          background:T.bg3, border:`1px solid ${T.border}`,
                          borderRadius:12, fontSize:".88rem", color:T.text,
                          fontFamily:"inherit", lineHeight:1.7, resize:"vertical",
                          outline:"none", boxSizing:"border-box",
                          transition:"border-color .2s",
                        }}
                        onFocus={e=>e.target.style.borderColor=T.accent}
                        onBlur={e=>e.target.style.borderColor=T.border}
                      />

                      <div style={{marginTop:8,fontSize:".73rem",color:T.muted}}>
                        {noteText.length} characters · Ctrl+S to save · Notes are private to you
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Curriculum */}
          <div className="sp-curriculum" style={{width:300,flexShrink:0,borderLeft:`1px solid ${T.border}`,overflowY:"auto",background:T.bg2}}>
            {/* Progress */}
            {activeEnr && (
              <div style={{padding:"12px 16px",background:T.bg3,borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:".82rem",fontWeight:600,color:T.text}}>Progress</span>
                  <span style={{fontSize:".82rem",fontWeight:700,color:T.gold}}>{activeEnr.progress||0}%</span>
                </div>
                <div style={{height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${activeEnr.progress||0}%`,background:`linear-gradient(90deg,${T.accent},${T.gold})`,borderRadius:3,transition:"width .4s"}}/>
                </div>
              </div>
            )}
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:".9rem",color:T.text}}>Curriculum</span>
              <span style={{fontSize:".74rem",color:T.muted}}>
                {(activeCourse.chapters||[]).reduce((s,c)=>s+(c.lectures||[]).filter(l=>activeEnr?.completedLectures?.includes(l.id)).length,0)}/
                {(activeCourse.chapters||[]).reduce((s,c)=>s+(c.lectures?.length||0),0)} lectures
              </span>
            </div>
            {(activeCourse.chapters||[]).map((ch,ci)=>(
              <CurriculumChapter key={ch.id||ci} chapter={ch} chIdx={ci}
                activeLecId={activeLecture?.id}
                completedIds={activeEnr?.completedLectures||[]}
                onPlay={(lec)=>{setActiveLecture(lec);setActiveChapIdx(ci);setPlayerTab("overview");window.scrollTo(0,0);}} T={T}/>
            ))}
            {(activeCourse.chapters||[]).length===0 && (
              <div style={{padding:24,textAlign:"center",color:T.muted,fontSize:".85rem"}}>
                <div style={{fontSize:"2rem",marginBottom:8}}>📚</div>
                Chapters loading or not added by admin yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MAIN TABS (when no course open) ════════════════════════════════ */}
      {!activeCourse && (
        <div className="sp-content" style={{padding:"clamp(14px,3vw,28px)",maxWidth:1100,margin:"0 auto"}}>

          {/* ── COURSES ── */}
          {tab==="courses" && (
            <div style={{animation:"sp-fade .3s ease"}}>
              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12,marginBottom:28}}>
                {[
                  ["🎓 Enrolled",      enrollments.length, T.accent],
                  ["✅ Completed",     completedList.length, T.green],
                  ["📊 Avg Progress",  `${avgProg}%`, T.gold],
                  ["⚡ Lectures Done", totalLectures, "#818CF8"],
                  ["🏅 Badges",       `${unlockedCount}/10`, "#F472B6"],
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 15px"}}>
                    <div style={{fontSize:".68rem",color:T.muted,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:"1.35rem",fontWeight:900,color:c}}>{v}</div>
                  </div>
                ))}
              </div>

              {loading ? (
                <div style={{textAlign:"center",padding:"60px",color:T.muted}}>
                  <div style={{fontSize:"2rem",marginBottom:10}}>⏳</div>Loading...
                </div>
              ) : enrollments.length===0 ? (
                <div style={{textAlign:"center",padding:"60px 20px"}}>
                  <div style={{fontSize:"4rem",marginBottom:16}}>📚</div>
                  <h3 style={{fontWeight:700,color:T.text,marginBottom:10}}>No courses enrolled yet</h3>
                  <p style={{color:T.muted,marginBottom:24}}>Explore DG HelpMate courses!</p>
                  <button onClick={()=>setTab("browse")} style={{padding:"12px 28px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>
                    🔍 Browse Courses
                  </button>
                </div>
              ) : (
                <>
                  {inProgress.length>0  && <EnrollSection title="🔄 In Progress"  count={inProgress.length}  color={T.gold}  enrollments={inProgress}  onOpen={openCourse} T={T}/>}
                  {notStarted.length>0  && <EnrollSection title="📌 Not Started"  count={notStarted.length}  color={T.muted} enrollments={notStarted}  onOpen={openCourse} T={T}/>}
                  {completedList.length>0 && <EnrollSection title="✅ Completed"  count={completedList.length} color={T.green} enrollments={completedList} onOpen={openCourse} T={T}/>}
                  <div style={{marginTop:28,textAlign:"center"}}>
                    <button onClick={()=>setTab("browse")} style={{padding:"10px 22px",background:`${T.accent}18`,border:`1px solid ${T.accent}30`,borderRadius:10,color:T.accent,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      + Browse More Courses
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── BROWSE COURSES ── */}
          {tab==="browse" && (
            <div style={{animation:"sp-fade .3s ease"}}>
              <div style={{marginBottom:20}}>
                <h2 style={{color:T.text,fontWeight:900,margin:"0 0 4px"}}>🔍 Browse All Courses</h2>
                <p style={{color:T.muted,fontSize:".87rem",margin:0}}>Click any course to enroll</p>
              </div>
              {courses.length===0 ? (
                <div style={{textAlign:"center",padding:"40px",color:T.muted}}>
                  <div style={{fontSize:"2rem",marginBottom:8}}>📚</div>
                  <p>No courses available yet. Check back soon!</p>
                </div>
              ) : (
                <div className="sp-browse-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:18}}>
                  {courses.map(course=>{
                    const enrolled = enrollments.find(e=>e.courseId===course.id);
                    const disc = course.mrp ? Math.round((1-course.price/course.mrp)*100) : 0;
                    return (
                      <div key={course.id} onClick={()=>setViewCourseId(course.id)}
                        style={{background:T.bg2,border:`1px solid ${enrolled?"#10B981":T.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
                        onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.3)";}}
                        onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                        <div style={{position:"relative",height:140,background:T.bg3,overflow:"hidden"}}>
                          {course.thumbnail
                            ? <img src={course.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3rem",opacity:.12}}>🎓</div>}
                          <div style={{position:"absolute",top:10,right:10,display:"flex",gap:6}}>
                            {enrolled && <span style={{background:"#10B981",color:"#fff",padding:"3px 10px",borderRadius:50,fontSize:".7rem",fontWeight:800}}>✅ Enrolled</span>}
                            {course.isBestseller && !enrolled && <span style={{background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",padding:"3px 10px",borderRadius:50,fontSize:".7rem",fontWeight:800}}>⭐ Bestseller</span>}
                            {disc>0 && !enrolled && <span style={{background:"#EF4444",color:"#fff",padding:"3px 8px",borderRadius:50,fontSize:".7rem",fontWeight:800}}>-{disc}%</span>}
                          </div>
                        </div>
                        <div style={{padding:"14px 16px"}}>
                          <div style={{fontWeight:700,color:T.text,marginBottom:6,fontSize:".9rem",lineHeight:1.3}}>{course.title}</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              {course.mrp && <div style={{fontSize:".72rem",color:T.muted,textDecoration:"line-through"}}>₹{course.mrp?.toLocaleString()}</div>}
                              <div style={{fontWeight:900,color:T.gold,fontSize:"1.05rem"}}>₹{course.price?.toLocaleString()}</div>
                            </div>
                            <div style={{fontSize:".75rem",color:T.muted}}>⭐ {course.rating||"4.8"}</div>
                          </div>
                          {enrolled ? (
                            <div onClick={e=>{e.stopPropagation();openCourse(course.id);}} style={{marginTop:8,padding:"7px 12px",background:"#10B98115",border:"1px solid #10B98130",borderRadius:8,color:"#10B981",fontWeight:700,fontSize:".8rem",textAlign:"center",cursor:"pointer"}}>
                              ▶ Continue Learning
                            </div>
                          ) : (
                            <div style={{marginTop:8,padding:"7px 12px",background:"linear-gradient(135deg,#F59E0B,#F97316)",borderRadius:8,color:"#070B14",fontWeight:800,fontSize:".8rem",textAlign:"center"}}>
                              🚀 Enroll Now
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ACHIEVEMENTS ── */}
          {tab==="achievements" && (
            <div style={{animation:"sp-fade .3s ease"}}>
              <div style={{textAlign:"center",marginBottom:28}}>
                <div style={{fontSize:"2.8rem"}}>🏅</div>
                <h2 style={{color:T.text,fontWeight:900,margin:"8px 0 6px"}}>Your Achievements</h2>
                <p style={{color:T.muted,fontSize:".9rem"}}>{unlockedCount} / 10 badges unlocked</p>
                <div style={{maxWidth:300,margin:"14px auto 0",height:8,background:T.bg2,borderRadius:50,overflow:"hidden",border:`1px solid ${T.border}`}}>
                  <div style={{height:"100%",width:`${(unlockedCount/10)*100}%`,background:"linear-gradient(90deg,#F59E0B,#F97316)",borderRadius:50,transition:"width .6s"}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,180px),1fr))",gap:14}}>
                {achievements.map(a=>(
                  <div key={a.id} className="sp-card" style={{background:T.bg2,border:`1px solid ${a.unlocked?T.gold+"45":T.border}`,borderRadius:14,padding:"20px 16px",textAlign:"center",opacity:a.unlocked?1:.4,position:"relative"}}>
                    {a.unlocked && <div style={{position:"absolute",top:10,right:10,width:8,height:8,borderRadius:"50%",background:T.gold,boxShadow:`0 0 8px ${T.gold}`}}/>}
                    <div style={{fontSize:"2.4rem",marginBottom:8,filter:a.unlocked?"none":"grayscale(1)"}}>{a.icon}</div>
                    <div style={{fontWeight:800,fontSize:".85rem",color:a.unlocked?T.text:T.muted,marginBottom:4}}>{a.label}</div>
                    <div style={{fontSize:".73rem",color:T.muted,lineHeight:1.45}}>{a.desc}</div>
                    {a.unlocked && <div style={{marginTop:8,fontSize:".7rem",fontWeight:700,color:T.gold}}>✓ Unlocked</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CERTIFICATES ── */}
          {tab==="certificates" && (
            <div style={{animation:"sp-fade .3s ease"}}>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{fontSize:"2.8rem"}}>📜</div>
                <h2 style={{color:T.text,fontWeight:900,margin:"8px 0 6px"}}>Certificates</h2>
                <p style={{color:T.muted,fontSize:".9rem"}}>Complete 100% of the course → get your certificate</p>
              </div>
              {completedList.length===0 ? (
                <div style={{textAlign:"center",padding:"40px 24px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16}}>
                  <div style={{fontSize:"3rem",marginBottom:12}}>🔒</div>
                  <p style={{color:T.muted,marginBottom:16}}>No course completed 100% yet.</p>
                  <button onClick={()=>setTab("courses")} style={{padding:"10px 22px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>📚 View Courses</button>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,340px),1fr))",gap:20}}>
                  {completedList.map(enr=>(
                    <CertificateCard key={enr.id} enrollment={enr} profile={profile} T={T}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SUPPORT ── */}
          {tab==="support" && (
            <div style={{animation:"sp-fade .3s ease",maxWidth:700,margin:"0 auto"}}>
              <div style={{textAlign:"center",marginBottom:24}}>
                <div style={{fontSize:"2.8rem"}}>💬</div>
                <h2 style={{color:T.text,fontWeight:900,margin:"8px 0 6px"}}>Support Center</h2>
              </div>

              {/* Contact buttons */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}>
                <a href="https://wa.me/919241653369?text=Hi%2C%20I%20am%20a%20DG%20HelpMate%20student%20and%20need%20help." target="_blank" rel="noreferrer"
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"18px 14px",background:"#25D36620",border:"1px solid #25D36640",borderRadius:14,textDecoration:"none"}}>
                  <span style={{fontSize:"1.8rem"}}>📱</span>
                  <span style={{fontWeight:800,color:"#25D366",fontSize:".9rem"}}>WhatsApp Support</span>
                  <span style={{fontSize:".73rem",color:T.muted,textAlign:"center"}}>24hr reply guaranteed</span>
                </a>
                <a href="mailto:support@dghelpmate.com" target="_blank" rel="noreferrer"
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"18px 14px",background:`${T.accent}15`,border:`1px solid ${T.accent}30`,borderRadius:14,textDecoration:"none"}}>
                  <span style={{fontSize:"1.8rem"}}>📧</span>
                  <span style={{fontWeight:800,color:T.accent,fontSize:".9rem"}}>Email Support</span>
                  <span style={{fontSize:".73rem",color:T.muted,textAlign:"center"}}>support@dghelpmate.com</span>
                </a>
              </div>

              {/* Live Chat — improved with timestamps + delete */}
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,marginBottom:20,overflow:"hidden"}}>
                {/* Header */}
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`}}/>
                  <span style={{fontWeight:700,color:T.text,fontSize:".9rem"}}>Live Chat with DG HelpMate</span>
                  <span style={{fontSize:".72rem",color:T.green,marginLeft:4}}>Online</span>
                </div>

                {/* Messages */}
                <div style={{height:280,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
                  {/* Welcome message */}
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem",fontWeight:800,color:"#070B14",flexShrink:0}}>DG</div>
                    <div style={{padding:"9px 14px",borderRadius:"14px 14px 14px 4px",background:T.bg3,border:`1px solid ${T.border}`,fontSize:".85rem",color:T.text,maxWidth:"78%"}}>
                      Hello! 🙏 Ask us anything — we're here to help!
                    </div>
                  </div>

                  {chatMsgs.map((m,i)=>{
                    const isMe = m.senderRole==="student"||m.senderId===user?.uid;
                    const prev = chatMsgs[i-1];
                    const showDate = i===0||(m.timestamp?.seconds&&prev?.timestamp?.seconds&&
                      new Date(m.timestamp.seconds*1000).toDateString()!==new Date(prev.timestamp.seconds*1000).toDateString());
                    const timeLabel = m.timestamp?.seconds ? new Date(m.timestamp.seconds*1000).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "";
                    return (
                      <div key={m.id}>
                        {showDate&&m.timestamp?.seconds&&(
                          <div style={{textAlign:"center",margin:"6px 0",fontSize:".68rem",color:T.muted}}>
                            {new Date(m.timestamp.seconds*1000).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
                          </div>
                        )}
                        <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",alignItems:"flex-end",gap:6}}>
                          {!isMe&&<div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".65rem",fontWeight:800,color:"#070B14",flexShrink:0}}>DG</div>}
                          <div style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2,maxWidth:"78%"}}>
                            <div style={{padding:"9px 14px",borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",
                              background:isMe?`linear-gradient(135deg,${T.accent},#4F46E5)`:T.bg3,
                              border:isMe?"none":`1px solid ${T.border}`,
                              fontSize:".86rem",color:isMe?"#fff":T.text,lineHeight:1.5,wordBreak:"break-word"}}>
                              {m.text}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:".64rem",color:T.muted}}>{timeLabel}</span>
                              {isMe&&(
                                <button onClick={async()=>{if(window.confirm("Delete this message?"))await deleteDoc(doc(db,"chats",user.uid,"messages",m.id)).catch(()=>{});}}
                                  style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:".68rem",padding:0,opacity:.6}}>
                                  🗑
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef}/>
                </div>

                {/* Input */}
                <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"flex-end"}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                    rows={1} placeholder="Type a message... (Enter to send)"
                    style={{flex:1,background:T.bg3,border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:T.text,fontFamily:"inherit",fontSize:".87rem",outline:"none",resize:"none",lineHeight:1.5}}/>
                  <button onClick={sendChat} disabled={chatSending||!chatInput.trim()}
                    style={{padding:"9px 18px",background:chatInput.trim()?"linear-gradient(135deg,#F59E0B,#F97316)":T.bg3,color:chatInput.trim()?"#070B14":T.muted,border:"none",borderRadius:9,fontWeight:700,cursor:chatInput.trim()?"pointer":"not-allowed",fontFamily:"inherit",height:42,flexShrink:0,transition:"all .2s"}}>
                    {chatSending?"⏳":"Send"}
                  </button>
                </div>
              </div>

              {/* FAQ */}
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"13px 18px",borderBottom:`1px solid ${T.border}`,fontWeight:700,color:T.text,fontSize:".9rem"}}>❓ FAQ</div>
                {FAQ.map((item,i)=>(
                  <div key={i} style={{borderBottom:i<FAQ.length-1?`1px solid ${T.border}`:"none"}}>
                    <button className="sp-faq" onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                      style={{width:"100%",textAlign:"left",padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",color:T.text,fontWeight:600,fontSize:".86rem"}}>
                      <span>{item.q}</span>
                      <span style={{color:T.muted,flexShrink:0,marginLeft:12,display:"inline-block",transition:"transform .2s",transform:faqOpen===i?"rotate(180deg)":"none"}}>▾</span>
                    </button>
                    {faqOpen===i && (
                      <div style={{padding:"0 18px 14px",color:T.muted,fontSize:".85rem",lineHeight:1.7,animation:"sp-fade .2s ease"}}>{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab==="profile" && (
            <div style={{animation:"sp-fade .3s ease",maxWidth:700,margin:"0 auto"}}>
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:20,overflow:"hidden",marginBottom:14}}>
                <div style={{height:88,background:`linear-gradient(135deg,${T.accent}55,${T.gold}35)`,position:"relative"}}>
                  <div style={{position:"absolute",inset:0,opacity:.1,backgroundImage:`linear-gradient(${T.accent} 1px,transparent 1px),linear-gradient(90deg,${T.accent} 1px,transparent 1px)`,backgroundSize:"24px 24px"}}/>
                </div>
                <div style={{padding:"0 20px 20px"}}>
                  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:-38,marginBottom:14}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      {profile?.photoUrl
                        ? <img src={profile.photoUrl} alt="" style={{width:78,height:78,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.bg2}`}}/>
                        : <div style={{width:78,height:78,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"2rem",color:"#070B14",border:`3px solid ${T.bg2}`}}>
                            {profile?.ownerName?.[0]?.toUpperCase()||"S"}
                          </div>
                      }
                      <label style={{position:"absolute",bottom:2,right:2,width:26,height:26,borderRadius:"50%",background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:`2px solid ${T.bg2}`}}>
                        {photoUploading?<span style={{fontSize:10}}>⏳</span>:<span style={{fontSize:13}}>📷</span>}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&uploadPhoto(e.target.files[0])}/>
                      </label>
                    </div>
                    <button onClick={()=>{setEditingProfile(true);setEditName(profile?.ownerName||"");setEditPhone(profile?.phone||"");}}
                      style={{padding:"7px 16px",background:`${T.accent}18`,border:`1px solid ${T.accent}35`,borderRadius:8,color:T.accent,fontWeight:600,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit"}}>
                      Edit Profile
                    </button>
                  </div>
                  <div style={{marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:"1.2rem",color:T.text,marginBottom:2}}>{profile?.ownerName||"Student"}</div>
                    <div style={{fontSize:".82rem",color:T.muted,marginBottom:profile?.phone?3:0}}>{user?.email}</div>
                    {profile?.phone && <div style={{fontSize:".78rem",color:T.muted}}>📞 {profile.phone}</div>}
                  </div>
                  {editingProfile && (
                    <div style={{background:T.bg3,borderRadius:12,padding:"16px",marginBottom:16,border:`1px solid ${T.border}`}}>
                      <div className="sp-eg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                        <div>
                          <div style={{fontSize:".72rem",fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Name</div>
                          <input value={editName} onChange={e=>setEditName(e.target.value)} style={{width:"100%",padding:"9px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,fontSize:".88rem",color:T.text,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:".72rem",fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Phone</div>
                          <input value={editPhone} onChange={e=>setEditPhone(e.target.value)} type="tel" style={{width:"100%",padding:"9px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,fontSize:".88rem",color:T.text,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={saveProfile} disabled={profileSaving} style={{flex:1,padding:"9px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:".85rem"}}>{profileSaving?"Saving...":"Save Changes"}</button>
                        <button onClick={()=>setEditingProfile(false)} style={{padding:"9px 16px",background:"none",border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,cursor:"pointer",fontFamily:"inherit",fontSize:".85rem"}}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="sp-sg" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                    {[{icon:"📚",label:"Enrolled",val:enrollments.length,color:T.accent},{icon:"✅",label:"Done",val:completedList.length,color:T.green},{icon:"⚡",label:"Lectures",val:totalLectures,color:T.gold},{icon:"📊",label:"Progress",val:`${avgProg}%`,color:T.saffron},{icon:"🏅",label:"Badges",val:`${unlockedCount}/10`,color:"#A78BFA"}].map(({icon,label,val,color})=>(
                      <div key={label} style={{background:T.bg3,borderRadius:10,padding:"10px 6px",textAlign:"center",border:`1px solid ${T.border}`}}>
                        <div style={{fontSize:"1rem",marginBottom:3}}>{icon}</div>
                        <div style={{fontWeight:800,fontSize:"1rem",color,lineHeight:1}}>{val}</div>
                        <div style={{fontSize:".62rem",color:T.muted,marginTop:3,textTransform:"uppercase"}}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="sp-pg" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px"}}>
                  <div style={{fontSize:".7rem",fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Quick Actions</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>setTab("achievements")} style={{width:"100%",padding:"10px 14px",background:`${T.gold}14`,border:`1px solid ${T.gold}28`,borderRadius:9,color:T.gold,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:".86rem"}}>🏅 View Achievements</button>
                    <button onClick={()=>setTab("certificates")} style={{width:"100%",padding:"10px 14px",background:`${T.accent}14`,border:`1px solid ${T.accent}28`,borderRadius:9,color:T.accent,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:".86rem"}}>📜 View Certificates</button>
                    <button onClick={()=>setTab("courses")} style={{width:"100%",padding:"10px 14px",background:`${T.green}12`,border:`1px solid ${T.green}28`,borderRadius:9,color:T.green,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:".86rem"}}>🎓 My Courses</button>
                    <a href="https://wa.me/919241653369?text=Hi, I need help with DG HelpMate" target="_blank" rel="noreferrer" style={{display:"block",padding:"10px 14px",background:"#25D36614",border:"1px solid #25D36628",borderRadius:9,color:"#25D366",fontWeight:700,textDecoration:"none",fontSize:".86rem"}}>💬 WhatsApp Support</a>
                    {showSwitchBtn && onSwitch && (
                      <button onClick={onSwitch} style={{width:"100%",padding:"9px 14px",background:"linear-gradient(135deg,#F59E0B,#F97316)",border:"none",borderRadius:9,color:"#070B14",fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:".86rem"}}>
                        {switchLabel}
                      </button>
                    )}
                    <button onClick={logout} style={{width:"100%",padding:"9px 14px",background:`${T.red}10`,border:`1px solid ${T.red}22`,borderRadius:9,color:T.red,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textAlign:"left",fontSize:".86rem"}}>🚪 Logout</button>
                  </div>
                </div>
                <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px"}}>
                  <div style={{fontSize:".7rem",fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>Referral Program</div>
                  {profile?.referralCode ? (
                    <>
                      <div style={{background:`${T.gold}10`,border:`1.5px dashed ${T.gold}45`,borderRadius:10,padding:"12px",marginBottom:10,textAlign:"center"}}>
                        <div style={{fontSize:".65rem",color:T.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:".1em"}}>Your Code</div>
                        <div style={{fontWeight:900,fontSize:"1.45rem",color:T.gold,letterSpacing:".2em",marginBottom:6}}>{profile.referralCode}</div>
                        <button onClick={()=>{navigator.clipboard.writeText(profile.referralCode);toast("Code copied!");}} style={{padding:"4px 14px",background:`${T.gold}20`,border:`1px solid ${T.gold}40`,borderRadius:20,color:T.gold,fontWeight:700,fontSize:".74rem",cursor:"pointer",fontFamily:"inherit"}}>Copy</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
                        <div style={{background:T.bg3,borderRadius:8,padding:"8px",textAlign:"center"}}>
                          <div style={{fontWeight:800,fontSize:"1.1rem",color:T.text}}>{profile.referralCount||0}</div>
                          <div style={{fontSize:".66rem",color:T.muted,marginTop:2}}>Referred</div>
                        </div>
                        <div style={{background:T.bg3,borderRadius:8,padding:"8px",textAlign:"center"}}>
                          <div style={{fontWeight:800,fontSize:"1.1rem",color:T.green}}>{profile.referralEarned||0}%</div>
                          <div style={{fontSize:".66rem",color:T.muted,marginTop:2}}>Earned</div>
                        </div>
                      </div>
                      <div style={{fontSize:".72rem",color:T.muted,marginBottom:9,lineHeight:1.55,padding:"6px 8px",background:T.bg3,borderRadius:7}}>Friend joins: <span style={{color:T.gold,fontWeight:700}}>You get 10% off</span> + <span style={{color:T.green,fontWeight:700}}>Friend gets 5% off</span></div>
                      <button onClick={()=>{const rc=profile.referralCode;const msg=encodeURIComponent("DG HelpMate — Digital Partner for Coaching Institutes!\n\nMCQ Banks, PPT Slides, YouTube SEO — all in one place!\n\nRegister using my referral code:\n*"+rc+"*\n\nYou get 5% discount!\nhttps://dghelpmate.com");window.open("https://wa.me/?text="+msg,"_blank");}} style={{width:"100%",padding:"9px",background:"#25D366",border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:".84rem",cursor:"pointer",fontFamily:"inherit"}}>Share on WhatsApp</button>
                    </>
                  ) : (
                    <div style={{textAlign:"center",padding:"18px 0"}}>
                      <div style={{fontSize:"1.8rem",marginBottom:8}}>🎁</div>
                      <div style={{fontSize:".82rem",color:T.muted,marginBottom:10}}>Generate your code to start earning!</div>
                      <button onClick={async()=>{const {doc:d,updateDoc:u}=await import("firebase/firestore");const {db:fdb}=await import("../../firebase/config");const code=user.uid.slice(0,8).toUpperCase();await u(d(fdb,"users",user.uid),{referralCode:code,referralCount:0,referralEarned:0});toast("Referral code generated!");}} style={{padding:"9px 20px",background:"linear-gradient(135deg,#F59E0B,#F97316)",border:"none",borderRadius:9,color:"#070B14",fontWeight:700,fontSize:".85rem",cursor:"pointer",fontFamily:"inherit"}}>Generate My Code</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}</div>
      )}

      {/* ══ ENROLL MODAL ════════════════════════════════════════════════════ */}
      {enrollModal && enrollTarget && (
        <div style={{position:"fixed",inset:0,zIndex:9990,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:20,padding:"28px 24px",maxWidth:440,width:"100%",animation:"sp-fade .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <h3 style={{fontWeight:800,color:T.text,marginBottom:4,fontSize:"1.05rem"}}>{enrollTarget.title}</h3>
                <div style={{fontSize:".82rem",color:T.muted}}>Course Enrollment</div>
              </div>
              <button onClick={()=>{setEnrollModal(false);setCoupon("");setFinalPrice(null);setCouponMsg("");}}
                style={{background:"none",border:"none",color:T.muted,fontSize:"1.4rem",cursor:"pointer",lineHeight:1}}>✕</button>
            </div>
            {/* Coupon */}
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Coupon code (optional)"
                style={{flex:1,background:T.bg3,border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:T.text,fontFamily:"inherit",fontSize:".87rem",outline:"none"}}/>
              <button onClick={applyCoupon} style={{padding:"9px 16px",background:T.bg4,border:`1px solid ${T.border}`,borderRadius:9,color:T.muted,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:".84rem"}}>Apply</button>
            </div>
            {couponMsg && <div style={{fontSize:".82rem",color:couponMsg.startsWith("✅")?T.green:T.red,marginBottom:12}}>{couponMsg}</div>}
            {/* Price */}
            <div style={{background:T.bg3,borderRadius:12,padding:"14px 16px",marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:T.muted,fontSize:".9rem"}}>Amount to pay</span>
                <div style={{textAlign:"right"}}>
                  {enrollTarget.mrp && <div style={{fontSize:".78rem",color:T.muted,textDecoration:"line-through"}}>₹{enrollTarget.mrp?.toLocaleString()}</div>}
                  <div style={{fontSize:"1.4rem",fontWeight:900,color:T.gold}}>₹{(finalPrice??enrollTarget.price)?.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <button onClick={submitPayment}
              style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:12,fontWeight:800,fontSize:"1rem",cursor:"pointer",fontFamily:"inherit"}}>
              🚀 Pay & Enroll Now
            </button>
            <a href={`https://wa.me/919241653369?text=Hi! I want to enroll in ${enrollTarget.title}`} target="_blank" rel="noreferrer"
              style={{display:"block",textAlign:"center",marginTop:10,color:T.muted,fontSize:".82rem",textDecoration:"none"}}>
              💬 Pay via WhatsApp instead
            </a>
            {enrollTarget.whatsappGroup && (
              <div style={{marginTop:10,padding:"8px 12px",background:"#25D36612",border:"1px solid #25D36630",borderRadius:8,fontSize:".78rem",color:"#25D366",textAlign:"center"}}>
                💬 After enrollment, you'll get access to the course WhatsApp group!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function EnrollSection({ title, count, color, enrollments, onOpen, T }) {
  return (
    <div style={{marginBottom:30}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <h3 style={{margin:0,fontWeight:800,fontSize:".98rem",color}}>{title}</h3>
        <span style={{background:`${color}20`,color,fontSize:".72rem",fontWeight:700,padding:"2px 10px",borderRadius:50}}>{count}</span>
      </div>
      <div className="sp-browse-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:18}}>
        {enrollments.map(enr=><CourseCard key={enr.id} enrollment={enr} onClick={()=>onOpen(enr.courseId)} T={T}/>)}
      </div>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({ enrollment, onClick, T }) {
  const prog = enrollment.progress||0;
  const isComplete = prog===100, isNew = prog===0;
  return (
    <div onClick={onClick} className="sp-card" style={{background:T.bg2,border:`1px solid ${isComplete?T.green:isNew?T.border:T.gold+"40"}`,borderRadius:16,overflow:"hidden",cursor:"pointer"}}>
      <div style={{position:"relative",height:148,background:T.bg3,overflow:"hidden"}}>
        {enrollment.thumbnail
          ? <img src={enrollment.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
          : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3.5rem",opacity:.12}}>🎓</div>}
        <div style={{position:"absolute",top:10,right:10}}>
          {isComplete ? <span style={{background:"#10B981",color:"#fff",padding:"3px 10px",borderRadius:50,fontSize:".7rem",fontWeight:800}}>✅ DONE</span>
            : isNew   ? <span style={{background:"rgba(0,0,0,.7)",color:"#fff",padding:"3px 10px",borderRadius:50,fontSize:".7rem"}}>NEW</span>
            : <span style={{background:T.gold,color:"#070B14",padding:"3px 10px",borderRadius:50,fontSize:".7rem",fontWeight:800}}>{prog}%</span>}
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:4,background:"rgba(255,255,255,.1)"}}>
          <div style={{height:"100%",width:`${prog}%`,background:isComplete?"#10B981":"linear-gradient(90deg,#F59E0B,#F97316)",transition:"width .5s"}}/>
        </div>
      </div>
      <div style={{padding:"14px 16px"}}>
        <h3 style={{fontWeight:700,fontSize:".92rem",color:T.text,marginBottom:6,lineHeight:1.35}}>{enrollment.courseTitle||"Course"}</h3>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:".74rem",color:T.muted}}>{enrollment.completedLectures?.length||0} lectures done</span>
          <span style={{fontSize:".74rem",color:isComplete?T.green:T.gold,fontWeight:700}}>{prog}% complete</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:`1px solid ${T.border}`}}>
          <span style={{fontSize:".77rem",color:T.muted}}>{isNew?"Start learning →":isComplete?"Review course →":"Continue →"}</span>
          <div style={{width:34,height:34,borderRadius:"50%",background:isComplete?`${T.green}25`:"linear-gradient(135deg,#F59E0B,#F97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".9rem"}}>
            {isComplete?"✅":isNew?"▶":"⏯"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Curriculum Chapter ───────────────────────────────────────────────────────
function CurriculumChapter({ chapter, chIdx, activeLecId, completedIds, onPlay, T }) {
  const [open, setOpen] = useState(chIdx===0);
  return (
    <div style={{borderBottom:`1px solid ${T.border}`}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:T.bg2,transition:"background .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background=T.bg3}
        onMouseLeave={e=>e.currentTarget.style.background=T.bg2}>
        <span style={{fontSize:".7rem",color:T.muted,display:"inline-block",transition:"transform .2s",transform:open?"rotate(90deg)":"none"}}>▶</span>
        <span style={{fontSize:".87rem",fontWeight:700,flex:1,color:T.text}}>{chapter.name}</span>
        <span style={{fontSize:".72rem",color:T.muted}}>{(chapter.lectures||[]).filter(l=>completedIds.includes(l.id)).length}/{(chapter.lectures||[]).length}</span>
      </div>
      {open && (
        <div style={{background:T.bg}}>
          {(chapter.lectures||[]).map(lec=>{
            const isActive = lec.id===activeLecId;
            const isDone   = completedIds.includes(lec.id);
            return (
              <div key={lec.id} onClick={()=>onPlay(lec)} className="sp-lec"
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px 10px 26px",cursor:"pointer",
                  background:isActive?"rgba(99,102,241,.08)":T.bg,
                  borderLeft:isActive?`3px solid ${T.accent}`:"3px solid transparent",
                  borderBottom:`1px solid rgba(255,255,255,.02)`,transition:"background .15s"}}>
                <div style={{width:26,height:26,borderRadius:6,background:isActive?"rgba(99,102,241,.15)":T.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".72rem",flexShrink:0,color:isActive?T.accent:T.muted}}>▶</div>
                <span style={{fontSize:".82rem",flex:1,lineHeight:1.35,color:isActive?T.text:T.muted}}>{lec.title}</span>
                {lec.duration && <span style={{fontSize:".7rem",color:T.muted,flexShrink:0}}>{lec.duration}</span>}
                <span style={{fontSize:".72rem",flexShrink:0,color:isDone?T.green:"transparent"}}>{isDone?"✓":""}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertificateCard({ enrollment, profile, T }) {
  const handleDownload = () => {
    const name  = profile?.ownerName||"Student";
    const title = enrollment.courseTitle||"Course";
    const date  = enrollment.completedAt?.toDate?.()?.toLocaleDateString("en-IN")||new Date().toLocaleDateString("en-IN");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Certificate</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#f8f4e8;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Inter,sans-serif;padding:20px;}.cert{width:780px;max-width:100%;padding:60px;background:#fff;border:3px solid #F59E0B;border-radius:16px;text-align:center;position:relative;box-shadow:0 8px 40px rgba(0,0,0,.15);}.cert::before{content:'';position:absolute;inset:14px;border:1px dashed #F59E0B88;border-radius:10px;pointer-events:none;}h1{font-family:'Playfair Display',serif;font-size:2.5rem;color:#1e293b;margin:14px 0 10px;}.name{font-family:'Playfair Display',serif;font-size:2rem;color:#F59E0B;margin:16px 0;}</style>
</head><body><div class="cert">
<div style="font-size:1rem;color:#F97316;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">🎓 DG HelpMate</div>
<h1>Certificate of Completion</h1>
<p style="color:#64748b;font-size:.95rem;margin-bottom:6px;">This is to proudly certify that</p>
<div class="name">${name}</div>
<p style="color:#475569;font-size:1.05rem;margin-bottom:4px;">has successfully completed</p>
<p style="color:#1e293b;font-size:1.1rem;font-weight:700;margin-bottom:20px;">${title}</p>
<div style="font-size:3.5rem;margin:16px 0 8px;">🏆</div>
<p style="color:#64748b;font-size:.85rem;font-weight:600;">With 100% Course Completion</p>
<p style="color:#94a3b8;font-size:.8rem;margin-top:20px;">Date: ${date}</p>
</div><script>window.addEventListener('load',()=>window.print());</script></body></html>`;
    const blob = new Blob([html],{type:"text/html"});
    window.open(URL.createObjectURL(blob),"_blank");
  };
  return (
    <div className="sp-card" style={{background:"linear-gradient(135deg,#1a1200,#261b00)",border:`1px solid ${T.gold}50`,borderRadius:16,padding:"24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#F59E0B,#F97316)"}}/>
      <div style={{fontSize:"2.5rem",marginBottom:10}}>📜</div>
      <div style={{fontWeight:800,fontSize:"1rem",color:"#F1F5F9",marginBottom:6}}>{enrollment.courseTitle||"Course"}</div>
      <div style={{fontSize:".78rem",color:T.gold,marginBottom:18,fontWeight:600}}>✅ 100% Completed</div>
      <button onClick={handleDownload} style={{width:"100%",padding:"11px 16px",background:"linear-gradient(135deg,#F59E0B,#F97316)",color:"#070B14",border:"none",borderRadius:10,fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:".88rem"}}>
        📥 Download Certificate
      </button>
    </div>
  );
}