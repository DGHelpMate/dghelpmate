// src/pages/LegalPages.jsx
// Privacy Policy | Terms & Conditions | Refund Policy

// ── Shared styles helper ──────────────────────────────────────
function LegalLayout({ title, icon, lastUpdated, children, t }) {
  return (
    <div style={{ background:t.bg, minHeight:"100vh", paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,"+t.bgCard+" 0%,"+t.bg+" 100%)", borderBottom:"1px solid "+t.border, padding:"clamp(32px,5%,56px) clamp(16px,5%,60px) clamp(24px,4%,40px)" }}>
        <div style={{ maxWidth:820, margin:"0 auto" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>{icon}</div>
          <h1 style={{ fontSize:"clamp(1.6rem,4vw,2.4rem)", fontWeight:900, color:t.text, marginBottom:8, lineHeight:1.2 }}>{title}</h1>
          <p style={{ color:t.muted, fontSize:".88rem" }}>Last updated: {lastUpdated} · DG HelpMate</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:820, margin:"0 auto", padding:"clamp(24px,4%,48px) clamp(16px,5%,60px)" }}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children, t }) {
  return (
    <div style={{ marginBottom:36 }}>
      <h2 style={{ fontSize:"1.1rem", fontWeight:800, color:t.text, marginBottom:12, paddingBottom:8, borderBottom:"2px solid "+t.gold+"44" }}>{title}</h2>
      <div style={{ color:t.muted, lineHeight:1.85, fontSize:".92rem" }}>{children}</div>
    </div>
  );
}

function Li({ children, t }) {
  return (
    <div style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
      <span style={{ color:t.gold, flexShrink:0, marginTop:2 }}>•</span>
      <span>{children}</span>
    </div>
  );
}

function ContactBox({ t }) {
  return (
    <div style={{ background:"linear-gradient(135deg,rgba(245,158,11,.1),rgba(245,158,11,.04))", border:"1px solid rgba(245,158,11,.25)", borderRadius:14, padding:"20px 24px", marginTop:36 }}>
      <div style={{ fontWeight:800, color:t.text, marginBottom:8, fontSize:"1rem" }}>📞 Koi sawaal hai?</div>
      <div style={{ color:t.muted, fontSize:".88rem", lineHeight:1.8 }}>
        <div>📧 Email: <a href="mailto:support@dghelpmate.in" style={{ color:t.accent }}>support@dghelpmate.in</a></div>
        <div>💬 WhatsApp: <a href="https://wa.me/919241653369" target="_blank" style={{ color:t.accent }}>+91 92416 53369</a></div>
        <div>🌐 Website: <a href="https://www.dghelpmate.com" style={{ color:t.accent }}>www.dghelpmate.com</a></div>
        <div>📍 Address: Rampur Chauram, Arwal, Bihar — 804402</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  1. PRIVACY POLICY
// ══════════════════════════════════════════════════════════════
export function PrivacyPolicy({ t }) {
  return (
    <LegalLayout title="Privacy Policy" icon="🔒" lastUpdated="22 March 2026" t={t}>

      <Section title="1. Introduction" t={t}>
        <p style={{ marginBottom:12 }}>
          DG HelpMate ("hum", "hamare", "company") aapki privacy ko seriously lete hain. Yeh Privacy Policy explain karti hai ki jab aap <strong style={{ color:t.text }}>www.dghelpmate.com</strong> use karte hain to hum kya information collect karte hain, kaise use karte hain, aur kaise protect karte hain.
        </p>
        <p>Yeh policy India ke IT Act 2000 aur Information Technology (Reasonable Security Practices) Rules 2011 ke anusaar hai.</p>
      </Section>

      <Section title="2. Jo Information Hum Collect Karte Hain" t={t}>
        <p style={{ marginBottom:10, fontWeight:700, color:t.text }}>Personal Information:</p>
        <Li t={t}>Naam, email address, phone number</Li>
        <Li t={t}>Coaching institute ka naam aur shehar</Li>
        <Li t={t}>Payment information (Razorpay ke through — hum card details store nahi karte)</Li>
        <Li t={t}>Profile photo aur logo (agar upload karo)</Li>

        <p style={{ marginBottom:10, marginTop:16, fontWeight:700, color:t.text }}>Automatically Collected Information:</p>
        <Li t={t}>IP address aur browser type</Li>
        <Li t={t}>Pages visited aur time spent</Li>
        <Li t={t}>Device information (mobile/desktop)</Li>
        <Li t={t}>Course progress aur completion data</Li>
      </Section>

      <Section title="3. Information Ka Upyog" t={t}>
        <p style={{ marginBottom:10 }}>Hum aapki information in kamon ke liye use karte hain:</p>
        <Li t={t}>Account banana aur manage karna</Li>
        <Li t={t}>Courses aur services provide karna</Li>
        <Li t={t}>Payments process karna aur receipts bhejna</Li>
        <Li t={t}>Customer support dena (WhatsApp/Email)</Li>
        <Li t={t}>Service improvements ke liye analytics</Li>
        <Li t={t}>Important updates aur notifications bhejna</Li>
      </Section>

      <Section title="4. Information Sharing" t={t}>
        <p style={{ marginBottom:12 }}>
          <strong style={{ color:t.text }}>Hum aapka data kisi ko bechte nahi hain.</strong> Hum sirf in circumstances mein share karte hain:
        </p>
        <Li t={t}><strong style={{ color:t.text }}>Razorpay:</strong> Payment processing ke liye — unki apni Privacy Policy apply hoti hai</Li>
        <Li t={t}><strong style={{ color:t.text }}>Firebase (Google):</strong> Data storage aur authentication ke liye</Li>
        <Li t={t}><strong style={{ color:t.text }}>Legal requirements:</strong> Court order ya government request par</Li>
      </Section>

      <Section title="5. Data Security" t={t}>
        <Li t={t}>Aapka data Firebase ke secure servers par store hota hai</Li>
        <Li t={t}>Passwords encrypted hain — hum unhe kabhi nahi dekh sakte</Li>
        <Li t={t}>Payment data Razorpay ke PCI-DSS compliant servers par hai</Li>
        <Li t={t}>Hum aapke data ko unauthorized access se protect karte hain</Li>
      </Section>

      <Section title="6. Cookies" t={t}>
        <p>Hum basic cookies use karte hain jo website functioning ke liye zaroori hain (login state, preferences). Hum third-party advertising cookies use nahi karte.</p>
      </Section>

      <Section title="7. Aapke Rights" t={t}>
        <Li t={t}>Apna data access karne ka haq</Li>
        <Li t={t}>Data correction ka haq</Li>
        <Li t={t}>Account deletion ka haq (WhatsApp/Email se request karein)</Li>
        <Li t={t}>Marketing emails se unsubscribe karne ka haq</Li>
      </Section>

      <Section title="8. Children's Privacy" t={t}>
        <p>Haari services 13 saal se kam umar ke bacchon ke liye nahi hain. Agar aapko lagta hai ki kisi child ne account banaya hai, please humse contact karein.</p>
      </Section>

      <Section title="9. Policy Changes" t={t}>
        <p>Hum yeh policy kabhi bhi update kar sakte hain. Major changes ke liye hum email/WhatsApp pe notify karenge. Website pe last updated date dekh sakte hain.</p>
      </Section>

      <ContactBox t={t}/>
    </LegalLayout>
  );
}

// ══════════════════════════════════════════════════════════════
//  2. TERMS & CONDITIONS
// ══════════════════════════════════════════════════════════════
export function TermsConditions({ t }) {
  return (
    <LegalLayout title="Terms & Conditions" icon="📋" lastUpdated="22 March 2026" t={t}>

      <Section title="1. Agreement" t={t}>
        <p>
          DG HelpMate ki website aur services use karke aap in Terms & Conditions se agree karte hain. Agar agree nahi karte to please services use mat karein. Yeh terms Indian law ke anusaar hain.
        </p>
      </Section>

      <Section title="2. Services" t={t}>
        <p style={{ marginBottom:10 }}>DG HelpMate provide karta hai:</p>
        <Li t={t}>Online courses (Smart Teachers Mastery Course, Fast Typing, etc.)</Li>
        <Li t={t}>MCQ Question Banks aur educational content</Li>
        <Li t={t}>PPT designing, thumbnail creation, YouTube management</Li>
        <Li t={t}>Client portal access for coaching institutes</Li>
        <Li t={t}>Digital content creation services</Li>
      </Section>

      <Section title="3. Account Registration" t={t}>
        <Li t={t}>Accurate information provide karna aapki zimmedari hai</Li>
        <Li t={t}>Account security aapki responsibility hai — password kisi ko share mat karein</Li>
        <Li t={t}>Ek person ek hi account bana sakta hai</Li>
        <Li t={t}>Admin approval ke baad hi account activate hoga (client/student accounts)</Li>
        <Li t={t}>18 saal se kam age ke users ke liye parent/guardian consent zaroori hai</Li>
      </Section>

      <Section title="4. Course Terms" t={t}>
        <Li t={t}>Course purchase ke baad aapko lifetime personal access milta hai</Li>
        <Li t={t}>Course content ko copy, share, resell ya redistribute karna mana hai</Li>
        <Li t={t}>Screen recording aur unauthorized download prohibited hai</Li>
        <Li t={t}>Course content ka commercial use bina permission ke nahi kar sakte</Li>
        <Li t={t}>Certificate tabhi milega jab 100% course complete hoga</Li>
      </Section>

      <Section title="5. Payments" t={t}>
        <Li t={t}>Sab payments Indian Rupees (INR) mein hain</Li>
        <Li t={t}>Payments Razorpay ke through process hoti hain (UPI, Card, Net Banking)</Li>
        <Li t={t}>Payment successful hone ke baad instant access milta hai</Li>
        <Li t={t}>GST applicable hoga jahan required ho</Li>
        <Li t={t}>Payment failure par auto-refund 5-7 business days mein aata hai</Li>
      </Section>

      <Section title="6. Prohibited Activities" t={t}>
        <p style={{ marginBottom:10 }}>Yeh kaam strictly mana hain:</p>
        <Li t={t}>Course content ko kisi doosre ke saath share karna</Li>
        <Li t={t}>Fake reviews ya ratings dena</Li>
        <Li t={t}>Platform ko hack karne ki koshish karna</Li>
        <Li t={t}>Dusre users ko harass karna</Li>
        <Li t={t}>Copyright material ka unauthorized use</Li>
        <Li t={t}>Ek se zyada accounts banana</Li>
      </Section>

      <Section title="7. Intellectual Property" t={t}>
        <p>DG HelpMate ke sare content — courses, videos, PDFs, templates, designs — haari intellectual property hain. Inhe bina written permission ke reproduce karna illegal hai aur legal action ho sakta hai.</p>
      </Section>

      <Section title="8. Limitation of Liability" t={t}>
        <p style={{ marginBottom:10 }}>DG HelpMate zimmedaar nahi hoga:</p>
        <Li t={t}>Internet connectivity issues se hone wale problems</Li>
        <Li t={t}>Third-party services (YouTube, Razorpay) ki downtime</Li>
        <Li t={t}>Course se expected results na aane par (results individual effort pe depend karte hain)</Li>
        <Li t={t}>Force majeure events (natural disasters, government actions)</Li>
      </Section>

      <Section title="9. Termination" t={t}>
        <p>DG HelpMate kisi bhi account ko bina notice ke terminate kar sakta hai agar Terms violate hote hain. Aise case mein refund available nahi hoga.</p>
      </Section>

      <Section title="10. Governing Law" t={t}>
        <p>Yeh Terms Indian law se govern hote hain. Koi bhi dispute Bihar courts mein resolve hoga. Informal resolution ke liye pehle WhatsApp/Email se contact karein.</p>
      </Section>

      <ContactBox t={t}/>
    </LegalLayout>
  );
}

// ══════════════════════════════════════════════════════════════
//  3. REFUND POLICY
// ══════════════════════════════════════════════════════════════
export function RefundPolicy({ t }) {
  return (
    <LegalLayout title="Refund Policy" icon="💰" lastUpdated="22 March 2026" t={t}>

      {/* Highlight box */}
      <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,.12),rgba(16,185,129,.04))", border:"1px solid rgba(16,185,129,.3)", borderRadius:14, padding:"20px 24px", marginBottom:36, display:"flex", gap:16, alignItems:"flex-start" }}>
        <span style={{ fontSize:"2rem", flexShrink:0 }}>✅</span>
        <div>
          <div style={{ fontWeight:800, color:"#10B981", marginBottom:4, fontSize:"1rem" }}>7-Day Money Back Guarantee</div>
          <div style={{ color:t.muted, fontSize:".9rem", lineHeight:1.7 }}>
            Hum apne courses ki quality pe 100% confident hain. Agar aap 7 din ke andar satisfied nahi hain, full refund milega — koi sawaal nahi.
          </div>
        </div>
      </div>

      <Section title="1. Course Refund — Eligible Cases" t={t}>
        <Li t={t}><strong style={{ color:t.text }}>7-day guarantee:</strong> Purchase ke 7 din ke andar refund request karein</Li>
        <Li t={t}><strong style={{ color:t.text }}>Technical issues:</strong> Agar course access nahi hua aur hum fix nahi kar paye</Li>
        <Li t={t}><strong style={{ color:t.text }}>Duplicate payment:</strong> Ek hi course ke liye do baar payment ho gayi</Li>
        <Li t={t}><strong style={{ color:t.text }}>Course not as described:</strong> Agar content bilkul alag tha jo describe kiya gaya tha</Li>
      </Section>

      <Section title="2. Refund — Not Eligible Cases" t={t}>
        <Li t={t}>7 din ke baad refund request (except technical issues)</Li>
        <Li t={t}>50% se zyada course complete kar liya ho</Li>
        <Li t={t}>Certificate download kar liya ho</Li>
        <Li t={t}>Course content download ya screen record kiya ho</Li>
        <Li t={t}>Terms & Conditions violate karne par account ban hua ho</Li>
        <Li t={t}>Sale ya discounted price pe liya course (jab tak technical issue na ho)</Li>
      </Section>

      <Section title="3. Refund Process" t={t}>
        <div style={{ background:t.bgCard, border:"1px solid "+t.border, borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
          {[
            { step:"Step 1", desc:"WhatsApp ya Email pe request bhejo — payment ID aur reason ke saath", icon:"💬" },
            { step:"Step 2", desc:"Hum 24 hours mein review karenge aur confirm karenge", icon:"🔍" },
            { step:"Step 3", desc:"Approve hone par original payment method pe refund initiate hoga", icon:"✅" },
            { step:"Step 4", desc:"Amount 5-7 business days mein aapke account mein aa jaayega", icon:"💸" },
          ].map((s,i)=>(
            <div key={i} style={{ display:"flex", gap:14, marginBottom: i<3 ? 16 : 0, alignItems:"flex-start" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#F59E0B,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:".75rem", fontWeight:800, color:"#070B14" }}>{i+1}</div>
              <div>
                <div style={{ fontWeight:700, color:t.text, fontSize:".88rem" }}>{s.step} {s.icon}</div>
                <div style={{ color:t.muted, fontSize:".84rem", marginTop:2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="4. Refund Timeline" t={t}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
          {[
            { method:"UPI / Net Banking", time:"3-5 business days" },
            { method:"Credit / Debit Card", time:"5-7 business days" },
            { method:"Wallet", time:"1-3 business days" },
            { method:"Bank Transfer", time:"5-7 business days" },
          ].map((r,i)=>(
            <div key={i} style={{ background:t.bgCard, border:"1px solid "+t.border, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontWeight:700, color:t.text, fontSize:".84rem", marginBottom:4 }}>{r.method}</div>
              <div style={{ color:t.gold, fontSize:".8rem", fontWeight:600 }}>{r.time}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="5. Services Refund Policy" t={t}>
        <p style={{ marginBottom:12 }}>Courses ke alawa anya services (MCQ banks, PPT designing, etc.) ke liye:</p>
        <Li t={t}><strong style={{ color:t.text }}>Work shuru hone se pehle:</strong> Full refund milega</Li>
        <Li t={t}><strong style={{ color:t.text }}>Work 50% complete:</strong> 50% refund milega</Li>
        <Li t={t}><strong style={{ color:t.text }}>Work complete ho jaane ke baad:</strong> Refund nahi milega</Li>
        <Li t={t}><strong style={{ color:t.text }}>Revision requests:</strong> 2 free revisions included hain</Li>
      </Section>

      <Section title="6. Payment Failure Auto-Refund" t={t}>
        <p>Agar payment deduct ho gayi lekin order confirm nahi hua, to Razorpay automatically 5-7 business days mein refund kar deta hai. Agar nahi aaya to humse contact karein — hum Razorpay se follow up karenge.</p>
      </Section>

      {/* CTA */}
      <div style={{ background:t.bgCard, border:"1px solid "+t.border, borderRadius:14, padding:"20px 24px", marginTop:8, display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontWeight:800, color:t.text, marginBottom:4 }}>Refund Request Karna Chahte Hain?</div>
          <div style={{ color:t.muted, fontSize:".86rem" }}>Payment ID ke saath WhatsApp karo — 24 hours mein reply guaranteed</div>
        </div>
        <a href="https://wa.me/919241653369?text=Refund%20Request%3A%20" target="_blank"
          style={{ background:"#25D366", color:"#fff", padding:"11px 22px", borderRadius:10, fontWeight:700, fontSize:".9rem", textDecoration:"none", whiteSpace:"nowrap" }}>
          💬 WhatsApp for Refund
        </a>
      </div>

      <ContactBox t={t}/>
    </LegalLayout>
  );
}