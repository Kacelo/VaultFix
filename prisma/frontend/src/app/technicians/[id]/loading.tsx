/**
 * A technician profile is a dynamic route, which Next.js does not prefetch by
 * default — without this file a click on "View Profile" left the directory on
 * screen, doing nothing, until the server finished rendering. Adding a loading
 * boundary lets the shell be prefetched and the navigation happen immediately,
 * with this skeleton standing in while the profile streams.
 */
function SkeletonBlock({ height, width = "100%" }: { height: number; width?: string }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.05)",
      }}
    />
  );
}

export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading electrician profile"
      style={{
        minHeight: "calc(100dvh - 68px)",
        background: "var(--grad-hero)",
        padding: "2.5rem 1.5rem 4rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--grad-glow)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <SkeletonBlock height={14} width="120px" />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="glass" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", gap: "1.125rem", alignItems: "center" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.05)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <SkeletonBlock height={22} width="55%" />
                  <SkeletonBlock height={13} width="35%" />
                  <SkeletonBlock height={13} width="45%" />
                </div>
              </div>
            </div>

            <div className="glass" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <SkeletonBlock height={16} width="30%" />
              <SkeletonBlock height={56} />
            </div>

            <div className="glass" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <SkeletonBlock height={16} width="25%" />
              <SkeletonBlock height={13} />
              <SkeletonBlock height={13} width="80%" />
            </div>
          </div>

          <aside style={{ flex: "1 1 320px", maxWidth: 380 }}>
            <div className="glass" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <SkeletonBlock height={18} width="50%" />
              <SkeletonBlock height={38} />
              <SkeletonBlock height={38} />
              <SkeletonBlock height={42} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
