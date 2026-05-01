// src/components/ui/NotificationBell.jsx
import { useState, useRef, useEffect } from "react";
import useNotifications from "../../hooks/useNotifications";
import useAuth from "../../hooks/useAuth";

const TYPE_ICON = {
  payment: "💰", file: "📁", order: "📦",
  chat: "💬", approval: "✅", due: "⚠️", info: "ℹ️",
};
const TYPE_COLOR = {
  payment: "#10B981", file: "#6366F1", order: "#F59E0B",
  chat: "#3B82F6", approval: "#10B981", due: "#EF4444", info: "#6366F1",
};

export default function NotificationBell({ t }) {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, requestPermission } = useNotifications(user?.uid);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Bell click — permission maango agar nahi mila
  const handleOpen = async () => {
    setOpen(v => !v);
    if ("Notification" in window && Notification.permission === "default") {
      await requestPermission();
    }
  };

  const timeAgo = (ts) => {
    if (!ts?.seconds) return "";
    const diff = Math.floor((Date.now()/1000) - ts.seconds);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  const handleClick = (n) => {
    markRead(n.id);
    setOpen(false);
  };

  const permGranted   = "Notification" in window && Notification.permission === "granted";
  const permDenied    = "Notification" in window && Notification.permission === "denied";
  const permDefault   = "Notification" in window && Notification.permission === "default";

  return (
    <div ref={ref} style={{ position:"relative" }}>

      {/* Bell button */}
      <button onClick={handleOpen} style={{
        position:"relative", width:38, height:38, borderRadius:9,
        border:`1px solid ${t.border}`,
        background: open ? `${t.accent}22` : t.bgCard,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"1.05rem", cursor:"pointer", transition:"all .2s",
      }}>
        {permGranted ? "🔔" : "🔕"}
        {unreadCount > 0 && (
          <span style={{
            position:"absolute", top:-5, right:-5,
            minWidth:18, height:18,
            background:"linear-gradient(135deg,#EF4444,#DC2626)",
            color:"#fff", borderRadius:50,
            fontSize:".65rem", fontWeight:800,
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"0 4px",
            animation:"pulse 2s ease-in-out infinite",
            boxShadow:"0 2px 8px rgba(239,68,68,.5)",
          }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 8px)", right:0,
          width:340, maxHeight:480,
          background:t.bgCard, border:`1px solid ${t.border}`,
          borderRadius:16, overflow:"hidden",
          boxShadow:`0 20px 60px ${t.shadow}`,
          zIndex:10000,
        }}>
          {/* Header */}
          <div style={{ padding:"14px 16px", borderBottom:`1px solid ${t.border}`, background:t.bgCard2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, color:t.text, fontSize:".92rem" }}>🔔 Notifications</div>
              {unreadCount > 0 && <div style={{ fontSize:".72rem", color:t.muted }}>{unreadCount} unread</div>}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background:"none", border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 10px", fontSize:".74rem", color:t.muted, cursor:"pointer", fontFamily:"inherit" }}>
                ✓ All read
              </button>
            )}
          </div>

          {/* Enable browser notifications banner */}
          {permDefault && (
            <div style={{ padding:"10px 14px", background:`${t.accent}10`, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:".8rem", color:t.muted, flex:1 }}>Enable browser notifications?</span>
              <button onClick={async()=>{ await requestPermission(); }} style={{ padding:"5px 12px", background:`linear-gradient(135deg,${t.accent},#4F46E5)`, color:"#fff", border:"none", borderRadius:7, fontSize:".76rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                🔔 Enable
              </button>
            </div>
          )}
          {permDenied && (
            <div style={{ padding:"9px 14px", background:"rgba(239,68,68,.08)", borderBottom:`1px solid ${t.border}` }}>
              <div style={{ fontSize:".76rem", color:"#EF4444" }}>⚠️ Browser notifications blocked. Enable in browser settings.</div>
            </div>
          )}

          {/* Notifications list */}
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:10 }}>🔔</div>
                <div style={{ color:t.muted, fontSize:".87rem" }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={()=>handleClick(n)} style={{
                  padding:"12px 16px",
                  borderBottom:`1px solid ${t.border}`,
                  background: n.read ? "transparent" : `${TYPE_COLOR[n.type]||"#6366F1"}08`,
                  cursor:"pointer",
                  display:"flex", gap:11, alignItems:"flex-start",
                  transition:"background .15s",
                  borderLeft:`3px solid ${n.read?"transparent":TYPE_COLOR[n.type]||"#6366F1"}`,
                }}
                  onMouseEnter={e=>e.currentTarget.style.background=t.bgCard2}
                  onMouseLeave={e=>e.currentTarget.style.background=n.read?"transparent":`${TYPE_COLOR[n.type]||"#6366F1"}08`}
                >
                  <div style={{
                    width:34, height:34, borderRadius:"50%",
                    background:`${TYPE_COLOR[n.type]||"#6366F1"}18`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:".95rem", flexShrink:0,
                  }}>
                    {TYPE_ICON[n.type] || "ℹ️"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:n.read?400:700, color:t.text, fontSize:".86rem", marginBottom:2, lineHeight:1.3 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize:".77rem", color:t.muted, lineHeight:1.4 }}>{n.body}</div>
                    <div style={{ fontSize:".69rem", color:t.muted, marginTop:3 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width:8, height:8, borderRadius:"50%", background:TYPE_COLOR[n.type]||"#6366F1", flexShrink:0, marginTop:4 }}/>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding:"10px 14px", borderTop:`1px solid ${t.border}`, background:t.bgCard2, textAlign:"center" }}>
            <div style={{ fontSize:".72rem", color:t.muted }}>
              {permGranted ? "✅ Browser notifications enabled" : "Notifications from DG HelpMate"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}