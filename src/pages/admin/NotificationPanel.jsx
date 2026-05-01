// src/pages/admin/NotificationPanel.jsx
// Admin ka full notification center
// - Sab notifications ek jagah
// - Client / Student / All filter
// - Type filter (payment, order, file, etc.)
// - Admin se broadcast notification bhejo
// - Read / Unread / Delete manage karo

import { useState, useEffect } from "react";
import {
  collection, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, addDoc,
  serverTimestamp, where, getDocs, limit
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { sendNotification } from "../../hooks/useNotifications";

const TYPE_ICON = {
  payment:  "💰", file: "📁", order: "📦",
  chat: "💬", approval: "✅", due: "⚠️", info: "ℹ️",
};
const TYPE_COLOR = {
  payment: "#10B981", file: "#6366F1", order: "#F59E0B",
  chat: "#3B82F6", approval: "#10B981", due: "#EF4444", info: "#6366F1",
};

export default function NotificationPanel({ t }) {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers]                 = useState([]);
  const [filter, setFilter]               = useState("all");    // all | client | student
  const [typeFilter, setTypeFilter]       = useState("all");
  const [readFilter, setReadFilter]       = useState("all");    // all | unread | read
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [showCompose, setShowCompose]     = useState(false);

  // Compose form
  const [compose, setCompose] = useState({
    target: "all",        // all | client | student | specific
    userId: "",
    title: "",
    body: "",
    type: "info",
  });

  // ── Load all notifications (admin sees all) ──────────────
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Load users for compose dropdown ─────────────────────
  useEffect(() => {
    getDocs(query(collection(db,"users"), where("role","in",["client","student","pending"])))
      .then(snap => setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);

  // ── Filtered notifications ───────────────────────────────
  const filtered = notifications.filter(n => {
    // user type filter
    if (filter !== "all") {
      const u = users.find(u => u.uid === n.toUserId || u.id === n.toUserId);
      if (!u) return false;
      const uType = u.userType || (u.role==="student"?"student":"client");
      if (filter === "client"  && uType !== "client")  return false;
      if (filter === "student" && uType !== "student") return false;
    }
    // type filter
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    // read filter
    if (readFilter === "unread" && n.read)   return false;
    if (readFilter === "read"   && !n.read)  return false;
    return true;
  });

  const unreadCount  = notifications.filter(n => !n.read).length;
  const clientCount  = notifications.filter(n => {
    const u = users.find(u => u.uid===n.toUserId||u.id===n.toUserId);
    return u && (u.userType==="client" || (u.role!=="student"));
  }).length;
  const studentCount = notifications.filter(n => {
    const u = users.find(u => u.uid===n.toUserId||u.id===n.toUserId);
    return u && (u.userType==="student" || u.role==="student");
  }).length;

  // ── Actions ──────────────────────────────────────────────
  const markRead    = (id) => updateDoc(doc(db,"notifications",id), { read:true });
  const markUnread  = (id) => updateDoc(doc(db,"notifications",id), { read:false });
  const deleteNotif = (id) => { if(confirm("Delete this notification?")) deleteDoc(doc(db,"notifications",id)); };

  const markAllRead = async () => {
    const unread = filtered.filter(n=>!n.read);
    await Promise.all(unread.map(n=>updateDoc(doc(db,"notifications",n.id),{read:true})));
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    if (!compose.title.trim() || !compose.body.trim()) return;
    setSending(true);
    try {
      if (compose.target === "specific" && compose.userId) {
        await sendNotification({ toUserId:compose.userId, toRole:"client", title:compose.title, body:compose.body, type:compose.type });
      } else if (compose.target === "all") {
        // Send to all active users
        const targets = users.filter(u=>u.role==="client"||u.role==="student");
        await Promise.all(targets.map(u=>sendNotification({ toUserId:u.uid||u.id, toRole:u.role, title:compose.title, body:compose.body, type:compose.type })));
      } else {
        // Send to all clients or all students
        const targets = users.filter(u=>
          compose.target==="client" ? (u.userType==="client"||u.role==="client"||u.role==="pending")
                                    : (u.userType==="student"||u.role==="student")
        );
        await Promise.all(targets.map(u=>sendNotification({ toUserId:u.uid||u.id, toRole:u.role, title:compose.title, body:compose.body, type:compose.type })));
      }
      setCompose({target:"all",userId:"",title:"",body:"",type:"info"});
      setShowCompose(false);
      alert(`✅ Notification sent to ${compose.target === "specific" ? "1 user" : compose.target}!`);
    } catch(e) { alert("Error: "+e.message); }
    setSending(false);
  };

  const timeAgo = (ts) => {
    if (!ts?.seconds) return "";
    const diff = Math.floor((Date.now()/1000) - ts.seconds);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return new Date(ts.seconds*1000).toLocaleDateString("en-IN");
  };

  const getUserName = (userId) => {
    const u = users.find(u=>u.uid===userId||u.id===userId);
    return u ? (u.coachingName||u.ownerName||u.email||"User") : userId?.slice(0,8)+"...";
  };

  const getUserType = (userId) => {
    const u = users.find(u=>u.uid===userId||u.id===userId);
    if (!u) return "unknown";
    return u.userType || (u.role==="student"?"student":"client");
  };

  const inp = { width:"100%", padding:"10px 12px", background:t.bg, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".88rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl = { fontSize:".74rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 };

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1.3rem", color:t.text, margin:0 }}>🔔 Notification Center</h2>
          <p style={{ color:t.muted, fontSize:".82rem", margin:"4px 0 0" }}>{unreadCount} unread · {notifications.length} total</p>
        </div>
        <button onClick={()=>setShowCompose(!showCompose)} style={{
          padding:"10px 20px", background:"linear-gradient(135deg,#F59E0B,#F97316)",
          color:"#070B14", border:"none", borderRadius:10, fontWeight:700,
          fontSize:".88rem", cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", gap:8,
        }}>
          ✉️ Send Notification
        </button>
      </div>

      {/* ── Compose Panel ── */}
      {showCompose && (
        <div style={{ background:t.bgCard, border:`2px solid ${t.gold}40`, borderRadius:14, padding:"20px", marginBottom:20 }}>
          <h3 style={{ fontWeight:700, color:t.text, marginBottom:16, fontSize:".95rem" }}>✉️ Send Notification to Users</h3>
          <form onSubmit={sendBroadcast}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={lbl}>Send To</label>
                <select value={compose.target} onChange={e=>setCompose({...compose,target:e.target.value,userId:""})} style={inp}>
                  <option value="all">🌐 All Users</option>
                  <option value="client">🏫 All Clients</option>
                  <option value="student">🎓 All Students</option>
                  <option value="specific">👤 Specific User</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select value={compose.type} onChange={e=>setCompose({...compose,type:e.target.value})} style={inp}>
                  <option value="info">ℹ️ Info</option>
                  <option value="order">📦 Order Update</option>
                  <option value="payment">💰 Payment</option>
                  <option value="file">📁 File Ready</option>
                  <option value="approval">✅ Approval</option>
                  <option value="due">⚠️ Due Reminder</option>
                </select>
              </div>
            </div>

            {compose.target==="specific" && (
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Select User</label>
                <select value={compose.userId} onChange={e=>setCompose({...compose,userId:e.target.value})} style={inp} required>
                  <option value="">— Choose user —</option>
                  {users.map(u=>(
                    <option key={u.id} value={u.uid||u.id}>
                      {u.coachingName||u.ownerName||u.email} ({u.userType||u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom:10 }}>
              <label style={lbl}>Title *</label>
              <input required value={compose.title} onChange={e=>setCompose({...compose,title:e.target.value})} placeholder="e.g. New Feature Available!" style={inp}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Message *</label>
              <textarea required rows={3} value={compose.body} onChange={e=>setCompose({...compose,body:e.target.value})} placeholder="Notification ka message..." style={{ ...inp, resize:"vertical" }}/>
            </div>

            {/* Preview */}
            {compose.title && (
              <div style={{ background:`${TYPE_COLOR[compose.type]||"#6366F1"}10`, border:`1px solid ${TYPE_COLOR[compose.type]||"#6366F1"}30`, borderRadius:9, padding:"10px 14px", marginBottom:14, display:"flex", gap:10, alignItems:"flex-start" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background:`${TYPE_COLOR[compose.type]||"#6366F1"}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>
                  {TYPE_ICON[compose.type]||"ℹ️"}
                </div>
                <div>
                  <div style={{ fontWeight:700, color:t.text, fontSize:".85rem" }}>{compose.title}</div>
                  <div style={{ fontSize:".78rem", color:t.muted }}>{compose.body}</div>
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button type="submit" disabled={sending} style={{ flex:1, padding:"11px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:9, fontWeight:700, cursor:sending?"not-allowed":"pointer", fontFamily:"inherit", opacity:sending?.7:1 }}>
                {sending ? "Sending..." : `🚀 Send to ${compose.target==="all"?"All":compose.target==="specific"?"1 User":compose.target==="client"?"All Clients":"All Students"}`}
              </button>
              <button type="button" onClick={()=>setShowCompose(false)} style={{ padding:"11px 18px", background:t.bgCard2, border:`1px solid ${t.border}`, borderRadius:9, color:t.muted, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
        {[
          { label:"Total", val:notifications.length, color:t.text, icon:"🔔" },
          { label:"Unread", val:unreadCount, color:"#EF4444", icon:"🔴" },
          { label:"Clients", val:clientCount, color:t.gold, icon:"🏫" },
          { label:"Students", val:studentCount, color:t.accent, icon:"🎓" },
        ].map(s=>(
          <div key={s.label} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:"1.3rem", marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:"1.3rem", fontWeight:900, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:".72rem", color:t.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>

        {/* User type filter */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[
            { val:"all",     label:"🌐 All",      count:notifications.length },
            { val:"client",  label:"🏫 Clients",  count:clientCount },
            { val:"student", label:"🎓 Students", count:studentCount },
          ].map(f=>(
            <button key={f.val} onClick={()=>setFilter(f.val)} style={{
              padding:"6px 14px", borderRadius:50, border:"none", cursor:"pointer",
              background: filter===f.val ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard2,
              color: filter===f.val ? "#070B14" : t.muted,
              fontWeight:700, fontSize:".8rem", fontFamily:"inherit",
            }}>
              {f.label} <span style={{ opacity:.7 }}>({f.count})</span>
            </button>
          ))}
        </div>

        <div style={{ width:1, height:24, background:t.border, flexShrink:0 }}/>

        {/* Read filter */}
        <div style={{ display:"flex", gap:6 }}>
          {[["all","All"],["unread","Unread"],["read","Read"]].map(([val,label])=>(
            <button key={val} onClick={()=>setReadFilter(val)} style={{
              padding:"5px 12px", borderRadius:50, border:`1px solid ${readFilter===val?t.gold:t.border}`,
              background: readFilter===val ? `${t.gold}18` : "transparent",
              color: readFilter===val ? t.gold : t.muted,
              fontWeight:600, fontSize:".78rem", cursor:"pointer", fontFamily:"inherit",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ width:1, height:24, background:t.border, flexShrink:0 }}/>

        {/* Type filter */}
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...inp, width:"auto", padding:"5px 10px", fontSize:".8rem" }}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_ICON).map(([k,v])=><option key={k} value={k}>{v} {k}</option>)}
        </select>

        {/* Mark all read */}
        {unreadCount>0 && (
          <button onClick={markAllRead} style={{ marginLeft:"auto", padding:"6px 14px", background:"none", border:`1px solid ${t.border}`, borderRadius:8, color:t.muted, fontSize:".78rem", cursor:"pointer", fontFamily:"inherit" }}>
            ✓ Mark All Read
          </button>
        )}
      </div>

      {/* ── Notifications List ── */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"40px", color:t.muted }}>Loading...</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:"50px", background:t.bgCard, borderRadius:14, border:`1px solid ${t.border}` }}>
          <div style={{ fontSize:"3rem", marginBottom:10 }}>🔔</div>
          <p style={{ color:t.muted }}>No notifications found for this filter.</p>
        </div>
      ) : (
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, overflow:"hidden" }}>
          {filtered.map((n, i) => {
            const uType = getUserType(n.toUserId);
            return (
              <div key={n.id} style={{
                padding:"14px 16px",
                borderBottom: i<filtered.length-1 ? `1px solid ${t.border}` : "none",
                background: n.read ? "transparent" : `${TYPE_COLOR[n.type]||"#6366F1"}06`,
                borderLeft: `3px solid ${n.read?"transparent":TYPE_COLOR[n.type]||"#6366F1"}`,
                display:"flex", gap:12, alignItems:"flex-start",
                transition:"background .15s",
              }}>
                {/* Type icon */}
                <div style={{ width:38, height:38, borderRadius:"50%", background:`${TYPE_COLOR[n.type]||"#6366F1"}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem", flexShrink:0 }}>
                  {TYPE_ICON[n.type]||"ℹ️"}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
                    <span style={{ fontWeight:n.read?500:700, color:t.text, fontSize:".88rem" }}>{n.title}</span>
                    {/* User type badge */}
                    <span style={{
                      fontSize:".65rem", padding:"2px 7px", borderRadius:50, fontWeight:700,
                      background: uType==="student" ? "rgba(99,102,241,.15)" : "rgba(245,158,11,.15)",
                      color: uType==="student" ? "#818CF8" : "#F59E0B",
                    }}>
                      {uType==="student"?"🎓 Student":"🏫 Client"}
                    </span>
                  </div>
                  <div style={{ fontSize:".8rem", color:t.muted, lineHeight:1.5, marginBottom:4 }}>{n.body}</div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:".72rem", color:t.muted }}>👤 {getUserName(n.toUserId)}</span>
                    <span style={{ fontSize:".72rem", color:t.muted }}>⏰ {timeAgo(n.createdAt)}</span>
                    {!n.read && <span style={{ width:7, height:7, borderRadius:"50%", background:TYPE_COLOR[n.type]||"#6366F1", display:"inline-block" }}/>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  {!n.read
                    ? <button onClick={()=>markRead(n.id)} title="Mark read" style={{ background:"none", border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 8px", fontSize:".72rem", color:t.muted, cursor:"pointer" }}>✓ Read</button>
                    : <button onClick={()=>markUnread(n.id)} title="Mark unread" style={{ background:"none", border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 8px", fontSize:".72rem", color:t.muted, cursor:"pointer" }}>↩ Unread</button>
                  }
                  <button onClick={()=>deleteNotif(n.id)} title="Delete" style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", fontSize:".85rem", padding:"4px 6px" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination hint */}
      {notifications.length>=200 && (
        <p style={{ textAlign:"center", color:t.muted, fontSize:".78rem", marginTop:12 }}>Showing latest 200 notifications</p>
      )}
    </div>
  );
}