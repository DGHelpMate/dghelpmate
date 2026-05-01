// src/components/ui/Invoice.jsx
// Invoice / Receipt generator — works for:
// 1. Course enrollment (razorpay payment)
// 2. Client service payment
// 3. Bundle purchase
// Print karo ya PDF save karo via window.print()

export default function Invoice({ data, onClose }) {
  // data = {
  //   invoiceNo, date, type (course|service|bundle),
  //   customerName, customerEmail, customerPhone, customerAddress,
  //   items: [{ desc, qty, rate, amount }],
  //   subtotal, discount, total,
  //   paymentMethod, paymentId, status,
  // }

  const {
    invoiceNo, date, type="service",
    customerName="", customerEmail="", customerPhone="", customerAddress="",
    items=[], subtotal=0, discount=0, total=0,
    paymentMethod="Razorpay", paymentId="", status="Paid",
  } = data;

  const today = date || new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });

  const handlePrint = () => {
    const printContent = document.getElementById("dg-invoice").innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Invoice — DG HelpMate</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Segoe UI',Arial,sans-serif; background:#fff; color:#111; }
        .invoice-wrap { max-width:700px; margin:0 auto; padding:40px; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:3px solid #F59E0B; padding-bottom:20px; }
        .logo-box { display:flex; align-items:center; gap:12px; }
        .logo-img { width:52px; height:52px; object-fit:contain; }
        .brand-name { font-size:1.4rem; font-weight:900; color:#111; }
        .brand-sub { font-size:.78rem; color:#666; }
        .invoice-meta { text-align:right; }
        .invoice-title { font-size:1.6rem; font-weight:900; color:#F59E0B; letter-spacing:.05em; }
        .invoice-no { font-size:.82rem; color:#666; margin-top:4px; }
        .invoice-date { font-size:.82rem; color:#666; }
        .bill-section { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; }
        .bill-box { background:#f9f9f9; border-radius:8px; padding:14px 16px; }
        .bill-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#888; margin-bottom:6px; }
        .bill-name { font-size:.95rem; font-weight:700; color:#111; }
        .bill-info { font-size:.82rem; color:#555; margin-top:2px; }
        table { width:100%; border-collapse:collapse; margin-bottom:24px; }
        thead tr { background:#F59E0B; }
        thead th { padding:10px 14px; text-align:left; font-size:.78rem; font-weight:700; color:#070B14; text-transform:uppercase; letter-spacing:.05em; }
        tbody tr:nth-child(even) { background:#fafafa; }
        tbody td { padding:10px 14px; font-size:.88rem; color:#333; border-bottom:1px solid #eee; }
        .text-right { text-align:right; }
        .totals { margin-left:auto; width:260px; margin-bottom:24px; }
        .total-row { display:flex; justify-content:space-between; padding:5px 0; font-size:.88rem; color:#555; }
        .total-row.final { border-top:2px solid #F59E0B; margin-top:6px; padding-top:10px; font-size:1.1rem; font-weight:900; color:#111; }
        .payment-box { background:#f0faf0; border:1px solid #a8d5a2; border-radius:8px; padding:14px 16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; }
        .paid-badge { background:#10B981; color:#fff; padding:5px 14px; border-radius:50px; font-size:.8rem; font-weight:700; }
        .footer { text-align:center; color:#888; font-size:.76rem; border-top:1px solid #eee; padding-top:16px; }
        .footer strong { color:#F59E0B; }
        @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
      </style></head><body>
      <div class="invoice-wrap">${printContent}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  // Auto-generate invoice items if not provided
  const invoiceItems = items.length > 0 ? items : [
    { desc: data.itemName || "Service / Product", qty: 1, rate: total, amount: total }
  ];
  const calcSubtotal = invoiceItems.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:16, maxWidth:720, width:"100%", maxHeight:"92vh", overflowY:"auto", position:"relative" }}>

        {/* Action buttons */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"rgba(255,255,255,.95)", backdropFilter:"blur(8px)", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #eee" }}>
          <div style={{ fontWeight:700, fontSize:".95rem", color:"#111" }}>🧾 Invoice #{invoiceNo || "001"}</div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handlePrint} style={{ padding:"8px 18px", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14", border:"none", borderRadius:8, fontWeight:700, fontSize:".88rem", cursor:"pointer" }}>
              🖨️ Print / Save PDF
            </button>
            <button onClick={onClose} style={{ padding:"8px 14px", background:"#f1f1f1", border:"none", borderRadius:8, fontWeight:600, fontSize:".88rem", cursor:"pointer", color:"#555" }}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div id="dg-invoice" style={{ padding:"32px 36px", color:"#111", fontFamily:"'Segoe UI',Arial,sans-serif" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, borderBottom:"3px solid #F59E0B", paddingBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <img src="/images/logo.png" alt="DG HelpMate" style={{ width:52, height:52, objectFit:"contain" }} onError={e=>{e.target.style.display="none"}}/>
              <div>
                <div style={{ fontSize:"1.3rem", fontWeight:900, color:"#111" }}>DG HelpMate</div>
                <div style={{ fontSize:".76rem", color:"#666", marginTop:2 }}>Digital Content Solutions for Coaching Institutes</div>
                <div style={{ fontSize:".73rem", color:"#888" }}>MSME Registered · Arwal, Bihar — 804402</div>
                <div style={{ fontSize:".73rem", color:"#888" }}>📞 +91 92416 53369 · support@dghelpmate.in</div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"1.8rem", fontWeight:900, color:"#F59E0B", letterSpacing:".05em" }}>INVOICE</div>
              <div style={{ fontSize:".82rem", color:"#666", marginTop:4 }}>Invoice No: <strong style={{ color:"#111" }}>#{invoiceNo || "DGH-001"}</strong></div>
              <div style={{ fontSize:".82rem", color:"#666" }}>Date: <strong style={{ color:"#111" }}>{today}</strong></div>
              <div style={{ marginTop:8 }}>
                <span style={{ background: status==="Paid" ? "#10B981" : "#F59E0B", color:"#fff", padding:"4px 12px", borderRadius:50, fontSize:".75rem", fontWeight:700 }}>
                  {status === "Paid" ? "✓ PAID" : status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Billed To / From */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
            <div style={{ background:"#f9f9f9", borderRadius:8, padding:"14px 16px" }}>
              <div style={{ fontSize:".7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#888", marginBottom:6 }}>Billed To</div>
              <div style={{ fontWeight:700, fontSize:".95rem", color:"#111" }}>{customerName || "Customer"}</div>
              {customerEmail && <div style={{ fontSize:".8rem", color:"#555", marginTop:2 }}>📧 {customerEmail}</div>}
              {customerPhone && <div style={{ fontSize:".8rem", color:"#555" }}>📞 {customerPhone}</div>}
              {customerAddress && <div style={{ fontSize:".8rem", color:"#555" }}>📍 {customerAddress}</div>}
            </div>
            <div style={{ background:"#f9f9f9", borderRadius:8, padding:"14px 16px" }}>
              <div style={{ fontSize:".7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:".1em", color:"#888", marginBottom:6 }}>Payment Info</div>
              <div style={{ fontSize:".85rem", color:"#333" }}>
                <div>Method: <strong>{paymentMethod}</strong></div>
                {paymentId && <div style={{ marginTop:3 }}>Txn ID: <span style={{ fontFamily:"monospace", fontSize:".78rem", color:"#555" }}>{paymentId}</span></div>}
                <div style={{ marginTop:3 }}>Type: <strong style={{ textTransform:"capitalize" }}>{type}</strong></div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:20 }}>
            <thead>
              <tr style={{ background:"#F59E0B" }}>
                <th style={{ padding:"10px 14px", textAlign:"left", fontSize:".77rem", fontWeight:700, color:"#070B14", textTransform:"uppercase" }}>#</th>
                <th style={{ padding:"10px 14px", textAlign:"left", fontSize:".77rem", fontWeight:700, color:"#070B14", textTransform:"uppercase" }}>Description</th>
                <th style={{ padding:"10px 14px", textAlign:"center", fontSize:".77rem", fontWeight:700, color:"#070B14", textTransform:"uppercase" }}>Qty</th>
                <th style={{ padding:"10px 14px", textAlign:"right", fontSize:".77rem", fontWeight:700, color:"#070B14", textTransform:"uppercase" }}>Rate</th>
                <th style={{ padding:"10px 14px", textAlign:"right", fontSize:".77rem", fontWeight:700, color:"#070B14", textTransform:"uppercase" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, i) => (
                <tr key={i} style={{ background: i%2===0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding:"10px 14px", fontSize:".85rem", color:"#555", borderBottom:"1px solid #eee" }}>{i+1}</td>
                  <td style={{ padding:"10px 14px", fontSize:".88rem", color:"#222", borderBottom:"1px solid #eee", fontWeight:500 }}>{item.desc}</td>
                  <td style={{ padding:"10px 14px", fontSize:".85rem", color:"#555", borderBottom:"1px solid #eee", textAlign:"center" }}>{item.qty || 1}</td>
                  <td style={{ padding:"10px 14px", fontSize:".85rem", color:"#555", borderBottom:"1px solid #eee", textAlign:"right" }}>₹{(item.rate || item.amount || 0).toLocaleString()}</td>
                  <td style={{ padding:"10px 14px", fontSize:".88rem", color:"#111", borderBottom:"1px solid #eee", textAlign:"right", fontWeight:700 }}>₹{(item.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
            <div style={{ width:260 }}>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:".87rem", color:"#555" }}>
                <span>Subtotal</span>
                <span>₹{calcSubtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:".87rem", color:"#10B981" }}>
                  <span>Discount</span>
                  <span>-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 5px", fontSize:"1.1rem", fontWeight:900, color:"#111", borderTop:"2px solid #F59E0B", marginTop:5 }}>
                <span>Total</span>
                <span style={{ color:"#F59E0B" }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment confirmation */}
          {status === "Paid" && (
            <div style={{ background:"#f0faf0", border:"1px solid #a8d5a2", borderRadius:8, padding:"12px 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700, color:"#065f46", fontSize:".9rem" }}>✅ Payment Received</div>
                {paymentId && <div style={{ fontSize:".78rem", color:"#4ade80", marginTop:2 }}>Transaction ID: {paymentId}</div>}
              </div>
              <span style={{ background:"#10B981", color:"#fff", padding:"5px 14px", borderRadius:50, fontSize:".8rem", fontWeight:700 }}>PAID</span>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign:"center", color:"#888", fontSize:".76rem", borderTop:"1px solid #eee", paddingTop:16 }}>
            <div style={{ marginBottom:4 }}>Thank you for your business! 🙏</div>
            <div>This is a computer-generated invoice from <strong style={{ color:"#F59E0B" }}>DG HelpMate</strong></div>
            <div>For queries: <strong>support@dghelpmate.in</strong> · <strong>+91 92416 53369</strong> · <strong>www.dghelpmate.com</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}