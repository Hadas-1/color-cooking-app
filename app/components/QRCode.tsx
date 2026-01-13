"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import QRCode to avoid SSR issues
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

export default function QRCodeComponent({ url }: { url: string }) {
  const [mounted, setMounted] = useState(false);
  const [fullUrl, setFullUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    // Get the full URL only on client side
    if (typeof window !== "undefined") {
      setFullUrl(`${window.location.origin}${url}`);
    }
  }, [url]);

  if (!mounted || !fullUrl) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <div
          style={{
            width: "200px",
            height: "200px",
            margin: "0 auto",
            background: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <p style={{ fontSize: "12px", color: "#999" }}>Loading QR code...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <div
        style={{
          display: "inline-block",
          padding: "16px",
          background: "#ffffff",
          borderRadius: "0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >
        <QRCode
          value={fullUrl}
          size={180}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox="0 0 180 180"
        />
      </div>
      <p
        style={{
          margin: "16px 0 0",
          fontSize: "13px",
          color: "#666",
          fontWeight: 300
        }}
      >
        Scan to open on your phone
      </p>
    </div>
  );
}

