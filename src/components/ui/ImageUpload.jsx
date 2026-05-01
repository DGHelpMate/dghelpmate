// src/components/ui/ImageUpload.jsx
// Drag-drop image upload — Cloudinary server pe store hota hai
import { useRef, useState } from "react";
import useUpload from "../../hooks/useUpload";

export default function ImageUpload({
  folder = "uploads",
  value  = "",
  onUpload,
  label  = "Image Upload Karo",
  shape  = "rect",
  t      = {},
}) {
  const inputRef = useRef();
  const { upload, uploading, progress, error } = useUpload();
  const [preview, setPreview] = useState(value || "");
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(!!value);

  const handleFile = async (file) => {
    if (!file) return;
    // Local preview turant
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      const url = await upload(file, folder);
      setDone(true);
      if (onUpload) onUpload(url);
    } catch (e) {
      console.error(e);
    }
  };

  const isRound = shape === "round";

  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <label style={{
          fontSize: ".78rem", fontWeight: 700,
          color: t.muted || "#8892A4",
          textTransform: "uppercase", letterSpacing: ".05em",
          display: "block", marginBottom: 8,
        }}>{label}</label>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        {/* Upload Zone */}
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            width: isRound ? 110 : "100%",
            minHeight: isRound ? 110 : 130,
            borderRadius: isRound ? "50%" : 12,
            border: `2px dashed ${dragOver ? (t.gold||"#F59E0B") : (t.border||"rgba(255,255,255,.15)")}`,
            background: dragOver ? `${t.gold||"#F59E0B"}12` : (t.bgCard2||"#151E35"),
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8, cursor: uploading ? "wait" : "pointer",
            transition: "all .2s", position: "relative", overflow: "hidden",
          }}
        >
          {preview ? (
            <>
              <img src={preview} alt="" style={{
                width: "100%", height: isRound ? "100%" : 130,
                objectFit: "cover", display: "block",
                borderRadius: isRound ? "50%" : 10,
              }} />
              {/* Hover overlay */}
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity .2s",
                borderRadius: isRound ? "50%" : 10,
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0"}
              >
                <span style={{ color: "#fff", fontSize: ".82rem", fontWeight: 700 }}>
                  {uploading ? `${progress}% uploading...` : "📷 Change"}
                </span>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: "2rem" }}>{uploading ? "⏳" : "📸"}</span>
              <div style={{ textAlign: "center", padding: "0 12px" }}>
                <div style={{ fontSize: ".86rem", fontWeight: 600, color: t.text||"#F1F5F9" }}>
                  {uploading ? `Uploading... ${progress}%` : "Click or Drag Image"}
                </div>
                <div style={{ fontSize: ".73rem", color: t.muted||"#8892A4", marginTop: 3 }}>
                  PNG · JPG · WEBP · Max 5MB
                </div>
              </div>
            </>
          )}

          {/* Progress bar */}
          {uploading && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,.1)" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#F59E0B,#F97316)", transition: "width .3s" }} />
            </div>
          )}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div style={{ fontSize: ".78rem", color: "#EF4444", marginTop: 6 }}>⚠️ {error}</div>
      )}
      {done && !uploading && !error && (
        <div style={{ fontSize: ".75rem", color: "#10B981", marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <span>✅ Cloudinary server pe upload ho gaya!</span>
          <button
            onClick={() => { setPreview(""); setDone(false); if (onUpload) onUpload(""); }}
            style={{ background: "none", border: "none", color: "#EF4444", fontSize: ".75rem", cursor: "pointer" }}
          >✕ Hatao</button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}