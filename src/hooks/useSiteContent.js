// src/hooks/useSiteContent.js
// Fetches website content from Firestore
// Public pages use this hook to show admin-editable content
// ✅ FIX: Ab testimonials bhi Firestore 'testimonials' collection se fetch hote hain
import { useState, useEffect } from "react";
import { doc, onSnapshot, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";

// Default content (shown if Firestore data not loaded yet)
const DEFAULTS = {
  general: {
    siteName: "DG HelpMate",
    tagline: "Bihar & Jharkhand's #1 Education Content Partner",
    description: "MCQ banks, PPT slides, test papers, thumbnails, typing — all under one roof.",
    phone: "+91 92416 53369",
    email: "support@dghelpmate.in",
    whatsapp: "919241653369",
    address: "Rampur Chauram, Arwal, Bihar — 804423",
    upiId: "dghelpmate@axl",
    msme: "2025",
    logoUrl: "",
    govardhanPhoto: "",
  },
  hero: {
    heading1: "Your Coaching's",
    heading2: "Digital Partner",
    heading3: "for Everything",
    subtext: "MCQ banks · PPT slides · Test papers · Thumbnails · Typing — all under one roof. Professional quality, fast delivery. MSME Registered since 2025.",
    badge: "⭐ Bihar & Jharkhand's #1 Education Content Partner",
    stat1: "26+",  stat1label: "Active Clients",
    stat2: "50K+", stat2label: "MCQs Delivered",
    stat3: "500+", stat3label: "Projects Done",
    stat4: "2.5yr",stat4label: "Experience",
  },
  about: {
    ownerName: "Govardhan Pandit",
    ownerTitle: "Founder & CEO",
    ownerBio: "Hello! I'm Govardhan Pandit — on a mission to digitally empower Smart Board teachers across India. For 2.5+ years, I've helped coaching institutes with professional content creation, teaching digital tools, and building DG HelpMate into Bihar's most trusted education content company.",
    mission: "To make every teacher in India a Self-Reliant Digital Educator — free from operator dependency, empowered with AI tools.",
    vision: "A future where every coaching in India has its own YouTube channel, branded content, and earns from digital products.",
    companyDetails: "DG HelpMate · MSME Registered (2025)\nRampur Chauram, Arwal, Bihar — 804423\nServing Bihar & Jharkhand",
  },
  course: {
    masterTitle: "Smart Teachers Mastery Course",
    masterSubtitle: "Complete Digital Teaching Bundle",
    masterDesc: "Master PPT designing, fast typing, thumbnail creation, AI tools, YouTube branding, video editing — everything a modern teacher needs.",
    masterPrice: "9999",
    masterMrp: "49999",
    masterIncludes: "25+ AI Tools Training\n20+ PPT Template Pack\nCanva Template Kit\nCompletion Certificate\n2 Months WhatsApp Support",
    instructorName: "Govardhan Pandit",
    refundPolicy: "7-day money-back guarantee",
  },
  services: {
    mcqRate: "₹1–₹3 / question",
    pptRate: "₹2–₹5 / slide",
    testPaperRate: "₹40–₹200",
    thumbnailRate: "₹50–₹150",
    typingRate: "₹20–₹80 / page",
    seoRate: "₹30 / video",
    channelMgmt: "₹4,999–₹5,999 / month",
    turnaroundTime: "24–48 hours",
    bulkDiscount: "Available for orders 50+",
  },
  marqueeItems: "📚 MCQ Banks\n🎞️ PPT Notes\n📄 Test Papers\n🖼️ Thumbnails\n🎓 Teacher Courses\n⌨️ Hindi Typing\n🎨 Poster Design\n📢 SEO Services\n💼 Digital Products\n🏆 MSME Registered",
  // ✅ testimonials ab Firestore se aayenge — default empty
  testimonials: [],
};

export default function useSiteContent() {
  const [content, setContent] = useState(DEFAULTS);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    // ── 1. Real-time listener for siteContent/main ─────────────────────────
    const unsub = onSnapshot(doc(db, "siteContent", "main"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setContent(prev => ({
          ...prev,
          general:      { ...DEFAULTS.general,  ...(d.general  || {}) },
          hero:         { ...DEFAULTS.hero,      ...(d.hero     || {}) },
          about:        { ...DEFAULTS.about,     ...(d.about    || {}) },
          course:       { ...DEFAULTS.course,    ...(d.course   || {}) },
          services:     { ...DEFAULTS.services,  ...(d.services || {}) },
          marqueeItems: d.marqueeItems || DEFAULTS.marqueeItems,
        }));
      }
      setLoaded(true);
    });

    // ── 2. ✅ FIX: Testimonials collection se fetch karo ───────────────────
    // approved:true wale testimonials sort by createdAt
    const fetchTestimonials = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "testimonials"),
            where("approved", "==", true),
            orderBy("createdAt", "desc")
          )
        );
        const testiData = snap.docs.map(d => ({
          id:    d.id,
          name:  d.data().name  || "",
          org:   d.data().org   || d.data().loc || "",
          loc:   d.data().org   || d.data().loc || "",
          stars: d.data().stars || 5,
          quote: d.data().quote || "",
        }));
        setContent(prev => ({ ...prev, testimonials: testiData }));
      } catch (e) {
        // orderBy requires composite index — fallback without orderBy
        try {
          const snap2 = await getDocs(
            query(collection(db, "testimonials"), where("approved", "==", true))
          );
          const testiData = snap2.docs.map(d => ({
            id:    d.id,
            name:  d.data().name  || "",
            org:   d.data().org   || d.data().loc || "",
            loc:   d.data().org   || d.data().loc || "",
            stars: d.data().stars || 5,
            quote: d.data().quote || "",
          }));
          setContent(prev => ({ ...prev, testimonials: testiData }));
        } catch (e2) {
          // Last fallback — fetch all testimonials without filter
          try {
            const snap3 = await getDocs(collection(db, "testimonials"));
            const testiData = snap3.docs
              .map(d => ({
                id:    d.id,
                name:  d.data().name  || "",
                org:   d.data().org   || d.data().loc || "",
                loc:   d.data().org   || d.data().loc || "",
                stars: d.data().stars || 5,
                quote: d.data().quote || "",
              }))
              .filter(t => t.name); // sirf valid entries
            setContent(prev => ({ ...prev, testimonials: testiData }));
          } catch {}
        }
      }
    };

    fetchTestimonials();

    return unsub;
  }, []);

  return { content, loaded };
}