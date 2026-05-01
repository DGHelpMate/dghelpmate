// src/pages/admin/BlogAdmin.jsx
// Full-featured Blog Admin — Rich Text Editor (MS Word style), drag-drop sections,
// cover images, resources, tags, publish/draft, SEO, comments management
import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp, getDoc
} from "firebase/firestore";
import { db } from "../../firebase/config";
import ImageUpload from "../../components/ui/ImageUpload";

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichEditor({ value, onChange, t }) {
  const editorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});

  // Sync content from parent only on mount / external change
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateFormats();
    syncContent();
  };

  const insertHTML = (html) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    updateFormats();
  };

  const updateFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikeThrough"),
      ul: document.queryCommandState("insertUnorderedList"),
      ol: document.queryCommandState("insertOrderedList"),
    });
  };

  const insertYouTube = () => {
    const url = prompt("YouTube URL ya Video ID daalo:");
    if (!url) return;
    let id = url.trim();
    const m = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
    if (m) id = m[1];
    insertHTML(`
      <div class="yt-embed" contenteditable="false" style="margin:20px 0;border-radius:14px;overflow:hidden;aspect-ratio:16/9;background:#000;position:relative;">
        <iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1" 
          style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;" 
          allowfullscreen allow="autoplay;encrypted-media"></iframe>
      </div><p><br></p>
    `);
  };

  const insertImage = () => {
    const url = prompt("Image URL daalo:");
    if (!url) return;
    insertHTML(`<img src="${url}" alt="" style="max-width:100%;border-radius:12px;margin:16px 0;display:block;" /><p><br></p>`);
  };

  const insertTipBox = (type) => {
    const configs = {
      tip:     { bg: "rgba(16,185,129,.1)",  border: "rgba(16,185,129,.3)",  icon: "💡", label: "Pro Tip" },
      warning: { bg: "rgba(245,158,11,.1)",  border: "rgba(245,158,11,.3)",  icon: "⚠️", label: "Important" },
      info:    { bg: "rgba(99,102,241,.1)",  border: "rgba(99,102,241,.3)",  icon: "ℹ️", label: "Note" },
      success: { bg: "rgba(16,185,129,.1)",  border: "rgba(16,185,129,.3)",  icon: "✅", label: "Success" },
    };
    const c = configs[type];
    insertHTML(`
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:14px 16px;margin:16px 0;display:flex;gap:10px;align-items:flex-start;" class="callout-box">
        <span contenteditable="false" style="flex-shrink:0;font-size:1.1rem">${c.icon}</span>
        <div><strong>${c.label}:</strong> Write your ${type} here...</div>
      </div><p><br></p>
    `);
  };

  const insertDivider = () => insertHTML('<hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:24px 0;" /><p><br></p>');

  const insertLink = () => {
    const text = window.getSelection()?.toString() || prompt("Link text:");
    const url = prompt("URL daalo (e.g. https://...):");
    if (!url) return;
    if (window.getSelection()?.toString()) {
      exec("createLink", url);
    } else {
      insertHTML(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6366F1;font-weight:600;text-decoration:underline;">${text}</a>`);
    }
  };

  const insertTable = () => {
    insertHTML(`
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:10px;overflow:hidden;">
        <thead><tr style="background:rgba(99,102,241,.15);">
          <th style="padding:10px 14px;text-align:left;border:1px solid rgba(255,255,255,.1);">Column 1</th>
          <th style="padding:10px 14px;text-align:left;border:1px solid rgba(255,255,255,.1);">Column 2</th>
          <th style="padding:10px 14px;text-align:left;border:1px solid rgba(255,255,255,.1);">Column 3</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);">Cell 1</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);">Cell 2</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);">Cell 3</td></tr>
          <tr><td style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);">Cell 4</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);">Cell 5</td><td style="padding:10px 14px;border:1px solid rgba(255,255,255,.1);">Cell 6</td></tr>
        </tbody>
      </table><p><br></p>
    `);
  };

  const btnStyle = (active) => ({
    padding: "6px 10px", borderRadius: 7, border: `1px solid ${active ? t.accent : t.border}`,
    background: active ? `${t.accent}20` : t.bg, color: active ? t.accent : t.muted,
    cursor: "pointer", fontSize: ".82rem", fontWeight: 600, fontFamily: "inherit",
    transition: "all .15s", minWidth: 32, display: "flex", alignItems: "center", justifyContent: "center",
  });

  const sepStyle = { width: 1, height: 22, background: t.border, flexShrink: 0 };

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", background: t.bg }}>
      {/* Toolbar */}
      <div style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {/* Text formatting */}
        <button onMouseDown={e=>{e.preventDefault();exec("bold")}} style={btnStyle(activeFormats.bold)} title="Bold (Ctrl+B)"><b>B</b></button>
        <button onMouseDown={e=>{e.preventDefault();exec("italic")}} style={btnStyle(activeFormats.italic)} title="Italic (Ctrl+I)"><i>I</i></button>
        <button onMouseDown={e=>{e.preventDefault();exec("underline")}} style={btnStyle(activeFormats.underline)} title="Underline"><u>U</u></button>
        <button onMouseDown={e=>{e.preventDefault();exec("strikeThrough")}} style={btnStyle(activeFormats.strikethrough)} title="Strikethrough"><s>S</s></button>
        <div style={sepStyle}/>
        {/* Headings */}
        {[["H1","h1"],["H2","h2"],["H3","h3"]].map(([l,t2])=>(
          <button key={l} onMouseDown={e=>{e.preventDefault();exec("formatBlock",t2)}} style={btnStyle(false)} title={l}><b>{l}</b></button>
        ))}
        <button onMouseDown={e=>{e.preventDefault();exec("formatBlock","p")}} style={btnStyle(false)} title="Paragraph">P</button>
        <div style={sepStyle}/>
        {/* Lists */}
        <button onMouseDown={e=>{e.preventDefault();exec("insertUnorderedList")}} style={btnStyle(activeFormats.ul)} title="Bullet List">• ≡</button>
        <button onMouseDown={e=>{e.preventDefault();exec("insertOrderedList")}} style={btnStyle(activeFormats.ol)} title="Numbered List">1. ≡</button>
        <button onMouseDown={e=>{e.preventDefault();exec("outdent")}} style={btnStyle(false)} title="Decrease Indent">⇤</button>
        <button onMouseDown={e=>{e.preventDefault();exec("indent")}} style={btnStyle(false)} title="Increase Indent">⇥</button>
        <div style={sepStyle}/>
        {/* Alignment */}
        <button onMouseDown={e=>{e.preventDefault();exec("justifyLeft")}} style={btnStyle(false)} title="Left">⬅</button>
        <button onMouseDown={e=>{e.preventDefault();exec("justifyCenter")}} style={btnStyle(false)} title="Center">⬛</button>
        <button onMouseDown={e=>{e.preventDefault();exec("justifyRight")}} style={btnStyle(false)} title="Right">➡</button>
        <div style={sepStyle}/>
        {/* Colors */}
        <button onMouseDown={e=>{e.preventDefault();exec("foreColor","#F59E0B")}} style={btnStyle(false)} title="Gold text" >
          <span style={{color:"#F59E0B",fontWeight:900}}>A</span>
        </button>
        <button onMouseDown={e=>{e.preventDefault();exec("foreColor","#10B981")}} style={btnStyle(false)} title="Green text">
          <span style={{color:"#10B981",fontWeight:900}}>A</span>
        </button>
        <button onMouseDown={e=>{e.preventDefault();exec("foreColor","#6366F1")}} style={btnStyle(false)} title="Blue text">
          <span style={{color:"#6366F1",fontWeight:900}}>A</span>
        </button>
        <button onMouseDown={e=>{e.preventDefault();exec("removeFormat")}} style={btnStyle(false)} title="Remove Format">✕A</button>
        <div style={sepStyle}/>
        {/* Insert elements */}
        <button onMouseDown={e=>{e.preventDefault();insertLink()}} style={btnStyle(false)} title="Insert Link">🔗</button>
        <button onMouseDown={e=>{e.preventDefault();insertImage()}} style={btnStyle(false)} title="Insert Image">🖼️</button>
        <button onMouseDown={e=>{e.preventDefault();insertYouTube()}} style={{...btnStyle(false), background:"rgba(255,0,0,.1)", borderColor:"rgba(255,0,0,.3)", color:"#EF4444"}} title="Embed YouTube Video">▶ YT</button>
        <button onMouseDown={e=>{e.preventDefault();insertTable()}} style={btnStyle(false)} title="Insert Table">⊞</button>
        <button onMouseDown={e=>{e.preventDefault();insertDivider()}} style={btnStyle(false)} title="Insert Divider">—</button>
        <div style={sepStyle}/>
        {/* Callout boxes */}
        <button onMouseDown={e=>{e.preventDefault();insertTipBox("tip")}} style={{...btnStyle(false), color:"#10B981", borderColor:"rgba(16,185,129,.3)"}} title="Tip Box">💡</button>
        <button onMouseDown={e=>{e.preventDefault();insertTipBox("warning")}} style={{...btnStyle(false), color:"#F59E0B", borderColor:"rgba(245,158,11,.3)"}} title="Warning Box">⚠️</button>
        <button onMouseDown={e=>{e.preventDefault();insertTipBox("info")}} style={{...btnStyle(false), color:"#6366F1", borderColor:"rgba(99,102,241,.3)"}} title="Info Box">ℹ️</button>
        <div style={sepStyle}/>
        {/* Undo/Redo */}
        <button onMouseDown={e=>{e.preventDefault();exec("undo")}} style={btnStyle(false)} title="Undo (Ctrl+Z)">↩</button>
        <button onMouseDown={e=>{e.preventDefault();exec("redo")}} style={btnStyle(false)} title="Redo (Ctrl+Y)">↪</button>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onKeyUp={updateFormats}
        onMouseUp={updateFormats}
        onFocus={updateFormats}
        style={{
          minHeight: 320, padding: "18px 20px", outline: "none",
          color: t.text, lineHeight: 1.8, fontSize: "1rem",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: t.bg,
        }}
        data-placeholder="Start writing your blog post here... Use the toolbar above for formatting."
      />
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: ${t.muted}; opacity: .5; pointer-events: none; }
        [contenteditable] h1 { font-size: 2rem; font-weight: 800; margin: 20px 0 12px; color: ${t.text}; }
        [contenteditable] h2 { font-size: 1.5rem; font-weight: 700; margin: 16px 0 10px; color: ${t.text}; }
        [contenteditable] h3 { font-size: 1.2rem; font-weight: 700; margin: 14px 0 8px; color: ${t.text}; }
        [contenteditable] p { margin: 0 0 12px; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 24px; margin: 8px 0 12px; }
        [contenteditable] li { margin-bottom: 6px; }
        [contenteditable] blockquote { border-left: 4px solid ${t.gold}; padding: 12px 16px; margin: 16px 0; background: ${t.gold}08; border-radius: 0 10px 10px 0; font-style: italic; }
        [contenteditable] a { color: #6366F1; font-weight: 600; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; border-radius: 12px; margin: 12px 0; }
        [contenteditable] table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        [contenteditable] td, [contenteditable] th { padding: 10px 14px; border: 1px solid ${t.border}; }
        [contenteditable] th { background: rgba(99,102,241,.1); font-weight: 700; }
        [contenteditable] hr { border: none; border-top: 1px solid ${t.border}; margin: 24px 0; }
        [contenteditable] code { background: rgba(99,102,241,.12); color: #818CF8; padding: 2px 7px; border-radius: 5px; font-family: monospace; font-size: .88em; }
        [contenteditable]:focus { outline: none; }
      `}</style>
    </div>
  );
}

// ── Comments Manager ──────────────────────────────────────────────────────────
function CommentsManager({ blogId, t }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!blogId) return;
    getDocs(query(collection(db, "blogComments"), where("blogId", "==", blogId)))
      .then(snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))));
  }, [blogId]);

  const deleteComment = async (id) => {
    await deleteDoc(doc(db, "blogComments", id));
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const approveComment = async (id) => {
    await updateDoc(doc(db, "blogComments", id), { approved: true });
    setComments(prev => prev.map(c => c.id === id ? { ...c, approved: true } : c));
  };

  if (comments.length === 0) return <div style={{ color: t.muted, fontSize: ".85rem", padding: "16px 0" }}>No comments yet.</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, color: t.text, marginBottom: 12, fontSize: ".9rem" }}>💬 Comments ({comments.length})</div>
      {comments.map(c => (
        <div key={c.id} style={{ background: t.bg, border: `1px solid ${c.approved ? t.green + "40" : t.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontWeight: 700, color: t.text, fontSize: ".88rem" }}>{c.name} ⭐{c.rating || ""}</div>
            <div style={{ fontSize: ".72rem", color: t.muted }}>{c.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || ""}</div>
          </div>
          <div style={{ fontSize: ".85rem", color: t.muted, marginBottom: 8 }}>{c.text}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {!c.approved && <button onClick={() => approveComment(c.id)} style={{ padding: "4px 10px", background: `${t.green}18`, border: `1px solid ${t.green}40`, color: t.green, borderRadius: 7, fontSize: ".76rem", fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>}
            <button onClick={() => deleteComment(c.id)} style={{ padding: "4px 10px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#EF4444", borderRadius: 7, fontSize: ".76rem", cursor: "pointer" }}>🗑 Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── Markdown format placeholder ───────────────────────────────────────────────
const MARKDOWN_PLACEHOLDER = `# Blog Post Title

## Introduction
Write your introduction here.

## Main Section
**Important point** about this topic.

- Bullet point 1
- Bullet point 2

> Important quote ya highlight.

[tip] Pro tip: Add your expert advice here!

[warning] Important warning here.

## 2-Column Layout Example
[cols]
### Left Column
- Point 1
- Point 2
- Point 3

[|]

### Right Column
- Point A
- Point B
- Point C
[/cols]

## Add Image with Caption
[img: https://image-url.com/img.jpg | Image caption here]

## Add YouTube Video
[youtube: https://youtu.be/VIDEO_ID]

---

## Conclusion
Summary here.`;

const MARKDOWN_PLACEHOLDER_UNUSED = `# Blog Post Title

## Introduction
Write your introduction here. Tell readers what they will learn.

## Main Section 1
### Sub-section

**Important point** about this topic.

- Bullet point 1
- Bullet point 2
- Bullet point 3

> This is an important quote or highlight.

[tip] Pro tip: Add your expert advice here!

[warning] Important: Add warnings or cautions here.

## Add a YouTube Video
[youtube: https://youtu.be/YOUR_VIDEO_ID]

## Add Resources Section
[Read more here](https://your-link.com)

---

## Conclusion
Summarize your key points here.`;

// ── Main Blog Admin ───────────────────────────────────────────────────────────
export default function BlogAdmin({ t }) {
  const [blogs, setBlogs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [view, setView] = useState("list"); // list | editor
  const [selectedBlog, setSelectedBlog] = useState(null);

  const empty = {
    title: "", emoji: "📝", category: "AI & Tools", summary: "", content: "",
    tags: "", coverCard: "", coverLandscape: "", resources: "",
    status: "draft", allowComments: true, editorMode: "rich",
  };
  const [form, setForm] = useState(empty);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const fetchBlogs = async () => {
    const snap = await getDocs(collection(db, "blogs"));
    setBlogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  };
  useEffect(() => { fetchBlogs(); }, []);

  const openEditor = (blog = null) => {
    if (blog) {
      setEditId(blog.id);
      setForm({
        title: blog.title || "",
        emoji: blog.emoji || "📝",
        category: blog.category || "AI & Tools",
        summary: blog.summary || "",
        content: blog.content || "",
        tags: (blog.tags || []).join(", "),
        coverCard: blog.coverCard || "",
        coverLandscape: blog.coverLandscape || "",
        resources: (blog.resources || []).map(r => `${r.title} | ${r.url} | ${r.icon || "🔗"} | ${r.desc || ""}`).join("\n"),
        status: blog.status || "draft",
        allowComments: blog.allowComments !== false,
        editorMode: blog.content?.includes("<") ? "rich" : "markdown",
      });
      setSelectedBlog(blog);
    } else {
      setEditId(null);
      setForm(empty);
      setSelectedBlog(null);
    }
    setView("editor");
    window.scrollTo(0, 0);
  };

  const save = async () => {
    if (!form.title.trim()) { flash("❌ Title required!"); return; }
    setSaving(true);
    try {
      const resourcesArr = (form.resources || "").split("\n").filter(Boolean).map(line => {
        const p = line.split("|").map(s => s.trim());
        return { title: p[0] || "", url: p[1] || "", icon: p[2] || "🔗", desc: p[3] || "" };
      });
      const tagsArr = (form.tags || "").split(",").map(s => s.trim()).filter(Boolean);
      const data = {
        title: form.title, emoji: form.emoji, category: form.category,
        summary: form.summary, content: form.content,
        tags: tagsArr, coverCard: form.coverCard, coverLandscape: form.coverLandscape,
        resources: resourcesArr, status: form.status,
        allowComments: form.allowComments,
        updatedAt: serverTimestamp(),
      };
      if (editId) {
        await updateDoc(doc(db, "blogs", editId), data);
        flash("✅ Post updated!");
      } else {
        await addDoc(collection(db, "blogs"), { ...data, createdAt: serverTimestamp(), views: 0 });
        flash("✅ Post published!");
      }
      await fetchBlogs();
      setView("list");
      setEditId(null);
      setForm(empty);
    } catch (e) { flash("❌ " + e.message); }
    setSaving(false);
  };

  const deleteBlog = async (id) => {
    if (!confirm("Delete this post permanently?")) return;
    await deleteDoc(doc(db, "blogs", id));
    await fetchBlogs();
    flash("🗑️ Deleted");
  };

  const toggleStatus = async (blog) => {
    const newStatus = blog.status === "published" ? "draft" : "published";
    await updateDoc(doc(db, "blogs", blog.id), { status: newStatus, updatedAt: serverTimestamp() });
    await fetchBlogs();
  };

  const inp = (label, key, ph = "", type = "text") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: ".76rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
        style={{ width: "100%", padding: "10px 13px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 9, fontSize: ".91rem", color: t.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  const txt = (label, key, ph = "", rows = 3) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: ".76rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>{label}</label>
      <textarea rows={rows} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
        style={{ width: "100%", padding: "10px 13px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 9, fontSize: ".91rem", color: t.text, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
    </div>
  );

  // ── EDITOR VIEW ──
  if (view === "editor") return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      {msg && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: msg.startsWith("✅") ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)", border: `1px solid ${msg.startsWith("✅") ? t.green : t.red}`, color: msg.startsWith("✅") ? t.green : t.red, padding: "10px 24px", borderRadius: 50, fontSize: ".9rem", fontWeight: 700, whiteSpace: "nowrap" }}>{msg}</div>}

      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => { setView("list"); setEditId(null); }} style={{ background: "none", border: "none", color: t.muted, cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>← Back</button>
        <div style={{ flex: 1, fontWeight: 700, color: t.text, fontSize: ".95rem" }}>
          {editId ? "✏️ Edit Post" : "✏️ New Blog Post"}
        </div>
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          style={{ padding: "8px 12px", background: form.status === "published" ? `${t.green}18` : t.bgCard2, border: `1px solid ${form.status === "published" ? t.green + "60" : t.border}`, borderRadius: 9, color: form.status === "published" ? t.green : t.muted, fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, outline: "none" }}>
          <option value="draft">📝 Draft</option>
          <option value="published">🟢 Published</option>
        </select>
        <button onClick={save} disabled={saving} style={{ padding: "9px 22px", background: saving ? t.border : "linear-gradient(135deg,#F59E0B,#F97316)", color: saving ? t.muted : "#070B14", border: "none", borderRadius: 9, fontWeight: 800, fontSize: ".9rem", cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}>
          {saving ? "Saving..." : editId ? "💾 Update" : "🚀 Publish"}
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>

        {/* LEFT: Main editor */}
        <div>
          {/* Title + Emoji */}
          <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, marginBottom: 16 }}>
            {inp("Emoji", "emoji", "📝")}
            {inp("Post Title *", "title", "How to grow your coaching YouTube channel...")}
          </div>
          {inp("Summary (shown on blog card, 1-2 lines)", "summary", "Short description that appears in the blog listing...")}

          {/* Editor Mode Toggle + Content */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Content
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, editorMode: "rich" }))}
                  style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${form.editorMode !== "markdown" ? t.accent : t.border}`, background: form.editorMode !== "markdown" ? `${t.accent}18` : "transparent", color: form.editorMode !== "markdown" ? t.accent : t.muted, fontSize: ".78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  🎨 Rich Editor
                </button>
                <button type="button" onClick={() => setForm(f => ({ ...f, editorMode: "markdown" }))}
                  style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${form.editorMode === "markdown" ? t.accent : t.border}`, background: form.editorMode === "markdown" ? `${t.accent}18` : "transparent", color: form.editorMode === "markdown" ? t.accent : t.muted, fontSize: ".78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  📝 Markdown
                </button>
              </div>
            </div>

            {form.editorMode === "markdown" ? (
              <div>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={16}
                  placeholder={MARKDOWN_PLACEHOLDER}
                  style={{ width: "100%", padding: "14px 16px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, fontSize: ".91rem", color: t.text, fontFamily: "monospace", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }}
                />
                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px", marginTop: 10 }}>
                  <div style={{ fontWeight: 700, color: t.text, marginBottom: 12, fontSize: ".88rem" }}>📋 Markdown Format Guide (AI ke saath use karo)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[
                      ["# Heading 1", "H1 bada heading"],
                      ["## Heading 2", "H2 medium heading"],
                      ["### Heading 3", "H3 chhota heading"],
                      ["**bold text**", "Bold text"],
                      ["*italic text*", "Italic text"],
                      ["`inline code`", "Code style text"],
                      ["- bullet item", "Bullet list item"],
                      ["1. numbered item", "Numbered list"],
                      ["> blockquote", "Quote / important note"],
                      ["[tip] text here", "💡 Green tip box"],
                      ["[warning] text", "⚠️ Yellow warning box"],
                      ["[info] text", "ℹ️ Blue info box"],
                      ["[youtube: URL]", "YouTube video embed"],
                      ["[image: URL]", "Image insert (full width)"],
                      ["[img: URL | Caption]", "Image with caption"],
                      ["[text](URL)", "Clickable link"],
                      ["---", "Horizontal divider line"],
                      ["[cols]", "2-column layout shuru"],
                      ["[|]", "Column separator (beech mein)"],
                      ["[/cols]", "2-column layout khatam"],
                    ].map(([code, desc]) => (
                      <div key={code} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: `1px solid ${t.border}40`, fontSize: ".8rem" }}>
                        <code style={{ background: t.bg, color: t.accent, padding: "2px 7px", borderRadius: 5, fontFamily: "monospace", flexShrink: 0, fontSize: ".75rem" }}>{code}</code>
                        <span style={{ color: t.muted }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: "12px 14px", background: `${t.gold}08`, border: `1px solid ${t.gold}25`, borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: t.text, marginBottom: 6, fontSize: ".82rem" }}>💡 AI se blog likhwane ka prompt:</div>
                    <div style={{ fontSize: ".78rem", color: t.muted, lineHeight: 1.7, fontFamily: "monospace", background: t.bg, padding: "10px 12px", borderRadius: 8 }}>
                      Write a detailed blog post about [TOPIC] for coaching institute teachers in Bihar/Jharkhand. Use this exact markdown format:
                      <br/>- # for H1, ## for H2, ### for H3
                      <br/>- **bold** for important words
                      <br/>- - for bullet points
                      <br/>- [tip] for pro tips
                      <br/>- [warning] for warnings
                      <br/>- [youtube: URL] for videos
                      <br/>- &gt; for important quotes
                      <br/>- --- for section dividers
                      <br/>Make it practical, helpful, and 800-1200 words.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <RichEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} t={t} />
            )}
          </div>

          {/* Resources */}
          {txt("Resources & Links (1 per line: Title | URL | Emoji | Description)", "resources",
            "Canva Free Templates | https://canva.com | 🎨 | Best for PPT designing\nChatGPT | https://chat.openai.com | 🤖 | AI content creation tool", 4)}

          {/* Comments (if editing existing) */}
          {editId && (
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "18px", marginTop: 16 }}>
              <CommentsManager blogId={editId} t={t} />
            </div>
          )}
        </div>

        {/* RIGHT: Settings panel */}
        <div>
          {/* Category + Tags */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: t.text, marginBottom: 12, fontSize: ".9rem" }}>📋 Post Settings</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: "100%", padding: "10px 13px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 9, fontSize: ".91rem", color: t.text, fontFamily: "inherit", outline: "none" }}>
                {["AI & Tools", "YouTube", "Business", "Productivity", "Teaching Tips", "Story", "MCQ Tips", "PPT Design"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {inp("Tags (comma separated)", "tags", "ai, teaching, youtube, canva")}
            <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", marginTop: 4 }}>
              <input type="checkbox" checked={form.allowComments} onChange={e => setForm(f => ({ ...f, allowComments: e.target.checked }))} style={{ accentColor: t.accent }} />
              <span style={{ fontSize: ".85rem", color: t.muted }}>Allow comments & ratings</span>
            </label>
          </div>

          {/* Cover Images */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: t.text, marginBottom: 12, fontSize: ".9rem" }}>🖼️ Cover Images</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>Card Cover (16:9)</label>
              <input value={form.coverCard} onChange={e => setForm(f => ({ ...f, coverCard: e.target.value }))} placeholder="https://... (paste URL)"
                style={{ width: "100%", padding: "9px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: ".88rem", color: t.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
              <ImageUpload folder="blog-covers" value={form.coverCard} onUpload={url => setForm(f => ({ ...f, coverCard: url }))} label="" t={t} />
              {form.coverCard && <img src={form.coverCard} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 6, aspectRatio: "16/9", objectFit: "cover" }} />}
            </div>
            <div>
              <label style={{ fontSize: ".76rem", fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>Post Banner (wide landscape)</label>
              <input value={form.coverLandscape} onChange={e => setForm(f => ({ ...f, coverLandscape: e.target.value }))} placeholder="https://... (paste URL)"
                style={{ width: "100%", padding: "9px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: ".88rem", color: t.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 6 }} />
              <ImageUpload folder="blog-banners" value={form.coverLandscape} onUpload={url => setForm(f => ({ ...f, coverLandscape: url }))} label="" t={t} />
              {form.coverLandscape && <img src={form.coverLandscape} alt="" style={{ width: "100%", borderRadius: 8, marginTop: 6, height: 80, objectFit: "cover" }} />}
            </div>
          </div>

          {/* Save button */}
          <button onClick={save} disabled={saving} style={{ width: "100%", padding: "13px", background: saving ? t.border : "linear-gradient(135deg,#F59E0B,#F97316)", color: saving ? t.muted : "#070B14", border: "none", borderRadius: 10, fontWeight: 800, fontSize: ".95rem", cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}>
            {saving ? "Saving..." : editId ? "💾 Update Post" : "🚀 Publish Now"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LIST VIEW ──
  return (
    <div>
      {msg && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "rgba(16,185,129,.15)", border: `1px solid ${t.green}`, color: t.green, padding: "10px 24px", borderRadius: 50, fontSize: ".9rem", fontWeight: 700, whiteSpace: "nowrap" }}>{msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "1.4rem", color: t.text, marginBottom: 4 }}>✏️ Blog Manager</h2>
          <div style={{ fontSize: ".82rem", color: t.muted }}>
            {blogs.filter(b => b.status === "published").length} published · {blogs.filter(b => b.status === "draft").length} drafts · {blogs.reduce((s, b) => s + (b.views || 0), 0)} total views
          </div>
        </div>
        <button onClick={() => openEditor()} style={{ padding: "10px 22px", background: "linear-gradient(135deg,#F59E0B,#F97316)", color: "#070B14", border: "none", borderRadius: 10, fontWeight: 800, fontSize: ".9rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
          ✏️ New Post
        </button>
      </div>

      {blogs.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", color: t.muted, background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✏️</div>
          <h3 style={{ color: t.text, marginBottom: 8 }}>No blog posts yet</h3>
          <p style={{ marginBottom: 20 }}>Click "New Post" to write your first article!</p>
          <button onClick={() => openEditor()} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#F59E0B,#F97316)", color: "#070B14", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✏️ Write First Post</button>
        </div>
      )}

      {blogs.map(b => (
        <div key={b.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Thumbnail */}
          <div style={{ width: 90, height: 60, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: t.bgCard2 }}>
            {b.coverCard
              ? <img src={b.coverCard} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>{b.emoji || "📝"}</div>
            }
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: t.text, fontSize: ".95rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.emoji} {b.title}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ padding: "2px 10px", borderRadius: 50, fontSize: ".7rem", fontWeight: 700, background: b.status === "published" ? `${t.green}18` : `${t.gold}18`, color: b.status === "published" ? t.green : t.gold }}>{b.status === "published" ? "🟢 Live" : "📝 Draft"}</span>
              <span style={{ fontSize: ".75rem", color: t.muted }}>{b.category}</span>
              {b.views > 0 && <span style={{ fontSize: ".75rem", color: t.muted }}>👁 {b.views} views</span>}
              {b.tags?.length > 0 && b.tags.slice(0, 2).map(tag => <span key={tag} style={{ fontSize: ".7rem", color: t.accent }}>#{tag}</span>)}
              <span style={{ fontSize: ".72rem", color: t.muted }}>{b.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || ""}</span>
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => openEditor(b)} style={{ padding: "7px 14px", background: t.bgCard2, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "inherit" }}>✏️ Edit</button>
            <button onClick={() => toggleStatus(b)} style={{ padding: "7px 14px", background: b.status === "published" ? `${t.gold}15` : `${t.green}15`, border: `1px solid ${b.status === "published" ? t.gold + "40" : t.green + "40"}`, borderRadius: 8, color: b.status === "published" ? t.gold : t.green, fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "inherit" }}>
              {b.status === "published" ? "⬇ Unpublish" : "🚀 Publish"}
            </button>
            <button onClick={() => deleteBlog(b.id)} style={{ padding: "7px 10px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, color: "#EF4444", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}