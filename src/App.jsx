// src/App.jsx — v5 with Dual Role Switch (client ↔ student)
import { useState, useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase/config";
import { AuthProvider } from "./hooks/useAuth";
import useAuth from "./hooks/useAuth";
import useTheme from "./hooks/useTheme";
import { GlobalCSS, Footer, WhatsAppFloat } from "./components/ui/UI";
import Navbar      from "./components/ui/Navbar";
import Loader      from "./components/ui/Loader";
import ProfileCompleteScreen from "./components/ui/ProfileCompleteScreen";

import Login         from "./pages/Login";
import CMSDashboard  from "./pages/admin/CMSDashboard";
import ClientPortal  from "./pages/client/ClientPortal";
import LMSApp        from "./pages/lms/LMSApp";
import StudentPortal from "./pages/student/StudentPortal";
import Home          from "./pages/Home";
import Services      from "./pages/Services";
import Bundles       from "./pages/Bundles";
import { Materials, About, Contact } from "./pages/OtherPages";
import { Blog } from "./pages/Blog";
import CourseCatalog from "./pages/courses/CourseCatalog";
import { PrivacyPolicy, TermsConditions, RefundPolicy } from "./pages/LegalPages";
import NotFound from "./pages/NotFound";
import ReviewPage from "./pages/ReviewPage";
import CourseDetail  from "./pages/courses/CourseDetail";

// ── Navbar height constant ───────────────────────────────────────────────────
export const NAVBAR_H = 64;

// ── Google Analytics tracking ────────────────────────────────────────────────
export function trackPage(page) {
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_title: page,
      page_location: window.location.href,
      page_path: "/" + page,
    });
  }
}
export function trackEvent(action, category, label, value) {
  if (typeof window.gtag === "function") {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value,
    });
  }
}

function InnerApp() {
  const { user, profile, loading, activeRole, switchRole, hasDualRole } = useAuth();
  const { dark, t, toggleTheme } = useTheme();

  const PUBLIC_PAGES = ["home","services","bundles","materials","blog","about","contact","courses","course-detail","privacy","terms","refund","review"];
  const getSavedPage = () => {
    try {
      const saved = localStorage.getItem("dgh_page");
      return saved && PUBLIC_PAGES.includes(saved) ? saved : "home";
    } catch { return "home"; }
  };
  const [page, setPage] = useState(getSavedPage);
  const [courseId, setCourseId] = useState(() => {
    try { return localStorage.getItem("dgh_course_id") || null; } catch { return null; }
  });
  const [returnPage, setReturnPage] = useState(null);

  const navigate = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
    trackPage(p);
    try { if (PUBLIC_PAGES.includes(p)) localStorage.setItem("dgh_page", p); } catch {}
  };

  const goToLogin = () => {
    setReturnPage(page === "login" ? "home" : page);
    navigate("login");
  };

  // ✅ AUTO-APPROVAL: Email verify hone ke baad pending clients auto-approve karo
  useEffect(() => {
    const autoApprove = async () => {
      if (user && profile && user.emailVerified && profile.role === "pending") {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            role:     "client",
            approved: true,
          });
        } catch(e) { console.error("Auto-approve error:", e); }
      }
    };
    autoApprove();
  }, [user, profile]);

  // ✅ User login ke baad return page pe bhejo
  useEffect(() => {
    if (user && profile && returnPage) {
      const portalRoles = ["admin", "client", "student", "pending"];
      if (!portalRoles.includes(profile.role)) {
        navigate(returnPage);
      }
      setReturnPage(null);
    }
  }, [user, profile]);

  const openCourse = (id) => {
    setCourseId(id);
    try { localStorage.setItem("dgh_course_id", id); } catch {}
    setTimeout(() => { setPage("course-detail"); window.scrollTo(0, 0); }, 0);
  };

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <GlobalCSS t={t}/>
        <Loader dark={dark}/>
      </>
    );
  }

  // ── Logged-in portals ──────────────────────────────────────────────────────
  if (user && profile) {

    // ✅ ADMIN — always admin panel
    if (profile.role === "admin") {
      return <><GlobalCSS t={t}/><CMSDashboard t={t}/></>;
    }

    // ✅ PENDING — approval screen
    if (profile.role === "pending") {
      return (
        <>
          <GlobalCSS t={t}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:t.bg, flexDirection:"column", gap:16, padding:20, textAlign:"center" }}>
            <div style={{ fontSize:"3rem" }}>⏳</div>
            <h2 style={{ color:t.text }}>Account Pending Approval</h2>
            <p style={{ color:t.muted, maxWidth:400, lineHeight:1.65 }}>
              Aapka account 24 hours mein approve ho jaayega. WhatsApp karo for faster approval.
            </p>
            <a href="https://wa.me/919241653369" target="_blank"
              style={{ background:"#25D366", color:"#fff", padding:"11px 24px", borderRadius:10, fontWeight:700, textDecoration:"none" }}>
              💬 WhatsApp Us
            </a>
          </div>
        </>
      );
    }

    // ✅ STUDENT (pure — no client access)
    if (profile.role === "student" && !profile.isAlsoClient) {
      // Google sign in ke baad profile complete screen
      if (profile.googleSignIn && !profile.phone && !profile.profileCompleted) {
        return <><GlobalCSS t={t}/><ProfileCompleteScreen t={t} user={user} profile={profile}/></>;
      }
      // Sirf student portal — no switch button
      return <><GlobalCSS t={t}/><StudentPortal t={t} dark={dark} toggleTheme={toggleTheme} setPage={navigate} showSwitchBtn={false}/></>;
    }

    // ✅ CLIENT (pure — no student access)
    if (profile.role === "client" && !profile.isAlsoStudent) {
      return <><GlobalCSS t={t}/><ClientPortal t={t} dark={dark} toggleTheme={toggleTheme} setPage={navigate} showSwitchBtn={false}/></>;
    }

    // ✅ DUAL ROLE — client jo student bhi hai, ya student jo client bhi hai
    const isDual = hasDualRole(profile);
    if (isDual) {
      const currentRole = activeRole || profile.role;

      if (currentRole === "client") {
        return (
          <>
            <GlobalCSS t={t}/>
            <ClientPortal
              t={t} dark={dark} toggleTheme={toggleTheme} setPage={navigate}
              showSwitchBtn={true}
              switchLabel="🎓 Switch to Student Mode"
              onSwitch={() => switchRole("student")}
            />
          </>
        );
      }

      if (currentRole === "student") {
        if (profile.googleSignIn && !profile.phone && !profile.profileCompleted) {
          return <><GlobalCSS t={t}/><ProfileCompleteScreen t={t} user={user} profile={profile}/></>;
        }
        return (
          <>
            <GlobalCSS t={t}/>
            <StudentPortal
              t={t} dark={dark} toggleTheme={toggleTheme} setPage={navigate}
              showSwitchBtn={true}
              switchLabel="🏢 Switch to Client Mode"
              onSwitch={() => switchRole("client")}
            />
          </>
        );
      }
    }

    // Fallback — koi bhi role ho jo match na kare
    if (profile.role === "client") {
      return <><GlobalCSS t={t}/><ClientPortal t={t} dark={dark} toggleTheme={toggleTheme} setPage={navigate} showSwitchBtn={false}/></>;
    }
    if (profile.role === "student") {
      return <><GlobalCSS t={t}/><StudentPortal t={t} dark={dark} toggleTheme={toggleTheme} setPage={navigate} showSwitchBtn={false}/></>;
    }
  }

  // ── Login page ─────────────────────────────────────────────────────────────
  if (page === "login") {
    return <><GlobalCSS t={t}/><Login t={t} onBack={()=>navigate("home")}/></>;
  }

  // ── Public pages ───────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case "home":          return <Home setPage={navigate} t={t}/>;
      case "services":      return <Services t={t}/>;
      case "bundles":       return <Bundles t={t}/>;
      case "materials":     return <Materials t={t}/>;
      case "blog":          return <Blog t={t}/>;
      case "about":         return <About t={t}/>;
      case "contact":       return <Contact t={t}/>;
      case "courses":       return user
        ? <LMSApp openCourse={openCourse} setPage={navigate} t={t}/>
        : <CourseCatalog openCourse={openCourse} setPage={navigate} t={t}/>;
      case "course-detail": return <CourseDetail courseId={courseId} setPage={navigate} t={t}/>;
      case "privacy":       return <PrivacyPolicy t={t}/>;
      case "terms":         return <TermsConditions t={t}/>;
      case "refund":        return <RefundPolicy t={t}/>;
      case "review":        return <ReviewPage t={t}/>;
      default:              return <NotFound setPage={navigate} t={t}/>;
    }
  };

  return (
    <div style={{ background:t.bg, minHeight:"100vh" }}>
      <GlobalCSS t={t}/>
      <Navbar page={page} setPage={navigate} dark={dark} toggleTheme={toggleTheme} t={t} onPortalClick={goToLogin}/>
      <main style={{ paddingTop: NAVBAR_H }}>{renderPage()}</main>
      <Footer setPage={navigate} t={t}/>
      <WhatsAppFloat/>
    </div>
  );
}

export default function App() {
  return <AuthProvider><InnerApp/></AuthProvider>;
}