interface StatusBadgeProps {
  status: "PENDING" | "SETTLED" | "EXPIRED";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    PENDING: {
      background: "rgba(0, 0, 0, 0.06)",
      border: "1px solid rgba(0, 0, 0, 0.15)",
      color: "#525252",
      boxShadow: "none",
    },
    SETTLED: {
      background: "#000000",
      border: "1px solid #000000",
      color: "#ffffff",
      boxShadow: "0 0 15px rgba(0, 0, 0, 0.2)",
    },
    EXPIRED: {
      background: "transparent",
      border: "1px solid rgba(0, 0, 0, 0.1)",
      color: "#737373",
      textDecoration: "line-through",
    },
  };
  const dotStyles = {
    PENDING: { background: "#737373" },
    SETTLED: { background: "#ffffff" },
    EXPIRED: { background: "#737373" },
  };

  const currentStyle = styles[status];
  const currentDotStyle = dotStyles[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 12px",
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        backdropFilter: "blur(10px)",
        transition: "all 0.3s ease",
        ...currentStyle,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          ...currentDotStyle,
        }}
      />
      <span>{status}</span>
    </span>
  );
}
