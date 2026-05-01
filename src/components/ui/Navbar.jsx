// src/components/ui/Navbar.jsx — v2 with Mega Dropdown for Services/Bundles/Materials
import { useState, useEffect, useRef } from "react";
import { NAVBAR_H } from "../../App";
import { Logo, Btn } from "./UI";

const NAV_SIMPLE = [
  ["Courses","courses"],
  ["Blog","blog"],["About","about"],["Contact","contact"],
];

// The 3 linked pages shown in mega menu
const STORE_MENU = {
  label: "Store",
  items: [
    {
      page: "services",
      icon: "🛠️",
      title: "Services",
      desc: "MCQ, PPT, Thumbnail, Typing & more",
      badge: null,
    },
    {
      page: "bundles",
      icon: "📦",
      title: "Bundles",
      desc: "Ready-made content with custom branding",
      badge: "HOT",
    },
    {
      page: "materials",
      icon: "📂",
      title: "Materials",
      desc: "Free & paid digital study resources",
      badge: "FREE",
    },
  ],
};

export default function Navbar({ page, setPage, dark, toggleTheme, t, onPortalClick }) {
  const [scrolled, setScrolled]   = useState(false);
  const [open, setOpen]           = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const storeRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e) => { if (storeRef.current && !storeRef.current.contains(e.target)) setStoreOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const go = (p) => { setPage(p); setOpen(false); setStoreOpen(false); window.scrollTo(0,0); };

  const isStorePage = ["services","bundles","materials"].includes(page);

  return (
    <>
      <style>{`
        @media(max-width:900px){.nav-links{display:none!important;}.nav-ham{display:flex!important;}}
        @media(min-width:901px){.nav-ham{display:none!important;}}
        .store-dropdown{position:absolute;top:calc(100% + 10px);left:50%;transform:translateX(-50%);z-index:999;opacity:0;pointer-events:none;transform:translateX(-50%) translateY(-8px);transition:opacity .2s,transform .2s;}
        .store-dropdown.open{opacity:1;pointer-events:all;transform:translateX(-50%) translateY(0);}
        .store-item:hover{background:var(--si-hover)!important;}
      `}</style>

      <header style={{
        position:"fixed", top:0, left:0, right:0, zIndex:1000,
        background: scrolled ? t.nav : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${t.border}` : "none",
        transition:"all .3s",
      }}>
        <nav style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          height:NAVBAR_H, padding:"0 clamp(16px,4%,40px)",
          maxWidth:1400, margin:"0 auto",
        }}>
          {/* Logo */}
          <div onClick={()=>go("home")} style={{ cursor:"pointer", flexShrink:0 }}>
            <Logo t={t} size={38}/>
          </div>

          {/* Desktop nav */}
          <ul className="nav-links" style={{ display:"flex", gap:2, listStyle:"none", margin:0, padding:0, alignItems:"center" }}>

            <li><button onClick={()=>go("home")} style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 10px", borderRadius:8, fontSize:".83rem", fontWeight:page==="home"?700:500, color:page==="home"?t.gold:t.muted, borderBottom:page==="home"?`2px solid ${t.gold}`:"2px solid transparent", transition:"all .2s" }}>Home</button></li>

            {/* Store dropdown */}
            <li ref={storeRef} style={{ position:"relative" }}>
              <button
                onClick={()=>setStoreOpen(!storeOpen)}
                style={{
                  background:"none", border:"none", cursor:"pointer",
                  padding:"6px 10px", borderRadius:8, fontSize:".83rem",
                  fontWeight: isStorePage ? 700 : 500,
                  color: isStorePage ? t.gold : t.muted,
                  borderBottom: isStorePage ? `2px solid ${t.gold}` : "2px solid transparent",
                  transition:"all .2s", display:"flex", alignItems:"center", gap:4,
                }}
              >
                Store
                <span style={{ fontSize:".6rem", transition:"transform .2s", display:"inline-block", transform:storeOpen?"rotate(180deg)":"none" }}>▼</span>
              </button>

              {/* Mega menu */}
              <div className={`store-dropdown${storeOpen?" open":""}`}
                style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:8, minWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>

                {/* Header */}
                <div style={{ padding:"10px 12px 6px", fontSize:".68rem", color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em" }}>
                  Our Products & Services
                </div>

                {/* Items */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {STORE_MENU.items.map(item => (
                    <button
                      key={item.page}
                      onClick={()=>go(item.page)}
                      style={{
                        background: page===item.page ? `${t.gold}12` : "none",
                        border: `1px solid ${page===item.page ? t.gold+"40" : "transparent"}`,
                        borderRadius:10, padding:"12px 14px", cursor:"pointer",
                        textAlign:"left", fontFamily:"inherit", transition:"all .15s",
                        "--si-hover": t.bgCard2,
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background=t.bgCard2}
                      onMouseLeave={e=>e.currentTarget.style.background=page===item.page?`${t.gold}12`:"none"}
                    >
                      <div style={{ fontSize:"1.4rem", marginBottom:6 }}>{item.icon}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                        <span style={{ fontWeight:700, fontSize:".88rem", color: page===item.page ? t.gold : t.text }}>{item.title}</span>
                        {item.badge && (
                          <span style={{ fontSize:".6rem", padding:"1px 6px", borderRadius:20, fontWeight:800,
                            background: item.badge==="FREE" ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)",
                            color: item.badge==="FREE" ? "#10B981" : "#EF4444",
                          }}>{item.badge}</span>
                        )}
                      </div>
                      <div style={{ fontSize:".74rem", color:t.muted, lineHeight:1.4 }}>{item.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ borderTop:`1px solid ${t.border}`, marginTop:8, padding:"10px 12px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:".74rem", color:t.muted }}>Need something custom?</span>
                  <a href="https://wa.me/919241653369" target="_blank" rel="noreferrer"
                    style={{ fontSize:".74rem", color:"#25D366", fontWeight:700, textDecoration:"none" }}>
                    💬 WhatsApp us →
                  </a>
                </div>
              </div>
            </li>

            {NAV_SIMPLE.map(([label,id]) => (
              <li key={id}>
                <button onClick={()=>go(id)} style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 10px", borderRadius:8, fontSize:".83rem", fontWeight:page===id?700:500, color:page===id?t.gold:t.muted, borderBottom:page===id?`2px solid ${t.gold}`:"2px solid transparent", transition:"all .2s", whiteSpace:"nowrap" }}>
                  {label}
                </button>
              </li>
            ))}
          </ul>

          {/* Right controls */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button onClick={toggleTheme} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${t.border}`, background:t.bgCard, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", color:t.text, cursor:"pointer", flexShrink:0 }}>
              {dark?"☀️":"🌙"}
            </button>
            <button onClick={onPortalClick} style={{ padding:"8px 12px", borderRadius:8, background:t.accentBg, border:`1px solid ${t.accent}30`, color:t.accent, fontWeight:700, fontSize:".8rem", cursor:"pointer", whiteSpace:"nowrap" }}>
              🔐 Login
            </button>
            <div className="nav-links">
              <Btn href="https://wa.me/919241653369" variant="primary" t={t} style={{ padding:"8px 14px", fontSize:".82rem" }}>
                📲 WhatsApp
              </Btn>
            </div>
            <button className="nav-ham" onClick={()=>setOpen(!open)} style={{ width:36, height:36, borderRadius:8, border:`1px solid ${t.border}`, background:t.bgCard, display:"none", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", color:t.text, cursor:"pointer" }}>
              {open?"✕":"☰"}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div style={{ position:"fixed", top:NAVBAR_H, left:0, right:0, bottom:0, zIndex:999, background:t.bgCard, borderTop:`1px solid ${t.border}`, overflowY:"auto", display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"8px 0", flex:1 }}>
            <button onClick={()=>go("home")} style={{ display:"flex", alignItems:"center", width:"100%", padding:"14px 20px", background:page==="home"?t.accentBg:"none", border:"none", borderLeft:page==="home"?`3px solid ${t.gold}`:"3px solid transparent", fontSize:"1rem", fontWeight:page==="home"?700:400, color:page==="home"?t.gold:t.text, cursor:"pointer", textAlign:"left" }}>Home</button>

            {/* Store section in mobile */}
            <div style={{ padding:"10px 20px 6px", fontSize:".72rem", color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em" }}>Store</div>
            {STORE_MENU.items.map(item => (
              <button key={item.page} onClick={()=>go(item.page)}
                style={{ display:"flex", alignItems:"center", gap:14, width:"100%", padding:"12px 20px", background:page===item.page?t.accentBg:"none", border:"none", borderLeft:page===item.page?`3px solid ${t.gold}`:"3px solid transparent", fontSize:".95rem", fontWeight:page===item.page?700:400, color:page===item.page?t.gold:t.text, cursor:"pointer", textAlign:"left" }}>
                <span style={{ fontSize:"1.2rem" }}>{item.icon}</span>
                <span>{item.title}</span>
                {item.badge && <span style={{ marginLeft:"auto", fontSize:".65rem", padding:"2px 7px", borderRadius:10, fontWeight:800, background:item.badge==="FREE"?"rgba(16,185,129,.2)":"rgba(239,68,68,.2)", color:item.badge==="FREE"?"#10B981":"#EF4444" }}>{item.badge}</span>}
              </button>
            ))}

            <div style={{ height:1, background:t.border, margin:"8px 0" }}/>

            {NAV_SIMPLE.map(([label,id]) => (
              <button key={id} onClick={()=>go(id)} style={{ display:"flex", alignItems:"center", width:"100%", padding:"14px 20px", background:page===id?t.accentBg:"none", border:"none", borderLeft:page===id?`3px solid ${t.gold}`:"3px solid transparent", fontSize:"1rem", fontWeight:page===id?700:400, color:page===id?t.gold:t.text, cursor:"pointer", textAlign:"left" }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding:"16px 20px", borderTop:`1px solid ${t.border}`, display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={()=>{ onPortalClick(); setOpen(false); }} style={{ padding:"13px", background:t.accentBg, border:`1px solid ${t.accent}30`, borderRadius:12, color:t.accent, fontWeight:700, fontSize:".95rem", cursor:"pointer" }}>🔐 Login / Register</button>
            <a href="https://wa.me/919241653369" target="_blank" onClick={()=>setOpen(false)} style={{ display:"block", textAlign:"center", background:"#25D366", color:"#fff", padding:"13px", borderRadius:12, fontWeight:700, fontSize:".95rem", textDecoration:"none" }}>📲 Chat on WhatsApp</a>
          </div>
        </div>
      )}
    </>
  );
}