// src/pages/admin/ClientsPage.jsx
// Beautiful clients management page with search, filter, stats
import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function ClientsPage({ clients, t, loading, nc, setNc, addClient, updatePayment, onSelect, onStudentSelect, fetchClients, onGrantDualRole, onRevokeDualRole }) {

  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");   // all | client | student | pending
  const [sort, setSort]         = useState("name");  // name | billed | dues | recent
  const [showAdd, setShowAdd]   = useState(false);
  const [billedEdit, setBilledEdit] = useState({});  // {id: value}
  const [paidEdit, setPaidEdit]     = useState({});

  const allUsers = clients.filter(c => c.role==="client"||c.role==="student"||c.role==="pending");

  // Stats
  const totalClients  = clients.filter(c=>c.role==="client").length;
  const totalStudents = clients.filter(c=>c.role==="student").length;
  const totalPending  = clients.filter(c=>c.role==="pending"||c.approved===false).length;
  const totalRevenue  = clients.filter(c=>c.role==="client").reduce((s,c)=>s+(c.totalBilled||0),0);
  const totalPaid     = clients.filter(c=>c.role==="client").reduce((s,c)=>s+(c.totalPaid||0),0);
  const totalDues     = Math.max(0, totalRevenue - totalPaid);

  // Filter + Search + Sort
  const filtered = allUsers
    .filter(c => {
      if (filter==="client"  && c.role!=="client")  return false;
      if (filter==="student" && c.role!=="student") return false;
      if (filter==="pending" && c.role!=="pending" && c.approved!==false) return false;
      if (search) {
        const q = search.toLowerCase();
        return (c.coachingName||"").toLowerCase().includes(q) ||
               (c.ownerName||"").toLowerCase().includes(q) ||
               (c.email||"").toLowerCase().includes(q) ||
               (c.phone||"").toLowerCase().includes(q) ||
               (c.city||"").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a,b) => {
      if (sort==="billed") return (b.totalBilled||0)-(a.totalBilled||0);
      if (sort==="dues")   return (Math.max(0,(b.totalBilled||0)-(b.totalPaid||0)))-(Math.max(0,(a.totalBilled||0)-(a.totalPaid||0)));
      if (sort==="recent") return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
      return (a.coachingName||"").localeCompare(b.coachingName||"");
    });

  const inp = { width:"100%", padding:"9px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:8, fontSize:".9rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl = { fontSize:".74rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 };

  const roleColor = (role) => ({
    client:  { bg:"rgba(16,185,129,.15)",  color:"#10B981", label:"🏫 Client" },
    student: { bg:"rgba(99,102,241,.15)",  color:"#818CF8", label:"🎓 Student" },
    pending: { bg:"rgba(245,158,11,.15)",  color:"#F59E0B", label:"⏳ Pending" },
    admin:   { bg:"rgba(239,68,68,.15)",   color:"#EF4444", label:"👑 Admin" },
  }[role] || { bg:"rgba(148,163,184,.15)", color:"#94A3B8", label:role });

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1.4rem", color:t.text, margin:0 }}>👥 Clients & Students</h2>
          <p style={{ color:t.muted, fontSize:".82rem", margin:"4px 0 0" }}>{allUsers.length} total users</p>
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{
          padding:"10px 20px", background:"linear-gradient(135deg,#F59E0B,#F97316)",
          color:"#070B14", border:"none", borderRadius:10, fontWeight:700,
          fontSize:".88rem", cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:8,
        }}>
          {showAdd ? "✕ Cancel" : "+ Add New Client"}
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { icon:"🏫", label:"Clients",    val:totalClients,                    color:t.accent },
          { icon:"🎓", label:"Students",   val:totalStudents,                   color:"#818CF8" },
          { icon:"⏳", label:"Pending",    val:totalPending,                    color:t.gold },
          { icon:"💰", label:"Revenue",    val:`₹${totalRevenue.toLocaleString()}`, color:t.text },
          { icon:"✅", label:"Collected",  val:`₹${totalPaid.toLocaleString()}`,    color:t.green },
          { icon:"⚠️", label:"Dues",       val:`₹${totalDues.toLocaleString()}`,    color:totalDues>0?t.red:t.green },
        ].map(s=>(
          <div key={s.label} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:"1.3rem", marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:"1.1rem", fontWeight:900, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:".7rem", color:t.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Add Client Form (collapsible) ── */}
      {showAdd && (
        <div style={{ background:t.bgCard, border:`2px solid ${t.gold}40`, borderRadius:14, padding:"22px", marginBottom:20 }}>
          <h3 style={{ fontWeight:700, color:t.text, marginBottom:16, fontSize:".95rem" }}>➕ Add New Client Account</h3>
          <form onSubmit={(e)=>{ addClient(e); setShowAdd(false); }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
              <div><label style={lbl}>Coaching Name *</label><input required value={nc.coachingName} onChange={e=>setNc({...nc,coachingName:e.target.value})} placeholder="e.g. SVM Classes" style={inp}/></div>
              <div><label style={lbl}>Owner Name *</label><input required value={nc.ownerName} onChange={e=>setNc({...nc,ownerName:e.target.value})} style={inp}/></div>
              <div><label style={lbl}>Email *</label><input type="email" required value={nc.email} onChange={e=>setNc({...nc,email:e.target.value})} style={inp}/></div>
              <div><label style={lbl}>Password *</label><input type="password" required value={nc.password} onChange={e=>setNc({...nc,password:e.target.value})} style={inp}/></div>
              <div><label style={lbl}>Phone</label><input value={nc.phone} onChange={e=>setNc({...nc,phone:e.target.value})} placeholder="+91 XXXXXXXXXX" style={inp}/></div>
              <div><label style={lbl}>City</label><input value={nc.city} onChange={e=>setNc({...nc,city:e.target.value})} placeholder="e.g. Patna" style={inp}/></div>
              <div><label style={lbl}>Total Billed ₹</label><input type="number" value={nc.totalBilled} onChange={e=>setNc({...nc,totalBilled:e.target.value})} style={inp}/></div>
              <div><label style={lbl}>Total Paid ₹</label><input type="number" value={nc.totalPaid} onChange={e=>setNc({...nc,totalPaid:e.target.value})} style={inp}/></div>
            </div>
            <div style={{ marginTop:14 }}>
              <button type="submit" disabled={loading} style={{ padding:"11px 32px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:10, fontWeight:700, fontSize:".9rem", cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
                {loading ? "Creating..." : "✅ Create Client Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search + Filter ── */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name, email, phone, city..."
          style={{ flex:1, minWidth:200, padding:"9px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".88rem", color:t.text, outline:"none", fontFamily:"inherit" }}/>

        {/* Role filter */}
        <div style={{ display:"flex", gap:6 }}>
          {[["all","🌐 All"],["client","🏫 Clients"],["student","🎓 Students"],["pending","⏳ Pending"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"7px 12px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit",
              background: filter===v ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard2,
              color: filter===v ? "#070B14" : t.muted,
              fontWeight:700, fontSize:".78rem",
            }}>{l}</button>
          ))}
        </div>

        {/* Sort */}
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{ padding:"8px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".82rem", color:t.text, outline:"none", fontFamily:"inherit" }}>
          <option value="name">Sort: Name</option>
          <option value="billed">Sort: Most Billed</option>
          <option value="dues">Sort: Most Dues</option>
          <option value="recent">Sort: Newest</option>
        </select>

        <div style={{ fontSize:".82rem", color:t.muted, fontWeight:600 }}>{filtered.length} results</div>
      </div>

      {/* ── Clients Grid ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:t.bgCard, borderRadius:14, border:`1px solid ${t.border}` }}>
          <div style={{ fontSize:"3rem", marginBottom:12 }}>👥</div>
          <p style={{ color:t.muted }}>{search ? "No clients match your search." : "No clients yet. Add your first client!"}</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
          {filtered.map(c => {
            const dues    = Math.max(0, (c.totalBilled||0) - (c.totalPaid||0));
            const paidPct = c.totalBilled>0 ? Math.round((c.totalPaid/c.totalBilled)*100) : 0;
            const rc      = roleColor(c.role);
            const joinDate= c.createdAt?.seconds ? new Date(c.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";

            return (
              <div key={c.id} style={{ background:t.bgCard, border:`1px solid ${dues>0?t.red+"40":t.border}`, borderRadius:14, overflow:"hidden", transition:"all .2s" }}
                onMouseOver={e=>e.currentTarget.style.borderColor=t.gold}
                onMouseOut={e=>e.currentTarget.style.borderColor=dues>0?t.red+"40":t.border}>

                {/* Card Header */}
                <div style={{ padding:"16px 16px 12px", cursor:"pointer" }} onClick={()=>c.role==="student" ? (onStudentSelect||onSelect)(c.id, c) : onSelect(c.id)}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    {/* Avatar */}
                    {c.logoUrl
                      ? <img src={c.logoUrl} style={{ width:46, height:46, borderRadius:10, objectFit:"cover", border:`2px solid ${t.gold}`, flexShrink:0 }}/>
                      : <div style={{ width:46, height:46, borderRadius:10, background:`linear-gradient(135deg,${t.accent},${t.gold})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:"1.2rem", color:"#fff", flexShrink:0 }}>
                          {(c.coachingName||"C")[0].toUpperCase()}
                        </div>
                    }

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <div style={{ fontWeight:800, color:t.text, fontSize:".92rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>{c.coachingName||"—"}</div>
                        <span style={{ background:rc.bg, color:rc.color, padding:"2px 8px", borderRadius:50, fontSize:".68rem", fontWeight:700, flexShrink:0 }}>{rc.label}</span>
                      </div>
                      <div style={{ fontSize:".76rem", color:t.muted, marginTop:2 }}>
                        👤 {c.ownerName}
                        {c.city && <span> · 📍 {c.city}</span>}
                      </div>
                      <div style={{ display:"flex", gap:10, marginTop:3, flexWrap:"wrap" }}>
                        {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize:".72rem", color:t.accent, textDecoration:"none" }} onClick={e=>e.stopPropagation()}>📞 {c.phone}</a>}
                        {c.email && <span style={{ fontSize:".72rem", color:t.muted }}>📧 {c.email.split("@")[0]}…</span>}
                      </div>
                      <div style={{ fontSize:".68rem", color:t.muted, marginTop:2 }}>🗓️ {joinDate}</div>
                    </div>

                    {/* Dues badge */}
                    <div style={{ flexShrink:0, textAlign:"right" }}>
                      {dues > 0
                        ? <div style={{ background:"rgba(239,68,68,.15)", color:"#EF4444", padding:"4px 10px", borderRadius:50, fontSize:".72rem", fontWeight:700 }}>⚠️ ₹{dues.toLocaleString()}</div>
                        : <div style={{ background:"rgba(16,185,129,.15)", color:"#10B981", padding:"4px 10px", borderRadius:50, fontSize:".72rem", fontWeight:700 }}>✓ Clear</div>
                      }
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
                    {[
                      ["💰 Billed", `₹${(c.totalBilled||0).toLocaleString()}`, t.text],
                      ["✅ Paid",   `₹${(c.totalPaid||0).toLocaleString()}`,   t.green],
                      ["⚠️ Dues",  `₹${dues.toLocaleString()}`,                 dues>0?t.red:t.green],
                    ].map(([label,val,color])=>(
                      <div key={label} style={{ background:t.bgCard2, borderRadius:8, padding:"8px", textAlign:"center" }}>
                        <div style={{ fontSize:".64rem", color:t.muted, marginBottom:2 }}>{label}</div>
                        <div style={{ fontWeight:800, color, fontSize:".88rem" }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {c.totalBilled > 0 && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:".68rem", color:t.muted, marginBottom:3 }}>
                        <span>Payment Progress</span>
                        <span style={{ color:paidPct===100?t.green:t.gold, fontWeight:700 }}>{paidPct}%</span>
                      </div>
                      <div style={{ background:t.bgCard2, borderRadius:50, height:5, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${paidPct}%`, background:`linear-gradient(90deg,${t.green},${t.gold})`, borderRadius:50 }}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer — Quick Actions */}
                <div style={{ padding:"10px 14px 12px", borderTop:`1px solid ${t.border}40`, background:t.bgCard2 }}>
                  {/* Row 1: Billed / Paid / Save / WA / Delete */}
                  <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:8 }}>
                    <input
                      type="number"
                      value={billedEdit[c.id] ?? (c.totalBilled||0)}
                      onChange={e=>setBilledEdit({...billedEdit,[c.id]:e.target.value})}
                      placeholder="Billed"
                      style={{ flex:1, minWidth:0, padding:"5px 8px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, fontSize:".78rem", color:t.text, fontFamily:"inherit", outline:"none" }}
                    />
                    <input
                      type="number"
                      value={paidEdit[c.id] ?? (c.totalPaid||0)}
                      onChange={e=>setPaidEdit({...paidEdit,[c.id]:e.target.value})}
                      placeholder="Paid"
                      style={{ flex:1, minWidth:0, padding:"5px 8px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:7, fontSize:".78rem", color:t.text, fontFamily:"inherit", outline:"none" }}
                    />
                    <button onClick={()=>{ updatePayment(c.id, paidEdit[c.id]??c.totalPaid, billedEdit[c.id]??c.totalBilled); }} style={{ padding:"5px 10px", background:`${t.green}22`, color:t.green, border:`1px solid ${t.green}40`, borderRadius:7, fontWeight:700, fontSize:".76rem", cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                      💾
                    </button>
                    {c.phone && (
                      <a href={`https://wa.me/${c.phone.replace(/\D/g,"")}`} target="_blank" onClick={e=>e.stopPropagation()} style={{ padding:"5px 8px", background:"#25D36618", border:"1px solid #25D36640", color:"#25D366", borderRadius:7, fontWeight:600, fontSize:".76rem", textDecoration:"none", flexShrink:0 }}>💬</a>
                    )}
                    <button onClick={async(e)=>{ e.stopPropagation(); if(!confirm(`Delete ${c.coachingName}?`))return; await deleteDoc(doc(db,"users",c.id)); fetchClients(); }} style={{ padding:"5px 8px", background:"rgba(239,68,68,.12)", border:"none", color:"#EF4444", borderRadius:7, cursor:"pointer", fontSize:".8rem", flexShrink:0 }}>
                      🗑
                    </button>
                  </div>
                  {/* Row 2: Manage button full width */}
                  <button onClick={()=>c.role==="student" ? (onStudentSelect||onSelect)(c.id, c) : onSelect(c.id)} style={{ width:"100%", padding:"8px", background:c.role==="student"?"linear-gradient(135deg,#8B5CF6,#6366F1)":"linear-gradient(135deg,#F59E0B,#F97316)", color:c.role==="student"?"#fff":"#070B14", border:"none", borderRadius:8, fontWeight:700, fontSize:".84rem", cursor:"pointer", fontFamily:"inherit" }}>
                    {c.role==="student" ? "View Profile →" : "Manage →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}