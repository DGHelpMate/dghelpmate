// src/utils/razorpay.js — LIVE MODE (Secure)
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const BUSINESS_NAME = "DG HelpMate";
const BUSINESS_LOGO = "https://dghelpmate.com/images/logo.png";
const WA_NUM        = "919241653369";

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpay({
  amount, name, description = "",
  prefillName = "", prefillEmail = "", prefillPhone = "",
  onSuccess, onFailure,
}) {
  if (!RAZORPAY_KEY_ID) {
    alert("Payment setup incomplete. WhatsApp karo: +91 92416 53369");
    onFailure?.("missing_key");
    return;
  }

  if (!amount || Number(amount) <= 0) {
    alert("Amount invalid hai.");
    onFailure?.("invalid_amount");
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded) {
    alert("Payment gateway load nahi hua. Internet check karo.");
    onFailure?.("script_load_failed");
    return;
  }

  const amountInPaise = Math.round(Number(amount) * 100);

  const options = {
    key:         RAZORPAY_KEY_ID,
    amount:      amountInPaise,
    currency:    "INR",
    name:        BUSINESS_NAME,
    description: name,
    image:       BUSINESS_LOGO,
    handler: function (response) {
      onSuccess?.(
        response.razorpay_payment_id,
        response.razorpay_order_id   || "",
        response.razorpay_signature  || ""
      );
    },
    prefill: { name: prefillName, email: prefillEmail, contact: prefillPhone },
    theme: { color: "#F59E0B" },
    modal: {
      confirm_close: true,
      ondismiss: () => { onFailure?.("dismissed"); },
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      const reason = response.error?.description || "Payment failed";
      if (reason !== "dismissed") alert("Payment fail hua: " + reason + "\n\nWhatsApp: +91 92416 53369");
      onFailure?.(reason);
    });
    rzp.open();
  } catch (err) {
    alert("Error: " + err.message);
    onFailure?.(err.message);
  }
}

export function waPaymentFallback(item, amount) {
  const msg = `Hi DG HelpMate!%0AMujhe *${item}* ke liye payment karni hai.%0AAmount: *%E2%82%B9${amount}*`;
  return `https://wa.me/${WA_NUM}?text=${msg}`;
}