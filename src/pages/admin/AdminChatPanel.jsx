// src/pages/admin/AdminChatPanel.jsx
// Admin chat — client + student dono ke saath, delete + reply features
import { useState, useEffect, useRef } from "react";
import {
  collection, onSnapshot, query, orderBy,
  addDoc, serverTimestamp, doc, getDoc,
  updateDoc, setDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../../firebase/config";

const QUICK = [
  "Hello! 🙏 We have received your message.",
  "Work has started. 🔄",
  "Your work is complete! ✅",
  "Please make the payment — dues pending. 💰",
  "It will take some time. Please wait. ⏳",
  "Feel free to ask anything! 😊",
];

export default function AdminChatPanel({ t }) {
  const [chats,       setChats]       = useState([]);
  const [clients,     setClients]     = useState({});
  const [selectedId,  setSelectedId]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [mobileView,  setMobileView]  = useState("list");
  const [hoveredMsg,  setHoveredMsg]  = useState(null);
  const endRef = useRef();

  // ── Load all chat rooms ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "chats")),
      async (snap) => {
        console.log("[AdminChat] chats loaded:", snap.docs.length);
        const list = snap.docs
          .map(d => {
            const data = d.data();
            // Document ID itself = clientId/uid
            return { id: d.id, clientId: data.clientId || d.id, ...data };
          })
          .sort((a, b) => (b.lastTime?.seconds||0) - (a.lastTime?.seconds||0));
        setChats(list);

        // Fetch user profiles using doc.id (uid) directly
        const data = {};
        for (const chat of list) {
          const uid = chat.clientId || chat.id;
          if (!uid || data[uid]) continue;
          try {
            const s = await getDoc(doc(db, "users", uid));
            if (s.exists()) {
              data[uid] = s.data();
            } else {
              // Fallback: use data from chat document itself
              data[uid] = {
                ownerName: chat.studentName || chat.clientName || uid.slice(0,8),
                coachingName: chat.studentName || chat.clientName || "",
                phone: chat.phone || "",
                role: chat.isStudent ? "student" : "client",
                userType: chat.isStudent ? "student" : "client",
              };
            }
          } catch(e) {
            console.warn("[AdminChat] user fetch failed:", uid, e.message);
            data[uid] = {
              ownerName: chat.studentName || chat.clientName || uid.slice(0,8),
              coachingName: chat.studentName || chat.clientName || "",
            };
          }
        }
        setClients(prev => ({ ...prev, ...data }));
      },
      (err) => {
        console.error("[AdminChat] onSnapshot error:", err.code, err.message);
      }
    );
    return unsub;
  }, []);

  // ── Load messages for selected chat ─────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    const unsub = onSnapshot(
      query(collection(db, "chats", selectedId, "messages"), orderBy("timestamp", "asc")),
      (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        // Mark as read
        msgs.forEach(m => {
          if (m.senderRole !== "admin" && !m.read)
            updateDoc(doc(db, "chats", selectedId, "messages", m.id), { read: true }).catch(() => {});
        });
        updateDoc(doc(db, "chats", selectedId), { unreadAdmin: 0 }).catch(() => {});
      }
    );
    return unsub;
  }, [selectedId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const selectChat = (id) => { setSelectedId(id); setMobileView("chat"); };

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMsg = async () => {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await addDoc(collection(db, "chats", selectedId, "messages"), {
        text,
        senderRole: "admin",
        senderName: "DG HelpMate",
        timestamp: serverTimestamp(),
        read: false,
      });
      await setDoc(doc(db, "chats", selectedId), {
        clientId: selectedId,
        lastMessage: text,
        lastSender: "admin",
        lastTime: serverTimestamp(),
        unreadAdmin: 0,
        unreadClient: 1,
      }, { merge: true });
    } catch (e) { console.error(e); }
    setSending(false);
  };

  // ── Delete message ───────────────────────────────────────────────────────
  const deleteMsg = async (msgId) => {
    if (!window.confirm("Message delete karein?")) return;
    try {
      await deleteDoc(doc(db, "chats", selectedId, "messages", msgId));
    } catch (e) { console.error(e); }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const timeStr = (ts) => {
    if (!ts?.seconds) return "";
    const d = new Date(ts.seconds * 1000), now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const fullDateStr = (ts) => {
    if (!ts?.seconds) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  const filteredChats = chats.filter(c => {
    const uid = c.clientId || c.id;
    const u = clients[uid];
    const name = (u?.coachingName || u?.ownerName || uid || "").toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filter === "unread"  && !(c.unreadAdmin > 0)) return false;
    if (filter === "student" && !(c.isStudent || u?.role === "student" || u?.userType === "student")) return false;
    if (filter === "client"  && (c.isStudent || u?.role === "student" || u?.userType === "student")) return false;
    return true;
  });

  const totalUnread = chats.reduce((s, c) => s + (c.unreadAdmin || 0), 0);
  const selUid = selectedId;
  const selUser = clients[selUid];
  const isStudent = chats.find(c => (c.clientId||c.id) === selUid)?.isStudent || selUser?.role === "student";

  return (
    <>
      <style>{`
        .acp-wrap { display:flex; height:calc(100vh - 72px); overflow:hidden; border-radius:14px; border:1px solid ${t.border}; }
        .acp-list { width:280px; min-width:280px; display:flex; flex-direction:column; border-right:1px solid ${t.border}; overflow:hidden; }
        .acp-chat { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }
        .acp-back { display:none; }
        .acp-row:hover { background:${t.bgCard2||t.bgCard} !important; }
        .msg-actions { display:none; }
        .msg-wrap:hover .msg-actions { display:flex !important; }
        @media(max-width:750px){
          .acp-wrap  { height:calc(100vh - 110px); border-radius:10px; }
          .acp-list  { width:100% !important; min-width:unset !important; border-right:none; }
          .acp-list.hide  { display:none !important; }
          .acp-chat.hide  { display:none !important; }
          .acp-back  { display:flex !important; }
        }
      `}</style>

      <div className="acp-wrap" style={{ background: t.bg }}>

        {/* ── LEFT: Chat list ──────────────────────────────────────────── */}
        <div className={`acp-list${mobileView === "chat" ? " hide" : ""}`} style={{ background: t.bgCard }}>

          {/* Header */}
          <div style={{ padding: "14px 12px 10px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, color: t.text, fontSize: ".92rem" }}>
                💬 Chats
              </div>
              {totalUnread > 0 && (
                <span style={{ background: "#EF4444", color: "#fff", borderRadius: 50, padding: "2px 8px", fontSize: ".7rem", fontWeight: 700 }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search..."
              style={{ width: "100%", padding: "7px 10px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: ".82rem", color: t.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {[["all","All"],["client","🏫"],["student","🎓"],["unread","🔴"]].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: ".72rem", background: filter === v ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard2 || t.bg, color: filter === v ? "#070B14" : t.muted }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredChats.length === 0 ? (
              <div style={{ padding: "40px 14px", textAlign: "center", color: t.muted, fontSize: ".83rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
                {chats.length === 0 ? "No messages yet from students or clients" : "No chats found"}
              </div>
            ) : (
              filteredChats.map(chat => {
                const uid = chat.clientId || chat.id;
                const u = clients[uid];
                const isSt = chat.isStudent || u?.role === "student";
                const sel = selectedId === uid;
                const unread = chat.unreadAdmin > 0;
                const name = u?.coachingName || u?.ownerName || uid?.slice(0, 12) || "User";
                return (
                  <div key={chat.id} className="acp-row" onClick={() => selectChat(uid)}
                    style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 12px", cursor: "pointer", background: sel ? `${t.accent}18` : "transparent", borderBottom: `1px solid ${t.border}40`, borderLeft: `3px solid ${sel ? t.accent : "transparent"}`, transition: "background .15s" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,${isSt ? t.accent : t.gold},${isSt ? "#4F46E5" : "#F97316"})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: ".88rem" }}>
                      {name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: unread ? 800 : 600, color: t.text, fontSize: ".84rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                          {name}
                        </div>
                        <div style={{ fontSize: ".65rem", color: t.muted, flexShrink: 0, marginLeft: 4 }}>{timeStr(chat.lastTime)}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <div style={{ fontSize: ".74rem", color: unread ? t.text : t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160, fontWeight: unread ? 600 : 400 }}>
                          {chat.lastSender === "admin" && "You: "}{chat.lastMessage || "No messages"}
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: ".6rem", color: isSt ? t.accent : t.gold, fontWeight: 700 }}>{isSt ? "🎓" : "🏫"}</span>
                          {unread && <span style={{ background: "#EF4444", color: "#fff", borderRadius: 50, minWidth: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".62rem", fontWeight: 800 }}>{chat.unreadAdmin}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Chat window ───────────────────────────────────────── */}
        <div className={`acp-chat${mobileView === "list" ? " hide" : ""}`}>
          {!selectedId ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.muted, gap: 10 }}>
              <div style={{ fontSize: "3.5rem" }}>💬</div>
              <div style={{ fontWeight: 700, color: t.text }}>Select a conversation</div>
              <div style={{ fontSize: ".84rem" }}>Choose from the left panel</div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${t.border}`, background: t.bgCard, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button className="acp-back" onClick={() => setMobileView("list")}
                  style={{ display: "none", alignItems: "center", background: "none", border: "none", color: t.muted, cursor: "pointer", fontSize: "1.2rem", padding: "0 6px 0 0" }}>←</button>

                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${isStudent ? t.accent : t.gold},${isStudent ? "#4F46E5" : "#F97316"})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {(selUser?.coachingName || selUser?.ownerName || "U")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: t.text, fontSize: ".9rem" }}>
                    {selUser?.coachingName || selUser?.ownerName || "User"}
                    <span style={{ marginLeft: 8, fontSize: ".7rem", color: isStudent ? t.accent : t.gold, fontWeight: 700 }}>{isStudent ? "🎓 Student" : "🏫 Client"}</span>
                  </div>
                  <div style={{ fontSize: ".7rem", color: t.muted }}>
                    {selUser?.phone && `📞 ${selUser.phone}`}{selUser?.city && ` · 📍 ${selUser.city}`}
                  </div>
                </div>
                {selUser?.phone && (
                  <a href={`https://wa.me/${selUser.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    style={{ padding: "6px 12px", background: "#25D366", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: ".78rem", textDecoration: "none", flexShrink: 0 }}>
                    💬 WA
                  </a>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: t.muted, marginTop: 60 }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>👋</div>
                    <p style={{ fontSize: ".88rem" }}>Student hasn't sent any messages yet.<br/>You can send the first message!</p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isAdmin = m.senderRole === "admin";
                    const prev = messages[i - 1];
                    const showDate = i === 0 || (
                      m.timestamp?.seconds && prev?.timestamp?.seconds &&
                      new Date(m.timestamp.seconds * 1000).toDateString() !== new Date(prev.timestamp.seconds * 1000).toDateString()
                    );
                    return (
                      <div key={m.id}>
                        {showDate && m.timestamp?.seconds && (
                          <div style={{ textAlign: "center", margin: "10px 0", fontSize: ".7rem", color: t.muted }}>
                            {fullDateStr(m.timestamp)}
                          </div>
                        )}
                        <div className="msg-wrap" style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6, marginBottom: 4 }}>
                          {!isAdmin && (
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},#4F46E5)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: ".65rem", flexShrink: 0 }}>
                              {(selUser?.ownerName || "U")[0].toUpperCase()}
                            </div>
                          )}
                          {isAdmin && (
                            <div className="msg-actions" style={{ display: "none", gap: 4, alignItems: "center" }}>
                              <button onClick={() => deleteMsg(m.id)} title="Delete"
                                style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: ".72rem", color: "#EF4444" }}>
                                🗑
                              </button>
                            </div>
                          )}
                          <div style={{ maxWidth: "72%", padding: "9px 13px", borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isAdmin ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard, border: isAdmin ? "none" : `1px solid ${t.border}`, color: isAdmin ? "#070B14" : t.text, wordBreak: "break-word" }}>
                            {!isAdmin && (
                              <div style={{ fontSize: ".67rem", fontWeight: 700, color: t.accent, marginBottom: 3 }}>
                                {m.senderName || "User"}
                              </div>
                            )}
                            <div style={{ fontSize: ".87rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
                            <div style={{ fontSize: ".63rem", color: isAdmin ? "rgba(0,0,0,.4)" : t.muted, marginTop: 3, textAlign: "right" }}>
                              {timeStr(m.timestamp)}{isAdmin && (m.read ? " ✓✓" : " ✓")}
                            </div>
                          </div>
                          {!isAdmin && (
                            <div className="msg-actions" style={{ display: "none", gap: 4, alignItems: "center" }}>
                              <button onClick={() => deleteMsg(m.id)} title="Delete"
                                style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: ".72rem", color: "#EF4444" }}>
                                🗑
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              {/* Quick replies */}
              <div style={{ padding: "6px 16px 0", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
                {QUICK.map((q, i) => (
                  <button key={i} onClick={() => setInput(q)}
                    style={{ padding: "4px 10px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 50, fontSize: ".7rem", color: t.muted, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}>
                    {q.slice(0, 26)}…
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${t.border}`, background: t.bgCard, display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                <textarea
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Type message... (Enter to send, Shift+Enter for new line)" rows={2}
                  style={{ flex: 1, padding: "9px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: ".88rem", color: t.text, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.4, boxSizing: "border-box" }}
                />
                <button onClick={sendMsg} disabled={!input.trim() || sending}
                  style={{ padding: "9px 18px", background: input.trim() ? "linear-gradient(135deg,#F59E0B,#F97316)" : t.bgCard, color: input.trim() ? "#070B14" : t.muted, border: "none", borderRadius: 9, fontWeight: 700, fontSize: ".86rem", cursor: input.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", height: 42, flexShrink: 0 }}>
                  {sending ? "…" : "Send ➤"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}