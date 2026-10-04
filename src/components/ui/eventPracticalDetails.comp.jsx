import React from "react";
import { Languages, Accessibility, Wallet, Bus, Backpack } from "lucide-react";
import EventDetailRow from "./eventDetailRow.comp";

const accessLabels = {
  yes: "Wheelchair accessible",
  partial: "Partially accessible — contact the organizer for details",
  no: "Not wheelchair accessible",
};
const text = value => typeof value === "string" ? value.trim() : "";

export default function EventPracticalDetails({ event }) {
  const details = [
    { label: "Language", icon: Languages, value: text(event.language) },
    { label: "Wheelchair access", icon: Accessibility, value: accessLabels[event.wheelchairAccess] },
    { label: "Cost", icon: Wallet, value: text(event.cost) },
    { label: "Transport", icon: Bus, value: text(event.transport) },
    { label: "What to bring", icon: Backpack, value: text(event.whatToBring) },
  ].filter(detail => detail.value);
  if (!details.length) return null;

  return <section className="event-practical-details" aria-label="Accessibility and practical details">
    <h4>Good to know</h4>
    <dl className="event-facts">
      {details.map(({ label, icon, value }) => <EventDetailRow key={label} label={label} icon={icon}>{value}</EventDetailRow>)}
    </dl>
  </section>;
}
