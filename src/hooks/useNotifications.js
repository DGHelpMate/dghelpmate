// src/hooks/useNotifications.js
import { useState, useEffect, useRef } from "react";
import {
  collection, onSnapshot, query, where,
  limit, updateDoc, doc, addDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";

// ── Send notification ────────────────────────────────────────────────────────
export async function sendNotification({ toUserId, toRole, title, body, type, link }) {
  if (!toUserId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      toUserId, toRole: toRole||"client",
      title, body,
      type: type || "info",
      link: link || "",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch(e) { console.error("Notification error:", e); }
}

// ── Send notification to admin (client actions se) ───────────────────────────
export async function sendAdminNotification({ title, body, type, fromUserId, fromName }) {
  try {
    // Admin users ko dhundho aur notification bhejo
    const { getDocs, query: q, collection: col, where: wh } = await import("firebase/firestore");
    const snap = await getDocs(q(col(db,"users"), wh("role","==","admin")));
    for (const adminDoc of snap.docs) {
      const adminUid = adminDoc.data().uid || adminDoc.id;
      await addDoc(collection(db, "notifications"), {
        toUserId: adminUid,
        toRole: "admin",
        title, body,
        type: type || "info",
        fromUserId: fromUserId || "",
        fromName: fromName || "",
        link: "",
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  } catch(e) { console.error("Admin notification error:", e); }
}

// ── Show browser notification ─────────────────────────────────────────────────
function showBrowserNotif(title, body, icon) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title || "DG HelpMate", {
      body: body || "",
      icon: icon || "/images/logo.png",
      badge: "/images/logo.png",
      tag: "dghelpmate-" + Date.now(), // unique tag = unique notification
    });
    // Auto close after 5 seconds
    setTimeout(() => n.close(), 5000);
  } catch(e) { console.error("Browser notif error:", e); }
}

// ── useNotifications hook ─────────────────────────────────────────────────────
export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const shownIds = useRef(new Set()); // Track which notifications already shown
  const isFirstLoad = useRef(true);  // Skip browser notif on initial load

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", userId),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);

      // Browser push — sirf NAYE notifications ke liye
      if (!isFirstLoad.current) {
        notifs.forEach(n => {
          if (!n.read && !shownIds.current.has(n.id)) {
            shownIds.current.add(n.id);
            showBrowserNotif(n.title, n.body, "/images/logo.png");
          }
        });
      } else {
        // First load pe existing IDs track karo — browser notif mat dikhao
        notifs.forEach(n => shownIds.current.add(n.id));
        isFirstLoad.current = false;
      }
    });

    return unsub;
  }, [userId]);

  const markRead = async (notifId) => {
    try { await updateDoc(doc(db, "notifications", notifId), { read: true }); }
    catch(e) { console.error(e); }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n =>
      updateDoc(doc(db, "notifications", n.id), { read: true }).catch(()=>{})
    ));
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch { return false; }
  };

  return { notifications, unreadCount, markRead, markAllRead, requestPermission };
}