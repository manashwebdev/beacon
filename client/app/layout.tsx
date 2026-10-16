import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Aurora from "@/components/Aurora";

const font = Outfit({ subsets: ["latin"], weight: ["300", "400", "600"] });

export const metadata: Metadata = {
  title: "Beacon: feedback, roadmap and changelog",
  description: "Collect feedback, rank it by votes, ship it, and tell your users.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05060d" };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>
        <Aurora />
        <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
      </body>
    </html>
  );
}
