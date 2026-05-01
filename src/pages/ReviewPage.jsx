// src/pages/ReviewPage.jsx
// Public review submission page
// URL: /#review?clientId=XXX&orderId=XXX&name=SVM+Classes
import { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { Logo } from "../components/ui/UI";

export default function ReviewPage({ t }) {
  // Parse URL params
  const params  = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const clientId = params.get("clientId") || "";
  const orderId  = params.get("orderId")  || "";
  const nameParam= params.get("name")     || "";

  const [step, setStep]     = useState("form"); // form | success
  const [stars, setStars]   = useState(5);
  const [hover, setHover]   = useState(0);
  const [form, setForm]     = useState({
    name: decodeURIComponent(nameParam),
    org: "", quote: "", photo: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.quote.trim() || form.quote.trim().length < 20) {
      setError("Please write at least 20 characters in your review."); return;
    }
    setLoading(true); setError("");
    try {
      await addDoc(collection(db, "testimonials"), {
        name:      form.name || "Client",
        org:       form.org  || "",
        quote:     form.quote.trim(),
        stars,
        clientId:  clientId || "",
        orderId:   orderId  || "",
        source:    "auto",       // auto-collected
        approved:  false,        // admin approval pending
        createdAt: serverTimestamp(),
      });
      setStep("success");
    } catch(e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const inp = { width:"100%", padding:"12px 14px", background:t.bg, border:`1.5px solid ${t.border}`, borderRadius:10, fontSize:".95rem", color:t.text, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none", boxSizing:"border-box" };

  if (step === "success") return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:t.bg, padding:20 }}>
      <div style={{ textAlign:"center", maxWidth:440 }}>
        <div style={{ fontSize:"4rem", marginBottom:16 }}>🎉</div>
        <h2 style={{ fontWeight:800, color:t.text, marginBottom:10 }}>Thank You!</h2>
        <p style={{ color:t.muted, fontSize:".95rem", lineHeight:1.7, marginBottom:24 }}>
          Your review has been submitted successfully. It will appear on our website after approval.
        </p>
        <div style={{ background:`${t.gold}10`, border:`1px solid ${t.gold}30`, borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
          <div style={{ color:t.gold, fontSize:"1.4rem", marginBottom:4 }}>{"★".repeat(stars)}</div>
          <p style={{ color:t.text, fontSize:".9rem", fontStyle:"italic", lineHeight:1.6 }}>"{form.quote}"</p>
          <div style={{ color:t.muted, fontSize:".82rem", marginTop:8 }}>— {form.name}{form.org ? `, ${form.org}` : ""}</div>
        </div>
        <a href="https://wa.me/919241653369?text=Hi!%20I%20just%20submitted%20my%20review%20on%20DG%20HelpMate!" target="_blank"
          style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#25D366", color:"#fff", padding:"11px 24px", borderRadius:10, fontWeight:700, fontSize:".9rem", textDecoration:"none" }}>
          💬 Share on WhatsApp too
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:t.bg, padding:"20px 16px" }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
            <Logo t={t} size={44}/>
          </div>
          <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.3rem", marginBottom:6 }}>Share Your Experience</h2>
          <p style={{ color:t.muted, fontSize:".88rem" }}>Your feedback helps other coaching institutes trust us!</p>
        </div>

        {/* Card */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:"clamp(20px,5vw,32px)", boxShadow:`0 20px 60px ${t.shadow}` }}>

          {error && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"10px 14px", fontSize:".88rem", color:"#EF4444", marginBottom:16 }}>⚠️ {error}</div>}

          <form onSubmit={submit}>
            {/* Star rating */}
            <div style={{ marginBottom:20, textAlign:"center" }}>
              <div style={{ fontSize:".78rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>Your Rating *</div>
              <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} type="button"
                    onClick={()=>setStars(s)}
                    onMouseEnter={()=>setHover(s)}
                    onMouseLeave={()=>setHover(0)}
                    style={{ background:"none", border:"none", fontSize:"2.2rem", cursor:"pointer", transition:"transform .1s", transform:(hover||stars)>=s?"scale(1.2)":"scale(1)" }}>
                    <span style={{ color:(hover||stars)>=s?"#F59E0B":"#374151" }}>★</span>
                  </button>
                ))}
              </div>
              <div style={{ fontSize:".82rem", color:t.gold, fontWeight:700, marginTop:6 }}>
                {["","Poor","Fair","Good","Very Good","Excellent!"][hover||stars]}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:".78rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Your Name / Coaching Name *</label>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. SVM Classes" style={inp}
                onFocus={e=>e.target.style.borderColor=t.gold} onBlur={e=>e.target.style.borderColor=t.border}/>
            </div>

            {/* Org */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:".78rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Location / City (optional)</label>
              <input value={form.org} onChange={e=>setForm({...form,org:e.target.value})} placeholder="e.g. Patna, Bihar" style={inp}
                onFocus={e=>e.target.style.borderColor=t.gold} onBlur={e=>e.target.style.borderColor=t.border}/>
            </div>

            {/* Review */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:".78rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Your Review *</label>
              <textarea required rows={4} value={form.quote} onChange={e=>setForm({...form,quote:e.target.value})}
                placeholder="Tell others about your experience with DG HelpMate — quality of work, delivery time, support..."
                style={{ ...inp, resize:"vertical", lineHeight:1.6 }}
                onFocus={e=>e.target.style.borderColor=t.gold} onBlur={e=>e.target.style.borderColor=t.border}/>
              <div style={{ fontSize:".74rem", color:form.quote.length<20?t.red:t.green, marginTop:4 }}>
                {form.quote.length < 20 ? `${20-form.quote.length} more characters needed` : "✓ Great length!"}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width:"100%", padding:"14px", background:loading?t.border:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:800, fontSize:"1rem", cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {loading ? "Submitting..." : "⭐ Submit Review"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:14, fontSize:".78rem", color:t.muted }}>
            Your review will appear on our website after approval.
          </p>
        </div>
      </div>
    </div>
  );
}