// src/pages/NotFound.jsx — 404 Page
export default function NotFound({ setPage, t }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:t.bg, padding:20 }}>
      <div style={{ textAlign:"center", maxWidth:480 }}>
        {/* Animated 404 */}
        <div style={{ fontSize:"clamp(5rem,20vw,8rem)", fontWeight:900, lineHeight:1, background:"linear-gradient(135deg,#F59E0B,#F97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:8 }}>
          404
        </div>
        <div style={{ fontSize:"clamp(1.2rem,4vw,1.8rem)", fontWeight:800, color:t.text, marginBottom:12 }}>
          Page Not Found
        </div>
        <p style={{ color:t.muted, fontSize:".95rem", lineHeight:1.7, marginBottom:32 }}>
          Aap jis page ko dhundh rahe hain woh exist nahi karta ya hata diya gaya hai.
        </p>

        {/* Quick navigation */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:24 }}>
          {[
            { icon:"🏠", label:"Home",     page:"home" },
            { icon:"🎓", label:"Courses",  page:"courses" },
            { icon:"⚡", label:"Services", page:"services" },
            { icon:"📞", label:"Contact",  page:"contact" },
          ].map(({ icon, label, page }) => (
            <button key={page} onClick={() => setPage(page)} style={{
              padding:"12px", background:t.bgCard, border:`1px solid ${t.border}`,
              borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
            }}>
              <span style={{ fontSize:"1.4rem" }}>{icon}</span>
              <span style={{ fontSize:".84rem", fontWeight:600, color:t.text }}>{label}</span>
            </button>
          ))}
        </div>

        <button onClick={() => setPage("home")} style={{
          padding:"13px 32px", background:"linear-gradient(135deg,#F59E0B,#F97316)",
          color:"#070B14", border:"none", borderRadius:10, fontWeight:800,
          fontSize:"1rem", cursor:"pointer", fontFamily:"inherit",
        }}>
          ← Back to Home
        </button>

        <p style={{ marginTop:20, fontSize:".82rem", color:t.muted }}>
          Need help? <a href="https://wa.me/919241653369" style={{ color:t.gold, fontWeight:700 }}>WhatsApp us</a>
        </p>
      </div>
    </div>
  );
}