import React from "react";

export default function EmptyState({ title, body, action }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="subtle">{body}</p>
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  );
}

