// src/pages/admin/AnalyticsDashboard.jsx — Revenue Analytics with Charts
import { useState, useEffect } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/config";

function StatCard({ icon, label, value, sub, color, t }) {
  return (
    <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ fontSize:"1.6rem" }}>{icon}</div>
        <div style={{ background:color+"22", color, padding:"3px 10px", borderRadius:50, fontSize:".72rem", fontWeight:700 }}>{sub}</div>
      </div>
      <div style={{ fontSize:"clamp(1.5rem,4vw,2rem)", fontWeight:900, color, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:".8rem", color:t.muted }}>{label}</div>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, color, height=140, valuePrefix="", t }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div style={{ display:"flex", gap:6, alignItems:"flex-end", height }}>
      {Object.entries(data).map(([label, value]) => {
        const pct = (value / max) * 100;
        return (
          <div key={label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ fontSize:".68rem", color:value>0?color:t.muted, fontWeight:700 }}>
              {value>0 ? valuePrefix+value.toLocaleString() : "—"}
            </div>
            <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:height-30 }}>
              <div style={{ width:"100%", height:`${Math.max(pct,value>0?3:1)}%`, background:value>0?`linear-gradient(180deg,${color},${color}aa)`:"rgba(255,255,255,.06)", borderRadius:"4px 4px 0 0", transition:"height .6s ease", minHeight:value>0?4:2 }}/>
            </div>
            <div style={{ fontSize:".65rem", color:t.muted, textAlign:"center", lineHeight:1.2 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Line-style Trend ──────────────────────────────────────────────────────────
function TrendBadge({ current, previous, t }) {
  if (!previous) return null;
  const pct = previous > 0 ? Math.round(((current-previous)/previous)*100) : 0;
  const up = pct >= 0;
  return (
    <span style={{ fontSize:".72rem", fontWeight:700, color:up?"#10B981":"#EF4444", background:up?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)", padding:"2px 8px", borderRadius:50 }}>
      {up?"↑":"↓"} {Math.abs(pct)}% vs last period
    </span>
  );
}

export default function AnalyticsDashboard({ t }) {
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [range,       setRange]       = useState("30");
  const [activeChart, setActiveChart] = useState("enrollments"); // enrollments | revenue

  useEffect(() => { loadData(); }, [range]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now   = new Date();
      const since = new Date(); since.setDate(since.getDate() - parseInt(range));
      const prev  = new Date(); prev.setDate(prev.getDate() - parseInt(range)*2);
      const sinceTs = Timestamp.fromDate(since);
      const prevTs  = Timestamp.fromDate(prev);

      const [eSnap, pSnap, uSnap, cSnap, oSnap] = await Promise.all([
        getDocs(collection(db,"enrollments")),
        getDocs(collection(db,"clientPayments")),
        getDocs(collection(db,"users")),
        getDocs(collection(db,"courses")),
        getDocs(collection(db,"orders")),
      ]);

      const allEnrollments = eSnap.docs.map(d=>({id:d.id,...d.data()}));
      const allPayments    = pSnap.docs.map(d=>({id:d.id,...d.data()}));
      const users          = uSnap.docs.map(d=>({id:d.id,...d.data()}));
      const courses        = cSnap.docs.map(d=>({id:d.id,...d.data()}));
      const orders         = oSnap.docs.map(d=>({id:d.id,...d.data()}));

      // Period filter
      const recentEnr  = allEnrollments.filter(e=>e.enrolledAt?.seconds > sinceTs.seconds);
      const prevEnr    = allEnrollments.filter(e=>e.enrolledAt?.seconds>prevTs.seconds && e.enrolledAt?.seconds<=sinceTs.seconds);

      // Revenue
      const courseRevenue = allEnrollments.reduce((s,e)=>{
        const c = courses.find(x=>x.id===e.courseId);
        return s+(c?.price||e.amount||0);
      },0);
      const clientRevenue = allPayments.reduce((s,p)=>s+(p.amount||0),0);

      const recentCourseRev = recentEnr.reduce((s,e)=>{
        const c = courses.find(x=>x.id===e.courseId);
        return s+(c?.price||e.amount||0);
      },0);
      const prevCourseRev = prevEnr.reduce((s,e)=>{
        const c = courses.find(x=>x.id===e.courseId);
        return s+(c?.price||e.amount||0);
      },0);

      // Monthly data — last 6 months
      const months = {};
      const revenueMonths = {};
      for (let i=5;i>=0;i--) {
        const d = new Date(); d.setMonth(d.getMonth()-i);
        const key = d.toLocaleString("en-IN",{month:"short",year:"2-digit"});
        months[key] = 0;
        revenueMonths[key] = 0;
      }
      allEnrollments.forEach(e=>{
        if (e.enrolledAt?.seconds) {
          const d   = new Date(e.enrolledAt.seconds*1000);
          const key = d.toLocaleString("en-IN",{month:"short",year:"2-digit"});
          if (key in months) {
            months[key]++;
            const c = courses.find(x=>x.id===e.courseId);
            revenueMonths[key] += (c?.price||e.amount||0);
          }
        }
      });

      // Course stats
      const courseMap = {};
      allEnrollments.forEach(e=>{ courseMap[e.courseId]=(courseMap[e.courseId]||0)+1; });
      const courseStats = courses.map(c=>({
        title:c.title||c.id, price:c.price||0,
        enrollments:courseMap[c.id]||0,
        revenue:(courseMap[c.id]||0)*(c.price||0),
      })).sort((a,b)=>b.revenue-a.revenue);

      // Orders pending
      const pendingOrders = orders.filter(o=>o.status==="new"||o.status==="inprogress").length;

      setStats({
        // Users
        clients:  users.filter(u=>u.role==="client").length,
        students: users.filter(u=>u.role==="student").length,
        pending:  users.filter(u=>u.role==="pending").length,
        // Revenue
        totalRevenue: courseRevenue+clientRevenue,
        courseRevenue, clientRevenue,
        recentRevenue: recentCourseRev,
        prevRevenue:   prevCourseRev,
        // Enrollments
        totalEnrollments: allEnrollments.length,
        recentEnrollments: recentEnr.length,
        prevEnrollments:   prevEnr.length,
        // Course
        courses: courses.length, courseStats,
        // Monthly
        monthlyEnrollments: months,
        monthlyRevenue: revenueMonths,
        // Avg
        avgProgress: allEnrollments.length>0
          ? Math.round(allEnrollments.reduce((s,e)=>s+(e.progress||0),0)/allEnrollments.length) : 0,
        pendingOrders,
      });
    } catch(e) { console.error("Analytics:", e); }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:300 }}>
      <div style={{ color:t.muted, fontSize:".9rem" }}>📊 Loading analytics...</div>
    </div>
  );

  const s = stats;

  return (
    <div style={{ padding:"clamp(16px,3%,28px)" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <div>
          <h2 style={{ fontWeight:800, color:t.text, fontSize:"1.2rem", margin:0 }}>📊 Analytics Dashboard</h2>
          <p style={{ color:t.muted, fontSize:".82rem", margin:"4px 0 0" }}>Real-time business overview</p>
        </div>
        <select value={range} onChange={e=>setRange(e.target.value)}
          style={{ padding:"8px 14px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:9, color:t.text, fontSize:".84rem", fontFamily:"inherit", cursor:"pointer" }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 1 year</option>
        </select>
      </div>

      {/* Top stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard icon="💰" label="Total Revenue" value={`₹${(s?.totalRevenue||0).toLocaleString()}`} sub={`₹${(s?.recentRevenue||0).toLocaleString()} this period`} color={t.gold} t={t}/>
        <StatCard icon="🎓" label="Course Revenue" value={`₹${(s?.courseRevenue||0).toLocaleString()}`} sub={`${s?.totalEnrollments||0} enrollments`} color="#10B981" t={t}/>
        <StatCard icon="🏫" label="Client Revenue" value={`₹${(s?.clientRevenue||0).toLocaleString()}`} sub={`${s?.clients||0} clients`} color={t.accent} t={t}/>
        <StatCard icon="📚" label="Students" value={s?.students||0} sub={`${s?.avgProgress||0}% avg progress`} color="#8B5CF6" t={t}/>
        <StatCard icon="👥" label="Pending Approvals" value={s?.pending||0} sub="Needs review" color={s?.pending>0?"#F59E0B":t.muted} t={t}/>
        <StatCard icon="📋" label="Active Orders" value={s?.pendingOrders||0} sub="In progress" color="#F97316" t={t}/>
      </div>

      {/* Revenue vs Enrollments Chart */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
          <div>
            <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", margin:0 }}>
              {activeChart==="revenue"?"💰 Monthly Revenue (Last 6 Months)":"📈 Monthly Enrollments (Last 6 Months)"}
            </h3>
            <div style={{ marginTop:6 }}>
              <TrendBadge current={s?.recentRevenue||0} previous={s?.prevRevenue||0} t={t}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[["enrollments","📈 Enrollments"],["revenue","💰 Revenue"]].map(([key,label])=>(
              <button key={key} onClick={()=>setActiveChart(key)}
                style={{ padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:".78rem", fontWeight:600, background:activeChart===key?"linear-gradient(135deg,#F59E0B,#F97316)":t.bgCard2, color:activeChart===key?"#070B14":t.muted }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <BarChart
          data={activeChart==="revenue" ? s?.monthlyRevenue||{} : s?.monthlyEnrollments||{}}
          color={activeChart==="revenue"?"#F59E0B":"#6366F1"}
          valuePrefix={activeChart==="revenue"?"₹":""}
          height={160} t={t}
        />
      </div>

      {/* Course Performance */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px", marginBottom:20 }}>
        <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", marginBottom:16 }}>🏆 Course Revenue Breakdown</h3>
        {(s?.courseStats||[]).length===0
          ? <p style={{ color:t.muted, fontSize:".86rem" }}>No enrollments yet.</p>
          : (s?.courseStats||[]).map((c,i)=>{
            const maxRev = Math.max(...(s?.courseStats||[]).map(x=>x.revenue),1);
            return (
              <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom:i<(s?.courseStats||[]).length-1?`1px solid ${t.border}`:"none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
                  <div style={{ fontWeight:600, color:t.text, fontSize:".88rem", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                  <div style={{ display:"flex", gap:12, flexShrink:0 }}>
                    <span style={{ fontSize:".8rem", color:t.gold, fontWeight:800 }}>₹{c.revenue.toLocaleString()}</span>
                    <span style={{ fontSize:".8rem", color:t.muted }}>{c.enrollments} students</span>
                  </div>
                </div>
                <div style={{ background:"rgba(255,255,255,.07)", borderRadius:4, height:8, overflow:"hidden" }}>
                  <div style={{ width:`${c.revenue/maxRev*100}%`, height:"100%", background:"linear-gradient(90deg,#F59E0B,#F97316)", borderRadius:4, transition:"width .6s ease" }}/>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Recent Enrollments table */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px" }}>
        <h3 style={{ fontWeight:700, color:t.text, fontSize:".95rem", marginBottom:16 }}>🕐 Recent Enrollments</h3>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".83rem" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${t.border}` }}>
                {["Student","Course","Amount","Date"].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:t.muted, fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s?.monthlyEnrollments ? [] : []).length===0 && (
                <tr><td colSpan={4} style={{ padding:"20px 12px", textAlign:"center", color:t.muted }}>No recent enrollments</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}