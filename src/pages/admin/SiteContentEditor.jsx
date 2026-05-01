// src/pages/admin/SiteContentEditor.jsx
// Admin se poori website ka content edit karo — Firestore mein save hota hai
// Website automatically latest data fetch karti hai
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import ImageUpload from "../../components/ui/ImageUpload";

const Inp = ({ label, value, onChange, placeholder, type="text", style={} }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ fontSize:".77rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>
    <input type={type} value={value||""} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", padding:"10px 13px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:".91rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", boxSizing:"border-box", ...style }}/>
  </div>
);

const Txt = ({ label, value, onChange, rows=3, placeholder }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ fontSize:".77rem", fontWeight:700, color:"var(--mut)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{label}</label>
    <textarea value={value||""} onChange={onChange} rows={rows} placeholder={placeholder}
      style={{ width:"100%", padding:"10px 13px", background:"var(--bg)", border:"1px solid var(--bord)", borderRadius:9, fontSize:".91rem", color:"var(--txt)", fontFamily:"inherit", outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
  </div>
);

const Section = ({ title, children, t }) => (
  <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:20 }}>
    <h3 style={{ fontWeight:700, color:t.text, marginBottom:16, fontSize:"1rem", paddingBottom:10, borderBottom:`1px solid ${t.border}` }}>{title}</h3>
    {children}
  </div>
);

const SaveBtn = ({ onClick, saving, t }) => (
  <button onClick={onClick} disabled={saving} style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", padding:"10px 24px", borderRadius:9, fontWeight:700, fontSize:".9rem", cursor:"pointer", fontFamily:"inherit" }}>
    {saving ? "💾 Saving..." : "💾 Save Changes"}
  </button>
);

export default function SiteContentEditor({ t }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [activeSection, setActiveSection] = useState("general");

  // All site content state
  const [general, setGeneral] = useState({
    siteName: "DG HelpMate",
    tagline: "Bihar & Jharkhand's #1 Education Content Partner",
    description: "MCQ banks, PPT slides, test papers, thumbnails, typing — all under one roof.",
    phone: "+91 92416 53369",
    email: "support@dghelpmate.in",
    whatsapp: "919241653369",
    address: "Rampur Chauram, Arwal, Bihar — 804423",
    upiId: "dghelpmate@axl",
    msme: "2025",
    logoUrl: "",
    govardhanPhoto: "",
  });

  const [hero, setHero] = useState({
    heading1: "Your Coaching's",
    heading2: "Digital Partner",
    heading3: "for Everything",
    subtext: "MCQ banks · PPT slides · Test papers · Thumbnails · Typing — all under one roof. Professional quality, fast delivery. MSME Registered since 2025.",
    badge: "⭐ Bihar & Jharkhand's #1 Education Content Partner",
    stat1: "26+", stat1label: "Active Clients",
    stat2: "50K+", stat2label: "MCQs Delivered",
    stat3: "500+", stat3label: "Projects Done",
    stat4: "2.5yr", stat4label: "Experience",
  });

  const [about, setAbout] = useState({
    ownerName: "Govardhan Pandit",
    ownerTitle: "Founder & CEO",
    ownerBio: "Hello! I'm Govardhan Pandit — on a mission to digitally empower Smart Board teachers across India. For 2.5+ years, I've helped coaching institutes with professional content creation, teaching digital tools, and building DG HelpMate into Bihar's most trusted education content company.",
    mission: "To make every teacher in India a Self-Reliant Digital Educator — free from operator dependency, empowered with AI tools.",
    vision: "A future where every coaching in India has its own YouTube channel, branded content, and earns from digital products.",
    companyDetails: "DG HelpMate · MSME Registered (2025)\nRampur Chauram, Arwal, Bihar — 804423\nServing Bihar & Jharkhand",
  });

  const [course, setCourse] = useState({
    masterTitle: "Smart Teachers Mastery Course",
    masterSubtitle: "Complete Digital Teaching Bundle",
    masterDesc: "Master PPT designing, fast typing, thumbnail creation, AI tools, YouTube branding, video editing, and monetization — everything a modern teacher needs.",
    masterPrice: "9999",
    masterMrp: "49999",
    masterIncludes: "25+ AI Tools Training\n20+ PPT Template Pack\nCanva Template Kit\nCompletion Certificate\n2 Months WhatsApp Support",
    instructorName: "Govardhan Pandit",
    refundPolicy: "7-day money-back guarantee",
  });

  const [services, setServices] = useState({
    mcqRate: "₹1–₹3 / question",
    pptRate: "₹2–₹5 / slide",
    testPaperRate: "₹40–₹200",
    thumbnailRate: "₹50–₹150",
    typingRate: "₹20–₹80 / page",
    seoRate: "₹30 / video",
    channelMgmt: "₹4,999–₹5,999 / month",
    turnaroundTime: "24–48 hours",
    bulkDiscount: "Available for orders 50+",
  });

  const [marqueeItems, setMarqueeItems] = useState(
    "📚 MCQ Banks\n🎞️ PPT Notes\n📄 Test Papers\n🖼️ Thumbnails\n🎓 Teacher Courses\n⌨️ Hindi Typing\n🎨 Poster Design\n📢 SEO Services\n💼 Digital Products\n🏆 MSME Registered"
  );

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(""),3000); };

  // Load from Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db,"siteContent","main"));
        if (snap.exists()) {
          const d = snap.data();
          if (d.general) setGeneral(d.general);
          if (d.hero)    setHero(d.hero);
          if (d.about)   setAbout(d.about);
          if (d.course)  setCourse(d.course);
          if (d.services) setServices(d.services);
          if (d.marqueeItems) setMarqueeItems(d.marqueeItems);
        }
      } catch(e) { console.error(e); }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db,"siteContent","main"), {
        general, hero, about, course, services, marqueeItems,
        updatedAt: serverTimestamp(),
      }, { merge:true });
      flash("✅ Saved! Website update ho gayi.");
    } catch(e) { flash("❌ Error: "+e.message); }
    setSaving(false);
  };

  const SECTIONS = [
    { id:"general",  label:"🏠 General" },
    { id:"hero",     label:"🎯 Hero Section" },
    { id:"about",    label:"👤 About" },
    { id:"course",   label:"🎓 Course" },
    { id:"services", label:"⚙️ Services" },
    { id:"marquee",  label:"📢 Marquee" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:t.bg }}>
      <style>{`:root{--bg:${t.bg};--card:${t.bgCard};--bg2:${t.bgCard2};--bord:${t.border};--txt:${t.text};--mut:${t.muted};}*{box-sizing:border-box;}button,input,textarea{font-family:'Plus Jakarta Sans',sans-serif;}`}</style>

      {msg && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:msg.startsWith("✅")?"rgba(16,185,129,.15)":"rgba(239,68,68,.15)", border:`1px solid ${msg.startsWith("✅")?t.green:t.red}`, color:msg.startsWith("✅")?t.green:t.red, padding:"10px 24px", borderRadius:50, fontSize:".9rem", fontWeight:700, whiteSpace:"nowrap" }}>{msg}</div>}

      <div style={{ padding:"24px", maxWidth:960 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text }}>🌐 Website Content Editor</h2>
          <SaveBtn onClick={save} saving={saving} t={t}/>
        </div>

        {/* Section Tabs */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActiveSection(s.id)} style={{
              padding:"7px 14px", borderRadius:50, border:"none", fontSize:".83rem", fontWeight:600, cursor:"pointer",
              background: activeSection===s.id ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard,
              color: activeSection===s.id ? "#070B14" : t.muted,
              border: activeSection===s.id ? "none" : `1px solid ${t.border}`,
            }}>{s.label}</button>
          ))}
        </div>

        {/* GENERAL */}
        {activeSection==="general" && (
          <div>
            <Section title="🏢 Company Details" t={t}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Inp label="Site Name" value={general.siteName} onChange={e=>setGeneral({...general,siteName:e.target.value})}/>
                <Inp label="Tagline" value={general.tagline} onChange={e=>setGeneral({...general,tagline:e.target.value})}/>
                <Inp label="Phone" value={general.phone} onChange={e=>setGeneral({...general,phone:e.target.value})}/>
                <Inp label="Email" value={general.email} onChange={e=>setGeneral({...general,email:e.target.value})}/>
                <Inp label="WhatsApp Number (with country code)" value={general.whatsapp} onChange={e=>setGeneral({...general,whatsapp:e.target.value})} placeholder="919241653369"/>
                <Inp label="UPI ID" value={general.upiId} onChange={e=>setGeneral({...general,upiId:e.target.value})}/>
              </div>
              <Txt label="Address" value={general.address} onChange={e=>setGeneral({...general,address:e.target.value})} rows={2}/>
              <Txt label="Short Description" value={general.description} onChange={e=>setGeneral({...general,description:e.target.value})} rows={2}/>
            </Section>

            <Section title="🖼️ Logo & Photo" t={t}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <div>
                  <div style={{ fontSize:".77rem", fontWeight:700, color:t.muted, textTransform:"uppercase", marginBottom:8 }}>Website Logo</div>
                  <ImageUpload folder="logos/site" value={general.logoUrl} onUpload={url=>setGeneral({...general,logoUrl:url})} label="" shape="round" t={t}/>
                  {general.logoUrl && <div style={{ fontSize:".75rem", color:t.green, marginTop:4 }}>✅ Logo uploaded</div>}
                </div>
                <div>
                  <div style={{ fontSize:".77rem", fontWeight:700, color:t.muted, textTransform:"uppercase", marginBottom:8 }}>Govardhan Sir Photo</div>
                  <ImageUpload folder="photos/govardhan" value={general.govardhanPhoto} onUpload={url=>setGeneral({...general,govardhanPhoto:url})} label="" shape="rect" t={t}/>
                  {general.govardhanPhoto && <div style={{ fontSize:".75rem", color:t.green, marginTop:4 }}>✅ Photo uploaded</div>}
                </div>
              </div>
              <div style={{ background:`${t.accent}10`, borderRadius:9, padding:"10px 14px", fontSize:".8rem", color:t.muted, marginTop:10 }}>
                💡 Ya phir manually <strong style={{ color:t.text }}>public/images/logo.png</strong> aur <strong style={{ color:t.text }}>public/images/govardhan.jpg</strong> files daalein project mein
              </div>
            </Section>
          </div>
        )}

        {/* HERO */}
        {activeSection==="hero" && (
          <Section title="🎯 Homepage Hero Section" t={t}>
            <Inp label="Badge Text" value={hero.badge} onChange={e=>setHero({...hero,badge:e.target.value})}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <Inp label="Heading Line 1" value={hero.heading1} onChange={e=>setHero({...hero,heading1:e.target.value})}/>
              <Inp label="Heading Line 2 (Gold)" value={hero.heading2} onChange={e=>setHero({...hero,heading2:e.target.value})}/>
              <Inp label="Heading Line 3" value={hero.heading3} onChange={e=>setHero({...hero,heading3:e.target.value})}/>
            </div>
            <Txt label="Sub Text" value={hero.subtext} onChange={e=>setHero({...hero,subtext:e.target.value})} rows={3}/>
            <div style={{ fontSize:".82rem", fontWeight:700, color:t.muted, textTransform:"uppercase", marginBottom:10 }}>Stats (Homepage Numbers)</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
              {[["stat1","stat1label"],["stat2","stat2label"],["stat3","stat3label"],["stat4","stat4label"]].map(([val,label])=>(
                <div key={val}>
                  <Inp label="Number" value={hero[val]} onChange={e=>setHero({...hero,[val]:e.target.value})}/>
                  <Inp label="Label" value={hero[label]} onChange={e=>setHero({...hero,[label]:e.target.value})}/>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ABOUT */}
        {activeSection==="about" && (
          <Section title="👤 About Page Content" t={t}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Inp label="Owner Name" value={about.ownerName} onChange={e=>setAbout({...about,ownerName:e.target.value})}/>
              <Inp label="Owner Title" value={about.ownerTitle} onChange={e=>setAbout({...about,ownerTitle:e.target.value})}/>
            </div>
            <Txt label="Owner Bio" value={about.ownerBio} onChange={e=>setAbout({...about,ownerBio:e.target.value})} rows={4}/>
            <Txt label="Mission Statement" value={about.mission} onChange={e=>setAbout({...about,mission:e.target.value})} rows={2}/>
            <Txt label="Vision Statement" value={about.vision} onChange={e=>setAbout({...about,vision:e.target.value})} rows={2}/>
            <Txt label="Company Details" value={about.companyDetails} onChange={e=>setAbout({...about,companyDetails:e.target.value})} rows={3}/>
          </Section>
        )}

        {/* COURSE */}
        {activeSection==="course" && (
          <Section title="🎓 Master Course Details" t={t}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Inp label="Course Title" value={course.masterTitle} onChange={e=>setCourse({...course,masterTitle:e.target.value})}/>
              <Inp label="Subtitle" value={course.masterSubtitle} onChange={e=>setCourse({...course,masterSubtitle:e.target.value})}/>
              <Inp label="Price ₹" type="number" value={course.masterPrice} onChange={e=>setCourse({...course,masterPrice:e.target.value})}/>
              <Inp label="MRP ₹ (Original)" type="number" value={course.masterMrp} onChange={e=>setCourse({...course,masterMrp:e.target.value})}/>
              <Inp label="Instructor Name" value={course.instructorName} onChange={e=>setCourse({...course,instructorName:e.target.value})}/>
              <Inp label="Refund Policy" value={course.refundPolicy} onChange={e=>setCourse({...course,refundPolicy:e.target.value})}/>
            </div>
            <Txt label="Course Description" value={course.masterDesc} onChange={e=>setCourse({...course,masterDesc:e.target.value})} rows={3}/>
            <Txt label="What's Included (ek cheez per line)" value={course.masterIncludes} onChange={e=>setCourse({...course,masterIncludes:e.target.value})} rows={6}
              placeholder="25+ AI Tools Training&#10;20+ PPT Template Pack&#10;Certificate"/>
          </Section>
        )}

        {/* SERVICES */}
        {activeSection==="services" && (
          <Section title="⚙️ Services & Pricing" t={t}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Inp label="MCQ Rate" value={services.mcqRate} onChange={e=>setServices({...services,mcqRate:e.target.value})} placeholder="₹1–₹3 / question"/>
              <Inp label="PPT Rate" value={services.pptRate} onChange={e=>setServices({...services,pptRate:e.target.value})} placeholder="₹2–₹5 / slide"/>
              <Inp label="Test Paper Rate" value={services.testPaperRate} onChange={e=>setServices({...services,testPaperRate:e.target.value})}/>
              <Inp label="Thumbnail Rate" value={services.thumbnailRate} onChange={e=>setServices({...services,thumbnailRate:e.target.value})}/>
              <Inp label="Typing Rate" value={services.typingRate} onChange={e=>setServices({...services,typingRate:e.target.value})}/>
              <Inp label="SEO Per Video" value={services.seoRate} onChange={e=>setServices({...services,seoRate:e.target.value})}/>
              <Inp label="Channel Management" value={services.channelMgmt} onChange={e=>setServices({...services,channelMgmt:e.target.value})}/>
              <Inp label="Turnaround Time" value={services.turnaroundTime} onChange={e=>setServices({...services,turnaroundTime:e.target.value})}/>
            </div>
            <Inp label="Bulk Discount Policy" value={services.bulkDiscount} onChange={e=>setServices({...services,bulkDiscount:e.target.value})}/>
            <div style={{ background:`${t.gold}10`, border:`1px solid ${t.gold}25`, borderRadius:9, padding:"10px 14px", fontSize:".8rem", color:t.muted }}>
              💡 Yeh prices website ke Services page pe automatically update ho jaayenge save karne ke baad!
            </div>
          </Section>
        )}

        {/* MARQUEE */}
        {activeSection==="marquee" && (
          <Section title="📢 Marquee Strip Items" t={t}>
            <Txt
              label="Ek item per line (emoji + text)"
              value={marqueeItems}
              onChange={e=>setMarqueeItems(e.target.value)}
              rows={12}
              placeholder="📚 MCQ Banks&#10;🎞️ PPT Notes&#10;..."
            />
            <div style={{ fontSize:".8rem", color:t.muted, marginTop:4 }}>
              Yeh scrolling strip homepage pe dikhti hai. Har line ek item hai.
            </div>
          </Section>
        )}

        <div style={{ marginTop:8 }}>
          <SaveBtn onClick={save} saving={saving} t={t}/>
        </div>
      </div>
    </div>
  );
}