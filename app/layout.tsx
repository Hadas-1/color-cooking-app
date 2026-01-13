import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Cook by Color",
  description: "Intuitive cooking guided by color",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

