// src/pages/Services.jsx — v3 Firebase-powered, clickable cards, detail modal, demo gallery
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, doc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { openRazorpay } from "../utils/razorpay";
import PostPaymentModal from "../components/ui/PostPaymentModal";
import useAuth from "../hooks/useAuth";

// ── Static fallback data ──────────────────────────────────────────────────────
const STATIC_SERVICES = [
  {
    id:"sv1", category:"Content Creation", color:"#6366F1",
    icon:"❓", title:"MCQ / Question Bank", badge:"Most Popular",
    desc:"Chapter-wise MCQs for every subject — accurate, exam-ready, board pattern.",
    fullDesc:"We create high-quality multiple choice questions for every subject and class. Each MCQ is carefully crafted to match board exam patterns, with 4 options and correct answers marked. Bulk orders get special discounts.",
    pricing:[["Science Subjects","₹2–₹3 / question"],["Language Subjects","₹1–₹2 / question"],["Competitive Exam","₹1.5 / question"]],
    quickPay:[{label:"100 MCQs",amount:200},{label:"500 MCQs",amount:900},{label:"1000 MCQs",amount:1700}],
    timeline:"2–5 working days",
    process:["Share subject, class & chapter list on WhatsApp","We confirm timeline & advance payment","Questions delivered as PDF/Word/Excel","Review & free corrections if needed"],
    requirements:["Subject name & class","Chapter list or syllabus PDF","Exam board (CBSE/State/Competitive)","Any sample format (optional)"],
    requireDocs:true,
    demoImages:[],
    demoUrl:"",
    rating:4.9, reviews:87, active:true,
  },
  {
    id:"sv2", category:"Content Creation", color:"#6366F1",
    icon:"📊", title:"PPT Slide Designing", badge:null,
    desc:"Visual-rich Smart Board presentations your students will love.",
    fullDesc:"Professional PowerPoint/Google Slides presentations with diagrams, images, animations and your coaching branding. Each slide is designed to maximize student engagement and understanding.",
    pricing:[["Science PPT","₹3–₹5 / slide"],["Language PPT","₹2–₹3 / slide"],["Full Chapter Set","Custom Quote"]],
    quickPay:[{label:"20 Slides",amount:80},{label:"50 Slides",amount:175},{label:"100 Slides",amount:320}],
    timeline:"2–4 working days",
    process:["Share topic, class & any reference material","Confirm design style & branding colors","First draft shared for review","Final PPT delivered after approval"],
    requirements:["Topic/chapter name","Class & board","Your coaching logo (if needed)","Reference book or notes (optional)"],
    requireDocs:true,
    demoImages:[],
    demoUrl:"",
    rating:4.8, reviews:63, active:true,
  },
  {
    id:"sv3", category:"Content Creation", color:"#6366F1",
    icon:"📝", title:"Test Papers", badge:null,
    desc:"Board-pattern objective & subjective papers with answer keys.",
    fullDesc:"Ready-to-print test papers in board exam format. Both objective (MCQ) and subjective (long answer) formats available. Comes with complete answer key and marking scheme.",
    pricing:[["Objective Paper","₹40–₹100"],["Subjective Paper","₹100–₹150"],["Model Paper (Board)","₹150–₹200"]],
    quickPay:[{label:"1 Paper",amount:70},{label:"5 Papers",amount:299},{label:"10 Papers",amount:550}],
    timeline:"1–3 working days",
    process:["Share subject, class & paper format","We create paper with marking scheme","Delivered as print-ready PDF","Free corrections within 24hrs"],
    requirements:["Subject & class","Paper type (Objective/Subjective/Both)","Total marks & time duration","Chapters to include"],
    requireDocs:true,
    demoImages:[],
    demoUrl:"",
    rating:4.9, reviews:45, active:true,
  },
  {
    id:"sv4", category:"Content Creation", color:"#6366F1",
    icon:"⌨️", title:"Typing Work", badge:null,
    desc:"Fast professional typing — papers, notes, books in Hindi & English.",
    fullDesc:"Professional Hindi and English typing service. We type handwritten notes, scanned documents, books, question papers and any content with 99%+ accuracy.",
    pricing:[["Hindi Typing","₹20–₹40 / page"],["English Typing","₹20–₹30 / page"],["Print Copy Extra","₹10 / page"]],
    quickPay:[{label:"10 Pages",amount:250},{label:"25 Pages",amount:599},{label:"50 Pages",amount:1099}],
    timeline:"Same day – 2 days",
    process:["Share scanned pages or photos via WhatsApp","We confirm page count & price","Typed document sent as Word/PDF","Review & corrections included"],
    requirements:["Scanned PDF or clear photos of pages","Language (Hindi/English/Both)","Output format (Word/PDF)","Font preference (optional)"],
    requireDocs:true,
    demoImages:[],
    demoUrl:"",
    rating:4.7, reviews:112, active:true,
  },
  {
    id:"sv5", category:"Design Services", color:"#F59E0B",
    icon:"🖼️", title:"Thumbnail Design", badge:"High Demand",
    desc:"YouTube thumbnails that get clicks — bold, attractive, branded.",
    fullDesc:"High-click YouTube thumbnails designed specifically for coaching channels. Bold text, attention-grabbing visuals, and your coaching branding — all optimized for maximum CTR.",
    pricing:[["YouTube Thumbnail","₹50–₹100"],["Course Thumbnail","₹100"],["Batch Discount (10+)","₹40 each"]],
    quickPay:[{label:"1 Thumbnail",amount:75},{label:"5 Thumbnails",amount:350},{label:"10 Thumbnails",amount:650}],
    timeline:"Same day – 24 hours",
    process:["Share video title, topic & style preference","We create 2 design options","You choose or request changes","Final file delivered in JPG + PSD"],
    requirements:["Video title","Subject & topic","Your coaching logo & colors","Any reference thumbnail (optional)"],
    requireDocs:false,
    demoImages:[],
    demoUrl:"https://thumbnails.dghelpmate.com",
    rating:5.0, reviews:156, active:true,
  },
  {
    id:"sv6", category:"Design Services", color:"#F59E0B",
    icon:"🎨", title:"Poster & Banner", badge:null,
    desc:"A4 posters, YouTube banners & logos that build your brand.",
    fullDesc:"Professional design for coaching institutes — admission posters, result announcements, YouTube channel banners, festive posts, and complete logo design.",
    pricing:[["A4 Color Poster","₹100"],["YouTube Banner","₹150"],["Logo Design","₹199"]],
    quickPay:[{label:"1 Poster",amount:100},{label:"Banner",amount:150},{label:"Logo",amount:199}],
    timeline:"24–48 hours",
    process:["Share your requirements & branding details","We send first design draft","2 free revision rounds","Final file in PDF/PNG/PSD"],
    requirements:["Coaching name & tagline","Logo (if available)","Color preference","Content/text to include"],
    requireDocs:false,
    demoImages:[],
    demoUrl:"",
    rating:4.9, reviews:78, active:true,
  },
  {
    id:"sv7", category:"Digital & Channel", color:"#10B981",
    icon:"📢", title:"SEO Services", badge:null,
    desc:"Title, tags & description optimised for maximum YouTube reach.",
    fullDesc:"Complete YouTube SEO optimization — keyword research, title writing, description with timestamps, tags selection. Helps your videos rank higher and get more views organically.",
    pricing:[["Per Video / Post","₹30"],["Monthly Package","₹999 / month"],["Title + Tags + Desc","Included"]],
    quickPay:[{label:"10 Videos",amount:300},{label:"Monthly",amount:999}],
    timeline:"Same day",
    process:["Share YouTube channel link & video topic","We research keywords & write SEO content","You receive title, description & tags","Apply and see results in 7–14 days"],
    requirements:["YouTube channel link","Video topic/subject","Target audience (class/exam)","Language (Hindi/English)"],
    requireDocs:false,
    demoImages:[],
    demoUrl:"",
    rating:4.8, reviews:34, active:true,
  },
  {
    id:"sv8", category:"Digital & Channel", color:"#10B981",
    icon:"📺", title:"Channel Management", badge:"Best Value",
    desc:"Full channel handled — uploads, SEO, community, growth.",
    fullDesc:"We manage your entire YouTube channel — video uploading, SEO optimization, thumbnail creation, community posts, analytics review. You focus on teaching, we handle everything else.",
    pricing:[["Basic Mgmt","₹4,999 / month"],["With Video Editing","₹5,999 / month"],["Daily 1 Video","Included"]],
    quickPay:[{label:"Basic",amount:4999},{label:"With Editing",amount:5999}],
    timeline:"Ongoing monthly service",
    process:["Initial channel audit & strategy call","Channel access setup (limited permissions)","We start managing from Day 1","Monthly report shared every 30 days"],
    requirements:["YouTube channel access (Manager role)","Your branding assets (logo, banner)","Video content or recording schedule","Contact person for coordination"],
    requireDocs:false,
    demoImages:[],
    demoUrl:"",
    rating:4.9, reviews:22, active:true,
  },
];

const CATEGORIES = ["All","Content Creation","Design Services","Digital & Channel"];
const CAT_COLORS  = {"Content Creation":"#6366F1","Design Services":"#F59E0B","Digital & Channel":"#10B981"};

// ── Service Detail Modal ──────────────────────────────────────────────────────
function ServiceDetailModal({ service, t, onClose, onOrder }) {
  const [activeDemo, setActiveDemo] = useState(0);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [selectedPkg, setSelectedPkg]   = useState(null);
  const { user } = useAuth();

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const handleOrder = () => {
    if (selectedPkg) {
      onOrder(service, selectedPkg, uploadFiles, orderNote);
      onClose();
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,.82)", display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:t.bgCard, borderRadius:22, maxWidth:700, width:"100%", maxHeight:"94vh", overflowY:"auto", border:`1px solid ${t.border}` }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 0", position:"sticky", top:0, background:t.bgCard, zIndex:2, borderRadius:"22px 22px 0 0", borderBottom:`1px solid ${t.border}`, paddingBottom:16 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:14, background:`${service.color}18`, border:`1px solid ${service.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem", flexShrink:0 }}>
                {service.icon}
              </div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <h2 style={{ fontWeight:900, fontSize:"1.15rem", color:t.text, margin:0 }}>{service.title}</h2>
                  {service.badge && <span style={{ padding:"2px 9px", borderRadius:20, fontSize:".65rem", fontWeight:800, background:`${service.color}20`, color:service.color }}>{service.badge}</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:4 }}>
                  <span style={{ color:"#F59E0B", fontSize:".82rem" }}>{"★".repeat(Math.floor(service.rating||5))}</span>
                  <span style={{ fontSize:".74rem", color:t.muted }}>{service.rating} · {service.reviews}+ reviews</span>
                  <span style={{ fontSize:".74rem", color:"#10B981", fontWeight:700 }}>⏱ {service.timeline}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:`1px solid ${t.border}`, color:t.muted, width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:"1.1rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"20px 24px" }}>

          {/* Demo gallery */}
          {(service.demoImages||[]).length > 0 && (
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Sample Work</div>
              <div style={{ borderRadius:14, overflow:"hidden", height:200, background:t.bgCard2, marginBottom:8 }}>
                <img src={service.demoImages[activeDemo]} alt="demo" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              </div>
              {service.demoImages.length > 1 && (
                <div style={{ display:"flex", gap:8, overflowX:"auto" }}>
                  {service.demoImages.map((img,i) => (
                    <div key={i} onClick={()=>setActiveDemo(i)}
                      style={{ width:60, height:44, borderRadius:8, overflow:"hidden", cursor:"pointer", border:`2px solid ${activeDemo===i?service.color:"transparent"}`, flexShrink:0 }}>
                      <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Demo website */}
          {service.demoUrl && (
            <a href={service.demoUrl} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:`${service.color}10`, border:`1px solid ${service.color}25`, borderRadius:12, textDecoration:"none", marginBottom:18 }}>
              <span style={{ fontSize:"1.2rem" }}>🌐</span>
              <div>
                <div style={{ fontWeight:700, color:service.color, fontSize:".88rem" }}>View Live Demo Website</div>
                <div style={{ fontSize:".74rem", color:t.muted }}>{service.demoUrl}</div>
              </div>
              <span style={{ marginLeft:"auto", fontSize:".8rem", color:service.color }}>→</span>
            </a>
          )}

          {/* Description */}
          <p style={{ fontSize:".9rem", color:t.muted, lineHeight:1.75, marginBottom:20 }}>{service.fullDesc}</p>

          {/* Process steps */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>How It Works</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(service.process||[]).map((step, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", background:`${service.color}20`, border:`1px solid ${service.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".78rem", fontWeight:900, color:service.color, flexShrink:0 }}>{i+1}</div>
                  <div style={{ fontSize:".85rem", color:t.text, lineHeight:1.5, paddingTop:3 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          {(service.requirements||[]).length > 0 && (
            <div style={{ background:t.bgCard2, borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
              <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>What You Need to Provide</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" }}>
                {service.requirements.map(req => (
                  <div key={req} style={{ display:"flex", alignItems:"center", gap:8, fontSize:".83rem", color:t.text }}>
                    <span style={{ color:service.color, flexShrink:0 }}>✓</span>{req}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>Pricing</div>
            <div style={{ background:t.bgCard2, borderRadius:12, overflow:"hidden", border:`1px solid ${t.border}` }}>
              {(service.pricing||[]).map(([label,price],i) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:i<(service.pricing.length-1)?`1px solid ${t.border}`:"none" }}>
                  <span style={{ fontSize:".85rem", color:t.muted }}>{label}</span>
                  <span style={{ fontSize:".88rem", fontWeight:800, color:service.color }}>{price}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order section */}
          {!showOrderForm ? (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={()=>setShowOrderForm(true)}
                style={{ flex:1, padding:"12px", background:`linear-gradient(135deg,${service.color},${service.color}cc)`, color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:".92rem", cursor:"pointer", fontFamily:"inherit" }}>
                ⚡ Order Now
              </button>
              <a href={`https://wa.me/919241653369?text=Hi! I'm interested in ${service.title} service. Please share details.`} target="_blank" rel="noreferrer"
                style={{ padding:"12px 18px", background:"#25D36618", border:"1px solid #25D36635", borderRadius:12, color:"#25D366", fontWeight:700, textDecoration:"none", fontSize:".9rem", display:"flex", alignItems:"center", gap:6 }}>
                💬 WhatsApp
              </a>
            </div>
          ) : (
            <div style={{ background:t.bgCard2, borderRadius:14, padding:"18px", border:`1px solid ${t.border}` }}>
              <div style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".92rem" }}>📋 Place Your Order</div>

              {/* Package selection */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Select Package</div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {(service.quickPay||[]).map(pkg => (
                    <button key={pkg.label} onClick={()=>setSelectedPkg(pkg)}
                      style={{ padding:"10px 14px", background:selectedPkg?.label===pkg.label?`${service.color}18`:t.bgCard, border:`1px solid ${selectedPkg?.label===pkg.label?service.color:t.border}`, borderRadius:9, display:"flex", justifyContent:"space-between", cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                      <span style={{ fontSize:".86rem", color:t.text, fontWeight:600 }}>{pkg.label}</span>
                      <span style={{ fontSize:".88rem", color:service.color, fontWeight:800 }}>₹{pkg.amount.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Document upload */}
              {service.requireDocs && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>
                    📎 Upload Related Documents (optional but helpful)
                  </div>
                  <div style={{ fontSize:".76rem", color:t.muted, marginBottom:8, lineHeight:1.5 }}>
                    Upload syllabus, reference material, notes or any document to help us understand your requirements better.
                  </div>
                  <label style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", background:t.bgCard, border:`1px dashed ${t.border}`, borderRadius:9, cursor:"pointer", fontSize:".83rem", color:t.muted }}>
                    📎 Choose Files (PDF, DOC, Images)
                    <input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display:"none" }} onChange={handleFileChange}/>
                  </label>
                  {uploadFiles.length > 0 && (
                    <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
                      {uploadFiles.map((f,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, fontSize:".74rem", color:t.text }}>
                          📄 {f.name.slice(0,20)}{f.name.length>20?"...":""}
                          <button onClick={()=>setUploadFiles(p=>p.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:".8rem" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Additional Notes (optional)</div>
                <textarea value={orderNote} onChange={e=>setOrderNote(e.target.value)} rows={2}
                  placeholder="Any specific requirements, deadline, subject details..."
                  style={{ width:"100%", padding:"9px 12px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, fontSize:".85rem", color:t.text, fontFamily:"inherit", outline:"none", resize:"none", boxSizing:"border-box" }}/>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={handleOrder} disabled={!selectedPkg}
                  style={{ flex:1, padding:"11px", background:selectedPkg?`linear-gradient(135deg,${service.color},${service.color}cc)`:`${t.border}`, color:selectedPkg?"#fff":t.muted, border:"none", borderRadius:10, fontWeight:800, fontSize:".9rem", cursor:selectedPkg?"pointer":"not-allowed", fontFamily:"inherit" }}>
                  {selectedPkg ? `⚡ Pay ₹${selectedPkg.amount.toLocaleString()} & Order` : "Select a package first"}
                </button>
                <button onClick={()=>setShowOrderForm(false)}
                  style={{ padding:"11px 16px", background:"none", border:`1px solid ${t.border}`, borderRadius:10, color:t.muted, cursor:"pointer", fontFamily:"inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Service Card ──────────────────────────────────────────────────────────────
function ServiceCard({ service, t, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:18, overflow:"hidden", cursor:"pointer", display:"flex", flexDirection:"column", transition:"transform .2s, box-shadow .2s" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 16px 40px rgba(0,0,0,.3),0 0 0 1px ${service.color}30`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}
    >
      <div style={{ height:4, background:`linear-gradient(90deg,${service.color},${service.color}80)` }}/>

      {/* Demo image or placeholder */}
      {(service.demoImages||[]).length > 0 ? (
        <div style={{ height:130, overflow:"hidden" }}>
          <img src={service.demoImages[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        </div>
      ) : (
        <div style={{ height:90, background:`${service.color}08`, display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <div style={{ fontSize:"2.5rem", opacity:.2 }}>{service.icon}</div>
          {service.demoUrl && (
            <div style={{ fontSize:".7rem", color:service.color, fontWeight:700, opacity:.7 }}>🌐 Live Demo Available</div>
          )}
        </div>
      )}

      <div style={{ padding:"16px", flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:`${service.color}18`, border:`1px solid ${service.color}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>
              {service.icon}
            </div>
            <div>
              <h4 style={{ fontWeight:800, fontSize:".93rem", color:t.text, margin:0, lineHeight:1.3 }}>{service.title}</h4>
              {service.badge && <span style={{ display:"inline-block", marginTop:3, padding:"1px 8px", borderRadius:20, fontSize:".63rem", fontWeight:700, background:`${service.color}18`, color:service.color }}>{service.badge}</span>}
            </div>
          </div>
          <div style={{ fontSize:".72rem", color:"#F59E0B" }}>{"★".repeat(Math.floor(service.rating||5))}</div>
        </div>

        <p style={{ fontSize:".82rem", color:t.muted, lineHeight:1.6, marginBottom:12, flex:1 }}>{service.desc}</p>

        <div style={{ background:t.bgCard2, borderRadius:10, overflow:"hidden", marginBottom:12, border:`1px solid ${t.border}` }}>
          {(service.pricing||[]).map(([label,price],i) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 11px", borderBottom:i<(service.pricing.length-1)?`1px solid ${t.border}`:"none" }}>
              <span style={{ fontSize:".78rem", color:t.muted }}>{label}</span>
              <span style={{ fontSize:".8rem", fontWeight:800, color:service.color }}>{price}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:".72rem", color:t.muted }}>⏱ {service.timeline}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {service.demoUrl && (
              <span style={{ fontSize:".7rem", color:service.color, fontWeight:700 }}>🌐 Demo</span>
            )}
            <div style={{ padding:"6px 14px", background:`${service.color}15`, border:`1px solid ${service.color}30`, borderRadius:8, fontSize:".8rem", fontWeight:700, color:service.color }}>
              View Details →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Services({ t }) {
  const { user, profile } = useAuth();
  const [services, setServices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [selected, setSelected]       = useState(null);
  const [modalData, setModalData]     = useState(null);
  const [paying, setPaying]           = useState(false);

  useEffect(() => {
    getDocs(query(collection(db,"services"), where("active","==",true)))
      .then(snap => {
        if (snap.docs.length > 0) setServices(snap.docs.map(d=>({id:d.id,...d.data()})));
        else setServices(STATIC_SERVICES);
      })
      .catch(() => setServices(STATIC_SERVICES))
      .finally(() => setLoading(false));
  }, []);

  const handleOrder = async (service, pkg, files, note) => {
    setPaying(true);
    // Upload files first if any
    let uploadedFiles = [];
    if (files.length > 0 && user) {
      for (const file of files) {
        try {
          const r = ref(storage, `serviceOrders/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(r, file);
          const url = await getDownloadURL(r);
          uploadedFiles.push({ name: file.name, url });
        } catch(e) { console.error(e); }
      }
    }

    await openRazorpay({
      amount: pkg.amount,
      name: `${service.title} — ${pkg.label}`,
      description: "DG HelpMate Service Order",
      prefillName: profile?.ownerName || profile?.coachingName || "",
      prefillEmail: user?.email || "",
      prefillPhone: profile?.phone || "",
      onSuccess: async (paymentId) => {
        setPaying(false);
        try {
          await addDoc(collection(db,"purchases"), {
            userId:     user?.uid || "guest",
            userName:   profile?.ownerName || profile?.coachingName || "Guest",
            userEmail:  user?.email || "",
            itemId:     service.id,
            itemType:   "service",
            itemName:   `${service.title} — ${pkg.label}`,
            amount:     pkg.amount,
            paymentId,
            status:     "pending",
            uploadedFiles,
            note,
            createdAt:  serverTimestamp(),
          });
          if (!service.id.startsWith("sv")) {
            await updateDoc(doc(db,"services",service.id),{ orders: increment(1) });
          }
        } catch(e) { console.error(e); }
        setModalData({ paymentId, amount: pkg.amount, itemName: `${service.title} — ${pkg.label}` });
      },
      onFailure: (err) => {
        setPaying(false);
        if (err !== "dismissed") alert("Payment failed. Please try again or WhatsApp us.");
      },
    });
  };

  const filtered = services.filter(s => {
    const matchCat = category === "All" || s.category === category;
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.desc?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = CATEGORIES.slice(1).map(cat => ({
    cat,
    color: CAT_COLORS[cat],
    items: filtered.filter(s => s.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ background:t.bg, minHeight:"100vh" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Hero */}
      <div style={{ padding:"64px 5% 50px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle at 15% 50%,${t.accent}12 0%,transparent 50%),radial-gradient(circle at 85% 20%,${t.gold}10 0%,transparent 45%)` }}/>
        <div style={{ position:"relative", zIndex:1, maxWidth:700 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 16px", background:`${t.gold}18`, border:`1px solid ${t.gold}30`, borderRadius:20, fontSize:".76rem", fontWeight:700, color:t.gold, marginBottom:18, letterSpacing:".06em" }}>
            MSME REGISTERED · 26+ INSTITUTES · 4.9★ AVERAGE RATING
          </div>
          <h1 style={{ fontSize:"clamp(1.8rem,5vw,3rem)", fontWeight:900, color:t.text, marginBottom:14, lineHeight:1.2 }}>
            Complete Services &{" "}
            <span style={{ color:t.gold }}>Transparent Pricing</span>
          </h1>
          <p style={{ fontSize:"1rem", color:t.muted, lineHeight:1.7, marginBottom:32, maxWidth:560 }}>
            Click any service card for full details, demo samples, timeline & ordering. Pay online and track your order in your dashboard.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
            {[["🛠️","8 Services"],["⚡","Same-day delivery"],["🎨","Demo available"],["💳","Online payment"]].map(([icon,txt])=>(
              <div key={txt} style={{ display:"flex", alignItems:"center", gap:8, fontSize:".86rem", color:t.muted }}>
                <span>{icon}</span><span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ padding:"0 5% 28px", position:"sticky", top:64, zIndex:50, background:t.bg+"f0", backdropFilter:"blur(12px)", paddingTop:12, paddingBottom:16 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
          <div style={{ position:"relative", flex:"1 1 240px" }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search services..."
              style={{ width:"100%", padding:"10px 14px 10px 40px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, fontSize:".88rem", color:t.text, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=t.gold} onBlur={e=>e.target.style.borderColor=t.border}/>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={()=>setCategory(cat)}
                style={{ padding:"8px 16px", borderRadius:20, border:"none", fontFamily:"inherit", fontSize:".82rem", fontWeight:600, cursor:"pointer", transition:"all .2s",
                  background: category===cat ? (cat==="All"?"linear-gradient(135deg,#F59E0B,#F97316)":CAT_COLORS[cat]) : t.bgCard,
                  color: category===cat ? (cat==="All"?"#070B14":"#fff") : t.muted,
                  outline: category===cat ? "none" : `1px solid ${t.border}`,
                }}>
                {cat==="All"?"🔥 All":cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services */}
      <div style={{ padding:"0 5% 60px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:t.muted }}><div style={{ fontSize:"2rem", marginBottom:10 }}>⏳</div>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ fontSize:"3rem", marginBottom:14 }}>🔍</div>
            <div style={{ fontWeight:700, color:t.text, marginBottom:8 }}>No services found</div>
          </div>
        ) : (
          grouped.map(({ cat, color, items }) => (
            <div key={cat} style={{ marginBottom:48 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, padding:"12px 18px", background:`${color}08`, border:`1px solid ${color}20`, borderRadius:12 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:`${color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>
                  {cat==="Content Creation"?"✍️":cat==="Design Services"?"🎨":"📱"}
                </div>
                <div>
                  <div style={{ fontWeight:800, color:t.text, fontSize:"1rem" }}>{cat}</div>
                  <div style={{ fontSize:".76rem", color:t.muted }}>{items.length} services · Click any card for full details & ordering</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:18 }}>
                {items.map(s => <ServiceCard key={s.id} service={s} t={t} onClick={()=>setSelected(s)}/>)}
              </div>
            </div>
          ))
        )}

        {/* Bottom CTA */}
        <div style={{ background:`linear-gradient(135deg,${t.accent}18,${t.gold}10)`, border:`1px solid ${t.border}`, borderRadius:20, padding:"32px 28px", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:20 }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:"1.15rem", color:t.text, marginBottom:8 }}>Need bulk order or custom quote?</h3>
            <div style={{ fontSize:".85rem", color:t.muted, lineHeight:1.6 }}>
              Bulk discounts available · UPI · Card · NetBanking accepted · +91 92416 53369
            </div>
          </div>
          <a href="https://wa.me/919241653369?text=Hi! I need a custom service quote." target="_blank" rel="noreferrer"
            style={{ padding:"12px 24px", background:"#25D366", color:"#fff", borderRadius:12, fontWeight:700, fontSize:".9rem", textDecoration:"none" }}>
            💬 WhatsApp Us
          </a>
        </div>
      </div>

      {/* Detail modal */}
      {selected && <ServiceDetailModal service={selected} t={t} onClose={()=>setSelected(null)} onOrder={handleOrder}/>}

      {/* Payment success */}
      {modalData && <PostPaymentModal paymentId={modalData.paymentId} amount={modalData.amount} itemName={modalData.itemName} itemType="service" onClose={()=>setModalData(null)} t={t}/>}

      {paying && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:t.bgCard, borderRadius:16, padding:"32px 40px", textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:12 }}>⏳</div>
            <div style={{ color:t.text, fontWeight:700 }}>Processing payment...</div>
          </div>
        </div>
      )}
    </div>
  );
}