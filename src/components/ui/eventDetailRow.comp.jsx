import React from "react";

export default function EventDetailRow({ icon: Icon, label, children }) {
  return <div className="event-fact">
    <dt><Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></dt>
    <dd>{children}</dd>
  </div>;
}
