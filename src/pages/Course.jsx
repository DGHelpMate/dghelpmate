// src/pages/Course.jsx
import { useState } from "react";
import { SecTitle, Tag, Btn, GlowBg } from "../components/ui/UI";

const MODULES = [
  { icon:"⌨️", n:1, title:"Fast Typing Mastery",         desc:"Type test papers, notes, books in record time. Hindi & English both." },
  { icon:"📄", n:2, title:"PPT & PDF Designing",          desc:"Smart Board-ready presentations from scratch using Canva & PowerPoint." },
  { icon:"🖼️", n:3, title:"Thumbnails & Posters",        desc:"YouTube thumbnails, course covers, reels posters — Canva Pro tricks." },
  { icon:"🎥", n:4, title:"Video Creation & Upload",      desc:"Record, edit, and upload teaching videos from mobile." },
  { icon:"🤖", n:5, title:"25+ AI Tools Training",        desc:"ChatGPT, SlidesAI, Canva AI & 20+ tools that save hours daily." },
  { icon:"🌐", n:6, title:"Digital Branding",             desc:"Create your teacher brand — logo, banner, social media presence." },
  { icon:"📱", n:7, title:"Mobile-Based Teaching",        desc:"Run entire coaching from smartphone. Apps, tools, workflows." },
  { icon:"💰", n:8, title:"Monetization & Freelancing",   desc:"Earn from YouTube, design, typing. Turn skills into income." },
];

const PLANS = [
  { name:"Starter Plan", price:"₹499",   strike:"₹2,999", popular:false,
    features:["3 Core Modules","Typing + PPT Demo","Mobile Compatible","Basic Certificate","Email Support"] },
  { name:"Pro Plan",     price:"₹1,499", strike:"₹9,999", popular:true,
    features:["All 8 Modules","25+ AI Tools","PPT + PDF + Typing","2 Months WhatsApp Support","Completion Certificate","Video Call Support"] },
  { name:"Master Plan",  price:"₹2,499", strike:"₹49,999",popular:false,
    features:["Everything in Pro","Personal 1-on-1 Mentorship","Monthly Updates","Lifetime Access","Priority Support"] },
];

const FAQS = [
  ["Is this for absolute beginners?","Yes! Designed for teachers who have never properly used a computer. We start from scratch."],
  ["Can I do this on mobile?","100%! The entire course can be completed on a smartphone. All tools are mobile-friendly."],
  ["Will I get a certificate?","Yes — a Completion Certificate signed by Govardhan Pandit upon finishing."],
  ["What support is available?","Pro and Master plans include WhatsApp support group for 2 months + video calls in Master Plan."],
  ["Can I earn money after?","Yes! YouTube, poster design, content typing — all can be monetized through freelancing."],
  ["What is the refund policy?","7-day money-back guarantee — no questions asked if you're not satisfied."],
];

export default function Course({ t }) {
  return (
    <div style={{ background: t.bg }}>
      {/* Hero */}
      <section style={{
        padding: "120px 5% 80px", position: "relative", overflow: "hidden",
        background: t.bg === "#070B14"
          ? "linear-gradient(150deg,#070B14,#0F1629)" : "linear-gradient(150deg,#EEF2FF,#F8FAFF)",
      }}>
        <GlowBg color={t.accent} size={400} top={0} right={0} />
        <div style={{ maxWidth: 680, position: "relative" }}>
          <div style={{
            display: "inline-block", background: "rgba(239,68,68,0.15)", color: "#EF4444",
            border: "1px solid rgba(239,68,68,0.3)", padding: "5px 14px", borderRadius: 50,
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14,
          }}>🔥 Limited Time — ₹40,000 OFF</div>

          <h1 style={{
            fontSize: "clamp(2rem,4.5vw,3.2rem)", fontWeight: 800, lineHeight: 1.15,
            color: t.text, marginBottom: 18,
          }}>
            Smart Teachers<br />
            <span style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Mastery Course
            </span>
          </h1>

          <p style={{ fontSize: "1.05rem", color: t.muted, lineHeight: 1.7, marginBottom: 24, maxWidth: 520 }}>
            Stop depending on operators forever. Become a <strong style={{ color: t.text }}>self-reliant digital teacher</strong> by Govardhan Pandit — MSME certified training.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
            {["📱 Mobile Friendly","🤖 25+ AI Tools","🏆 Certificate","💬 WhatsApp Support","♾️ Lifetime Access","7-Day Refund"].map(f => (
              <span key={f} style={{
                background: t.accentBg, color: t.accent,
                padding: "5px 12px", borderRadius: 50,
                fontSize: "0.8rem", fontWeight: 600,
              }}>{f}</span>
            ))}
          </div>

          <div className="stack-mobile" style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: t.muted, textDecoration: "line-through" }}>₹49,999</div>
              <div style={{ fontSize: "3rem", fontWeight: 900, color: t.gold, lineHeight: 1 }}>₹9,999</div>
              <div style={{ fontSize: "0.8rem", color: t.green, fontWeight: 700 }}>🎉 Save ₹40,000!</div>
            </div>
            <div>
              <Btn href="https://wa.me/919241653369?text=I%20want%20to%20enroll%20in%20Smart%20Teachers%20Mastery%20Course"
                variant="primary" t={t} style={{ fontSize: "1.05rem", padding: "14px 30px" }}>
                🚀 Enroll Now
              </Btn>
              <div style={{ fontSize: "0.78rem", color: t.muted, marginTop: 6, textAlign: "center" }}>7-day money-back guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Warning */}
      <section style={{ padding: "60px 5%", background: t.bgCard2 }}>
        <div style={{
          maxWidth: 760, margin: "0 auto",
          background: `rgba(239,68,68,0.08)`, border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 18, padding: "28px", textAlign: "center",
        }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: t.red, marginBottom: 16 }}>⚠️ If You Don't Do This Course...</h2>
          {["You'll have a ₹50,000 Smart Board — but still work like the whiteboard era",
            "You'll keep paying operators ₹5,000–₹8,000 every month forever",
            "Your coaching will look outdated while competitors go digital"].map(item => (
            <div key={item} style={{ display: "flex", gap: 10, marginBottom: 10, textAlign: "left" }}>
              <span style={{ color: t.red, fontWeight: 800, flexShrink: 0 }}>✘</span>
              <span style={{ fontSize: "0.95rem", color: t.muted }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section style={{ padding: "80px 5%", background: t.bg }}>
        <SecTitle t={t} tag="Curriculum" h="8 Power-Packed Modules" center />
        <div className="grid-mobile-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {MODULES.map(({ icon, n, title, desc }) => (
            <div key={n} className="card-hover" style={{
              background: t.bgCard, border: `1px solid ${t.border}`,
              borderRadius: 14, padding: "20px", display: "flex", gap: 14,
            }}>
              <span style={{ fontSize: "1.7rem", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: "0.72rem", color: t.accent, fontWeight: 700, marginBottom: 3 }}>MODULE {n}</div>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text, marginBottom: 5 }}>{title}</h4>
                <p style={{ fontSize: "0.83rem", color: t.muted, lineHeight: 1.55 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "80px 5%", background: t.bgCard2 }}>
        <SecTitle t={t} tag="Pricing" h="Choose Your Plan" center />
        <div className="grid-mobile-1" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
          gap: 22, maxWidth: 900, margin: "0 auto",
        }}>
          {PLANS.map(({ name, price, strike, popular, features }) => (
            <div key={name} className="card-hover" style={{
              background: t.bgCard,
              border: popular ? `2px solid ${t.gold}` : `1px solid ${t.border}`,
              borderRadius: 18, padding: "28px 24px", position: "relative",
            }}>
              {popular && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: "linear-gradient(135deg,#F59E0B,#F97316)", color: "#070B14",
                  fontWeight: 800, fontSize: "0.75rem", padding: "4px 16px", borderRadius: 50,
                }}>⭐ MOST POPULAR</div>
              )}
              <h3 style={{ fontWeight: 800, fontSize: "1.15rem", color: t.text, marginBottom: 4 }}>{name}</h3>
              <div style={{ fontSize: "0.83rem", color: t.muted, textDecoration: "line-through", marginBottom: 4 }}>{strike}</div>
              <div style={{ fontSize: "2.4rem", fontWeight: 900, color: t.gold, lineHeight: 1, marginBottom: 18 }}>{price}</div>
              {features.map(f => (
                <div key={f} style={{ display: "flex", gap: 8, marginBottom: 9, fontSize: "0.88rem", color: t.muted }}>
                  <span style={{ color: t.green, fontWeight: 800 }}>✓</span> {f}
                </div>
              ))}
              <Btn href="https://wa.me/919241653369" variant={popular ? "primary" : "ghost"} t={t}
                style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
                {popular ? "🚀 Enroll Now" : "Get Started"}
              </Btn>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "80px 5%", background: t.bg }}>
        <SecTitle t={t} tag="FAQ" h="Frequently Asked Questions" center />
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {FAQS.map(([q, a]) => {
            const [open, setOpen] = useState(false);
            return (
              <div key={q} style={{ borderBottom: `1px solid ${t.border}` }}>
                <button onClick={() => setOpen(!open)} style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "17px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontWeight: 600, fontSize: "0.97rem", color: t.text, paddingRight: 16 }}>{q}</span>
                  <span style={{ color: t.gold, fontSize: "1.3rem", transform: open ? "rotate(45deg)" : "none", transition: "0.2s", flexShrink: 0 }}>+</span>
                </button>
                {open && <p style={{ fontSize: "0.9rem", color: t.muted, lineHeight: 1.65, paddingBottom: 16 }}>{a}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}