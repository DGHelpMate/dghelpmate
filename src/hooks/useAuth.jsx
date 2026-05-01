// src/hooks/useAuth.jsx — v2 with Dual Role (client ↔ student switch)
import { useState, useEffect, createContext, useContext } from "react";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, serverTimestamp,
  getDocs, query, collection, where,
  addDoc, updateDoc, increment,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext(null);

// ── Referral bonus coupon create karo ─────────────────────────────────────────
async function giveReferralBonus(referrerId, referrerCode, newUserName) {
  const bonusCode = `REF-${referrerCode}-${Date.now().toString().slice(-4)}`;
  await addDoc(collection(db, "coupons"), {
    code:        bonusCode,
    discount:    10,
    description: `Referral bonus — ${newUserName} ne join kiya!`,
    maxUses:     1,
    usedCount:   0,
    active:      true,
    type:        "referral",
    forUserId:   referrerId,
    createdAt:   serverTimestamp(),
  });
  await addDoc(collection(db, "notifications"), {
    toUserId:  referrerId,
    toRole:    "student",
    title:     "🎉 Referral Bonus!",
    body:      `${newUserName} ne tera referral use kiya! Coupon code: ${bonusCode} (10% off next purchase)`,
    type:      "success",
    read:      false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", referrerId), {
    referralCount: increment(1),
    referralEarned: increment(10),
  });
  return bonusCode;
}

// ── Referee ko welcome discount do ────────────────────────────────────────────
async function giveWelcomeDiscount(userId, userName) {
  const welcomeCode = `WELCOME-${userId.slice(0,6).toUpperCase()}`;
  await addDoc(collection(db, "coupons"), {
    code:        welcomeCode,
    discount:    5,
    description: `Welcome discount for ${userName}`,
    maxUses:     1,
    usedCount:   0,
    active:      true,
    type:        "welcome",
    forUserId:   userId,
    createdAt:   serverTimestamp(),
  });
  return welcomeCode;
}

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  // ✅ NEW: activeRole — current mode user chal raha hai (client ya student)
  // localStorage se restore karo taaki refresh pe bhi same rahe
  const [activeRole, setActiveRole] = useState(() => {
    try { return localStorage.getItem("dgh_active_role") || null; } catch { return null; }
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (fu) => {
      setUser(fu || null);
      if (fu) {
        const snap = await getDoc(doc(db, "users", fu.uid));
        const profileData = snap.exists() ? snap.data() : null;
        setProfile(profileData);

        // ✅ activeRole set karo — agar already set hai to wahi rakho, warna default role use karo
        const savedRole = localStorage.getItem("dgh_active_role");
        if (profileData && savedRole && canUseRole(profileData, savedRole)) {
          setActiveRole(savedRole);
        } else if (profileData) {
          const defaultRole = profileData.role;
          setActiveRole(defaultRole);
          try { localStorage.setItem("dgh_active_role", defaultRole); } catch {}
        }
      } else {
        setProfile(null);
        setActiveRole(null);
        try { localStorage.removeItem("dgh_active_role"); } catch {}
      }
      setLoading(false);
    });
  }, []);

  // ✅ Check karo ki user given role use kar sakta hai ya nahi
  function canUseRole(prof, role) {
    if (!prof) return false;
    if (prof.role === "admin") return true;
    // Pure student — sirf student role use kar sakta hai
    if (prof.role === "student" && !prof.isAlsoClient) return role === "student";
    // Pure client — sirf client role use kar sakta hai
    if (prof.role === "client" && !prof.isAlsoStudent) return role === "client";
    // Dual role user (isAlsoClient + isAlsoStudent dono true)
    if (prof.isAlsoClient && prof.isAlsoStudent) return role === "client" || role === "student";
    if (prof.role === "client" && prof.isAlsoStudent) return role === "client" || role === "student";
    if (prof.role === "student" && prof.isAlsoClient) return role === "client" || role === "student";
    return role === prof.role;
  }

  // ✅ NEW: Role switch function
  const switchRole = (newRole) => {
    if (!profile || !canUseRole(profile, newRole)) return false;
    setActiveRole(newRole);
    try { localStorage.setItem("dgh_active_role", newRole); } catch {}
    return true;
  };

  // ✅ Check karo ki user dono roles rakhta hai
  const hasDualRole = (prof) => {
    if (!prof) return false;
    return (prof.role === "client" && prof.isAlsoStudent) ||
           (prof.role === "student" && prof.isAlsoClient) ||
           (prof.isAlsoClient && prof.isAlsoStudent);
  };

  const login         = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
  const logout        = () => {
    try { localStorage.removeItem("dgh_active_role"); } catch {}
    return signOut(auth);
  };
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // ── Google Sign In ──────────────────────────────────────────────────────────
  const loginWithGoogle = async (role = "student") => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const fu   = cred.user;

    const snap = await getDoc(doc(db, "users", fu.uid));
    if (!snap.exists()) {
      const refCode = fu.uid.slice(0, 8).toUpperCase();
      const newProfile = {
        uid:          fu.uid,
        role,
        email:        fu.email || "",
        ownerName:    fu.displayName || "",
        coachingName: fu.displayName || "",
        phone:        fu.phoneNumber || "",
        city:         "",
        photoUrl:     fu.photoURL || "",
        logoUrl:      "",
        totalBilled:  0,
        totalPaid:    0,
        approved:     role === "student",
        createdAt:    serverTimestamp(),
        googleSignIn: true,
        referralCode: refCode,
        referralCount: 0,
        referralEarned: 0,
        isAlsoClient:  false,
        isAlsoStudent: false,
      };
      await setDoc(doc(db, "users", fu.uid), newProfile);
      setProfile(newProfile);
      setActiveRole(role);
      try { localStorage.setItem("dgh_active_role", role); } catch {}
    } else {
      const prof = snap.data();
      setProfile(prof);
      const savedRole = localStorage.getItem("dgh_active_role");
      if (savedRole && canUseRole(prof, savedRole)) {
        setActiveRole(savedRole);
      } else {
        setActiveRole(prof.role);
        try { localStorage.setItem("dgh_active_role", prof.role); } catch {}
      }
    }
    return cred;
  };

  // ── Email/Password Sign Up ──────────────────────────────────────────────────
  const signUp = async ({ email, password, name, phone, coachingName, city = "", role = "pending", userType = "client", referralCode = "" }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const refCode = cred.user.uid.slice(0, 8).toUpperCase();

    // ✅ role aur userType se isAlsoClient/isAlsoStudent set karo
    const isStudent = role === "student" || userType === "student";
    const isClient  = role === "pending" || role === "client" || userType === "client";

    const userData = {
      uid:           cred.user.uid,
      role,
      email,
      ownerName:     name,
      coachingName:  coachingName || name,
      phone,
      city,
      logoUrl:       "",
      photoUrl:      "",
      totalBilled:   0,
      totalPaid:     0,
      approved:      role === "student",
      createdAt:     serverTimestamp(),
      referralCode:  refCode,
      referralCount: 0,
      referralEarned: 0,
      isAlsoClient:  false,
      isAlsoStudent: false,
    };

    // ── Referral code handle karo ──────────────────────────────────────────
    if (referralCode.trim()) {
      const code = referralCode.trim().toUpperCase();
      userData.referredBy = code;
      try {
        const referrerSnap = await getDocs(query(
          collection(db, "users"),
          where("referralCode", "==", code)
        ));
        if (!referrerSnap.empty) {
          const referrerId   = referrerSnap.docs[0].id;
          const referrerCode = referrerSnap.docs[0].data().referralCode;
          userData.referrerId = referrerId;
          await giveReferralBonus(referrerId, referrerCode, coachingName || name);
          const welcomeCode = await giveWelcomeDiscount(cred.user.uid, coachingName || name);
          userData.welcomeCoupon = welcomeCode;
          await addDoc(collection(db, "notifications"), {
            toUserId:  cred.user.uid,
            toRole:    role,
            title:     "🎁 Welcome Discount!",
            body:      `Referral ke through aaye! Aapka welcome coupon: ${welcomeCode} (5% off first purchase)`,
            type:      "success",
            read:      false,
            createdAt: serverTimestamp(),
          });
        }
      } catch(e) { console.warn("Referral error:", e); }
    }

    await setDoc(doc(db, "users", cred.user.uid), userData);
    return cred;
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      activeRole, switchRole, hasDualRole, canUseRole,
      login, logout, resetPassword, signUp, loginWithGoogle,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function useAuth() { return useContext(AuthContext); }