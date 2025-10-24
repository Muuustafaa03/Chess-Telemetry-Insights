// components/PlayerSelect.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PlayerSelect({ players }: { players: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("player") || "all";

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to ingest games");
        return;
      }

      setSuccess(data.message);
      setUsername("");
      
      // Refresh the page to show new data
      setTimeout(() => {
        router.refresh();
        setSuccess("");
      }, 2000);

    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Username Search Form */}
      <form onSubmit={handleIngest} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter Chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          className="border border-neutral-700 rounded-md px-3 py-1.5 bg-neutral-900 text-neutral-100 placeholder:text-neutral-500 disabled:opacity-50 min-w-[240px]"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {/* Status Messages */}
      {error && (
        <div className="text-red-400 text-sm bg-red-950/30 border border-red-800 rounded px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-green-400 text-sm bg-green-950/30 border border-green-800 rounded px-3 py-2">
          {success}
        </div>
      )}

      {/* Player Filter Dropdown */}
      {players.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Filter by player:</label>
          <select
            className="border border-neutral-700 rounded-md px-2 py-1 bg-neutral-900 text-neutral-100"
            value={current}
            onChange={(e) => {
              const v = e.target.value;
              const q = new URLSearchParams(params.toString());
              if (v === "all") q.delete("player");
              else q.set("player", v);
              router.push("/?" + q.toString());
            }}
          >
            <option value="all">All Players</option>
            {players.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}