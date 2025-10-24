"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SummaryCard() {
  const [text, setText] = useState("Loading summary…");
  const [source, setSource] = useState<"openai" | "heuristic" | "local" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const params = useSearchParams();
  const player = params.get("player") || "";

  useEffect(() => {
    let mounted = true;
    
    // Try OpenAI first, fallback to local summary
    const tryOpenAI = async () => {
      const openaiUrl = "/api/openai" + (player ? `?player=${encodeURIComponent(player)}` : "");
      try {
        const r = await fetch(openaiUrl, { cache: "no-store" });
        if (!r.ok) throw new Error("OpenAI endpoint failed");
        const j = await r.json();
        
        if (mounted) {
          setText(j.insight || "No insights yet.");
          setSource(j.source);
        }
      } catch {
        // Fallback to local summary
        const localUrl = "/api/summary" + (player ? `?player=${encodeURIComponent(player)}` : "");
        try {
          const r = await fetch(localUrl, { cache: "no-store" });
          if (!r.ok) throw new Error("Local endpoint failed");
          const j = await r.json();
          
          if (mounted) {
            setText(j.insight || "No insights yet.");
            setSource(j.source);
          }
        } catch {
          if (mounted) {
            setErr("Could not load summary.");
          }
        }
      }
    };

    tryOpenAI();
    return () => { mounted = false; };
  }, [player]);

  const getBadge = () => {
    if (source === "openai") return { text: "AI", color: "bg-green-100 text-green-800 border-green-300" };
    if (source === "heuristic") return { text: "Heuristic", color: "bg-blue-100 text-blue-800 border-blue-300" };
    if (source === "local") return { text: "Local", color: "bg-gray-100 text-gray-800 border-gray-300" };
    return { text: "Loading", color: "bg-gray-100 text-gray-600 border-gray-300" };
  };

  const badge = getBadge();

  return (
    <div className="rounded-2xl border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold">Summary (last 7 days)</div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
          {badge.text}
        </span>
      </div>
      {err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-6">{text}</pre>
      )}
    </div>
  );
}