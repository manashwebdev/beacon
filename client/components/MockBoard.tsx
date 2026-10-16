"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const START = [
  { t: "Dark mode for the diff viewer", v: 42, s: "In progress" },
  { t: "Export the comparison as PDF", v: 31, s: "Planned" },
  { t: "Compare more than two versions", v: 24, s: "Under review" },
];

// A small animated sample of the public board, shown in the landing hero.
export default function MockBoard() {
  const [rows, setRows] = useState(START);
  useEffect(() => {
    const i = setInterval(() => setRows((r) => r.map((x, k) => (k === Math.floor(Math.random() * 3) ? { ...x, v: x.v + 1 } : x))), 1800);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="glass" style={{ padding: 18, display: "grid", gap: 10, maxWidth: 460, width: "100%" }} aria-hidden>
      <b style={{ fontWeight: 600 }}>ResumeDiff feedback</b>
      {rows.map((r) => (
        <div key={r.t} className="flex items-center gap-3" style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid var(--line)" }}>
          <div className="vote on" style={{ minWidth: 48, cursor: "default" }}>
            <span>▲</span><motion.b key={r.v} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{r.v}</motion.b>
          </div>
          <div><div style={{ fontSize: 15 }}>{r.t}</div><span className="chip">{r.s}</span></div>
        </div>
      ))}
    </div>
  );
}
