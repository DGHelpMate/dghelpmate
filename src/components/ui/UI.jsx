// src/components/ui/UI.jsx
import { useEffect } from "react";

export const GlobalCSS = ({ t }) => {
  useEffect(() => {
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
    document.documentElement.style.background = t.bg;
    const root = document.getElementById("root");
    if (root) { root.style.background = t.bg; root.style.minHeight = "100vh"; }
  }, [t.bg, t.text]);
  return (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:'Plus Jakarta Sans',sans-serif;background:${t.bg}!important;color:${t.text}!important;transition:background .3s,color .3s;overflow-x:hidden;}
    #root{background:${t.bg};min-height:100vh;transition:background .3s;}
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:${t.gold};border-radius:3px;}
    input,textarea,select{background:${t.bgCard}!important;color:${t.text}!important;border-color:${t.border}!important;}
    input::placeholder,textarea::placeholder{color:${t.muted}!important;}
    a{text-decoration:none;color:inherit;}
    button{font-family:inherit;cursor:pointer;}
    img{max-width:100%;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .fade-up{animation:fadeUp .6s ease both;}
    .floating{animation:float 4s ease-in-out infinite;}
    .card-hover{transition:transform .3s,box-shadow .3s!important;}
    .card-hover:hover{transform:translateY(-5px)!important;box-shadow:0 20px 50px ${t.shadow}!important;}
    .btn-hover{transition:transform .2s,opacity .2s!important;}
    .btn-hover:hover{transform:translateY(-2px)!important;opacity:.9!important;}
    @media(max-width:768px){
      .hide-mobile{display:none!important;}
      .stack-mobile{flex-direction:column!important;}
      .full-mobile{width:100%!important;}
      .center-mobile{text-align:center!important;}
      .grid-1-mobile{grid-template-columns:1fr!important;}
      .grid-2-mobile{grid-template-columns:1fr 1fr!important;}
      .pad-mobile{padding:60px 4%!important;}
      .hero-h{font-size:2rem!important;}
      .sec-h{font-size:1.6rem!important;}
      .nav-desktop{display:none!important;}
      .nav-mobile-btn{display:flex!important;}
    }
    @media(min-width:769px){
      .hide-desktop{display:none!important;}
      .nav-mobile-btn{display:none!important;}
    }
  `}</style>
  );
};

export const Tag = ({ children, t, color }) => (
  <span style={{
    display:"inline-block", padding:"5px 14px", borderRadius:50,
    fontSize:".72rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
    marginBottom:12, background: color ? `${color}18` : t.accentBg,
    color: color || t.accent, border:`1px solid ${(color||t.accent)}30`,
  }}>{children}</span>
);

export const SecTitle = ({ tag, h, sub, center, t, tagColor }) => (
  <div style={{ textAlign:center?"center":"left", marginBottom:44 }}>
    {tag && <Tag t={t} color={tagColor}>{tag}</Tag>}
    <h2 className="sec-h" style={{
      fontFamily:"'Plus Jakarta Sans',sans-serif",
      fontSize:"clamp(1.75rem,3.2vw,2.55rem)", fontWeight:800,
      lineHeight:1.2, color:t.text, marginBottom:12,
    }}>{h}</h2>
    {sub && <p style={{ fontSize:"1.02rem", color:t.muted, lineHeight:1.7, maxWidth:560, margin:center?"0 auto":0 }}>{sub}</p>}
  </div>
);

export const Btn = ({ children, variant="primary", href, onClick, style={}, t={} }) => {
  const base = {
    display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px",
    borderRadius:10, fontWeight:700, fontSize:".93rem", border:"none",
    fontFamily:"'Plus Jakarta Sans',sans-serif", textDecoration:"none", ...style,
  };
  const v = {
    primary:{ background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", boxShadow:"0 8px 24px rgba(245,158,11,.35)" },
    outline:{ background:"transparent", border:"2px solid rgba(255,255,255,.2)", color:"#fff" },
    green:  { background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff" },
    wa:     { background:"#25D366", color:"#fff", boxShadow:"0 8px 24px rgba(37,211,102,.3)" },
    ghost:  { background:"transparent", border:`2px solid ${t.gold||"#F59E0B"}`, color:t.gold||"#F59E0B" },
    dark:   { background:t.bgCard||"#0F1629", color:t.text||"#F1F5F9", border:`1px solid ${t.border||"rgba(255,255,255,.1)"}` },
    danger: { background:"linear-gradient(135deg,#EF4444,#DC2626)", color:"#fff" },
    accent: { background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff" },
  };
  const T = href ? "a" : "button";
  return <T href={href} onClick={onClick} className="btn-hover" style={{...base,...v[variant]}}>{children}</T>;
};

export const Card = ({ children, style={}, hover=true }) => (
  <div className={hover?"card-hover":""} style={{
    background:"var(--card,#0F1629)", border:"1px solid var(--bord,rgba(255,255,255,.07))",
    borderRadius:16, padding:"22px 20px", ...style,
  }}>{children}</div>
);

export const Spinner = ({ size=32, color="#F59E0B" }) => (
  <div style={{ width:size, height:size, border:`3px solid transparent`, borderTopColor:color,
    borderRadius:"50%", animation:"spin .8s linear infinite", display:"inline-block" }} />
);

export const GlowBg = ({ color, size=400, top, bottom, left, right, opacity=.15 }) => (
  <div style={{ position:"absolute", width:size, height:size, borderRadius:"50%",
    background:color, filter:"blur(100px)", opacity, top, bottom, left, right, pointerEvents:"none", zIndex:0 }} />
);

export const MarqueeStrip = ({ t, items: customItems }) => {
  const items = customItems || [
    "📚 MCQ Banks","🎞️ PPT Notes","📄 Test Papers","🖼️ Thumbnails",
    "🎓 Teacher Courses","⌨️ Hindi Typing","🎨 Poster Design",
    "📢 SEO Services","💼 Digital Products","🏆 MSME Registered",
  ];
  const all = [...items,...items];
  return (
    <div style={{ background:"linear-gradient(90deg,#F59E0B,#F97316)", padding:"10px 0", overflow:"hidden" }}>
      <div style={{ display:"flex", animation:"marquee 30s linear infinite", whiteSpace:"nowrap" }}>
        {all.map((item,i) => (
          <span key={i} style={{ padding:"0 26px", fontWeight:700, fontSize:".86rem", color:"#070B14", borderRight:"2px solid rgba(7,11,20,.18)" }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

// Logo component — uses /images/logo.png or falls back to text
export const Logo = ({ size=38, showText=true, t={} }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <div style={{ width:size, height:size, borderRadius:Math.round(size*.24), overflow:"hidden", flexShrink:0 }}>
      <img
        src="/images/logo.png"
        alt="DG HelpMate Logo"
        style={{ width:"100%", height:"100%", objectFit:"cover" }}
        onError={e => {
          e.target.style.display = "none";
          e.target.parentElement.style.background = "linear-gradient(135deg,#F59E0B,#F97316)";
          e.target.parentElement.style.display = "flex";
          e.target.parentElement.style.alignItems = "center";
          e.target.parentElement.style.justifyContent = "center";
          e.target.parentElement.innerHTML = `<span style="font-weight:900;font-size:${Math.round(size*.32)}px;color:#070B14">DG</span>`;
        }}
      />
    </div>
    {showText && (
      <span style={{ fontWeight:800, fontSize:`${Math.round(size*.34)}px`, color:t.text||"#F1F5F9" }}>
        DG <span style={{ color:t.gold||"#F59E0B" }}>HelpMate</span>
      </span>
    )}
  </div>
);

// Govardhan photo component
export const GovardhanPhoto = ({ size=200, style={} }) => (
  <div style={{
    width:size, height:size, borderRadius:"50%", overflow:"hidden",
    border:"4px solid #F59E0B", flexShrink:0,
    boxShadow:"0 20px 60px rgba(245,158,11,.25)", ...style,
  }}>
    <img
      src="/images/govardhan.jpg"
      alt="Govardhan Pandit"
      style={{ width:"100%", height:"100%", objectFit:"cover" }}
      onError={e => {
        e.target.style.display = "none";
        e.target.parentElement.style.background = "linear-gradient(135deg,#6366F1,#F59E0B)";
        e.target.parentElement.style.display = "flex";
        e.target.parentElement.style.alignItems = "center";
        e.target.parentElement.style.justifyContent = "center";
        e.target.parentElement.innerHTML = `<span style="font-size:${Math.round(size*.4)}px">👨‍💻</span>`;
      }}
    />
  </div>
);

// Image Banner / Slider component — can be placed anywhere on website
export const ImageBanner = ({ slides=[], height=280, autoplay=true, interval=4000, style={} }) => {
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const id = setInterval(() => setCurrent(c => (c+1) % slides.length), interval);
    return () => clearInterval(id);
  }, [slides.length, autoplay, interval]);
  if (!slides.length) return null;
  return (
    <div style={{ position:"relative", height, overflow:"hidden", ...style }}>
      {slides.map((slide, i) => (
        <div key={i} style={{
          position:"absolute", inset:0, transition:"opacity .8s",
          opacity: i === current ? 1 : 0,
        }}>
          <img src={slide.image} alt={slide.alt||""} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          {slide.caption && (
            <div style={{
              position:"absolute", bottom:0, left:0, right:0, padding:"16px 24px",
              background:"linear-gradient(transparent,rgba(0,0,0,.6))",
              color:"#fff", fontWeight:700, fontSize:"1rem",
            }}>{slide.caption}</div>
          )}
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button onClick={() => setCurrent(c => (c-1+slides.length)%slides.length)}
            style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,.4)", border:"none", color:"#fff", width:36, height:36, borderRadius:"50%", fontSize:"1.1rem" }}>‹</button>
          <button onClick={() => setCurrent(c => (c+1)%slides.length)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"rgba(0,0,0,.4)", border:"none", color:"#fff", width:36, height:36, borderRadius:"50%", fontSize:"1.1rem" }}>›</button>
          <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6 }}>
            {slides.map((_,i) => (
              <button key={i} onClick={() => setCurrent(i)}
                style={{ width:i===current?20:8, height:8, borderRadius:4, border:"none", background:i===current?"#F59E0B":"rgba(255,255,255,.5)", transition:"all .3s" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Floating WhatsApp button
export const WhatsAppFloat = () => (
  <a href="https://wa.me/919241653369?text=Hi%20DG%20HelpMate!" target="_blank"
    style={{
      position:"fixed", bottom:24, right:24, zIndex:999,
      width:56, height:56, borderRadius:"50%",
      background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 8px 24px rgba(37,211,102,.5)", textDecoration:"none",
      animation:"pulse 2s ease-in-out infinite",
    }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </a>
);

export const Footer = ({ setPage, t }) => (
  <footer style={{ background:t.bgCard, borderTop:`1px solid ${t.border}`, padding:"56px 5% 28px" }}>
    <div className="grid-1-mobile" style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr", gap:36, marginBottom:36 }}>
      <div>
        <div style={{ marginBottom:14 }}><Logo t={t} size={40} /></div>
        <p style={{ fontSize:".86rem", color:t.muted, lineHeight:1.65, maxWidth:230, marginBottom:14 }}>
          Bihar & Jharkhand's trusted education content partner. MSME Registered · Est. 2025 · Arwal, Bihar.
        </p>
        <div style={{ display:"inline-block", background:"rgba(16,185,129,.12)", color:t.green, padding:"5px 12px", borderRadius:8, fontSize:".8rem", fontWeight:700 }}>✅ MSME Registered</div>
      </div>
      {[
        { head:"Services", links:["MCQ Banks","PPT Notes","Test Papers","Thumbnails","SEO & Channel"] },
        { head:"Company",  links:[["About","about"],["Courses","courses"],["Bundles","bundles"],["Blog","blog"],["Contact","contact"]] },
      ].map(({ head, links }) => (
        <div key={head}>
          <div style={{ fontSize:".77rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:t.gold, marginBottom:14 }}>{head}</div>
          {links.map(l => (
            <div key={Array.isArray(l)?l[0]:l} onClick={() => Array.isArray(l)&&setPage(l[1])}
              style={{ fontSize:".86rem", color:t.muted, marginBottom:9, cursor:Array.isArray(l)?"pointer":"default" }}>
              {Array.isArray(l)?l[0]:l}
            </div>
          ))}
        </div>
      ))}
      <div>
        <div style={{ fontSize:".77rem", fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", color:t.gold, marginBottom:14 }}>Contact</div>
        {[["📞","+91 92416 53369"],["✉️","support@dghelpmate.com"],["📍","Arwal, Bihar — 804402"],["🌐","dghelpmate.com"]].map(([icon,val]) => (
          <div key={val} style={{ fontSize:".84rem", color:t.muted, marginBottom:9, display:"flex", gap:8 }}>
            <span>{icon}</span><span>{val}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:22, borderTop:`1px solid ${t.border}`, flexWrap:"wrap", gap:10 }}>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
        <p style={{ fontSize:".81rem", color:t.muted }}>💚 Proudly Made for Indian Teachers 🇮🇳 · © 2025 DG HelpMate. All Rights Reserved.</p>
      </div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
        {[["Privacy Policy","privacy"],["Terms & Conditions","terms"],["Refund Policy","refund"]].map(([label,page])=>(
          <span key={page} onClick={()=>setPage(page)} style={{ fontSize:".79rem", color:t.muted, cursor:"pointer", textDecoration:"underline" }}>{label}</span>
        ))}
        <span style={{ fontSize:".81rem", color:t.gold, fontWeight:700 }}>MSME Registered</span>
      </div>
    </div>
  </footer>
);