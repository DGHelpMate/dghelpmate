// src/components/ui/PostPaymentModal.jsx
// Payment ke baad Client account create karo ya existing mein order add karo
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, addDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { sendEmailVerification } from "firebase/auth";
import { Spinner } from "./UI";
import { waServicePurchaseToAdmin, waServiceConfirmToCustomer } from "../../utils/whatsapp";
import Invoice from "./Invoice";

// Helper to show invoice
function PostPaymentInvoice({ paymentId, amount, itemName, itemType, customerName, customerEmail, onClose }) {
  return (
    <Invoice
      data={{
        invoiceNo: "DGH-" + (itemType==="bundle"?"B":"S") + "-" + Date.now().toString().slice(-6),
        type: itemType,
        customerName, customerEmail,
        itemName,
        items: [{ desc: itemName, qty: 1, rate: amount, amount }],
        subtotal: amount, total: amount,
        paymentMethod: "Razorpay",
        paymentId,
        status: "Paid",
      }}
      onClose={onClose}
    />
  );
}

export default function PostPaymentModal({ paymentId, amount, itemName, itemType="service", onClose, t }) {
  const [step, setStep]       = useState("choice"); // choice | register | login | done
  const [showInvoice, setShowInvoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState({
    ownerName:"", coachingName:"", phone:"", city:"",
    email:"", password:""
  });

  const inp = (extra={}) => ({
    width:"100%", padding:"10px 12px",
    background:t.bg, border:`1.5px solid ${t.border}`,
    borderRadius:9, fontSize:".9rem", color:t.text,
    fontFamily:"inherit", outline:"none",
    boxSizing:"border-box", ...extra,
  });
  const lbl = { fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 };

  // Order Firestore mein save karo
  const saveOrder = async (userId, userName, userEmail) => {
    await addDoc(collection(db, "orders"), {
      clientId:    userId,
      clientName:  userName,
      email:       userEmail,
      item:        itemName,
      itemType,
      amount,
      razorpayPaymentId: paymentId,
      status:      "pending",
      note:        "",
      createdAt:   serverTimestamp(),
    });
  };

  // NEW account banao + order save karo
  const handleRegister = async () => {
    if (!form.ownerName || !form.email || !form.password || !form.phone) {
      setError("Sabhi * fields fill karo"); return;
    }
    if (form.password.length < 6) {
      setError("Password kam se kam 6 characters"); return;
    }
    setLoading(true); setError("");
    try {
      // Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      // Firestore profile
      await setDoc(doc(db, "users", cred.user.uid), {
        uid:          cred.user.uid,
        role:         "pending",
        userType:     "client",
        email:        form.email,
        ownerName:    form.ownerName,
        coachingName: form.coachingName || form.ownerName,
        phone:        form.phone,
        city:         form.city,
        logoUrl:      "",
        photoUrl:     "",
        totalBilled:  amount,
        totalPaid:    amount,
        approved:     false,
        createdAt:    serverTimestamp(),
      });
      // Order save karo
      await saveOrder(cred.user.uid, form.coachingName||form.ownerName, form.email);
      // Email verification
      await sendEmailVerification(cred.user);
      setStep("done");
    } catch(e) {
      setError(
        e.code === "auth/email-already-in-use"
          ? "Yeh email already registered hai — neeche 'Already have account?' pe click karo"
          : "Error: " + e.message
      );
    }
    setLoading(false);
  };

  // EXISTING account mein order add karo
  const handleLoginAndSave = async () => {
    if (!form.email || !form.password) { setError("Email aur password daalo"); return; }
    setLoading(true); setError("");
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
      // User profile fetch karo
      const uSnap = await getDocs(query(collection(db,"users"), where("uid","==",cred.user.uid)));
      const userName = uSnap.empty ? form.email : (uSnap.docs[0].data().coachingName || uSnap.docs[0].data().ownerName);
      // Order save karo
      await saveOrder(cred.user.uid, userName, form.email);
      setStep("done");
    } catch(e) {
      setError(
        e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
          ? "Password galat hai"
          : "Error: " + e.message
      );
    }
    setLoading(false);
  };

  if (showInvoice) return (
    <PostPaymentInvoice
      paymentId={paymentId} amount={amount} itemName={itemName} itemType={itemType}
      customerName="" customerEmail=""
      onClose={()=>setShowInvoice(false)}
    />
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if(e.target===e.currentTarget && step==="done") onClose(); }}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:"clamp(20px,5%,32px)", maxWidth:440, width:"100%", maxHeight:"90vh", overflowY:"auto" }}
        onClick={e=>e.stopPropagation()}>

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:12 }}>🎉</div>
            <h3 style={{ fontWeight:800, color:t.text, marginBottom:8 }}>Payment & Account Ready!</h3>
            <div style={{ background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.2)", borderRadius:12, padding:"14px 16px", marginBottom:16, textAlign:"left" }}>
              <p style={{ color:t.text, fontSize:".88rem", lineHeight:1.8, margin:0 }}>
                ✅ Payment recorded: ₹{amount?.toLocaleString()}<br/>
                📋 Order dashboard mein save hua<br/>
                📧 Email verify karo (inbox check karo)<br/>
                ⏳ Admin 24 hours mein approve karega<br/>
                💬 Faster approval ke liye WhatsApp karo
              </p>
            </div>
            <a href={`https://wa.me/919241653369?text=Hi!%20Maine%20*${encodeURIComponent(itemName)}*%20ke%20liye%20payment%20kiya.%0APayment%20ID:%20${paymentId}%0AAmount:%20%E2%82%B9${amount}%0A%0APlease%20kaam%20start%20karein.`}
              target="_blank" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#25D366", color:"#fff", padding:"12px 20px", borderRadius:10, fontWeight:700, fontSize:".9rem", textDecoration:"none", marginBottom:10 }}>
              💬 WhatsApp karo — Order Confirm
            </a>
            <button onClick={onClose} style={{ background:"none", border:`1px solid ${t.border}`, color:t.muted, padding:"9px 20px", borderRadius:9, cursor:"pointer", fontFamily:"inherit", fontSize:".86rem", width:"100%" }}>
              Close
            </button>
          </div>
        )}

        {/* ── CHOICE ── */}
        {step === "choice" && (
          <>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:"1.8rem", marginBottom:8 }}>✅</div>
              <h3 style={{ fontWeight:800, color:t.text, marginBottom:4 }}>Payment Successful!</h3>
              <p style={{ color:t.muted, fontSize:".85rem" }}>₹{amount?.toLocaleString()} — {itemName}</p>
            </div>
            <div style={{ background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)", borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
              <p style={{ color:t.text, fontSize:".85rem", lineHeight:1.7, margin:0 }}>
                📋 <strong>Order track karne ke liye</strong> account banao ya login karo — sab kuch aapke Client Dashboard mein dikhega!
              </p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={()=>{ setStep("register"); setError(""); }} style={{ padding:"13px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:700, fontSize:".95rem", cursor:"pointer", fontFamily:"inherit" }}>
                🏫 Naya Account Banao (Recommended)
              </button>
              <button onClick={()=>{ setStep("login"); setError(""); }} style={{ padding:"13px", background:t.bgCard2, border:`1px solid ${t.border}`, color:t.text, borderRadius:10, fontWeight:700, fontSize:".9rem", cursor:"pointer", fontFamily:"inherit" }}>
                🔐 Already Account Hai — Login Karo
              </button>
              <button onClick={()=>{
                const msg = `Hi!%20Maine%20*${encodeURIComponent(itemName)}*%20ke%20liye%20payment%20kiya.%0APayment%20ID:%20${paymentId}%0AAmount:%20%E2%82%B9${amount}`;
                window.open(`https://wa.me/919241653369?text=${msg}`, "_blank");
                onClose();
              }} style={{ padding:"11px", background:"#25D36618", border:"1px solid #25D36640", color:"#25D366", borderRadius:10, fontWeight:600, fontSize:".88rem", cursor:"pointer", fontFamily:"inherit" }}>
                💬 Sirf WhatsApp se Confirm karo
              </button>
            </div>
          </>
        )}

        {/* ── REGISTER ── */}
        {step === "register" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <button onClick={()=>{ setStep("choice"); setError(""); }} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.2rem" }}>←</button>
              <div>
                <div style={{ fontWeight:800, color:t.text }}>Naya Account Banao</div>
                <div style={{ fontSize:".76rem", color:t.muted }}>Order save hoga + future tracking</div>
              </div>
            </div>
            {error && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"9px 12px", fontSize:".84rem", color:"#EF4444", marginBottom:12 }}>{error}</div>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ marginBottom:10 }}>
                <label style={lbl}>Aapka Naam *</label>
                <input value={form.ownerName} onChange={e=>setForm({...form,ownerName:e.target.value})} placeholder="Full name" style={inp()}/>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={lbl}>WhatsApp *</label>
                <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXXXXXXX" style={inp()}/>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Coaching / Business Name</label>
              <input value={form.coachingName} onChange={e=>setForm({...form,coachingName:e.target.value})} placeholder="e.g. SVM Classes (optional)" style={inp()}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ marginBottom:10 }}>
                <label style={lbl}>City</label>
                <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="e.g. Patna" style={inp()}/>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={lbl}>Email *</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com" style={inp()}/>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Password * (min 6 chars)</label>
              <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Set a password" style={inp()}/>
            </div>
            <button onClick={handleRegister} disabled={loading} style={{ width:"100%", padding:"13px", background: loading ? t.border : "linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:700, fontSize:".95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading ? <><Spinner size={18} color="#070B14"/> Creating...</> : "🏫 Create Account & Save Order"}
            </button>
            <p style={{ textAlign:"center", marginTop:12, fontSize:".8rem", color:t.muted }}>
              Already account hai? <button onClick={()=>{ setStep("login"); setError(""); }} style={{ background:"none", border:"none", color:t.gold, fontWeight:700, cursor:"pointer", fontSize:".8rem" }}>Login karo</button>
            </p>
          </>
        )}

        {/* ── LOGIN ── */}
        {step === "login" && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <button onClick={()=>{ setStep("choice"); setError(""); }} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.2rem" }}>←</button>
              <div>
                <div style={{ fontWeight:800, color:t.text }}>Existing Account Login</div>
                <div style={{ fontSize:".76rem", color:t.muted }}>Order aapke dashboard mein add hoga</div>
              </div>
            </div>
            {error && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:9, padding:"9px 12px", fontSize:".84rem", color:"#EF4444", marginBottom:12 }}>{error}</div>}
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="your@email.com" style={inp()}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Password</label>
              <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Your password" style={inp()}/>
            </div>
            <button onClick={handleLoginAndSave} disabled={loading} style={{ width:"100%", padding:"13px", background: loading ? t.border : "linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:700, fontSize:".95rem", cursor: loading ? "not-allowed" : "pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading ? <><Spinner size={18} color="#070B14"/> Logging in...</> : "🔐 Login & Save Order"}
            </button>
            <p style={{ textAlign:"center", marginTop:12, fontSize:".8rem", color:t.muted }}>
              Account nahi hai? <button onClick={()=>{ setStep("register"); setError(""); }} style={{ background:"none", border:"none", color:t.gold, fontWeight:700, cursor:"pointer", fontSize:".8rem" }}>Banao</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}