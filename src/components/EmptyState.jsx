import React from "react";

export default function EmptyState({ title, body, action }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="subtle">{body}</p>
      {action ? <div className="emptyStateAction">{action}</div> : null}
    </div>
  );
}

