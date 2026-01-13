import Link from "next/link";
import recipe from "../data/recipes/sample.json";

export default function HomePage() {
  return (
    <main className="container">
      <div style={{ textAlign: "center", paddingTop: "60px", paddingBottom: "40px" }}>
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

      <div style={{ marginTop: "60px" }}>
        <Link
          href={`/recipes/${recipe.id}/1`}
          style={{
            display: "block",
            textAlign: "center",
            padding: "20px",
            border: "1px solid #1a1a1a",
            borderRadius: "0",
            color: "#1a1a1a",
            fontSize: "18px",
            fontWeight: 300,
            letterSpacing: "0.5px",
            transition: "all 0.2s ease",
            textDecoration: "none"
          }}
          className="recipe-link"
        >
          {recipe.title}
        </Link>
      </div>
    </main>
  );
}

