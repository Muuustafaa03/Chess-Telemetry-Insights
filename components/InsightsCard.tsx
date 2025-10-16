"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function InsightsCard() {
  const [text, setText] = useState("Loading insights…");
  const [err, setErr] = useState<string | null>(null);
  const params = useSearchParams();
  const player = params.get("player") || "";

  useEffect(() => {
    let mounted = true;
    const url = "/api/insights" + (player ? `?player=${encodeURIComponent(player)}` : "");
    fetch(url, { cache: "no-store" }) // ✅ bypass cache
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((j) => { if (mounted) setText(j.insight || "No insights yet."); })
      .catch(() => { if (mounted) setErr("Could not load insights."); });
    return () => { mounted = false; };
  }, [player]);

  return (
    <div className="rounded-2xl border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold">AI Insights (last 7 days)</div>
        <span className="text-xs px-2 py-0.5 rounded-full border">Local</span>
      </div>
      {err ? (
        <div className="text-sm text-red-600">{err}</div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-6">{text}</pre>
      )}
      <div className="text-xs text-gray-500">
        (Showing local summary; you can re-enable OpenAI later.)
      </div>
    </div>
  );
}
