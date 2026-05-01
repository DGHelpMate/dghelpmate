// src/utils/whatsapp.js
// Centralized WhatsApp notification system
// Auto-opens WhatsApp with pre-filled message for different events

const ADMIN_WA = "919241653369";
const BUSINESS = "DG HelpMate";

// ── Open WhatsApp with message ────────────────────────────────
function openWA(phone, message) {
  const num = phone ? phone.replace(/\D/g, "") : ADMIN_WA;
  const finalNum = num.startsWith("91") ? num : "91" + num;
  const url = `https://wa.me/${finalNum}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ── 1. Course Enrollment ──────────────────────────────────────
export function waEnrollmentToAdmin({ studentName, studentPhone, courseTitle, amount, paymentId }) {
  const msg =
`🎓 *New Course Enrollment!*

👤 Student: *${studentName}*
📞 Phone: ${studentPhone || "N/A"}
📚 Course: *${courseTitle}*
💰 Amount: *₹${Number(amount).toLocaleString()}*
💳 Payment ID: ${paymentId}

✅ Auto-enrolled. Check Admin Panel.`;
  openWA(ADMIN_WA, msg);
}

export function waEnrollmentToStudent({ studentPhone, courseTitle }) {
  if (!studentPhone) return;
  const msg =
`✅ *Enrollment Confirmed — ${BUSINESS}*

Namaste! 🙏

Aapka *${courseTitle}* course enroll ho gaya hai!

👉 Login karein: *www.dghelpmate.com*
▶️ Course access karein Student Portal se

Koi sawaal ho toh reply karein.
— ${BUSINESS}`;
  openWA(studentPhone, msg);
}

// ── 2. Service / Bundle Purchase ─────────────────────────────
export function waServicePurchaseToAdmin({ customerName, customerPhone, itemName, amount, paymentId }) {
  const msg =
`⚡ *New Service Purchase!*

👤 Customer: *${customerName || "New Customer"}*
📞 Phone: ${customerPhone || "N/A"}
🛒 Item: *${itemName}*
💰 Amount: *₹${Number(amount).toLocaleString()}*
💳 Payment ID: ${paymentId}

📋 Check Admin Panel for details.`;
  openWA(ADMIN_WA, msg);
}

export function waServiceConfirmToCustomer({ customerPhone, itemName, amount, paymentId }) {
  if (!customerPhone) return;
  const msg =
`✅ *Payment Confirmed — ${BUSINESS}*

Namaste! 🙏

Aapki payment receive ho gayi hai.

🛒 Item: *${itemName}*
💰 Amount: *₹${Number(amount).toLocaleString()}*
💳 Txn ID: ${paymentId}

Hum jald hi aapka kaam shuru karenge.
Status updates ke liye Client Portal check karein: *www.dghelpmate.com*

— Govardhan Pandit, ${BUSINESS}`;
  openWA(customerPhone, msg);
}

// ── 3. New Client Registration ────────────────────────────────
export function waNewClientToAdmin({ ownerName, coachingName, phone, city, email }) {
  const msg =
`🏫 *New Client Registration!*

👤 Name: *${ownerName}*
🏢 Coaching: *${coachingName || "N/A"}*
📞 Phone: ${phone}
📍 City: ${city || "N/A"}
📧 Email: ${email}

⏳ Approval pending — check Admin Panel.`;
  openWA(ADMIN_WA, msg);
}

export function waRegistrationConfirmToClient({ phone, ownerName }) {
  if (!phone) return;
  const msg =
`✅ *Registration Successful — ${BUSINESS}*

Namaste *${ownerName}*! 🙏

Aapka account successfully register ho gaya hai.

📧 Email verify karein (inbox check karein)
⏳ Admin 24 hours mein approve karega
💬 Faster approval: Reply "APPROVE" ya call karein

Login: *www.dghelpmate.com*

— ${BUSINESS}`;
  openWA(phone, msg);
}

// ── 4. Order Status Update ────────────────────────────────────
export function waOrderStatusUpdate({ clientPhone, clientName, orderTopic, status, driveLink }) {
  if (!clientPhone) return;
  const statusMsg = {
    inprogress: `🔄 Aapka order *"${orderTopic}"* par kaam shuru ho gaya hai!`,
    revision:   `📝 Aapka order *"${orderTopic}"* revision mein hai. Jald complete hoga.`,
    done:       `✅ Aapka order *"${orderTopic}"* complete ho gaya hai!\n\n📁 File: ${driveLink || "Client Portal mein available hai"}`,
    cancelled:  `❌ Aapka order *"${orderTopic}"* cancel ho gaya. Koi sawaal? Reply karein.`,
  }[status] || `📦 Order update: *${orderTopic}* — Status: ${status}`;

  const msg =
`📦 *Order Update — ${BUSINESS}*

Namaste *${clientName}*! 🙏

${statusMsg}

👉 Details: *www.dghelpmate.com* (Client Portal)

— Govardhan Pandit`;
  openWA(clientPhone, msg);
}

// ── 5. Payment Due Reminder ───────────────────────────────────
export function waPaymentReminder({ clientPhone, clientName, dueAmount, coachingName }) {
  if (!clientPhone) return;
  const msg =
`💰 *Payment Reminder — ${BUSINESS}*

Namaste *${clientName}*! 🙏

${coachingName ? `(${coachingName})` : ""}

Aapka outstanding balance hai: *₹${Number(dueAmount).toLocaleString()}*

UPI: *dghelpmate@axl*
Phone: *+91 92416 53369*

Payment ke baad screenshot share karein.
— ${BUSINESS}`;
  openWA(clientPhone, msg);
}

// ── 6. File Delivered ─────────────────────────────────────────
export function waFileDelivered({ clientPhone, clientName, fileTitle, driveLink }) {
  if (!clientPhone) return;
  const msg =
`📁 *File Delivered — ${BUSINESS}*

Namaste *${clientName}*! 🙏

Aapki file ready hai:
📄 *${fileTitle}*

🔗 Download: ${driveLink}

Koi revision chahiye? Reply karein.
— Govardhan Pandit, ${BUSINESS}`;
  openWA(clientPhone, msg);
}
// ── 7. Review Request (after order completion) ────────────────────────────
export function waReviewRequest({ clientPhone, clientName, orderTopic, clientId, orderId }) {
  if (!clientPhone) return;
  const reviewUrl = `https://dghelpmate.com/#review?clientId=${clientId}&orderId=${orderId}&name=${encodeURIComponent(clientName)}`;
  const msg =
`⭐ *Review Request — ${BUSINESS}*

Namaste *${clientName}*! 🙏

Aapka order *"${orderTopic}"* complete ho gaya hai!

Aapka kuch minute leke apna experience share karein — isse hamare doosre clients ko bahut help milegi.

👇 Review dene ke liye click karein:
${reviewUrl}

Thank you! 🙏
— Govardhan Pandit, ${BUSINESS}`;
  openWA(clientPhone, msg);
}