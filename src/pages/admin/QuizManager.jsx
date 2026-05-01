// src/pages/admin/QuizManager.jsx
// Admin se quiz create/manage karo — courses ke saath link karo
import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where
} from "firebase/firestore";
import { db } from "../../firebase/config";

const Inp = ({ label, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".75rem", fontWeight:700, color:"var(--mut,#8892A4)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <input {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg,#070B14)", border:"1px solid var(--bord,rgba(255,255,255,.07))", borderRadius:9, fontSize:".9rem", color:"var(--txt,#F1F5F9)", fontFamily:"inherit", outline:"none", boxSizing:"border-box", ...p.style }}/>
  </div>
);

const Sel = ({ label, children, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".75rem", fontWeight:700, color:"var(--mut,#8892A4)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <select {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg,#070B14)", border:"1px solid var(--bord,rgba(255,255,255,.07))", borderRadius:9, fontSize:".9rem", color:"var(--txt,#F1F5F9)", fontFamily:"inherit", outline:"none" }}>{children}</select>
  </div>
);

const Txt = ({ label, ...p }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ fontSize:".75rem", fontWeight:700, color:"var(--mut,#8892A4)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:4 }}>{label}</label>}
    <textarea {...p} style={{ width:"100%", padding:"9px 12px", background:"var(--bg,#070B14)", border:"1px solid var(--bord,rgba(255,255,255,.07))", borderRadius:9, fontSize:".9rem", color:"var(--txt,#F1F5F9)", fontFamily:"inherit", outline:"none", resize:"vertical", boxSizing:"border-box", ...p.style }}/>
  </div>
);

const EMPTY_Q = { question:"", options:["","","",""], correct:0, explanation:"" };

export default function QuizManager({ t }) {
  const [quizzes,     setQuizzes]     = useState([]);
  const [courses,     setCourses]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState("list");    // list | create | edit | questions
  const [activeQuiz,  setActiveQuiz]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState("");

  const [form, setForm] = useState({
    title:"", description:"", courseId:"", timeLimit:30,
    passingScore:60, isActive:true, showResults:true,
  });

  const [questions,   setQuestions]   = useState([]);
  const [editQIdx,    setEditQIdx]    = useState(null);
  const [qForm,       setQForm]       = useState(EMPTY_Q);

  const flash = (m) => { setMsg(m); setTimeout(()=>setMsg(""),3500); };

  // Load quizzes + courses
  useEffect(() => {
    const load = async () => {
      try {
        const [qSnap, cSnap] = await Promise.all([
          getDocs(query(collection(db,"quizzes"), orderBy("createdAt","desc"))),
          getDocs(collection(db,"courses")),
        ]);
        setQuizzes(qSnap.docs.map(d=>({id:d.id,...d.data()})));
        setCourses(cSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const loadQuestions = async (quizId) => {
    const snap = await getDocs(query(collection(db,"quizzes",quizId,"questions"), orderBy("order","asc")));
    setQuestions(snap.docs.map(d=>({id:d.id,...d.data()})));
  };

  const openQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setForm({
      title:        quiz.title||"",
      description:  quiz.description||"",
      courseId:     quiz.courseId||"",
      timeLimit:    quiz.timeLimit||30,
      passingScore: quiz.passingScore||60,
      isActive:     quiz.isActive!==false,
      showResults:  quiz.showResults!==false,
    });
    setView("edit");
  };

  const openQuestions = async (quiz) => {
    setActiveQuiz(quiz);
    await loadQuestions(quiz.id);
    setView("questions");
  };

  // Save quiz (create/update)
  const saveQuiz = async () => {
    if (!form.title.trim()) { flash("❌ Title required"); return; }
    setSaving(true);
    try {
      const data = { ...form, timeLimit:Number(form.timeLimit), passingScore:Number(form.passingScore) };
      if (view==="create") {
        const ref = await addDoc(collection(db,"quizzes"), { ...data, createdAt:serverTimestamp(), questionCount:0 });
        const newQ = { id:ref.id, ...data, questionCount:0 };
        setQuizzes(p=>[newQ,...p]);
        flash("✅ Quiz created!");
        setActiveQuiz(newQ);
        setView("questions");
        await loadQuestions(ref.id);
      } else {
        await updateDoc(doc(db,"quizzes",activeQuiz.id), data);
        setQuizzes(p=>p.map(q=>q.id===activeQuiz.id?{...q,...data}:q));
        flash("✅ Saved!");
      }
    } catch(e) { flash("❌ Error: "+e.message); }
    setSaving(false);
  };

  const deleteQuiz = async (id) => {
    if (!window.confirm("Delete this quiz?")) return;
    await deleteDoc(doc(db,"quizzes",id));
    setQuizzes(p=>p.filter(q=>q.id!==id));
    flash("Deleted.");
  };

  // Save question
  const saveQuestion = async () => {
    if (!qForm.question.trim()) { flash("❌ Question is required"); return; }
    if (qForm.options.some(o=>!o.trim())) { flash("❌ Please fill all options"); return; }
    setSaving(true);
    try {
      const data = { ...qForm, order: editQIdx !== null ? questions[editQIdx].order : questions.length };
      if (editQIdx !== null) {
        const qid = questions[editQIdx].id;
        await updateDoc(doc(db,"quizzes",activeQuiz.id,"questions",qid), data);
        setQuestions(p=>p.map((q,i)=>i===editQIdx?{...q,...data}:q));
      } else {
        const ref = await addDoc(collection(db,"quizzes",activeQuiz.id,"questions"), { ...data, createdAt:serverTimestamp() });
        setQuestions(p=>[...p, {id:ref.id,...data}]);
        // Update question count
        await updateDoc(doc(db,"quizzes",activeQuiz.id), { questionCount:questions.length+1 });
        setQuizzes(p=>p.map(q=>q.id===activeQuiz.id?{...q,questionCount:(q.questionCount||0)+1}:q));
      }
      setQForm(EMPTY_Q); setEditQIdx(null);
      flash("✅ Question saved!");
    } catch(e) { flash("❌ Error: "+e.message); }
    setSaving(false);
  };

  const deleteQuestion = async (idx) => {
    if (!window.confirm("Delete this question?")) return;
    const qid = questions[idx].id;
    await deleteDoc(doc(db,"quizzes",activeQuiz.id,"questions",qid));
    const updated = questions.filter((_,i)=>i!==idx);
    setQuestions(updated);
    await updateDoc(doc(db,"quizzes",activeQuiz.id), { questionCount:updated.length });
    setQuizzes(p=>p.map(q=>q.id===activeQuiz.id?{...q,questionCount:updated.length}:q));
  };

  const editQuestion = (idx) => {
    setEditQIdx(idx);
    setQForm({ ...EMPTY_Q, ...questions[idx] });
  };

  const updateOption = (i, val) => setQForm(p=>({ ...p, options:p.options.map((o,j)=>j===i?val:o) }));

  const Btn = ({ children, onClick, variant="primary", disabled, style={} }) => {
    const v = {
      primary: { background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#070B14" },
      ghost:   { background:"transparent", border:`1px solid ${t.border}`, color:t.muted },
      danger:  { background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.25)", color:"#EF4444" },
      accent:  { background:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff" },
    };
    return <button onClick={onClick} disabled={disabled} style={{ padding:"8px 16px", borderRadius:9, border:"none", fontWeight:700, fontSize:".84rem", cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, fontFamily:"inherit", ...v[variant], ...style }}>{children}</button>;
  };

  if (loading) return <div style={{ padding:40, color:t.muted, textAlign:"center" }}>Loading quizzes...</div>;

  return (
    <div style={{ padding:"clamp(14px,3%,24px)" }}>
      <style>{`:root{--bg:${t.bg};--bord:${t.border};--txt:${t.text};--mut:${t.muted}}`}</style>

      {/* Flash message */}
      {msg && (
        <div style={{ position:"fixed", top:80, left:"50%", transform:"translateX(-50%)", background: msg.startsWith("✅")?"#10B981":"#EF4444", color:"#fff", padding:"10px 20px", borderRadius:10, fontWeight:700, zIndex:9999, whiteSpace:"nowrap" }}>
          {msg}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <h2 style={{ color:t.text, fontWeight:800, margin:0 }}>📋 Quiz Manager</h2>
              <div style={{ color:t.muted, fontSize:".83rem", marginTop:3 }}>{quizzes.length} quizzes created</div>
            </div>
            <Btn onClick={()=>{ setForm({title:"",description:"",courseId:"",timeLimit:30,passingScore:60,isActive:true,showResults:true}); setView("create"); }}>+ New Quiz</Btn>
          </div>

          {quizzes.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px", color:t.muted }}>
              <div style={{ fontSize:"3rem", marginBottom:12 }}>📋</div>
              <p>No quizzes yet. Create your first quiz!</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,320px),1fr))", gap:16 }}>
              {quizzes.map(quiz => {
                const course = courses.find(c=>c.id===quiz.courseId);
                return (
                  <div key={quiz.id} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, color:t.text, fontSize:".95rem", marginBottom:4 }}>{quiz.title}</div>
                        {course && <div style={{ fontSize:".75rem", color:t.accent, fontWeight:600 }}>📚 {course.title}</div>}
                        {quiz.description && <div style={{ fontSize:".78rem", color:t.muted, marginTop:4 }}>{quiz.description.slice(0,80)}{quiz.description.length>80?"...":""}</div>}
                      </div>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:quiz.isActive?"#10B981":"#EF4444", flexShrink:0, marginLeft:10, marginTop:3 }}/>
                    </div>
                    <div style={{ display:"flex", gap:16, fontSize:".78rem", color:t.muted, marginBottom:14 }}>
                      <span>❓ {quiz.questionCount||0} questions</span>
                      <span>⏱️ {quiz.timeLimit}min</span>
                      <span>🎯 {quiz.passingScore}% pass</span>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <Btn onClick={()=>openQuestions(quiz)} variant="accent" style={{ flex:1, fontSize:".8rem", padding:"7px 10px" }}>❓ Questions</Btn>
                      <Btn onClick={()=>openQuiz(quiz)} variant="ghost" style={{ flex:1, fontSize:".8rem", padding:"7px 10px" }}>✏️ Edit</Btn>
                      <Btn onClick={()=>deleteQuiz(quiz.id)} variant="danger" style={{ padding:"7px 10px", fontSize:".8rem" }}>🗑</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── CREATE / EDIT VIEW ── */}
      {(view==="create" || view==="edit") && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <button onClick={()=>setView("list")} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.1rem" }}>←</button>
            <h2 style={{ color:t.text, fontWeight:800, margin:0 }}>{view==="create"?"New Quiz":"Edit Quiz"}</h2>
          </div>
          <div style={{ maxWidth:560 }}>
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"20px" }}>
              <Inp label="Quiz Title *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Module 1 Test"/>
              <Txt label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} placeholder="Quiz description (optional)"/>
              <Sel label="Link to Course (optional)" value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})}>
                <option value="">— No course —</option>
                {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
              </Sel>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Inp label="Time Limit (minutes)" type="number" value={form.timeLimit} onChange={e=>setForm({...form,timeLimit:e.target.value})}/>
                <Inp label="Passing Score (%)" type="number" value={form.passingScore} onChange={e=>setForm({...form,passingScore:e.target.value})}/>
              </div>
              <div style={{ display:"flex", gap:16, marginBottom:16 }}>
                {[["isActive","Active (visible to students)"],["showResults","Show results to students"]].map(([k,label])=>(
                  <label key={k} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:".85rem", color:t.muted }}>
                    <input type="checkbox" checked={form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})}/>
                    {label}
                  </label>
                ))}
              </div>
              <Btn onClick={saveQuiz} disabled={saving}>{saving?"Saving...":view==="create"?"Create Quiz →":"Save Changes"}</Btn>
            </div>
          </div>
        </>
      )}

      {/* ── QUESTIONS VIEW ── */}
      {view==="questions" && activeQuiz && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
            <button onClick={()=>setView("list")} style={{ background:"none", border:"none", color:t.muted, cursor:"pointer", fontSize:"1.1rem" }}>←</button>
            <div>
              <h2 style={{ color:t.text, fontWeight:800, margin:0, fontSize:"1.05rem" }}>{activeQuiz.title}</h2>
              <div style={{ color:t.muted, fontSize:".78rem" }}>{questions.length} questions</div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"flex-start" }}>

            {/* Left: Add/Edit question form */}
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px" }}>
              <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>
                {editQIdx !== null ? `Edit Q${editQIdx+1}` : "New Question"}
              </h3>
              <Txt label="Question *" value={qForm.question} onChange={e=>setQForm({...qForm,question:e.target.value})} rows={3} placeholder="Write your question here..."/>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:".75rem", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 }}>Options (sahi answer select karo)</label>
                {qForm.options.map((opt,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                    <input type="radio" name="correct" checked={qForm.correct===i} onChange={()=>setQForm({...qForm,correct:i})} style={{ accentColor:"#10B981", flexShrink:0 }}/>
                    <div style={{ width:24, height:24, borderRadius:"50%", background: qForm.correct===i?"#10B981":"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".72rem", fontWeight:800, color: qForm.correct===i?"#fff":t.muted, flexShrink:0 }}>
                      {["A","B","C","D"][i]}
                    </div>
                    <input value={opt} onChange={e=>updateOption(i,e.target.value)} placeholder={`Option ${["A","B","C","D"][i]}`}
                      style={{ flex:1, padding:"7px 10px", background:t.bg, border:`1px solid ${qForm.correct===i?"#10B981":t.border}`, borderRadius:7, fontSize:".87rem", color:t.text, fontFamily:"inherit", outline:"none" }}/>
                  </div>
                ))}
              </div>
              <Txt label="Explanation (optional)" value={qForm.explanation} onChange={e=>setQForm({...qForm,explanation:e.target.value})} rows={2} placeholder="Explain why this answer is correct..."/>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={saveQuestion} disabled={saving} style={{ flex:1 }}>{saving?"Saving...":editQIdx!==null?"Update Question":"Add Question"}</Btn>
                {editQIdx!==null && <Btn onClick={()=>{setQForm(EMPTY_Q);setEditQIdx(null);}} variant="ghost">Cancel</Btn>}
              </div>
            </div>

            {/* Right: Questions list */}
            <div>
              {questions.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 20px", background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, color:t.muted }}>
                  <div style={{ fontSize:"2.5rem", marginBottom:10 }}>❓</div>
                  <p style={{ fontSize:".87rem" }}>No questions yet. Add from the form on the left!</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {questions.map((q,i)=>(
                    <div key={q.id} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:".72rem", fontWeight:700, color:t.muted, marginBottom:4 }}>Q{i+1}</div>
                          <div style={{ fontSize:".87rem", color:t.text, fontWeight:600, lineHeight:1.4 }}>{q.question}</div>
                          <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                            {q.options.map((o,j)=>(
                              <span key={j} style={{ fontSize:".73rem", padding:"2px 8px", borderRadius:50, background:j===q.correct?"rgba(16,185,129,.15)":t.bg, color:j===q.correct?"#10B981":t.muted, border:`1px solid ${j===q.correct?"#10B981":t.border}`, fontWeight:j===q.correct?700:400 }}>
                                {["A","B","C","D"][j]}: {o.slice(0,20)}{o.length>20?"...":""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          <button onClick={()=>editQuestion(i)} style={{ padding:"5px 10px", background:`${t.accent}15`, border:`1px solid ${t.accent}30`, borderRadius:6, color:t.accent, cursor:"pointer", fontSize:".78rem", fontFamily:"inherit" }}>✏️</button>
                          <button onClick={()=>deleteQuestion(i)} style={{ padding:"5px 10px", background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.25)", borderRadius:6, color:"#EF4444", cursor:"pointer", fontSize:".78rem", fontFamily:"inherit" }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}