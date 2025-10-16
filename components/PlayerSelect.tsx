"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function PlayerSelect({ players }: { players: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("player") || "all";

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500">Player</label>
      <select
        className="border border-neutral-700 rounded-md px-2 py-1 bg-neutral-900 text-neutral-100"
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          const q = new URLSearchParams(params.toString());
          if (v === "all") q.delete("player"); else q.set("player", v);
          router.push("/?" + q.toString());
        }}
      >
        <option value="all">All</option>
        {players.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
