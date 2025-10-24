"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PlayerSelect({ players }: { players: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("player") || "all";

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleAnalyze = async () => {
    if (!username.trim()) {
      setMessage({ text: "Please enter a username", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Failed to ingest games", type: "error" });
        return;
      }

      setMessage({ text: data.message || "Success!", type: "success" });
      setUsername("");
      
      // Refresh the page after 1 second
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Username Search */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter Chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          disabled={loading}
          className="border rounded-md px-3 py-1.5 disabled:opacity-50
                     bg-white dark:bg-neutral-900 
                     text-gray-900 dark:text-neutral-100 
                     border-gray-300 dark:border-neutral-700 
                     placeholder-gray-400 dark:placeholder-neutral-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`text-sm p-2 rounded ${
          message.type === "success" 
            ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
            : "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {/* Player Filter Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-gray-400">Filter by player:</label>
        <select
          className="border rounded-md px-2 py-1
                     bg-white dark:bg-neutral-900 
                     text-gray-900 dark:text-neutral-100
                     border-gray-300 dark:border-neutral-700
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={current}
          onChange={(e) => {
            const v = e.target.value;
            const q = new URLSearchParams(params.toString());
            if (v === "all") q.delete("player"); else q.set("player", v);
            router.push("/?" + q.toString());
          }}
        >
          <option value="all">All Players</option>
          {players.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}