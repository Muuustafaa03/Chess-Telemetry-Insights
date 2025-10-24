// components/LoadingState.tsx (optional enhancement)
export default function LoadingState() {
  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-neutral-800 rounded"></div>
        <div className="h-10 w-48 bg-neutral-800 rounded"></div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-neutral-800 rounded"></div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-64 bg-neutral-800 rounded"></div>
      <div className="h-64 bg-neutral-800 rounded"></div>

      {/* Summary skeleton */}
      <div className="h-48 bg-neutral-800 rounded"></div>
    </div>
  );
}