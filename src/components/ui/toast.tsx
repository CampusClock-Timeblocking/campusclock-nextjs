"use client";
import { useEffect, useState } from "react";

export function Toast({ msg, onDone }: { msg: string; onDone: ()=>void }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setShow(false); onDone(); }, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-black px-4 py-2 text-sm text-white shadow-lg">
      {msg}
    </div>
  );
}
