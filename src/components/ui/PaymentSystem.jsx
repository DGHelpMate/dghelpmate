// src/components/ui/PaymentSystem.jsx
// ✅ Razorpay integrated — auto payment verification
// Manual UPI fallback bhi hai agar Razorpay kaam na kare

import { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import useAuth from "../../hooks/useAuth";
import { openRazorpay, waPaymentFallback } from "../../utils/razorpay";

const WA_NUM = "919241653369";

// ── Client Payment Box (Course ya Service ke liye) ─────────────────────────────
export function ClientPaymentBox({ duesAmount, clientName, clientId, t }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(duesAmount || 0);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState("razorpay"); // "razorpay" | "upi"
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inp = {
    width: "100%", padding: "10px 14px",
    background: t.bg, border: `1.5px solid ${t.border}`,
    borderRadius: 9, fontSize: ".91rem", color: t.text,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  // ── Razorpay payment ──────────────────────────────────────────────────────
  const handleRazorpay = async () => {
    if (!amount || amount <= 0) { alert("Amount enter karo"); return; }
    setPaying(true);
    await openRazorpay({
      amount,
      name: "DG HelpMate — Payment",
      description: `Payment by ${clientName}`,
      prefillName: clientName,
      prefillEmail: user?.email || "",
      onSuccess: async (paymentId) => {
        // Firebase mein save karo
        try {
          await addDoc(collection(db, "clientPayments"), {
            clientId: user?.uid || clientId,
            clientName,
            amount: Number(amount),
            method: "Razorpay",
            razorpayPaymentId: paymentId,
            status: "verified",
            verified: true,
            createdAt: serverTimestamp(),
          });
          // totalPaid update karo
          const userSnap = await getDoc(doc(db, "users", user?.uid || clientId));
          if (userSnap.exists()) {
            const curr = userSnap.data().totalPaid || 0;
            await updateDoc(doc(db, "users", user?.uid || clientId), {
              totalPaid: curr + Number(amount),
            });
          }
          setDone(true);
        } catch (e) { alert("Payment hua lekin record save nahi hua. WhatsApp karo: " + paymentId); }
        setPaying(false);
      },
      onFailure: (err) => {
        if (err !== "dismissed") alert("Payment fail hua. WhatsApp karo ya UPI se try karo.");
        setPaying(false);
      },
    });
  };

  // ── Manual UPI submit ─────────────────────────────────────────────────────
  const submitManualUPI = async () => {
    if (!utr.trim()) { alert("UTR number enter karo"); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "paymentRequests"), {
        clientId: user?.uid || clientId,
        clientName,
        amount: Number(amount),
        utrNumber: utr.trim(),
        method: "UPI-Manual",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch { alert("Error. WhatsApp karo."); }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 16, padding: "24px", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎉</div>
      <h3 style={{ color: t.text, marginBottom: 8 }}>Payment Complete!</h3>
      <p style={{ color: t.muted, fontSize: ".9rem", lineHeight: 1.6 }}>
        ₹<strong style={{ color: t.gold }}>{amount}</strong> ka payment record ho gaya.
        {method === "upi" ? " 2-4 ghante mein verify hoga." : " Turant verify ho gaya!"}
      </p>
    </div>
  );

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${t.accent}20,${t.bgCard})`, padding: "16px 20px", borderBottom: `1px solid ${t.border}` }}>
        <h3 style={{ fontWeight: 800, color: t.text, marginBottom: 4 }}>💳 Payment</h3>
        <div style={{ fontSize: ".85rem", color: t.muted }}>
          Outstanding: <span style={{ color: t.red, fontWeight: 700 }}>₹{duesAmount?.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: ".78rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>Amount (₹)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inp} />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[duesAmount, Math.ceil(duesAmount / 2), 500, 1000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map(amt => (
              <button key={amt} onClick={() => setAmount(amt)} style={{ padding: "4px 12px", borderRadius: 50, border: `1px solid ${amount === amt ? t.gold : t.border}`, background: amount === amt ? `${t.gold}20` : "transparent", color: amount === amt ? t.gold : t.muted, fontSize: ".78rem", fontWeight: 700, cursor: "pointer" }}>₹{amt?.toLocaleString()}</button>
            ))}
          </div>
        </div>

        {/* Method Toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setMethod("razorpay")} style={{ padding: "12px", borderRadius: 12, border: `2px solid ${method === "razorpay" ? t.gold : t.border}`, background: method === "razorpay" ? `${t.gold}12` : t.bgCard2, cursor: "pointer", transition: "all .2s" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>⚡</div>
            <div style={{ fontWeight: 700, fontSize: ".82rem", color: t.text }}>Razorpay</div>
            <div style={{ fontSize: ".7rem", color: t.muted }}>Card · UPI · NetBanking</div>
            {method === "razorpay" && <div style={{ fontSize: ".68rem", color: t.green, fontWeight: 700, marginTop: 3 }}>✓ Instant Verify</div>}
          </button>
          <button onClick={() => setMethod("upi")} style={{ padding: "12px", borderRadius: 12, border: `2px solid ${method === "upi" ? t.accent : t.border}`, background: method === "upi" ? `${t.accent}12` : t.bgCard2, cursor: "pointer", transition: "all .2s" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>📱</div>
            <div style={{ fontWeight: 700, fontSize: ".82rem", color: t.text }}>Direct UPI</div>
            <div style={{ fontSize: ".7rem", color: t.muted }}>PhonePe · GPay · Paytm</div>
            {method === "upi" && <div style={{ fontSize: ".68rem", color: t.muted, fontWeight: 700, marginTop: 3 }}>Manual verify (2-4hr)</div>}
          </button>
        </div>

        {/* Razorpay Button */}
        {method === "razorpay" && (
          <button onClick={handleRazorpay} disabled={paying || !amount} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#F59E0B,#F97316)", color: "#070B14", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "1rem", cursor: paying ? "wait" : "pointer", fontFamily: "inherit", marginBottom: 10 }}>
            {paying ? "⏳ Processing..." : `⚡ Pay ₹${Number(amount).toLocaleString()} Instantly`}
          </button>
        )}

        {/* Manual UPI */}
        {method === "upi" && (
          <div>
            <div style={{ background: `${t.gold}10`, border: `1px solid ${t.gold}25`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 700, color: t.text, marginBottom: 8 }}>UPI Details:</div>
              {[["UPI ID", "dghelpmate@axl"], ["PhonePe / GPay", "+91 92416 53369"], ["Amount", `₹${Number(amount).toLocaleString()}`]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: ".83rem" }}>
                  <span style={{ color: t.muted }}>{k}</span>
                  <span style={{ fontWeight: 700, color: k === "Amount" ? t.red : t.text }}>{v}</span>
                </div>
              ))}
              <a href={`upi://pay?pa=dghelpmate@axl&pn=DG+HelpMate&am=${amount}&cu=INR`} style={{ display: "block", textAlign: "center", marginTop: 10, background: "linear-gradient(135deg,#F59E0B,#F97316)", color: "#070B14", padding: "9px", borderRadius: 8, fontWeight: 800, textDecoration: "none", fontSize: ".87rem" }}>
                📱 Open UPI App
              </a>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: ".78rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>UTR / Transaction Number *</label>
              <input value={utr} onChange={e => setUtr(e.target.value)} placeholder="12-digit UTR number" style={inp} />
            </div>
            <button onClick={submitManualUPI} disabled={!utr.trim() || submitting || !amount} style={{ width: "100%", padding: "13px", background: (utr.trim() && amount) ? "linear-gradient(135deg,#10B981,#059669)" : t.border, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: "1rem", cursor: (utr.trim() && amount) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              {submitting ? "Submitting..." : "✅ Submit for Verification"}
            </button>
          </div>
        )}

        <a href={`https://wa.me/${WA_NUM}`} target="_blank" style={{ display: "block", textAlign: "center", marginTop: 10, color: t.muted, fontSize: ".8rem", textDecoration: "none" }}>
          Problem? <span style={{ color: "#25D366", fontWeight: 700 }}>WhatsApp karo →</span>
        </a>
      </div>
    </div>
  );
}

// ── Admin Payment Verifier (Razorpay auto-verified + manual UPI pending) ───────
export function AdminPaymentVerifier({ t, onVerified }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { getDocs, query, collection, where, orderBy } = await import("firebase/firestore");
      try {
        const snap = await getDocs(query(
          collection(db, "paymentRequests"),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        ));
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const verify = async (reqId, clientId, amount) => {
    const { updateDoc, doc, addDoc, collection, serverTimestamp, getDoc } = await import("firebase/firestore");
    try {
      await updateDoc(doc(db, "paymentRequests", reqId), { status: "approved", verifiedAt: serverTimestamp() });
      await addDoc(collection(db, "clientPayments"), { clientId, amount: Number(amount), method: "UPI-Manual", note: "Manually verified", date: new Date().toISOString().split("T")[0], verified: true, createdAt: serverTimestamp() });
      const userSnap = await getDoc(doc(db, "users", clientId));
      if (userSnap.exists()) {
        const curr = userSnap.data().totalPaid || 0;
        await updateDoc(doc(db, "users", clientId), { totalPaid: curr + Number(amount) });
      }
      setRequests(prev => prev.filter(r => r.id !== reqId));
      if (onVerified) onVerified();
    } catch (e) { alert("Error: " + e.message); }
  };

  if (loading) return <div style={{ color: t.muted, padding: "10px 0" }}>Loading...</div>;
  if (requests.length === 0) return <div style={{ color: t.muted, fontSize: ".87rem", padding: "16px 0" }}>✅ No pending verifications (Razorpay payments auto-verify!)</div>;

  return (
    <div>
      <h3 style={{ fontWeight: 700, color: t.text, marginBottom: 14, fontSize: "1rem" }}>
        💳 Pending Manual UPI Verifications ({requests.length})
      </h3>
      <div style={{ fontSize: ".78rem", color: t.green, marginBottom: 12, background: "rgba(16,185,129,.08)", padding: "8px 12px", borderRadius: 8 }}>
        ℹ️ Razorpay payments auto-verify hote hain — sirf manual UPI wale yahan aate hain.
      </div>
      {requests.map(req => (
        <div key={req.id} style={{ background: t.bgCard, border: `1.5px solid ${t.gold}40`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: t.text }}>{req.clientName}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: t.gold }}>₹{req.amount?.toLocaleString()}</div>
              <div style={{ fontSize: ".76rem", color: t.muted, marginTop: 3 }}>UTR: <strong style={{ color: t.text }}>{req.utrNumber}</strong></div>
              <div style={{ fontSize: ".73rem", color: t.muted }}>{req.createdAt?.toDate?.()?.toLocaleString("en-IN") || ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => verify(req.id, req.clientId, req.amount)} style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 9, fontWeight: 700, fontSize: ".85rem", cursor: "pointer" }}>✓ Verify</button>
              <button onClick={async () => { const { updateDoc, doc } = await import("firebase/firestore"); await updateDoc(doc(db, "paymentRequests", req.id), { status: "rejected" }); setRequests(prev => prev.filter(r => r.id !== req.id)); }} style={{ background: "rgba(239,68,68,.12)", color: t.red, border: `1px solid rgba(239,68,68,.3)`, padding: "8px 14px", borderRadius: 9, fontWeight: 700, fontSize: ".85rem", cursor: "pointer" }}>✕ Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}