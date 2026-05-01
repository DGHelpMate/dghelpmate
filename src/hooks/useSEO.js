// src/hooks/useSEO.js — Dynamic SEO for every page
export const SEO_DATA = {
  home: {
    title: "DG HelpMate — Digital Support for Coaching Institutes | MCQ, PPT, YouTube",
    description: "DG HelpMate by Govardhan Pandit — Professional MCQ Question Banks, PPT Designing, YouTube Thumbnail, SEO & Channel Management. Trusted by 26+ institutes across Bihar & Jharkhand.",
    keywords: "DG HelpMate, coaching content creator, MCQ question bank, PPT designing Bihar, YouTube SEO coaching, thumbnail design Bihar",
  },
  services: {
    title: "Services & Pricing — MCQ, PPT, Thumbnail, Typing | DG HelpMate",
    description: "Affordable services for coaching institutes — MCQ banks from ₹1/question, PPT slides from ₹2/slide, YouTube thumbnails, typing work, SEO & channel management. Get instant quote!",
    keywords: "MCQ question bank price, PPT slide designing price, YouTube thumbnail Bihar, coaching content services, typing work Bihar",
  },
  bundles: {
    title: "Bundle Packages — Save More | DG HelpMate",
    description: "Get more value with DG HelpMate bundle packages. Combine MCQ, PPT, thumbnails & more at discounted prices. Best for coaching institutes with regular content needs.",
    keywords: "coaching content bundle, MCQ PPT package, DG HelpMate bundle, coaching institute package Bihar",
  },
  courses: {
    title: "Smart Teachers Mastery Course — Learn Digital Teaching | DG HelpMate",
    description: "Complete digital teaching course — PPT designing, AI tools, YouTube growth, fast typing, thumbnail creation & monetization. Hindi language. Join 500+ teachers.",
    keywords: "Smart Teachers Course, digital teaching course Hindi, teacher PPT course, YouTube course teachers Bihar, online teaching course India",
  },
  blog: {
    title: "Blog — Tips for Coaching Institutes & Teachers | DG HelpMate",
    description: "Read expert tips on MCQ creation, PPT designing, YouTube growth, thumbnail design & digital marketing for coaching institutes and teachers in Bihar & Jharkhand.",
    keywords: "coaching institute blog, teacher tips blog, MCQ tips, YouTube tips teachers, digital marketing coaching Bihar",
  },
  about: {
    title: "About Us — Govardhan Pandit & DG HelpMate | Bihar",
    description: "DG HelpMate founded by Govardhan Pandit — MSME registered digital content agency serving 26+ coaching institutes in Bihar & Jharkhand. Our story, mission & team.",
    keywords: "Govardhan Pandit, DG HelpMate founder, about DG HelpMate, Bihar digital agency, coaching content agency Bihar",
  },
  contact: {
    title: "Contact Us — WhatsApp, Call, Email | DG HelpMate",
    description: "Contact DG HelpMate for coaching content services. WhatsApp: +91 92416 53369. Quick response guaranteed. Order MCQ, PPT, thumbnails & more.",
    keywords: "DG HelpMate contact, WhatsApp coaching content, contact Govardhan Pandit, order MCQ Bihar",
  },
  materials: {
    title: "Free Study Materials — Notes & Resources | DG HelpMate",
    description: "Download free study materials, sample MCQs, PPT templates and resources for coaching institutes. DG HelpMate free resources.",
    keywords: "free study material coaching, free MCQ download, PPT template free, coaching resources Bihar",
  },
  login: {
    title: "Login / Register — Client & Student Portal | DG HelpMate",
    description: "Login to DG HelpMate portal — manage orders, download files, access courses and track your work. Register as client or student.",
    keywords: "DG HelpMate login, client portal login, student portal DG HelpMate",
  },
  privacy: {
    title: "Privacy Policy | DG HelpMate",
    description: "DG HelpMate privacy policy — how we collect, use and protect your personal information.",
    keywords: "DG HelpMate privacy policy",
  },
  terms: {
    title: "Terms & Conditions | DG HelpMate",
    description: "DG HelpMate terms and conditions — service terms, payment terms, delivery policy and more.",
    keywords: "DG HelpMate terms conditions",
  },
  refund: {
    title: "Refund Policy | DG HelpMate",
    description: "DG HelpMate refund and cancellation policy — 7 day refund guarantee on courses. Service refund terms.",
    keywords: "DG HelpMate refund policy, cancellation policy",
  },
  "course-detail": {
    title: "Course Details — Smart Teachers Mastery | DG HelpMate",
    description: "Full details of Smart Teachers Mastery Course — curriculum, pricing, what you'll learn, instructor profile and enrollment process.",
    keywords: "Smart Teachers Course details, digital teaching course Bihar, teacher course enrollment",
  },
};

export default function useSEO(page) {
  const data = SEO_DATA[page] || SEO_DATA["home"];

  // Title update
  document.title = data.title;

  // Description update
  let desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", data.description);

  // Keywords update
  let kw = document.querySelector('meta[name="keywords"]');
  if (kw) kw.setAttribute("content", data.keywords);

  // OG Title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", data.title);

  // OG Description
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", data.description);

  // Twitter Title
  let twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute("content", data.title);

  // Twitter Description
  let twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute("content", data.description);

  // Canonical URL
  let canonical = document.querySelector('link[rel="canonical"]');
  const pageSlug = page === "home" ? "" : page;
  if (canonical) canonical.setAttribute("href", `https://www.dghelpmate.com/${pageSlug}`);
}