// src/pages/admin/CouponManager.jsx
import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, where,
} from "firebase/firestore";
import { db } from "../../firebase/config";

export default function CouponManager({ t }) {
  const [coupons, setCoupons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");
  const [tab, setTab]           = useState("all"); // all | referral | manual
  const [form, setForm]         = useState({
    code: "", discount: "", description: "", maxUses: "", active: true
  });

  // ── Referral stats ──────────────────────────────────────────────────────────
  const [referralStats, setReferralStats] = useState({
    total: 0, active: 0, used: 0
  });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "coupons"), orderBy("createdAt", "desc")));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCoupons(all);
      // Stats calculate karo
      const referralOnes = all.filter(c => c.type === "referral" || c.type === "welcome");
      setReferralStats({
        total:  referralOnes.length,
        active: referralOnes.filter(c => c.active && c.usedCount < (c.maxUses||999)).length,
        used:   referralOnes.filter(c => c.usedCount >= (c.maxUses||999)).length,
      });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const saveCoupon = async () => {
    if (!form.code.trim() || !form.discount) {
      setMsg("❌ Code aur discount zaroori hain!"); return;
    }
    if (Number(form.discount) < 1 || Number(form.discount) > 100) {
      setMsg("❌ Discount 1-100% ke beech hona chahiye!"); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "coupons"), {
        code:        form.code.trim().toUpperCase(),
        discount:    Number(form.discount),
        description: form.description.trim(),
        maxUses:     form.maxUses ? Number(form.maxUses) : null,
        usedCount:   0,
        active:      form.active,
        type:        "manual",
        createdAt:   serverTimestamp(),
      });
      setMsg("✅ Coupon create ho gaya!");
      setForm({ code:"", discount:"", description:"", maxUses:"", active:true });
      fetchCoupons();
    } catch(e) { setMsg("❌ Error: " + e.message); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const toggleActive = async (id, current) => {
    await updateDoc(doc(db, "coupons", id), { active: !current });
    setCoupons(prev => prev.map(c => c.id === id ? {...c, active:!current} : c));
  };

  const deleteCoupon = async (id, code) => {
    if (!window.confirm(`"${code}" delete karo?`)) return;
    await deleteDoc(doc(db, "coupons", id));
    setCoupons(prev => prev.filter(c => c.id !== id));
    setMsg("✅ Deleted!");
    setTimeout(() => setMsg(""), 2000);
  };

  const inp = (extra={}) => ({
    width:"100%", padding:"10px 12px",
    background:t.bg, border:`1.5px solid ${t.border}`,
    borderRadius:9, fontSize:".9rem", color:t.text,
    fontFamily:"inherit", outline:"none",
    boxSizing:"border-box", ...extra,
  });

  // Filter coupons by tab
  const filtered = coupons.filter(c => {
    if (tab === "referral") return c.type === "referral" || c.type === "welcome";
    if (tab === "manual")   return c.type === "manual" || !c.type;
    return true;
  });

  const typeColor = (type) => {
    if (type === "referral") return t.gold;
    if (type === "welcome")  return t.green;
    return t.accent;
  };
  const typeLabel = (type) => {
    if (type === "referral") return "🎁 Referral Bonus";
    if (type === "welcome")  return "🌟 Welcome";
    return "🏷️ Manual";
  };

  return (
    <div style={{ padding:"24px", maxWidth:900, margin:"0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, marginBottom:4 }}>🏷️ Coupon Manager</h2>
        <p style={{ color:t.muted, fontSize:".88rem" }}>Manual coupons banao ya referral bonuses track karo</p>
      </div>

      {/* ── Referral Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[
          ["🎁 Total Referral Coupons", referralStats.total, t.gold],
          ["✅ Active", referralStats.active, t.green],
          ["💫 Used", referralStats.used, t.accent],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"16px", textAlign:"center" }}>
            <div style={{ fontSize:"1.6rem", fontWeight:900, color }}>{val}</div>
            <div style={{ fontSize:".78rem", color:t.muted, marginTop:3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Create New Coupon ── */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:24 }}>
        <h3 style={{ fontWeight:700, color:t.text, marginBottom:16, fontSize:"1rem" }}>➕ Naya Coupon Banao</h3>
        {msg && (
          <div style={{ padding:"10px 14px", borderRadius:9, marginBottom:14, fontSize:".86rem",
            background: msg.startsWith("✅") ? "rgba(16,185,129,.1)" : "rgba(239,68,68,.1)",
            color: msg.startsWith("✅") ? t.green : "#EF4444",
            border: `1px solid ${msg.startsWith("✅") ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)"}`,
          }}>{msg}</div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", display:"block", marginBottom:5 }}>Code *</label>
            <input value={form.code} onChange={e=>setForm({...form, code:e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" style={inp()}/>
          </div>
          <div>
            <label style={{ fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", display:"block", marginBottom:5 }}>Discount % *</label>
            <input type="number" min="1" max="100" value={form.discount} onChange={e=>setForm({...form, discount:e.target.value})} placeholder="e.g. 20" style={inp()}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", display:"block", marginBottom:5 }}>Description</label>
            <input value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="e.g. Festive offer" style={inp()}/>
          </div>
          <div>
            <label style={{ fontSize:".76rem", fontWeight:700, color:t.muted, textTransform:"uppercase", display:"block", marginBottom:5 }}>Max Uses (blank = unlimited)</label>
            <input type="number" min="1" value={form.maxUses} onChange={e=>setForm({...form, maxUses:e.target.value})} placeholder="e.g. 100" style={inp()}/>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <input type="checkbox" id="active" checked={form.active} onChange={e=>setForm({...form, active:e.target.checked})} style={{ width:16, height:16 }}/>
          <label htmlFor="active" style={{ fontSize:".88rem", color:t.text, cursor:"pointer" }}>Active (turant use ho sakta hai)</label>
        </div>
        <button onClick={saveCoupon} disabled={saving} style={{ padding:"11px 24px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:9, fontWeight:700, fontSize:".9rem", cursor: saving ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
          {saving ? "Saving..." : "➕ Create Coupon"}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["all","All"],["referral","🎁 Referral"],["manual","🏷️ Manual"]].map(([v,l]) => (
          <button key={v} onClick={()=>setTab(v)} style={{ padding:"7px 16px", borderRadius:20, border:`1px solid ${tab===v ? t.gold : t.border}`, background: tab===v ? `${t.gold}18` : "none", color: tab===v ? t.gold : t.muted, fontWeight: tab===v ? 700 : 400, cursor:"pointer", fontFamily:"inherit", fontSize:".85rem" }}>{l}</button>
        ))}
      </div>

      {/* ── Coupons List ── */}
      {loading ? (
        <div style={{ textAlign:"center", color:t.muted, padding:40 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", color:t.muted, padding:40 }}>Koi coupon nahi mila</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background:t.bgCard, border:`1px solid ${c.active ? t.border : t.border+"88"}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14, opacity: c.active ? 1 : 0.6 }}>
              {/* Code */}
              <div style={{ minWidth:130 }}>
                <div style={{ fontWeight:900, fontSize:"1rem", color:t.gold, letterSpacing:".1em" }}>{c.code}</div>
                <div style={{ fontSize:".72rem", color:typeColor(c.type), fontWeight:700, marginTop:2 }}>{typeLabel(c.type)}</div>
              </div>
              {/* Discount */}
              <div style={{ minWidth:60, textAlign:"center" }}>
                <div style={{ fontWeight:800, fontSize:"1.1rem", color:t.green }}>{c.discount}%</div>
                <div style={{ fontSize:".7rem", color:t.muted }}>OFF</div>
              </div>
              {/* Usage */}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:".82rem", color:t.text }}>{c.description || "—"}</div>
                <div style={{ fontSize:".74rem", color:t.muted, marginTop:3 }}>
                  Used: {c.usedCount || 0}{c.maxUses ? `/${c.maxUses}` : " / ∞"}
                  {c.forUserId && <span style={{ marginLeft:8, color:t.accent }}>• User specific</span>}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button onClick={()=>toggleActive(c.id, c.active)} style={{ padding:"6px 12px", background: c.active ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", border:`1px solid ${c.active ? "rgba(16,185,129,.25)" : "rgba(239,68,68,.25)"}`, borderRadius:7, color: c.active ? t.green : "#EF4444", fontWeight:700, fontSize:".78rem", cursor:"pointer", fontFamily:"inherit" }}>
                  {c.active ? "Active" : "Inactive"}
                </button>
                <button onClick={()=>deleteCoupon(c.id, c.code)} style={{ padding:"6px 10px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:7, color:"#EF4444", fontWeight:700, fontSize:".78rem", cursor:"pointer", fontFamily:"inherit" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}