import React from "react";

export default function EmptyState({ title, body, action, emoji = '🌱' }) {
  return (
    <div className="card celebrateCard emptyPlayful">
      <span className="emptyEmoji" aria-hidden="true">{emoji}</span>
      <h2>{title}</h2>
      <p className="subtle" style={{ maxWidth: 420, margin: '8px auto 0' }}>{body}</p>
      {action ? <div className="emptyStateAction">{action}</div> : null}
    </div>
  );
}

