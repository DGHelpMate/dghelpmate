import React from "react";

const Loader = ({ dark }) => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: dark ? "#070B14" : "#F8FAFF",
      }}
    >
      <div style={{ position: "relative", width: 90, height: 90 }}>

        {/* Rotating Ring */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTop: "3px solid #F97316",
            borderRight: "3px solid #F59E0B",
            animation: "spin 1.2s linear infinite"
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            boxShadow: "0 0 25px rgba(249,115,22,0.6)",
            animation: "pulseGlow 2s ease-in-out infinite"
          }}
        />

        {/* Logo */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 55,
            height: 55,
            borderRadius: 14,
            overflow: "hidden"
          }}
        >
          <img
            src="/images/logo.png"
            alt="DG HelpMate Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain"
            }}
            onError={(e) => {
              const parent = e.target.parentElement;
              e.target.style.display = "none";
              parent.innerHTML = `<span style="font-weight:900;font-size:18px;color:#F97316;">DG</span>`;
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div
        style={{
          position: "absolute",
          bottom: "80px",
          fontSize: ".95rem",
          color: dark ? "#94A3B8" : "#64748B",
          letterSpacing: "1.5px"
        }}
      >
        Initializing DG HelpMate...
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes pulseGlow {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  );
};

export default Loader;