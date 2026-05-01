// src/components/ui/ChatSystem.jsx
// Real-time chat between Admin and Client using Firestore
// Each client has their own chat room: chats/{clientId}/messages
import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, doc, setDoc, getDoc
} from "firebase/firestore";
import { db } from "../../firebase/config";
import useAuth from "../../hooks/useAuth";

// ── Chat Bubble ───────────────────────────────────────────────────────────────
const DGLogo = () => (
  <div style={{
    width: 32, height: 32, borderRadius: "50%",
    overflow: "hidden", flexShrink: 0, marginRight: 8, marginTop: 2,
    border: "2px solid #F59E0B",
  }}>
    <img
      src="/images/logo.png"
      alt="DG"
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      onError={e => {
        e.target.style.display = "none";
        e.target.parentElement.style.background = "linear-gradient(135deg,#F59E0B,#F97316)";
        e.target.parentElement.style.display = "flex";
        e.target.parentElement.style.alignItems = "center";
        e.target.parentElement.style.justifyContent = "center";
        e.target.parentElement.innerText = "DG";
        e.target.parentElement.style.fontSize = ".65rem";
        e.target.parentElement.style.fontWeight = "900";
        e.target.parentElement.style.color = "#070B14";
      }}
    />
  </div>
);

const StudentAvatar = ({ name, color = "#6366F1" }) => (
  <div style={{
    width: 32, height: 32, borderRadius: "50%",
    background: `linear-gradient(135deg,${color},#818CF8)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: ".75rem", fontWeight: 800, color: "#fff",
    flexShrink: 0, marginLeft: 8, marginTop: 2,
    border: "2px solid rgba(99,102,241,.3)",
  }}>
    {(name || "S")[0].toUpperCase()}
  </div>
);

const Bubble = ({ msg, isMe, myName, t }) => (
  <div style={{
    display: "flex",
    justifyContent: isMe ? "flex-end" : "flex-start",
    alignItems: "flex-start",
    marginBottom: 12,
  }}>
    {!isMe && <DGLogo />}
    <div style={{ maxWidth: "72%" }}>
      {!isMe && (
        <div style={{ fontSize: ".7rem", color: t.muted, marginBottom: 3, marginLeft: 2, fontWeight: 600 }}>
          DG HelpMate
        </div>
      )}
      {isMe && (
        <div style={{ fontSize: ".7rem", color: t.muted, marginBottom: 3, marginRight: 2, textAlign: "right", fontWeight: 600 }}>
          {myName || "You"}
        </div>
      )}
      <div style={{
        background: isMe
          ? "linear-gradient(135deg,#6366F1,#4F46E5)"
          : t.bgCard2 || "#1A2440",
        color: isMe ? "#fff" : t.text,
        padding: "10px 14px",
        borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        fontSize: ".88rem",
        lineHeight: 1.55,
        border: isMe ? "none" : `1px solid ${t.border}`,
        boxShadow: isMe ? "0 4px 12px rgba(99,102,241,.25)" : "none",
      }}>
        {msg.text}
        {msg.fileUrl && (
          <a href={msg.fileUrl} target="_blank" style={{ display:"block", marginTop:6, color: isMe?"rgba(255,255,255,.8)":t.accent, fontSize:".8rem", fontWeight:700 }}>
            📎 {msg.fileName || "Attached File"}
          </a>
        )}
      </div>
      <div style={{ fontSize: ".66rem", color: t.muted, marginTop: 4, textAlign: isMe ? "right" : "left", marginLeft: isMe ? 0 : 2 }}>
        {msg.timestamp?.toDate?.()?.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) || ""}
      </div>
    </div>
    {isMe && <StudentAvatar name={myName} />}
  </div>
);

// ── Main Chat Component ───────────────────────────────────────────────────────
// chatId = clientId (each client has their own chat room)
// isAdmin = true for admin view, false for client view
export default function ChatWidget({ chatId, isAdmin = false, t, compact = false }) {
  const { user, profile }   = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText]     = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen]     = useState(!compact);
  const bottomRef = useRef();
  const inputRef  = useRef();

  const roomId = chatId || user?.uid;

  // ── Real-time listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      // Count unread from other side
      if (!open) {
        const newUnread = msgs.filter(m => m.senderRole !== (isAdmin ? "admin" : "client") && !m.read).length;
        setUnread(newUnread);
      }
      // Scroll to bottom
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [roomId, open]);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !roomId) return;
    setSending(true);
    try {
      const msgData = {
        text: text.trim(),
        senderId:   user?.uid,
        senderName: isAdmin ? "DG HelpMate (Govardhan)" : (profile?.coachingName || profile?.ownerName || "Client"),
        senderRole: isAdmin ? "admin" : "client",
        timestamp:  serverTimestamp(),
        read:       false,
      };
      await addDoc(collection(db, "chats", roomId, "messages"), msgData);

      // Update chat metadata (last message preview)
      await setDoc(doc(db, "chats", roomId), {
        clientId:    roomId,
        lastMessage: text.trim(),
        lastTime:    serverTimestamp(),
        lastSender:  isAdmin ? "admin" : "client",
        unreadAdmin: isAdmin ? 0 : (await getUnreadCount(roomId, "client")),
        unreadClient:isAdmin ? (await getUnreadCount(roomId, "admin")) : 0,
      }, { merge: true });

      setText("");
      inputRef.current?.focus();
    } catch(err) { console.error("Chat error:", err); }
    setSending(false);
  };

  const getUnreadCount = async (id, fromRole) => {
    // Simple count — not blocking
    return messages.filter(m => m.senderRole === fromRole && !m.read).length + 1;
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Compact floating version ───────────────────────────────────────────────
  if (compact) {
    return (
      <div style={{ position: "relative" }}>
        {/* Toggle button */}
        {!open && (
          <button onClick={() => { setOpen(true); setUnread(0); }} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: `linear-gradient(135deg,${t.accent},#4F46E5)`,
            color: "#fff", border: "none", borderRadius: 50,
            padding: "10px 18px", fontWeight: 700, fontSize: ".87rem", cursor: "pointer",
            position: "relative",
          }}>
            💬 Chat with {isAdmin ? "Client" : "DG HelpMate"}
            {unread > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                width: 20, height: 20, borderRadius: "50%",
                background: t.red, color: "#fff",
                fontSize: ".7rem", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{unread}</span>
            )}
          </button>
        )}

        {open && (
          <div style={{
            width: 340, background: t.bgCard, border: `1px solid ${t.border}`,
            borderRadius: 16, overflow: "hidden",
            boxShadow: `0 20px 60px ${t.shadow}`,
          }}>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg,${t.accent},#4F46E5)`,
              padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: ".9rem" }}>
                  💬 {isAdmin ? "Chat with Client" : "Chat with DG HelpMate"}
                </div>
                <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.7)" }}>
                  {isAdmin ? "Direct message" : "We reply within 2 hours"}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:"#fff", fontSize:"1.2rem", cursor:"pointer" }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ height: 280, overflowY: "auto", padding: "12px 14px", background: t.bg }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: t.muted, padding: "40px 0", fontSize: ".85rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
                  No messages yet. Say hello!
                </div>
              )}
              {messages.map(msg => (
                <Bubble key={msg.id} msg={msg} isMe={msg.senderId === user?.uid} myName={profile?.coachingName || profile?.ownerName || "You"} t={t} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 12px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8 }}>
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: "9px 12px",
                  background: t.bgCard2, border: `1px solid ${t.border}`,
                  borderRadius: 50, fontSize: ".87rem", color: t.text,
                  fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={send} disabled={!text.trim() || sending} style={{
                width: 36, height: 36, borderRadius: "50%",
                background: text.trim() ? `linear-gradient(135deg,${t.accent},#4F46E5)` : t.border,
                border: "none", color: "#fff", fontSize: ".9rem", cursor: text.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>➤</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Full page version ──────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: t.bg, borderRadius: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: t.muted, padding: "50px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map(msg => (
          <Bubble key={msg.id} msg={msg} isMe={msg.senderId === user?.uid} myName={profile?.coachingName || profile?.ownerName || "You"} t={t} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        display: "flex", gap: 10, padding: "12px 0 0",
        borderTop: `1px solid ${t.border}`, marginTop: 12,
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          style={{
            flex: 1, padding: "10px 14px",
            background: t.bgCard2, border: `1px solid ${t.border}`,
            borderRadius: 12, fontSize: ".88rem", color: t.text,
            fontFamily: "inherit", outline: "none", resize: "none",
          }}
        />
        <button onClick={send} disabled={!text.trim() || sending} style={{
          padding: "0 20px",
          background: text.trim()
            ? `linear-gradient(135deg,${t.accent},#4F46E5)`
            : t.border,
          border: "none", borderRadius: 12,
          color: "#fff", fontWeight: 700, fontSize: ".88rem",
          cursor: text.trim() ? "pointer" : "default",
          transition: "all .2s",
        }}>
          {sending ? "..." : "Send ➤"}
        </button>
      </div>
    </div>
  );
}

// ── Admin Chat List — shows all clients with unread counts ────────────────────
export function AdminChatList({ t, onSelectChat }) {
  const [chats, setChats] = useState([]);
  const [clients, setClients] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "chats"), async (snap) => {
      const chatList = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.lastTime?.seconds||0) - (a.lastTime?.seconds||0));
      setChats(chatList);

      // Fetch client names
      const clientData = {};
      for (const chat of chatList) {
        try {
          const userSnap = await getDoc(doc(db,"users",chat.clientId));
          if (userSnap.exists()) clientData[chat.clientId] = userSnap.data();
        } catch {}
      }
      setClients(clientData);
    });
    return unsub;
  }, []);

  return (
    <div>
      <h3 style={{ fontWeight: 700, color: t.text, marginBottom: 14, fontSize: "1rem" }}>
        💬 Client Messages
      </h3>
      {chats.length === 0 && (
        <div style={{ color: t.muted, fontSize: ".87rem", padding: "20px 0" }}>No conversations yet.</div>
      )}
      {chats.map(chat => {
        const client = clients[chat.clientId];
        return (
          <div key={chat.id}
            onClick={() => onSelectChat(chat.clientId)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", background: t.bgCard,
              border: `1px solid ${t.border}`, borderRadius: 12,
              marginBottom: 10, cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = t.bgCard2}
            onMouseLeave={e => e.currentTarget.style.background = t.bgCard}
          >
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: `linear-gradient(135deg,${t.accent},${t.gold})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, color: "#fff", fontSize: ".9rem", flexShrink: 0,
            }}>
              {client?.coachingName?.[0] || "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: t.text, fontSize: ".9rem" }}>
                {client?.coachingName || chat.clientId.substring(0,8)}
              </div>
              <div style={{ fontSize: ".75rem", color: t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {chat.lastMessage || "No messages yet"}
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              {chat.unreadAdmin > 0 && (
                <span style={{
                  background: t.red, color: "#fff",
                  width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: ".72rem", fontWeight: 800, marginBottom: 4,
                }}>{chat.unreadAdmin}</span>
              )}
              <div style={{ fontSize: ".68rem", color: t.muted }}>
                {chat.lastTime?.toDate?.()?.toLocaleDateString("en-IN") || ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}