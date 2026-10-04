import React from "react";
import { Avatar, Typography } from "antd";
import { CalendarDays, Clock3, MapPin, Users, ListOrdered } from "lucide-react";
import { getMediaUrl } from "../../api";
import EventDetailRow from "./eventDetailRow.comp";
import EventPracticalDetails from "./eventPracticalDetails.comp";
import UserProfilePreview from "./userProfilePreview.comp";

const { Title, Text } = Typography;
const dateAndTime = value => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return <><span>{date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span><strong className="event-fact-time">{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</strong></>;
};

// Shared by Discover, My Events, organizer details and the creation preview.
export default function EventDetails({ event, coverUrl, preview = false, children }) {
  const organizerName = `${event.organizer?.fname || "Event organizer"} ${event.organizer?.lname || ""}`.trim();
  const organizer = <span className="event-organizer-link">
    <Avatar size={34} src={getMediaUrl(event.organizer?.profilePicture, "profile")} alt={`Profile picture of ${organizerName}`} />
    <strong>{organizerName}</strong>
  </span>;
  return <div className="event-details">
    <img className="event-detail-image" src={coverUrl || getMediaUrl(event.coverImage, "event")} alt={`Cover for ${event.title || "this event"}`} />
    <Title level={4}>{event.title}</Title>
    <p className="event-detail-description">{event.description}</p>
    <div className="event-organizer"><Text type="secondary">Organized by</Text>{preview ? organizer : <UserProfilePreview user={event.organizer}>{organizer}</UserProfilePreview>}</div>
    <dl className="event-facts" aria-label="Event essentials">
      <EventDetailRow icon={CalendarDays} label="Starts">{dateAndTime(event.startDate || event.StartDate)}</EventDetailRow>
      <EventDetailRow icon={Clock3} label="Ends">{dateAndTime(event.endDate || event.EndDate)}</EventDetailRow>
      <EventDetailRow icon={MapPin} label="Location">{event.location}</EventDetailRow>
      <EventDetailRow icon={Users} label="Participants"><strong>{event.participants?.length || 0}</strong> / <strong>{event.maxParticipants || 50}</strong> places</EventDetailRow>
      {event.waitlist?.length > 0 && <EventDetailRow icon={ListOrdered} label="Waitlist">{event.waitlist.length} waiting</EventDetailRow>}
    </dl>
    <EventPracticalDetails event={event} />
    {children && <div className="event-detail-actions">{children}</div>}
  </div>;
}
