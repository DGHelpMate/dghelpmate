// functions/index.js — Firebase Cloud Functions
// Razorpay Payment Webhook — server-side payment verification

const functions   = require("firebase-functions");
const admin       = require("firebase-admin");
const crypto      = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// ── Razorpay Webhook Secret ──────────────────────────────────────────────────
// Firebase Console → Functions → Environment Variables mein set karo:
// RAZORPAY_WEBHOOK_SECRET = apna Razorpay dashboard ka webhook secret
const WEBHOOK_SECRET = functions.config().razorpay?.webhook_secret || "";

// ── Razorpay Payment Webhook ─────────────────────────────────────────────────
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST")    { res.status(405).send("Method not allowed"); return; }

  try {
    // ── 1. Signature verify karo ────────────────────────────────────────
    const signature  = req.headers["x-razorpay-signature"];
    const body       = JSON.stringify(req.body);
    const expected   = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (WEBHOOK_SECRET && signature !== expected) {
      console.error("[Webhook] Invalid signature");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const event   = req.body.event;
    const payload = req.body.payload;

    console.log("[Webhook] Event received:", event);

    // ── 2. payment.captured — successful payment ────────────────────────
    if (event === "payment.captured") {
      const payment   = payload.payment?.entity;
      const paymentId = payment?.id;
      const amount    = payment?.amount / 100; // paise → rupees
      const notes     = payment?.notes || {};

      console.log("[Webhook] Payment captured:", paymentId, "₹" + amount);

      // Firestore mein save karo
      await db.collection("payments").doc(paymentId).set({
        paymentId,
        amount,
        currency:    payment?.currency || "INR",
        status:      "captured",
        method:      payment?.method || "",
        email:       payment?.email || notes.email || "",
        contact:     payment?.contact || notes.phone || "",
        courseId:    notes.courseId || "",
        userId:      notes.userId || "",
        description: payment?.description || "",
        capturedAt:  admin.firestore.FieldValue.serverTimestamp(),
        raw:         payment,
      });

      // Enrollment confirm karo agar courseId aur userId available hai
      if (notes.courseId && notes.userId) {
        const enrollQ = await db.collection("enrollments")
          .where("courseId", "==", notes.courseId)
          .where("userId",   "==", notes.userId)
          .limit(1).get();

        if (enrollQ.empty) {
          // Enrollment nahi thi — create karo
          await db.collection("enrollments").add({
            courseId:     notes.courseId,
            userId:       notes.userId,
            courseTitle:  notes.courseTitle || "",
            studentName:  notes.studentName || "",
            email:        notes.email || "",
            amount,
            razorpayPaymentId: paymentId,
            progress:          0,
            completedLectures: [],
            enrolledAt:        admin.firestore.FieldValue.serverTimestamp(),
            paymentStatus:     "captured",
          });
          console.log("[Webhook] Enrollment created for", notes.userId, notes.courseId);
        } else {
          // Enrollment hai — payment status update karo
          await enrollQ.docs[0].ref.update({
            paymentStatus:     "captured",
            razorpayPaymentId: paymentId,
          });
          console.log("[Webhook] Enrollment payment status updated");
        }

        // Admin ko notification bhejo
        const adminSnap = await db.collection("users")
          .where("role", "==", "admin").limit(1).get();
        if (!adminSnap.empty) {
          await db.collection("notifications").add({
            toUserId:  adminSnap.docs[0].id,
            toRole:    "admin",
            title:     "💰 Payment Received!",
            body:      `₹${amount} payment captured. PaymentID: ${paymentId}`,
            type:      "payment",
            read:      false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      res.status(200).json({ status: "ok", paymentId });
      return;
    }

    // ── 3. payment.failed ──────────────────────────────────────────────
    if (event === "payment.failed") {
      const payment   = payload.payment?.entity;
      const paymentId = payment?.id;

      await db.collection("payments").doc(paymentId).set({
        paymentId,
        status:    "failed",
        error:     payment?.error_description || "",
        failedAt:  admin.firestore.FieldValue.serverTimestamp(),
        raw:       payment,
      }, { merge: true });

      console.log("[Webhook] Payment failed:", paymentId);
      res.status(200).json({ status: "ok" });
      return;
    }

    // Other events — acknowledge karo
    res.status(200).json({ status: "ok", event });

  } catch (err) {
    console.error("[Webhook] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Auto-enrollment on successful payment (callable function) ────────────────
// Student app se directly call kar sakta hai payment ke baad
exports.confirmEnrollment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");

  const { paymentId, courseId, courseTitle, amount } = data;
  const userId = context.auth.uid;

  // Check karo already enrolled hai ya nahi
  const existing = await db.collection("enrollments")
    .where("courseId", "==", courseId)
    .where("userId",   "==", userId)
    .limit(1).get();

  if (!existing.empty) {
    return { success: true, message: "Already enrolled" };
  }

  // Enrollment create karo
  await db.collection("enrollments").add({
    courseId, userId, courseTitle,
    amount:           Number(amount) || 0,
    razorpayPaymentId: paymentId,
    studentName:      context.auth.token?.name || "",
    email:            context.auth.token?.email || "",
    progress:          0,
    completedLectures: [],
    enrolledAt:        admin.firestore.FieldValue.serverTimestamp(),
    paymentStatus:     "captured",
  });

  return { success: true };
});