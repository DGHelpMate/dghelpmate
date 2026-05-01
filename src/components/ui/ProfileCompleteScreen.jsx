// src/components/ui/ProfileCompleteScreen.jsx
// Google login ke baad phone + name complete karne ka screen
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { Spinner } from "./UI";

export default function ProfileCompleteScreen({ t, user, profile }) {
  const [phone, setPhone] = useState(profile?.phone || "");
  const [name,  setName]  = useState(profile?.ownerName || profile?.coachingName || user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSave = async () => {
    if (!phone.trim() || phone.replace(/\D/g,"").length < 10) {
      setError("Please enter a valid 10-digit phone number."); return;
    }
    if (!name.trim()) { setError("Please enter your name."); return; }
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        phone:            phone.trim(),
        ownerName:        name.trim(),
        coachingName:     name.trim(),
        profileCompleted: true,   // Flag — sirf pehli baar dikhega
      });
      // Page reload — App.jsx will re-read profile and route correctly
      window.location.reload();
    } catch(e) {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const inp = {
    width:"100%", padding:"12px 14px", background:t.bgCard,
    border:`1px solid ${t.border}`, borderRadius:10, fontSize:".95rem",
    color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:"32px 28px", maxWidth:420, width:"100%", textAlign:"center" }}>

        {/* Avatar from Google */}
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" style={{ width:72, height:72, borderRadius:"50%", border:`3px solid ${t.gold}`, marginBottom:16, objectFit:"cover" }}/>
        ) : (
          <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${t.accent},${t.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem", fontWeight:900, color:"#fff", margin:"0 auto 16px" }}>
            {(name||"U")[0].toUpperCase()}
          </div>
        )}

        <h2 style={{ fontWeight:900, color:t.text, margin:"0 0 6px", fontSize:"1.2rem" }}>
          Welcome, {name.split(" ")[0] || "there"}! 👋
        </h2>
        <p style={{ color:t.muted, fontSize:".87rem", marginBottom:24, lineHeight:1.6 }}>
          One last step — complete your profile to get started.
        </p>

        <div style={{ textAlign:"left", marginBottom:14 }}>
          <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Your Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" style={inp}/>
        </div>

        <div style={{ textAlign:"left", marginBottom:14 }}>
          <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>WhatsApp Number</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number" type="tel" maxLength={10} style={inp}/>
          <div style={{ fontSize:".75rem", color:t.muted, marginTop:4 }}>We'll send course updates on WhatsApp</div>
        </div>

        {error && <div style={{ color:"#EF4444", fontSize:".82rem", marginBottom:12, textAlign:"left" }}>{error}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:12, fontWeight:900, fontSize:"1rem", cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:saving?.7:1 }}>
          {saving ? <><Spinner size={18} color="#070B14"/> Saving...</> : "Complete Profile →"}
        </button>

        <div style={{ marginTop:14, fontSize:".78rem", color:t.muted }}>
          You can update these details anytime from your Profile tab.
        </div>
      </div>
    </div>
  );
}