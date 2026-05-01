// src/pages/Home.jsx — Fully Mobile Responsive + Dynamic Content
import { SecTitle, Tag, Btn, GlowBg, MarqueeStrip } from "../components/ui/UI";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import useSiteContent from "../hooks/useSiteContent";

// 🔥 VITE MAGIC: Automatically fetch all images from the folders
const scrollModules = import.meta.glob('../assets/images/scroll/*.{jpg,jpeg,png,webp,gif}', { eager: true });
const galleryModules = import.meta.glob('../assets/images/gallery/*.{jpg,jpeg,png,webp,gif}', { eager: true });

// Extract the actual image URLs
const scrollImages = Object.values(scrollModules).map(mod => mod.default);
const galleryImages = Object.values(galleryModules).map(mod => mod.default);

// If folders are empty (or while you are copying images), use placeholders so design doesn't break
const finalScrollImages = scrollImages.length > 0 ? scrollImages : ["https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80"];
const finalGalleryImages = galleryImages.length > 0 ? galleryImages : ["https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80"];

// Duplicating the arrays to make the infinite scrolling smooth
const infiniteScrollImages = [...finalScrollImages, ...finalScrollImages];
const infiniteGalleryImages = [...finalGalleryImages, ...finalGalleryImages];

const CLIENTS = [
  "SVM Classes Official","MargDarshan Academy","Math By-Ranjeet Sir",
  "The Real Education","Prerna Classes","Osho Classes",
  "AECC Achievement English","G.P. Classes","Future Math",
  "Vishal Mathematics","G.S. Academy","Top Exam @ 100%",
  "Bright Way Institute","Vansh Biology","Srijan Chemistry",
  "Level Up English","Dreamset Classes","Maadhavi Results",
  "SDR Physics","Samarpan Online","Vidyalakshmi Classes",
  "Riyanshu Matric Art's","Maurya Classes","ARS Academy",
  "Mithila Commerce","+ More joining...",
];

const TESTIMONIALS = [
  { name:"SVM Classes Official", loc:"Bihar · 160+ orders", stars:5, quote:"Govardhan bhai ka kaam ekdum professional hai. 12,000+ MCQs banaye — quality outstanding thi. Best content partner!" },
  { name:"Math By-Ranjeet Sir",  loc:"Patna · Active Client", stars:5, quote:"4,600+ math questions — every single one accurate. My students now get the best material. Highly recommended!" },
  { name:"Vansh Biology",        loc:"Active Client", stars:5, quote:"268 biology questions ekdam sahi level ke. Thumbnail bhi attractive bana. Students ka response bahut acha tha!" },
];

export default function Home({ setPage, t }) {
  const { content } = useSiteContent();
  const { hero, general, services, marqueeItems } = content;
  const liveTestimonials = content.testimonials || [];
  // ✅ FIX: Koi bhi ek testimonial ho to Firestore ka use karo, warna hardcoded fallback

  const marqueeList = marqueeItems.split("\n").filter(Boolean);

  const SERVICES = [
    { icon:"❓", title:"MCQ / Question Bank",    desc:"Chapter-wise MCQs for every subject.",              price:services.mcqRate },
    { icon:"📊", title:"PPT Notes & Slides",      desc:"Visual-rich Smart Board presentations.",            price:services.pptRate },
    { icon:"📝", title:"Test Papers",             desc:"Board pattern objective & subjective.",             price:services.testPaperRate },
    { icon:"🎨", title:"Thumbnail & Poster",      desc:"YouTube thumbnails & banners that get clicks.",     price:services.thumbnailRate },
    { icon:"⌨️", title:"Hindi/English Typing",   desc:"Fast professional typing — papers, notes, books.",  price:services.typingRate },

  ];

  return (
    <div>
      {/* CSS for Auto-Scrolling Gallery + Responsive */}
      <style>
        {`
          @keyframes scrollUpGallery {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          @keyframes scrollDownGallery {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0); }
          }
          .gallery-col {
            display: flex;
            flex-direction: column;
            width: 100%;
            animation: 30s linear infinite;
          }
          .gallery-col:hover { animation-play-state: paused; }

          /* ── Responsive ── */
          @media (max-width: 768px) {
            .hero-gallery { flex: 0 0 100% !important; height: 260px !important; order: -1; }
            .hero-text { flex: 1 1 100% !important; max-width: 100% !important; }
            .hero-stats { grid-template-columns: repeat(2, 1fr) !important; }
            .hero-btns { flex-direction: column !important; }
            .hero-btns a, .hero-btns button { width: 100% !important; text-align: center !important; justify-content: center !important; }
          }
          @media (max-width: 480px) {
            .hero-gallery { height: 200px !important; }
            .hero-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .hero-gallery { flex: 1 1 280px !important; height: 420px !important; }
          }
        `}
      </style>

      {/* Hero + Marquee wrapper */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section style={{
          flex: 1,
          position:"relative", overflow:"hidden",
          display:"flex", alignItems:"center",
          /* Top padding: navbar transparent hai, toh hero uske neeche se hi shuru ho.
             Sirf itna padding ki text navbar ke peeche na jaaye */
          padding:"64px clamp(16px,5%,60px) clamp(40px,6vw,64px)",
          background: t.bg,
        }}>
          <GlowBg color={t.accent} size={500} top={-100} right={-100} />
          <GlowBg color={t.gold}   size={300} bottom={-50} left={-50} />
          <div style={{
            position:"absolute", inset:0, opacity:.025,
            backgroundImage:`linear-gradient(${t.accent} 1px,transparent 1px),linear-gradient(90deg,${t.accent} 1px,transparent 1px)`,
            backgroundSize:"48px 48px",
          }}/>

          <div style={{ 
            position:"relative", zIndex:2, width:"100%", 
            display: "flex", flexWrap: "wrap", gap: "50px", alignItems: "center", justifyContent: "space-between" 
          }}>
            
            {/* LEFT SIDE: Text Content */}
            <div className="hero-text" style={{ flex: "1 1 500px", maxWidth: 680 }}>
              <div className="fade-up" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.35)",
                borderRadius:50, padding:"6px 16px",
                fontSize:".8rem", fontWeight:700, color:t.gold, marginBottom:22,
              }}>
                {hero.badge}
              </div>

              <h1 className="fade-up" style={{
                fontSize:"clamp(2rem,6vw,4rem)", fontWeight:800,
                lineHeight:1.12, color:t.text, marginBottom:18,
                animationDelay:".1s",
              }}>
                {hero.heading1}<br/>
                <span style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  {hero.heading2}
                </span>
                <br/>{hero.heading3}
              </h1>

              <p className="fade-up" style={{
                fontSize:"clamp(.95rem,2.5vw,1.1rem)", lineHeight:1.75,
                color:t.muted, marginBottom:32, maxWidth:520, animationDelay:".2s",
              }}>
                {hero.subtext}
              </p>

              <div className="hero-btns fade-up" style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:clamp_mb(50), animationDelay:".3s" }}>
                <Btn href={`https://wa.me/${general.whatsapp}`} variant="primary" t={t}
                  style={{ fontSize:"clamp(.88rem,2vw,.95rem)" }}>
                  📲 Get Started on WhatsApp
                </Btn>
                <Btn onClick={()=>setPage("services")} variant="ghost" t={t}
                  style={{ fontSize:"clamp(.88rem,2vw,.95rem)" }}>
                  🔍 View Services
                </Btn>
              </div>

              {/* Stats */}
              <div className="hero-stats fade-up" style={{
                display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"clamp(14px,3vw,24px)",
                animationDelay:".4s",
              }}>
                {[
                  [hero.stat1, hero.stat1label],
                  [hero.stat2, hero.stat2label],
                  [hero.stat3, hero.stat3label],
                  [hero.stat4, hero.stat4label],
                ].map(([n,l], idx) => (
                  <div key={idx}>
                    <div style={{ fontSize:"clamp(1.4rem,4vw,2rem)", fontWeight:900, color:t.gold, lineHeight:1 }}>{n}</div>
                    <div style={{ fontSize:".78rem", color:t.muted, marginTop:3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE: Animated Scrolling Gallery */}
            <div className="hero-gallery fade-up" style={{ 
              flex: "1 1 400px", 
              height: "550px", 
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
              maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
              animationDelay: ".5s"
            }}>
              
              {/* Column 1 (Left): Scrolls UP - 16:9 Ratio (Landscape) */}
              <div className="gallery-col" style={{ animationName: "scrollUpGallery", maxWidth: "280px" }}>
                {infiniteScrollImages.map((imgSrc, i) => (
                  <img 
                    key={`up-${i}`} 
                    src={imgSrc} 
                    alt={`Scroll Work ${i}`} 
                    style={{ 
                      width: "100%", 
                      aspectRatio: "16/9", 
                      objectFit: "cover", 
                      borderRadius: 12, 
                      border: `1px solid ${t.border}`, 
                      boxShadow: `0 10px 30px ${t.accentBg}`,
                      marginBottom: "20px" 
                    }}
                  />
                ))}
              </div>

              {/* Column 2 (Right): Scrolls DOWN - 9:16 Ratio (Portrait) */}
              <div className="gallery-col" style={{ animationName: "scrollDownGallery", maxWidth: "200px" }}>
                {infiniteGalleryImages.map((imgSrc, i) => (
                  <img 
                    key={`down-${i}`} 
                    src={imgSrc} 
                    alt={`Gallery Work ${i}`} 
                    style={{ 
                      width: "100%", 
                      aspectRatio: "9/16", 
                      objectFit: "cover", 
                      borderRadius: 12, 
                      border: `1px solid ${t.border}`, 
                      boxShadow: `0 10px 30px ${t.accentBg}`,
                      marginBottom: "20px" 
                    }}
                  />
                ))}
              </div>

            </div>

          </div>
        </section>

        {/* 🔥 Yahan Par Marquee daal diya, ye ab exact screen ke bottom par dikhega without scroll kiye */}
        <MarqueeStrip t={t} items={marqueeList}/>
      </div>

      {/* ── SERVICES ──────────────────────────────────────────────────────── */}
      <section style={{ padding:"clamp(60px,8vw,90px) clamp(16px,5%,60px)", background:t.bg }}>
        <SecTitle t={t} tag="What We Do" h="Services That Power Your Coaching"
          sub="Everything your institute needs — content, design, digital — one trusted partner."/>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",
          gap:18,
        }}>
          {SERVICES.map(({ icon, title, desc, price }) => (
            <div key={title} className="card-hover" style={{
              background:t.bgCard, border:`1px solid ${t.border}`,
              borderRadius:16, padding:"22px 18px",
            }}>
              <div style={{ width:48, height:48, borderRadius:12, background:t.accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", marginBottom:14 }}>{icon}</div>
              <h3 style={{ fontWeight:700, fontSize:"1rem", color:t.text, marginBottom:7 }}>{title}</h3>
              <p style={{ fontSize:".87rem", color:t.muted, lineHeight:1.6, marginBottom:12 }}>{desc}</p>
              <div style={{ paddingTop:10, borderTop:`1px solid ${t.border}`, fontSize:".83rem", fontWeight:700, color:t.gold }}>{price}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:32 }}>
          <Btn onClick={()=>setPage("services")} variant="ghost" t={t}>View All Services & Pricing →</Btn>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      {/* <section style={{ padding:"clamp(60px,8vw,80px) clamp(16px,5%,60px)", background:t.bgCard2 }}>
        <SecTitle t={t} tag="Process" h="4 Simple Steps" center
          sub="WhatsApp se order karo — professional quality files receive karo."/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,200px),1fr))", gap:24 }}>
          {[
            ["1","WhatsApp Us","Topic, quantity, deadline batao. Instant quote milega."],
            ["2","Confirm Order","Payment advance ya delivery pe — tumhara choice."],
            ["3","We Work","Professional quality content within deadline."],
            ["4","Files Delivered","WhatsApp ya Client Portal pe — anytime access."],
          ].map(([n,title,desc]) => (
            <div key={n} style={{ textAlign:"center" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.gold})`, color:"#fff", fontSize:"1.4rem", fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 8px 24px ${t.accentBg}` }}>{n}</div>
              <h3 style={{ fontWeight:700, fontSize:"1rem", color:t.text, marginBottom:8 }}>{title}</h3>
              <p style={{ fontSize:".86rem", color:t.muted, lineHeight:1.55 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section> */}
      <section style={{
        padding: "clamp(60px,8vw,80px) clamp(16px,5%,60px)",
        background: t.bgCard2
      }}>
        <SecTitle 
          t={t} 
          tag="Process" 
          h="4 Simple Steps" 
          center
          sub="Order via WhatsApp — receive professional quality files."
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 28,
          maxWidth: "1000px",
          margin: "0 auto",   // ✅ center whole grid
          justifyContent: "center"
        }}>
          {[
            ["1","Contact on WhatsApp","Share topic, quantity, and deadline. Get an instant quote."],
            ["2","Confirm Order","Choose advance payment or pay on delivery."],
            ["3","We Start Working","High-quality content delivered within deadline."],
            ["4","Files Delivered","Get files via WhatsApp or Client Portal anytime."],
          ].map(([n,title,desc]) => (
            
            <div key={n} style={{
              textAlign: "center",
              padding: "24px 16px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.05)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
            onMouseEnter={e=>{
              e.currentTarget.style.transform="translateY(-6px) scale(1.03)";
              e.currentTarget.style.boxShadow="0 20px 40px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.transform="translateY(0) scale(1)";
              e.currentTarget.style.boxShadow="none";
            }}
            >

              {/* Number Box */}
              <div style={{
                width: 70,
                height: 70,
                borderRadius: "18px",
                background: "linear-gradient(135deg, #00c6ff, #0072ff, #00f2fe)",
                boxShadow: "0 10px 30px rgba(0, 198, 255, 0.4)",
                color: "#fff",
                fontSize: "1.6rem",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px"
              }}>
                {n}
              </div>

              {/* Title */}
              <h3 style={{
                fontWeight: 700,
                fontSize: "1.05rem",
                color: t.text,
                marginBottom: 10
              }}>
                {title}
              </h3>

              {/* Description */}
              <p style={{
                fontSize: ".9rem",
                color: t.muted,
                lineHeight: 1.6
              }}>
                {desc}
              </p>

            </div>
          ))}
        </div>
      </section>
      {/* ── CLIENTS ───────────────────────────────────────────────────────── */}
      <section style={{ padding:"clamp(60px,8vw,80px) clamp(16px,5%,60px)", background:t.bg }}>
        <SecTitle t={t} tag="Trusted By" h="500+ Coaching Institutes Trust Us"
          sub="From Bihar to Jharkhand — top institutes rely on DG HelpMate."/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,185px),1fr))", gap:10 }}>
          {CLIENTS.map((name,i) => (
            <div key={i} className="card-hover" style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, padding:"11px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:i===CLIENTS.length-1?t.gold:t.green, flexShrink:0 }}/>
              <span style={{ fontSize:".85rem", fontWeight:600, color:i===CLIENTS.length-1?t.gold:t.text }}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section style={{ padding:"clamp(60px,8vw,80px) clamp(16px,5%,60px)", background:t.bgCard2 }}>
        <SecTitle t={t} tag="Testimonials" h="What Our Clients Say" center/>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:20 }}>
          {(liveTestimonials.length >= 1 ? liveTestimonials.slice(0,6) : TESTIMONIALS).map(({ name, org, loc, stars, quote }, i) => (
            <div key={name} className="card-hover" style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:"22px" }}>
              <div style={{ color:t.gold, fontSize:".9rem", letterSpacing:2, marginBottom:12 }}>{"★".repeat(stars)}</div>
              <p style={{ fontSize:".9rem", color:t.muted, lineHeight:1.65, marginBottom:16 }}>"{(quote||"").substring(0,200)}{(quote||"").length>200?"...":""}"</p>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${t.gold},${t.saffron})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:".85rem", color:"#070B14" }}>{name[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:".88rem", color:t.text }}>{name}</div>
                  <div style={{ fontSize:".74rem", color:t.muted }}>{loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COURSE CTA ────────────────────────────────────────────────────── */}
      <section style={{
        padding:"clamp(60px,8vw,80px) clamp(16px,5%,60px)",
        textAlign:"center",
        background:`linear-gradient(135deg,${t.accent}CC,${t.bg})`,
        position:"relative", overflow:"hidden",
      }}>
        <GlowBg color={t.gold} size={300} top={-80} right={-80}/>
        <div style={{ position:"relative", zIndex:1, maxWidth:580, margin:"0 auto" }}>
          <Tag t={t} color={t.gold}>🔥 High Value Course</Tag>
          <h2 style={{ fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:800, color:"#fff", marginBottom:14 }}>
            {content.course.masterTitle}
          </h2>
          <p style={{ color:"rgba(255,255,255,.75)", fontSize:"1rem", marginBottom:22, lineHeight:1.65 }}>
            {content.course.masterDesc.substring(0,120)}...
          </p>
          <div style={{ marginBottom:24 }}>
            <span style={{ fontSize:".9rem", color:"rgba(255,255,255,.6)", textDecoration:"line-through" }}>₹{Number(content.course.masterMrp).toLocaleString()}</span>
            <div style={{ fontSize:"3rem", fontWeight:900, color:t.gold, lineHeight:1 }}>₹{Number(content.course.masterPrice).toLocaleString()}</div>
            <div style={{ fontSize:".82rem", color:t.green, fontWeight:700 }}>🎉 Save ₹{(Number(content.course.masterMrp)-Number(content.course.masterPrice)).toLocaleString()}!</div>
          </div>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Btn onClick={()=>setPage("courses")} variant="primary" t={t} style={{ fontSize:"1rem", padding:"13px 28px" }}>🚀 See Course Details</Btn>
            <Btn href={`https://wa.me/${general.whatsapp}?text=Course%20enroll%20karna%20hai`} variant="wa" t={t}>📲 Enroll via WhatsApp</Btn>
          </div>
        </div>
      </section>
    </div>
  );
}

function clamp_mb(v) { return v; }