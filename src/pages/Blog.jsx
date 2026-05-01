// src/pages/Blog.jsx — Mobile Responsive Complete Blog System
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const CATS = ["All","AI & Tools","YouTube","Business","Productivity","Teaching Tips","Story","MCQ Tips","PPT Design"];

function useSEO({ title, description, image }) {
  useEffect(() => {
    if (title) {
      document.title = title + " — DG HelpMate Blog";
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
      if (description) meta.content = description;
      ["og:title","og:description","og:image"].forEach((p, i) => {
        let el = document.querySelector('meta[property="' + p + '"]');
        if (!el) { el = document.createElement("meta"); el.setAttribute("property", p); document.head.appendChild(el); }
        el.content = [title, description, image][i] || "";
      });
    } else {
      document.title = "Blog — DG HelpMate";
    }
    return () => { document.title = "DG HelpMate — Digital Support for Coaching Institutes"; };
  }, [title, description, image]);
}

function markdownToHtml(md) {
  if (!md) return "";
  if (/<[a-z][\s\S]*>/i.test(md)) return md;
  const lines = md.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; } // skip empty lines, CSS handles spacing
    if (t.startsWith("[youtube:")) {
      const url = t.replace("[youtube:", "").replace("]", "").trim();
      let id = url;
      const m = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
      if (m) id = m[1];
      result.push('<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:16px 0;background:#000;"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen allow="autoplay;encrypted-media"></iframe></div>');
      i++; continue;
    }
    if (t.startsWith("[image:")) {
      const url = t.replace("[image:", "").replace("]", "").trim();
      result.push('<img src="' + url + '" alt="" style="max-width:100%;width:100%;height:auto;border-radius:12px;margin:16px 0;display:block;" />');
      i++; continue;
    }
    if (t.startsWith("[tip]")) {
      const txt = t.slice(5).trim() || "Pro tip here";
      result.push('<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:12px 14px;margin:10px 0;display:flex;gap:10px;align-items:flex-start;"><span style="flex-shrink:0;font-size:1rem">💡</span><span style="color:inherit">' + inlineFormat(txt) + '</span></div>');
      i++; continue;
    }
    if (t.startsWith("[warning]")) {
      const txt = t.slice(9).trim() || "Warning here";
      result.push('<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:12px 14px;margin:10px 0;display:flex;gap:10px;align-items:flex-start;"><span style="flex-shrink:0;font-size:1rem">⚠️</span><span style="color:inherit">' + inlineFormat(txt) + '</span></div>');
      i++; continue;
    }
    if (t.startsWith("[info]")) {
      const txt = t.slice(6).trim() || "Info here";
      result.push('<div style="background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:12px;padding:12px 14px;margin:10px 0;display:flex;gap:10px;align-items:flex-start;"><span style="flex-shrink:0;font-size:1rem">ℹ️</span><span style="color:inherit">' + inlineFormat(txt) + '</span></div>');
      i++; continue;
    }
    // 2-column layout: [cols] col1 content [|] col2 content [/cols]
    if (t === "[cols]") {
      const colLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "[/cols]") {
        colLines.push(lines[i]);
        i++;
      }
      i++; // skip [/cols]
      const splitIdx = colLines.findIndex(l => l.trim() === "[|]");
      const left = splitIdx >= 0 ? colLines.slice(0, splitIdx) : colLines;
      const right = splitIdx >= 0 ? colLines.slice(splitIdx + 1) : [];
      result.push(
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;margin:14px 0;">' +
        '<div>' + markdownToHtml(left.join("\n")) + '</div>' +
        '<div>' + markdownToHtml(right.join("\n")) + '</div>' +
        '</div>'
      );
      continue;
    }
    // Image with caption: [img: URL | Caption text]
    if (t.startsWith("[img:")) {
      const inner = t.slice(5).replace("]","").trim();
      const parts = inner.split("|");
      const url = parts[0].trim();
      const caption = parts[1] ? parts[1].trim() : "";
      result.push(
        '<figure style="margin:14px 0;">' +
        '<img src="' + url + '" alt="' + caption + '" style="max-width:100%;width:100%;height:auto;border-radius:10px;display:block;" />' +
        (caption ? '<figcaption style="text-align:center;font-size:.8rem;margin-top:5px;opacity:.6;">' + caption + '</figcaption>' : '') +
        '</figure>'
      );
      i++; continue;
    }
    if (t.startsWith("# ")) { result.push("<h1>" + inlineFormat(t.slice(2)) + "</h1>"); i++; continue; }
    if (t.startsWith("## ")) { result.push("<h2>" + inlineFormat(t.slice(3)) + "</h2>"); i++; continue; }
    if (t.startsWith("### ")) { result.push("<h3>" + inlineFormat(t.slice(4)) + "</h3>"); i++; continue; }
    if (t.startsWith("> ")) { result.push("<blockquote>" + inlineFormat(t.slice(2)) + "</blockquote>"); i++; continue; }
    if (t === "---") { result.push("<hr />"); i++; continue; }
    if (t.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) { items.push("<li>" + inlineFormat(lines[i].trim().slice(2)) + "</li>"); i++; }
      result.push("<ul>" + items.join("") + "</ul>"); continue;
    }
    if (/^\d+\. /.test(t)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) { items.push("<li>" + inlineFormat(lines[i].trim().replace(/^\d+\. /, "")) + "</li>"); i++; }
      result.push("<ol>" + items.join("") + "</ol>"); continue;
    }
    result.push("<p>" + inlineFormat(t) + "</p>");
    i++;
  }
  return result.join("\n");
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function RichContent({ content, t }) {
  if (!content) return null;
  const html = markdownToHtml(content);
  return (
    <>
      <style>{`
        .blog-content { line-height:1.75; color:${t.muted}; font-size:1rem; word-break:break-word; overflow-wrap:break-word; max-width:100%; }
        .blog-content * { max-width:100%; box-sizing:border-box; }
        .blog-content h1 { font-size:clamp(1.4rem,5vw,2rem); font-weight:800; margin:14px 0 6px; color:${t.text}; line-height:1.3; }
        .blog-content h2 { font-size:clamp(1.15rem,4vw,1.5rem); font-weight:700; margin:12px 0 6px; color:${t.text}; }
        .blog-content h3 { font-size:clamp(1rem,3vw,1.2rem); font-weight:700; margin:10px 0 5px; color:${t.text}; }
        .blog-content p { margin-bottom:8px; }
        .blog-content figure { margin:12px 0; }
        .blog-content figcaption { text-align:center; font-size:.8rem; margin-top:4px; opacity:.6; }
        .blog-content strong, .blog-content b { color:${t.text}; font-weight:700; }
        .blog-content em, .blog-content i { font-style:italic; }
        .blog-content ul, .blog-content ol { padding-left:20px; margin:6px 0 10px; }
        .blog-content li { margin-bottom:4px; }
        .blog-content a { color:#6366F1; font-weight:600; text-decoration:underline; word-break:break-all; }
        .blog-content blockquote { border-left:4px solid ${t.gold}; padding:9px 13px; margin:10px 0; background:${t.gold}10; border-radius:0 10px 10px 0; font-style:italic; }
        .blog-content img { max-width:100% !important; width:100%; height:auto; border-radius:10px; margin:12px 0; display:block; }
        .blog-content table { width:100%; border-collapse:collapse; margin:14px 0; display:block; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .blog-content td, .blog-content th { padding:8px 10px; border:1px solid ${t.border}; white-space:nowrap; font-size:.88rem; }
        .blog-content th { background:rgba(99,102,241,.12); font-weight:700; color:${t.text}; }
        .blog-content hr { border:none; border-top:1px solid ${t.border}; margin:16px 0; }
        .blog-content code { background:rgba(99,102,241,.12); color:#818CF8; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:.85em; word-break:break-all; }
        .blog-content pre { background:#0d1117; border-radius:10px; padding:14px; overflow-x:auto; margin:14px 0; -webkit-overflow-scrolling:touch; }
        .blog-content pre code { background:none; color:#e6edf3; word-break:normal; }
        .blog-content iframe { max-width:100%; }
        @media(max-width:480px){
          .blog-content { font-size:.93rem; }
          .blog-content td,.blog-content th { padding:6px 8px; font-size:.8rem; }
        }
      `}</style>
      <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

function CommentsSection({ blogId, t }) {
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ name:"", email:"", text:"", rating:5 });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "blogComments"), where("blogId", "==", blogId)))
      .then(snap => {
        const all = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        setComments(all.filter(c => c.approved === true)
          .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
      }).catch(() => {});
  }, [blogId]);

  const avgRating = comments.length > 0
    ? (comments.reduce((s,c) => s + (c.rating||5), 0) / comments.length).toFixed(1) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "blogComments"), {
        blogId, name:form.name.trim(), email:form.email.trim(),
        text:form.text.trim(), rating:form.rating,
        approved:false, createdAt:serverTimestamp(),
      });
      setDone(true);
    } catch(err) { console.error(err); }
    setSubmitting(false);
  };

  const iStyle = { padding:"10px 14px", background:t.bg, border:"1px solid "+t.border, borderRadius:9, fontSize:".9rem", color:t.text, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ marginTop:40 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <h3 style={{ fontWeight:800, color:t.text, fontSize:"1.1rem", margin:0 }}>
          💬 Comments {comments.length > 0 && "("+comments.length+")"}
        </h3>
        {avgRating && (
          <div style={{ display:"flex", alignItems:"center", gap:5, background:t.gold+"12", border:"1px solid "+t.gold+"30", padding:"3px 10px", borderRadius:50 }}>
            <span style={{ color:t.gold }}>★</span>
            <span style={{ fontWeight:700, color:t.gold, fontSize:".85rem" }}>{avgRating}</span>
            <span style={{ color:t.muted, fontSize:".72rem" }}>({comments.length})</span>
          </div>
        )}
      </div>

      {comments.map(c => (
        <div key={c.id} style={{ padding:"14px 0", borderBottom:"1px solid "+t.border }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,"+t.accent+",#818CF8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#fff", fontSize:".8rem", flexShrink:0 }}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:700, color:t.text, fontSize:".88rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                <div style={{ color:t.gold, fontSize:".8rem" }}>{"★".repeat(c.rating||5)}</div>
              </div>
            </div>
            <div style={{ fontSize:".72rem", color:t.muted, flexShrink:0 }}>
              {c.createdAt?.toDate?.()?.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})||""}
            </div>
          </div>
          <p style={{ color:t.muted, fontSize:".88rem", lineHeight:1.6, margin:0, paddingLeft:40 }}>{c.text}</p>
        </div>
      ))}

      {comments.length === 0 && <p style={{ color:t.muted, fontSize:".86rem", marginBottom:20 }}>Be the first to comment!</p>}

      <div style={{ marginTop:24, background:t.bgCard, border:"1px solid "+t.border, borderRadius:14, padding:"clamp(16px,4%,24px)" }}>
        <h4 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".97rem" }}>Leave a Comment</h4>
        {done ? (
          <div style={{ textAlign:"center", padding:"16px", color:t.green }}>
            <div style={{ fontSize:"2rem", marginBottom:6 }}>🎉</div>
            <p style={{ fontWeight:700, margin:"0 0 4px" }}>Comment submitted!</p>
            <p style={{ fontSize:".83rem", color:t.muted, margin:0 }}>Appears after admin approval.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:".74rem", fontWeight:700, color:t.muted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Your Rating</label>
              <div style={{ display:"flex", gap:4 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setForm(f=>({...f,rating:s}))}
                    style={{ background:"none", border:"none", fontSize:"1.5rem", cursor:"pointer", opacity:s<=form.rating?1:.3, transition:"opacity .15s", padding:"0 2px" }}>★</button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:8 }}>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your Name *" required style={iStyle} />
              <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email (optional)" style={iStyle} />
            </div>
            <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Share your thoughts..." rows={3} required
              style={{ ...iStyle, resize:"vertical", marginBottom:12 }} />
            <button type="submit" disabled={submitting}
              style={{ padding:"10px 24px", background:submitting?t.border:"linear-gradient(135deg,#6366F1,#4F46E5)", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:".88rem", cursor:submitting?"wait":"pointer", fontFamily:"inherit" }}>
              {submitting ? "Submitting..." : "💬 Post Comment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function BlogPost({ post, onBack, t }) {
  useSEO({ title:post.title, description:post.summary||post.content?.slice(0,160), image:post.coverLandscape||post.coverCard });
  const readTime = Math.max(1, Math.round((post.content||"").split(" ").length / 200));

  return (
    <article style={{ background:t.bg, minHeight:"100vh", overflowX:"hidden" }}>
      {/* Back button */}
      <div style={{ padding:"80px clamp(16px,5%,60px) 0", maxWidth:820, margin:"0 auto" }}>
        <button onClick={onBack} style={{ background:t.bgCard, border:"1px solid "+t.border, color:t.muted, cursor:"pointer", fontSize:".86rem", display:"inline-flex", alignItems:"center", gap:6, fontFamily:"inherit", padding:"7px 16px", borderRadius:50, marginBottom:16 }}>
          ← Back to Blog
        </button>
      </div>

      {/* Landscape cover */}
      {(post.coverLandscape||post.coverCard) && (
        <div style={{ width:"100%", maxHeight:360, overflow:"hidden", background:t.bgCard2 }}>
          <img src={post.coverLandscape||post.coverCard} alt={post.title}
            style={{ width:"100%", height:"100%", objectFit:"cover", maxHeight:360, display:"block" }} />
        </div>
      )}

      <div style={{ maxWidth:820, margin:"0 auto", padding:"24px clamp(16px,5%,50px) 80px" }}>
        {/* Meta */}
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
          <span style={{ background:t.accentBg, color:t.accent, padding:"3px 10px", borderRadius:50, fontSize:".72rem", fontWeight:700 }}>{post.category}</span>
          <span style={{ fontSize:".78rem", color:t.muted }}>{post.createdAt?.toDate?.()?.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})||""}</span>
          <span style={{ fontSize:".78rem", color:t.muted }}>· {readTime} min read</span>
          {post.views > 0 && <span style={{ fontSize:".78rem", color:t.muted }}>· {post.views} views</span>}
        </div>

        {/* Title */}
        <h1 style={{ fontSize:"clamp(1.5rem,5vw,2.6rem)", fontWeight:800, color:t.text, lineHeight:1.25, marginBottom:14 }}>
          {post.emoji} {post.title}
        </h1>

        {/* Summary */}
        {post.summary && (
          <p style={{ fontSize:"clamp(.95rem,2.5vw,1.05rem)", color:t.muted, lineHeight:1.7, marginBottom:20, borderLeft:"4px solid "+t.gold, paddingLeft:14 }}>
            {post.summary}
          </p>
        )}

        {/* Author */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0", borderTop:"1px solid "+t.border, borderBottom:"1px solid "+t.border, marginBottom:28, flexWrap:"wrap" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", overflow:"hidden", border:"2px solid "+t.gold, flexShrink:0 }}>
            <img src="/images/govardhan.jpg" alt="Govardhan" style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e=>{ e.target.style.display="none"; e.target.parentElement.style.background="linear-gradient(135deg,#F59E0B,#F97316)"; e.target.parentElement.style.display="flex"; e.target.parentElement.style.alignItems="center"; e.target.parentElement.style.justifyContent="center"; e.target.parentElement.innerText="G"; e.target.parentElement.style.color="#070B14"; e.target.parentElement.style.fontWeight="900"; }} />
          </div>
          <div>
            <div style={{ fontWeight:700, color:t.text, fontSize:".9rem" }}>Govardhan Pandit</div>
            <div style={{ fontSize:".74rem", color:t.muted }}>Founder & CEO, DG HelpMate</div>
          </div>
          {post.tags?.length > 0 && (
            <div style={{ marginLeft:"auto", display:"flex", gap:5, flexWrap:"wrap" }}>
              {post.tags.slice(0,3).map(tag => (
                <span key={tag} style={{ background:t.bgCard2, color:t.muted, padding:"2px 8px", borderRadius:50, fontSize:".7rem", border:"1px solid "+t.border }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <RichContent content={post.content} t={t} />

        {/* Resources */}
        {post.resources?.length > 0 && (
          <div style={{ marginTop:32, padding:"clamp(14px,4%,22px)", background:t.bgCard, border:"1px solid "+t.border, borderRadius:14 }}>
            <h3 style={{ fontWeight:700, color:t.text, marginBottom:14, fontSize:".95rem" }}>📎 Resources & Links</h3>
            {post.resources.map((r,i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:t.bg, borderRadius:9, marginBottom:7, textDecoration:"none", border:"1px solid "+t.border }}>
                <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{r.icon||"🔗"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, color:t.text, fontSize:".88rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.title}</div>
                  {r.desc && <div style={{ fontSize:".74rem", color:t.muted }}>{r.desc}</div>}
                </div>
                <span style={{ color:t.accent, fontSize:".78rem", fontWeight:700, flexShrink:0 }}>→</span>
              </a>
            ))}
          </div>
        )}

        {/* Share */}
        <div style={{ marginTop:28, padding:"clamp(14px,4%,20px)", background:t.bgCard, borderRadius:13, border:"1px solid "+t.border, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontWeight:700, color:t.text, marginBottom:3, fontSize:".92rem" }}>Share this article</div>
            <div style={{ fontSize:".78rem", color:t.muted }}>Teacher friends ke saath share karo!</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <a href={"https://wa.me/?text="+encodeURIComponent(post.title+" — "+window.location.href)} target="_blank"
              style={{ padding:"8px 14px", background:"#25D366", color:"#fff", borderRadius:8, fontWeight:700, fontSize:".82rem", textDecoration:"none" }}>
              💬 WhatsApp
            </a>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)}
              style={{ padding:"8px 14px", background:t.bgCard2, color:t.text, border:"1px solid "+t.border, borderRadius:8, fontWeight:700, fontSize:".82rem", cursor:"pointer", fontFamily:"inherit" }}>
              🔗 Copy
            </button>
          </div>
        </div>

        {/* Comments */}
        {post.allowComments !== false && <CommentsSection blogId={post.id} t={t} />}

        <button onClick={onBack} style={{ marginTop:28, padding:"10px 22px", background:"none", border:"1px solid "+t.border, borderRadius:9, color:t.muted, cursor:"pointer", fontFamily:"inherit", fontSize:".88rem" }}>
          ← Back to all articles
        </button>
      </div>
    </article>
  );
}

function BlogCard({ post, onClick, t }) {
  const readTime = Math.max(1, Math.round((post.content||"").split(" ").length / 200));
  return (
    <div onClick={onClick} style={{ background:t.bgCard, border:"1px solid "+t.border, borderRadius:14, overflow:"hidden", cursor:"pointer", transition:"transform .2s,box-shadow .2s" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,.18)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
      {/* 16:9 cover */}
      <div style={{ width:"100%", paddingTop:"56.25%", position:"relative", background:t.bgCard2, overflow:"hidden" }}>
        {post.coverCard
          ? <img src={post.coverCard} alt={post.title} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", objectFit:"cover" }} />
          : <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3rem" }}>{post.emoji||"📝"}</div>
        }
        <div style={{ position:"absolute", top:8, left:8 }}>
          <span style={{ background:t.accentBg, color:t.accent, padding:"2px 9px", borderRadius:50, fontSize:".68rem", fontWeight:700 }}>{post.category}</span>
        </div>
        <div style={{ position:"absolute", bottom:8, right:8 }}>
          <span style={{ background:"rgba(0,0,0,.65)", color:"#fff", padding:"2px 7px", borderRadius:5, fontSize:".68rem", fontWeight:600 }}>{readTime} min</span>
        </div>
      </div>
      <div style={{ padding:"14px" }}>
        <div style={{ fontSize:".72rem", color:t.muted, marginBottom:6 }}>
          {post.createdAt?.toDate?.()?.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})||""}
          {post.views > 0 && " · "+post.views+" views"}
        </div>
        <h3 style={{ fontWeight:700, fontSize:".93rem", color:t.text, marginBottom:7, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {post.title}
        </h3>
        <p style={{ fontSize:".82rem", color:t.muted, lineHeight:1.55, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", marginBottom:12 }}>
          {post.summary||(post.content?.slice(0,100)+"...")}
        </p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:".72rem", color:t.muted, fontWeight:600 }}>Govardhan Pandit</span>
          <span style={{ fontSize:".78rem", color:t.accent, fontWeight:700 }}>Read →</span>
        </div>
      </div>
    </div>
  );
}

export function Blog({ t }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useSEO(activePost ? {} : { title:"Blog — DG HelpMate", description:"Practical guides and tips for coaching institutes." });

  useEffect(() => {
    getDocs(query(collection(db,"blogs"), where("status","==","published")))
      .then(snap => {
        setPosts(snap.docs.map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
      }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openPost = async (post) => {
    setActivePost(post);
    window.scrollTo(0,0);
    try { await updateDoc(doc(db,"blogs",post.id),{views:increment(1)}); } catch {}
  };

  if (activePost) return <BlogPost post={activePost} onBack={()=>{ setActivePost(null); window.scrollTo(0,0); }} t={t} />;

  const filtered = posts.filter(p =>
    (filter==="All" || p.category===filter) &&
    (!search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.summary?.toLowerCase().includes(search.toLowerCase()))
  );
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div style={{ padding:"64px 0 80px", background:t.bg, minHeight:"100vh", overflowX:"hidden" }}>
      <div style={{ padding:"0 clamp(16px,5%,60px)", maxWidth:1200, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ maxWidth:700, marginBottom:36 }}>
          <div style={{ display:"inline-block", background:t.accentBg, color:t.accent, padding:"4px 12px", borderRadius:50, fontSize:".72rem", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:14 }}>Blog</div>
          <h1 style={{ fontSize:"clamp(1.8rem,5vw,3rem)", fontWeight:800, color:t.text, lineHeight:1.2, marginBottom:12 }}>
            Teachers Problems &<br />
            <span style={{ background:"linear-gradient(135deg,#F59E0B,#F97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Digital Solutions
            </span>
          </h1>
          <p style={{ fontSize:"clamp(.9rem,2.5vw,1rem)", color:t.muted, lineHeight:1.7, maxWidth:520 }}>
            AI tools, YouTube tips, MCQ guides and real stories from coaching institutes.
          </p>
        </div>

        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background:t.bgCard, border:"1px solid "+t.border, borderRadius:50, padding:"9px 16px", maxWidth:340, marginBottom:16 }}>
          <span style={{ color:t.muted }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search articles..."
            style={{ background:"none", border:"none", outline:"none", color:t.text, fontSize:".9rem", fontFamily:"inherit", flex:1, minWidth:0 }} />
        </div>

        {/* Category filter — horizontal scroll on mobile */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:28, WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none" }}>
          {CATS.map(cat => (
            <button key={cat} onClick={()=>setFilter(cat)}
              style={{ padding:"6px 14px", borderRadius:50, fontSize:".78rem", fontWeight:600, cursor:"pointer", border:"1px solid "+(filter===cat?t.gold:t.border), background:filter===cat?t.gold+"18":"transparent", color:filter===cat?t.gold:t.muted, transition:"all .2s", fontFamily:"inherit", flexShrink:0, whiteSpace:"nowrap" }}>
              {cat}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign:"center", padding:"50px", color:t.muted }}>Loading articles...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"50px", color:t.muted }}>
            <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📝</div>
            <h3 style={{ color:t.text, marginBottom:6 }}>No articles yet</h3>
            <p>Check back soon!</p>
          </div>
        )}

        {/* Featured post */}
        {featured && (
          <div onClick={()=>openPost(featured)} style={{ background:t.bgCard, border:"1px solid "+t.border, borderRadius:18, overflow:"hidden", marginBottom:32, cursor:"pointer", transition:"all .25s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=t.gold+"80"; e.currentTarget.style.boxShadow="0 16px 40px rgba(0,0,0,.18)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=t.border; e.currentTarget.style.boxShadow="none"; }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))" }}>
              <div style={{ paddingTop:"56.25%", position:"relative", background:t.bgCard2, overflow:"hidden", minHeight:180 }}>
                {featured.coverCard
                  ? <img src={featured.coverCard} alt={featured.title} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", objectFit:"cover" }} />
                  : <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"4rem" }}>{featured.emoji||"📝"}</div>
                }
              </div>
              <div style={{ padding:"clamp(16px,4%,30px)", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                <div style={{ display:"flex", gap:7, marginBottom:12, flexWrap:"wrap" }}>
                  <span style={{ background:t.gold+"18", color:t.gold, padding:"3px 10px", borderRadius:50, fontSize:".7rem", fontWeight:700 }}>Featured</span>
                  <span style={{ background:t.accentBg, color:t.accent, padding:"3px 10px", borderRadius:50, fontSize:".7rem", fontWeight:700 }}>{featured.category}</span>
                </div>
                <h2 style={{ fontSize:"clamp(1.1rem,3vw,1.7rem)", fontWeight:800, color:t.text, marginBottom:10, lineHeight:1.3 }}>{featured.title}</h2>
                <p style={{ color:t.muted, lineHeight:1.65, marginBottom:16, fontSize:".9rem", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {featured.summary||(featured.content?.slice(0,160)+"...")}
                </p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:".78rem", color:t.muted }}>{featured.createdAt?.toDate?.()?.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})||""}</span>
                  <span style={{ color:t.gold, fontWeight:700, fontSize:".88rem" }}>Read →</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {rest.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))", gap:14 }}>
            {rest.map(post => <BlogCard key={post.id} post={post} onClick={()=>openPost(post)} t={t} />)}
          </div>
        )}

      </div>
    </div>
  );
}