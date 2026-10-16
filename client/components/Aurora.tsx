"use client";
import { useEffect } from "react";

export default function Aurora() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    };
    addEventListener("pointermove", move);
    return () => removeEventListener("pointermove", move);
  }, []);
  return (
    <>
      <div className="bg"><i /><i /><i /></div>
      <div className="glow" />
    </>
  );
}
