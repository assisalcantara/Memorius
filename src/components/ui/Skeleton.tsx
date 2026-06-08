import React from "react";

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ width: "100%" }}>
      {/* Header Skeleton */}
      <div style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "2px solid #eee" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="skeleton"
            style={{ height: "1.2rem", flex: 1, borderRadius: "4px" }}
          />
        ))}
      </div>
      {/* Rows Skeleton */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          style={{ display: "flex", gap: "1rem", padding: "1.2rem 0", borderBottom: "1px solid #eee" }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={`c-${c}`}
              className="skeleton skeleton-text"
              style={{ flex: 1, margin: 0, height: "1rem" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="dashboard-card" style={{ minHeight: "150px" }}>
      <div className="skeleton skeleton-title" style={{ width: "40%", height: "1.2rem" }} />
      <div className="skeleton skeleton-text" style={{ width: "90%", height: "1rem" }} />
      <div className="skeleton skeleton-text" style={{ width: "70%", height: "1rem" }} />
    </div>
  );
}
