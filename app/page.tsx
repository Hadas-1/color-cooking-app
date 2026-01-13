"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import recipe from "../data/recipes/sample.json";
import QRCodeComponent from "./components/QRCode";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <main className="container">
      <div style={{ textAlign: "center", paddingTop: "60px", paddingBottom: "32px" }}>
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "32px",
            fontWeight: 300,
            letterSpacing: "-0.5px",
            color: "#1a1a1a"
          }}
        >
          Cook by Color
        </h1>
        <p style={{ margin: 0, fontSize: "16px", color: "#666", fontWeight: 300 }}>
          Intuitive cooking guided by color
        </p>
      </div>

      {mounted && <QRCodeComponent url={`/recipes/${recipe.id}/1`} />}

      <div style={{ marginTop: "32px", marginBottom: "40px" }}>
        <Link
          href={`/recipes/${recipe.id}/1`}
          style={{
            display: "block",
            width: "100%",
            padding: "18px",
            background: "#1a1a1a",
            color: "#ffffff",
            fontSize: "17px",
            fontWeight: 300,
            letterSpacing: "0.5px",
            textAlign: "center",
            transition: "all 0.2s ease",
            borderRadius: "0",
            textDecoration: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Start cooking
        </Link>
      </div>
    </main>
  );
}

