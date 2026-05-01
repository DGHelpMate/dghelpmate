// src/hooks/useUpload.js
// Cloudinary image upload — FREE 25GB storage
// Cloud: de4llulzo | Preset: dghelpmate_uploads
import { useState } from "react";

const CLOUD_NAME    = "de4llulzo";
const UPLOAD_PRESET = "dghelpmate_uploads";
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export default function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState("");

  const upload = (file, folder = "uploads") => {
    return new Promise((resolve, reject) => {
      if (!file) { reject("No file"); return; }
      if (!file.type.startsWith("image/")) {
        setError("Sirf image files allowed hain (PNG, JPG, WEBP).");
        reject("Not an image"); return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File 5MB se choti honi chahiye.");
        reject("Too large"); return;
      }

      setUploading(true); setProgress(0); setError("");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("folder", `dghelpmate/${folder}`);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded/e.total)*100));
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setProgress(100);
          resolve(data.secure_url);
        } else {
          setError("Upload fail hua. Dobara try karo.");
          reject("Failed");
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        setError("Network error. Internet check karo.");
        reject("Network error");
      };
      xhr.open("POST", UPLOAD_URL);
      xhr.send(fd);
    });
  };

  return { upload, uploading, progress, error, setError };
}