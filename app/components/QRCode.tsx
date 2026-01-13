"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import QRCode to avoid SSR issues
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false });

export default function QRCodeComponent({ url }: { url: string }) {
  const [mounted, setMounted] = useState(false);
  const [fullUrl, setFullUrl] = useState("");
  const [qrSize, setQrSize] = useState(150);
  const [qrPadding, setQrPadding] = useState("14px");
  const [isMobile, setIsMobile] = useState(false);
  const [qrMarginTop, setQrMarginTop] = useState("32px");
  const [qrMarginBottom, setQrMarginBottom] = useState("32px");

  useEffect(() => {
    setMounted(true);
    // Get the full URL only on client side
    if (typeof window !== "undefined") {
      setFullUrl(`${window.location.origin}${url}`);
      
      // Determine QR code size based on screen width
      const updateQrSize = () => {
        const mobile = window.innerWidth <= 480;
        setIsMobile(mobile);
        setQrSize(mobile ? 150 : 130); // Smaller on desktop (130px), same on mobile (150px)
        setQrPadding(mobile ? "12px" : "12px");
        // Increase margins on mobile
        setQrMarginTop(mobile ? "40px" : "32px");
        setQrMarginBottom(mobile ? "40px" : "32px");
      };
      
      updateQrSize();
      window.addEventListener('resize', updateQrSize);
      
      return () => {
        window.removeEventListener('resize', updateQrSize);
      };
    }
  }, [url]);

  if (!mounted || !fullUrl) {
    return (
      <div style={{ textAlign: "center", marginTop: "32px", marginBottom: "32px" }}>
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
    <div style={{ textAlign: "center", marginTop: qrMarginTop, marginBottom: qrMarginBottom }}>
      <div
        className="qr-code-wrapper"
        style={{
          display: "inline-block",
          padding: qrPadding,
          background: "#ffffff",
          borderRadius: "0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          maxWidth: "100%"
        }}
      >
        <QRCode
          value={fullUrl}
          size={qrSize}
          style={{ 
            height: "auto", 
            maxWidth: "100%", 
            width: "100%",
            display: "block"
          }}
          viewBox={`0 0 ${qrSize} ${qrSize}`}
        />
      </div>
      <p
        style={{
          margin: "16px 0 0",
          marginBottom: isMobile ? "16px" : "0",
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

