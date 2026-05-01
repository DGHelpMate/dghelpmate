// src/pages/Login.jsx — Fixed: Field/SubmitBtn moved outside component (no focus loss)
import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { Logo, Spinner } from "../components/ui/UI";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase/config";
import { waNewClientToAdmin, waRegistrationConfirmToClient } from "../utils/whatsapp";

// ── Shared input style (not inside component — stable reference) ──────────────
const INP_BASE = {
  width:"100%", padding:"12px 14px",
  borderRadius:10, fontSize:".95rem",
  fontFamily:"'Plus Jakarta Sans',sans-serif",
  outline:"none", boxSizing:"border-box",
};
const LBL_STYLE = {
  fontSize:".78rem", fontWeight:700,
  textTransform:"uppercase", letterSpacing:".05em",
  display:"block", marginBottom:5,
};

// ── Field — defined OUTSIDE Login so it never remounts on re-render ───────────
function Field({ label, type="text", value, onChange, placeholder, required=true, t }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ ...LBL_STYLE, color:t.muted }}>{label}</label>
      <input
        type={type} required={required} value={value}
        onChange={onChange} placeholder={placeholder}
        style={{ ...INP_BASE, background:t.bg, border:`1.5px solid ${t.border}`, color:t.text }}
        onFocus={e => e.target.style.borderColor = t.gold}
        onBlur={e  => e.target.style.borderColor = t.border}
      />
    </div>
  );
}

// ── SubmitBtn — also outside ──────────────────────────────────────────────────
function SubmitBtn({ label, loading, t }) {
  return (
    <button type="submit" disabled={loading} style={{
      width:"100%", padding:"14px",
      background: loading ? t.border : "linear-gradient(135deg,#F59E0B,#F97316)",
      color:"#070B14", fontWeight:800, fontSize:"1rem",
      border:"none", borderRadius:10,
      cursor: loading ? "not-allowed" : "pointer",
      fontFamily:"'Plus Jakarta Sans',sans-serif",
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      marginTop:4,
    }}>
      {loading ? <><Spinner size={18} color="#070B14"/> Please wait...</> : label}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Login({ t, onBack }) {
  const { login, signUp, resetPassword, loginWithGoogle } = useAuth();

  const [mode, setMode]       = useState("login");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleRoleModal, setShowGoogleRoleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [showPass, setShowPass] = useState(false);

  const [client, setClient] = useState({
    ownerName:"", coachingName:"", phone:"", city:"",
    email:"", password:"", confirm:"",
  });
  const [student, setStudent] = useState({
    name:"", phone:"", email:"", password:"", confirm:"", referralCode:"",
  });

  const errMsg = (code) => ({
    "auth/user-not-found":      "No account found with this email.",
    "auth/wrong-password":      "Incorrect password.",
    "auth/invalid-email":       "Invalid email address.",
    "auth/too-many-requests":   "Too many attempts. Please try again later.",
    "auth/email-already-in-use":"This email is already registered.",
    "auth/weak-password":       "Password must be at least 6 characters.",
    "auth/invalid-credential":  "Invalid email or password.",
  }[code] || "Something went wrong. Please try again.");

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, pass); }
    catch (err) { setError(errMsg(err.code)); }
    setLoading(false);
  };

  const handleClientSignup = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    if (client.password !== client.confirm) { setError("Passwords do not match!"); setLoading(false); return; }
    if (client.password.length < 6)         { setError("Password must be at least 6 characters."); setLoading(false); return; }
    try {
      await signUp({ email:client.email, password:client.password, name:client.ownerName,
        phone:client.phone, coachingName:client.coachingName, city:client.city,
        role:"pending", userType:"client" });
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      setMode("verify"); setSuccess("client");
    } catch (err) { setError(errMsg(err.code)); }
    setLoading(false);
  };

  const handleStudentSignup = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    if (student.password !== student.confirm) { setError("Passwords do not match!"); setLoading(false); return; }
    if (student.password.length < 6)          { setError("Password must be at least 6 characters."); setLoading(false); return; }
    try {
      await signUp({ email:student.email, password:student.password, name:student.name,
        phone:student.phone, coachingName:student.name, role:"student", userType:"student" });
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      setMode("verify"); setSuccess("student");
    } catch (err) { setError(errMsg(err.code)); }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await resetPassword(email); setSuccess("reset"); setMode("verify"); }
    catch (err) { setError(errMsg(err.code)); }
    setLoading(false);
  };

  const handleGoogleLogin = async (role = "student") => {
    setGoogleLoading(true); setError("");
    try {
      await loginWithGoogle(role);
    } catch(err) {
      if (err.code !== "auth/popup-closed-by-user")
        setError(err.code === "auth/account-exists-with-different-credential"
          ? "This email already has an account. Please sign in with email/password."
          : "Google sign-in failed. Please try again.");
    }
    setGoogleLoading(false);
  };

  // Tab button style
  const tabBtn = (active) => ({
    padding:"11px", borderRadius:10, border:"none",
    fontWeight:700, fontSize:".88rem",
    background: active ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard2,
    color: active ? "#070B14" : t.muted, cursor:"pointer",
  });

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:"20px 16px", background:t.bg,
    }}>
      {/* BG blobs */}
      <div style={{ position:"fixed", width:300, height:300, borderRadius:"50%", background:t.accent, filter:"blur(120px)", opacity:.07, top:-100, right:-100, pointerEvents:"none" }}/>
      <div style={{ position:"fixed", width:250, height:250, borderRadius:"50%", background:t.gold,   filter:"blur(120px)", opacity:.06, bottom:-80,  left:-80,   pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth: mode==="select"?"560px":mode==="client"?"480px":"420px", position:"relative", zIndex:2 }}>

        {/* Back button */}
        {onBack && (
          <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:`1px solid ${t.border}`, color:t.muted, padding:"7px 14px", borderRadius:9, cursor:"pointer", fontFamily:"inherit", fontSize:".84rem", marginBottom:16 }}>
            ← Back to Home
          </button>
        )}

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
            <Logo t={t} size={46}/>
          </div>
          <p style={{ fontSize:".85rem", color:t.muted }}>
            {mode==="login"   ? "Sign in to your account" :
             mode==="select"  ? "Who are you? Select below" :
             mode==="client"  ? "Coaching / Institute Registration" :
             mode==="student" ? "Teacher / Student Registration" :
             mode==="reset"   ? "Reset your password" :
             "Verify your account"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:t.bgCard, border:`1px solid ${t.border}`,
          borderRadius:20, padding:"clamp(20px,5vw,32px)",
          boxShadow:`0 20px 60px ${t.shadow}`,
        }}>

          {/* Error */}
          {error && (
            <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:10, padding:"10px 14px", fontSize:".88rem", color:"#EF4444", marginBottom:16 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── VERIFY ── */}
          {mode === "verify" && (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:"3rem", marginBottom:12 }}>
                {success==="reset" ? "📧" : "✅"}
              </div>
              {success === "reset" ? (
                <>
                  <h3 style={{ fontWeight:800, color:t.text, marginBottom:8 }}>Reset Link Sent!</h3>
                  <p style={{ color:t.muted, fontSize:".88rem", lineHeight:1.7, marginBottom:20 }}>
                    Check your email inbox — a password reset link has been sent.
                  </p>
                </>
              ) : success === "client" ? (
                <>
                  <h3 style={{ fontWeight:800, color:t.text, marginBottom:8 }}>Registration Successful! 🎉</h3>
                  <div style={{ background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)", borderRadius:12, padding:"14px 16px", marginBottom:16, textAlign:"left" }}>
                    <p style={{ color:t.text, fontSize:".88rem", lineHeight:1.8, margin:0 }}>
                      <strong>Step 1:</strong> 📧 Verify your email — check inbox and click the link<br/>
                      <strong>Step 2:</strong> ⏳ Admin will approve your account within 24 hours<br/>
                      <strong>Step 3:</strong> 🚀 Once approved, you will get full Client Portal access
                    </p>
                  </div>
                  <a href="https://wa.me/919241653369?text=Hi!%20I%20have%20registered%20on%20DG%20HelpMate%20%E2%80%94%20please%20approve%20my%20account"
                    target="_blank" rel="noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#25D366", color:"#fff", padding:"11px 22px", borderRadius:10, fontWeight:700, fontSize:".9rem", textDecoration:"none", marginBottom:12 }}>
                    💬 WhatsApp for Faster Approval
                  </a>
                </>
              ) : (
                <>
                  <h3 style={{ fontWeight:800, color:t.text, marginBottom:8 }}>Account Ready! 🎓</h3>
                  <div style={{ background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", borderRadius:12, padding:"14px 16px", marginBottom:16, textAlign:"left" }}>
                    <p style={{ color:t.text, fontSize:".88rem", lineHeight:1.8, margin:0 }}>
                      <strong>Step 1:</strong> 📧 Verify your email — check inbox and click the link<br/>
                      <strong>Step 2:</strong> ✅ Once verified, you can access your courses<br/>
                      <strong>Step 3:</strong> 🚀 Login and start learning!
                    </p>
                  </div>
                </>
              )}
              <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                style={{ background:"none", border:`1px solid ${t.border}`, color:t.muted, padding:"10px 24px", borderRadius:9, cursor:"pointer", fontFamily:"inherit", fontSize:".88rem" }}>
                ← Back to Login
              </button>
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:22 }}>
                <button onClick={() => { setMode("login"); setError(""); }} style={tabBtn(true)}>🔐 Sign In</button>
                <button onClick={() => { setMode("select"); setError(""); }} style={tabBtn(false)}>📝 Register</button>
              </div>
              <form onSubmit={handleLogin}>
                <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" t={t}/>
                <div style={{ marginBottom:8 }}>
                  <label style={{ ...LBL_STYLE, color:t.muted }}>Password</label>
                  <div style={{ position:"relative" }}>
                    <input
                      type={showPass ? "text" : "password"} required value={pass}
                      onChange={e => setPass(e.target.value)} placeholder="Enter your password"
                      style={{ ...INP_BASE, background:t.bg, border:`1.5px solid ${t.border}`, color:t.text, paddingRight:46 }}
                      onFocus={e => e.target.style.borderColor = t.gold}
                      onBlur={e  => e.target.style.borderColor = t.border}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", fontSize:"1.1rem", cursor:"pointer", color:t.muted }}>
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <div style={{ textAlign:"right", marginBottom:20 }}>
                  <button type="button" onClick={() => { setMode("reset"); setError(""); }} style={{ background:"none", border:"none", color:t.gold, fontSize:".84rem", fontWeight:600, cursor:"pointer" }}>
                    Forgot password?
                  </button>
                </div>
                <SubmitBtn label="Sign In →" loading={loading} t={t}/>
              </form>

              <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0" }}>
                <div style={{ flex:1, height:1, background:t.border }}/>
                <span style={{ fontSize:".75rem", color:t.muted }}>or</span>
                <div style={{ flex:1, height:1, background:t.border }}/>
              </div>
              <button onClick={()=>setShowGoogleRoleModal(true)} disabled={googleLoading}
                style={{ width:"100%", padding:"12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:10, fontWeight:700, fontSize:".9rem", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:10, color:t.text, transition:"all .2s" }}
                onMouseOver={e=>e.currentTarget.style.borderColor=t.accent}
                onMouseOut={e=>e.currentTarget.style.borderColor=t.border}>
                {googleLoading ? <><Spinner size={18} color={t.accent}/> Signing in...</> : <>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                  Continue with Google
                </>}
              </button>
            </>
          )}

          {/* ── SELECT REGISTER TYPE ── */}
          {mode === "select" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:22 }}>
                <button onClick={() => { setMode("login"); setError(""); }} style={tabBtn(false)}>🔐 Sign In</button>
                <button onClick={() => { setMode("select"); setError(""); }} style={tabBtn(true)}>📝 Register</button>
              </div>
              <p style={{ color:t.muted, fontSize:".88rem", marginBottom:18, textAlign:"center" }}>
                Select your account type 👇
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <button onClick={() => { setMode("client"); setError(""); }} style={{ background:t.bg, border:`2px solid ${t.border}`, borderRadius:14, padding:"20px 14px", cursor:"pointer", textAlign:"center", transition:"all .2s", fontFamily:"inherit" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor=t.gold; e.currentTarget.style.background=t.gold+"12"; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.bg; }}>
                  <div style={{ fontSize:"2.2rem", marginBottom:8 }}>🏫</div>
                  <div style={{ fontWeight:800, color:t.text, fontSize:".95rem", marginBottom:6 }}>Coaching / Client</div>
                  <div style={{ fontSize:".78rem", color:t.muted, lineHeight:1.5 }}>I need MCQ, PPT, YouTube or digital services from DG HelpMate</div>
                  <div style={{ marginTop:12, background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", padding:"7px 0", borderRadius:8, fontWeight:700, fontSize:".8rem" }}>Register as Client →</div>
                </button>
                <button onClick={() => { setMode("student"); setError(""); }} style={{ background:t.bg, border:`2px solid ${t.border}`, borderRadius:14, padding:"20px 14px", cursor:"pointer", textAlign:"center", transition:"all .2s", fontFamily:"inherit" }}
                  onMouseOver={e => { e.currentTarget.style.borderColor=t.accent; e.currentTarget.style.background=t.accent+"12"; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor=t.border; e.currentTarget.style.background=t.bg; }}>
                  <div style={{ fontSize:"2.2rem", marginBottom:8 }}>🎓</div>
                  <div style={{ fontWeight:800, color:t.text, fontSize:".95rem", marginBottom:6 }}>Teacher / Student</div>
                  <div style={{ fontSize:".78rem", color:t.muted, lineHeight:1.5 }}>I want to purchase online courses from DG HelpMate</div>
                  <div style={{ marginTop:12, background:`linear-gradient(135deg,${t.accent},#4F46E5)`, color:"#fff", padding:"7px 0", borderRadius:8, fontWeight:700, fontSize:".8rem" }}>Register as Student →</div>
                </button>
              </div>
              <p style={{ textAlign:"center", marginTop:16, fontSize:".8rem", color:t.muted }}>
                Already registered? <button onClick={() => setMode("login")} style={{ background:"none", border:"none", color:t.gold, fontWeight:700, cursor:"pointer", fontSize:".8rem" }}>Sign In</button>
              </p>
            </>
          )}

          {/* ── CLIENT REGISTRATION ── */}
          {mode === "client" && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <button onClick={() => { setMode("select"); setError(""); }} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.2rem" }}>←</button>
                <div>
                  <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>🏫 Client Registration</div>
                  <div style={{ fontSize:".76rem", color:t.muted }}>Register to get services from DG HelpMate</div>
                </div>
              </div>
              <form onSubmit={handleClientSignup}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="Your Name *" value={client.ownerName} onChange={e=>setClient({...client,ownerName:e.target.value})} placeholder="Full name" t={t}/>
                  <Field label="WhatsApp No. *" value={client.phone} onChange={e=>setClient({...client,phone:e.target.value})} placeholder="+91 XXXXXXXXXX" t={t}/>
                </div>
                <Field label="Coaching / Institute Name *" value={client.coachingName} onChange={e=>setClient({...client,coachingName:e.target.value})} placeholder="e.g. SVM Classes" t={t}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="City *" value={client.city} onChange={e=>setClient({...client,city:e.target.value})} placeholder="e.g. Patna" t={t}/>
                  <Field label="Email *" type="email" value={client.email} onChange={e=>setClient({...client,email:e.target.value})} placeholder="your@email.com" t={t}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="Password *" type="password" value={client.password} onChange={e=>setClient({...client,password:e.target.value})} placeholder="Min 6 chars" t={t}/>
                  <Field label="Confirm Password *" type="password" value={client.confirm} onChange={e=>setClient({...client,confirm:e.target.value})} placeholder="Repeat password" t={t}/>
                </div>
                <div style={{ background:`${t.gold}10`, border:`1px solid ${t.gold}25`, borderRadius:9, padding:"10px 14px", fontSize:".8rem", color:t.muted, marginBottom:14, lineHeight:1.6 }}>
                  ℹ️ After registration, verify your email. Admin will approve your account within 24 hours.
                </div>
                <SubmitBtn label="🏫 Register as Client →" loading={loading} t={t}/>
              </form>
            </>
          )}

          {/* ── STUDENT REGISTRATION ── */}
          {mode === "student" && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <button onClick={() => { setMode("select"); setError(""); }} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.2rem" }}>←</button>
                <div>
                  <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>🎓 Student Registration</div>
                  <div style={{ fontSize:".76rem", color:t.muted }}>Register to enroll in courses</div>
                </div>
              </div>
              <form onSubmit={handleStudentSignup}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="Your Name *" value={student.name} onChange={e=>setStudent({...student,name:e.target.value})} placeholder="Full name" t={t}/>
                  <Field label="WhatsApp No. *" value={student.phone} onChange={e=>setStudent({...student,phone:e.target.value})} placeholder="+91 XXXXXXXXXX" t={t}/>
                </div>
                <Field label="Email *" type="email" value={student.email} onChange={e=>setStudent({...student,email:e.target.value})} placeholder="your@email.com" t={t}/>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field label="Password *" type="password" value={student.password} onChange={e=>setStudent({...student,password:e.target.value})} placeholder="Min 6 chars" t={t}/>
                  <Field label="Confirm Password *" type="password" value={student.confirm} onChange={e=>setStudent({...student,confirm:e.target.value})} placeholder="Repeat password" t={t}/>
                </div>
                <Field label="Referral Code (optional)" value={student.referralCode||""} onChange={e=>setStudent({...student,referralCode:e.target.value})} placeholder="Enter referral code (optional)" required={false} t={t}/>
                <div style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:9, padding:"10px 14px", fontSize:".8rem", color:t.muted, marginBottom:14, lineHeight:1.6 }}>
                  ✅ Student account is instantly activated — just verify your email and start learning!
                </div>
                <SubmitBtn label="🎓 Register as Student →" loading={loading} t={t}/>
              </form>
            </>
          )}

          {/* ── RESET ── */}
          {mode === "reset" && (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <button onClick={() => { setMode("login"); setError(""); }} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.2rem" }}>←</button>
                <div style={{ fontWeight:700, color:t.text }}>Password Reset</div>
              </div>
              <p style={{ color:t.muted, fontSize:".88rem", marginBottom:16, lineHeight:1.6 }}>
                Enter your email — we will send a password reset link.
              </p>
              <form onSubmit={handleReset}>
                <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" t={t}/>
                <SubmitBtn label="Send Reset Link →" loading={loading} t={t}/>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:16, fontSize:".82rem", color:t.muted }}>
          Need help? <a href="https://wa.me/919241653369" style={{ color:t.gold, fontWeight:700 }}>WhatsApp us</a>
        </p>
      </div>

      {/* ── Google Role Selection Modal ── */}
      {showGoogleRoleModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(6px)" }}
          onClick={()=>setShowGoogleRoleModal(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:"28px 24px", maxWidth:400, width:"100%" }}>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>👋</div>
              <h3 style={{ fontWeight:900, color:t.text, margin:"0 0 6px", fontSize:"1.1rem" }}>Welcome to DG HelpMate!</h3>
              <p style={{ color:t.muted, fontSize:".87rem", margin:0 }}>What do you want to do?</p>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
              <button onClick={()=>{ setShowGoogleRoleModal(false); handleGoogleLogin("student"); }}
                style={{ padding:"16px", background:`linear-gradient(135deg,${t.accent}20,${t.accent}08)`, border:`1.5px solid ${t.accent}40`, borderRadius:14, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                <div style={{ fontWeight:800, color:t.text, marginBottom:4, fontSize:".97rem" }}>🎓 Learn — Student</div>
                <div style={{ fontSize:".8rem", color:t.muted, lineHeight:1.5 }}>Enroll in courses, watch videos, get certificates</div>
              </button>

              <button onClick={()=>{ setShowGoogleRoleModal(false); handleGoogleLogin("pending"); }}
                style={{ padding:"16px", background:`linear-gradient(135deg,${t.gold}15,${t.gold}05)`, border:`1.5px solid ${t.gold}35`, borderRadius:14, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                <div style={{ fontWeight:800, color:t.text, marginBottom:4, fontSize:".97rem" }}>🏫 Order Work — Client</div>
                <div style={{ fontSize:".8rem", color:t.muted, lineHeight:1.5 }}>Order MCQs, PPT, thumbnails, typing & more services</div>
              </button>
            </div>

            <button onClick={()=>setShowGoogleRoleModal(false)}
              style={{ width:"100%", padding:"10px", background:"none", border:`1px solid ${t.border}`, borderRadius:10, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".85rem" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}