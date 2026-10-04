import { ContentSkeleton, LoadingContent, LazyCard } from "../ui/loading.comp";
import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  List,
  Row,
  Col,
  Typography,
  message,
  Modal,
} from "antd";
import axios from "axios";
import moment from "moment";
import { API_URL, getMediaUrl } from "../../api";
import { formatEventDateRange, sortEventsByStart } from "../../lib/eventDates";
import EventDetails from "../ui/eventDetails.comp";
import UserProfilePreview from "../ui/userProfilePreview.comp";
import "../../Styles/Events.css";

const { Text, Title } = Typography;

const escapeIcsText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const formatIcsDate = (value) =>
  moment(value).utc().format("YYYYMMDD[T]HHmmss[Z]");

const buildCalendarFile = (events) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UniEventia//My Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event) => {
    const start = moment(event.startDate || event.StartDate);
    const end = moment(event.endDate || event.EndDate);
    if (!start.isValid()) return;

    const organizer = event.organizer
      ? `${event.organizer.fname || ""} ${event.organizer.lname || ""}`.trim()
      : "UniEventia";
    const description = [
      event.description,
      organizer ? `Organizer: ${organizer}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event._id}@unieventia`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end.isValid() ? end : start.clone().add(1, "hour"))}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(event.location)}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
};

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMyEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const userId = user?._id || user?.id;
      if (!userId) throw new Error("Sign in again to load your events.");
      const response = await axios.get(`${API_URL}/events`);
      const myEvents = (response.data || []).filter(event =>
        (event.participants || []).some(person => String(person?._id || person) === String(userId)) ||
        (event.waitlist || []).some(id => String(id) === String(userId)));
      setEvents(sortEventsByStart(myEvents));
      setSelectedEvent(current => current ? myEvents.find(event => event._id === current._id) || null : null);
    } catch { setError("Your events could not be loaded. Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    fetchMyEvents();
    window.addEventListener("focus", fetchMyEvents);
    return () => window.removeEventListener("focus", fetchMyEvents);
  }, [fetchMyEvents]);

  const currentUserId = (() => { try { const user = JSON.parse(localStorage.getItem("user") || "null"); return user?._id || user?.id; } catch { return null; } })();
  const isWaitlisted = (event) => (event.waitlist || []).some(id => String(id) === String(currentUserId));
  const joinedEvents = events.filter(event => !isWaitlisted(event));
  const downloadCalendar = () => {
    const content = buildCalendarFile(joinedEvents);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "unieventia-my-events.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    message.success("Calendar file downloaded.");
  };

  const handleCancelParticipation = async (eventId, eventTitle) => {
    const waiting = isWaitlisted(events.find(event => event._id === eventId) || {});
    Modal.confirm({
      title: waiting ? "Leave waitlist" : "Cancel Participation",
      content: `Are you sure you want to withdraw from "${eventTitle}"?`,
      okText: "Yes, withdraw",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(`${API_URL}/events/${eventId}/${waiting ? "waitlist" : "participate"}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          message.success(waiting ? "You left the waitlist." : "You have withdrawn from this event.");
          setEvents((previousEvents) =>
            previousEvents.filter((event) => event._id !== eventId),
          );
          setSelectedEvent(null);
        } catch (error) {
          console.error("Failed to cancel participation:", error);
          message.error(
            error.response?.data?.message || "Failed to withdraw from event.",
          );
        }
      },
    });
  };

  if (loading) return <ContentSkeleton label="Loading your events" />;

  return (
    <div className="my-events-page">
      <div className="my-events-toolbar">
        <div>
          <Title level={3}>My events</Title>
          <Text type="secondary">
            Your confirmed events and waitlists. Only confirmed events are included in your calendar.
          </Text>
        </div>
        <Button onClick={fetchMyEvents}>Refresh</Button>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadCalendar}
          disabled={!joinedEvents.length}
        >
          Download calendar
        </Button>
      </div>

      {error && <Alert type="error" showIcon message={error} action={<Button onClick={fetchMyEvents}>Try again</Button>} />}
      {!error && !events.length && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="You have not joined any events yet"
        />
      )}
      {!error && events.length > 0 && (
        <Row gutter={[16, 16]}>
          {events.map((event) => (
            <Col key={event._id} xs={24} sm={12} md={8} lg={6}>
              <LazyCard label="Loading event">
              <Card
                className="event-card"
                hoverable
                onClick={() => setSelectedEvent(event)}
                cover={
                  <img
                    className="event-card-image"
                    alt={`Cover for ${event.title || "this event"}`}
                    src={getMediaUrl(event.coverImage, "event")}
                  />
                }
              >
                <Title className="event-card-title" level={4}>
                  {event.title}
                </Title>
                {isWaitlisted(event) && <p><strong>Waitlisted · position {(event.waitlist || []).findIndex(id => String(id) === String(currentUserId)) + 1}</strong></p>}
                <p className="event-card-description">{event.description}</p>
                <Text className="event-card-info">
                  <CalendarOutlined /> {formatEventDateRange(event)}
                </Text>
                <br />
                <Text className="event-card-info" type="secondary">
                  <EnvironmentOutlined /> {event.location}
                </Text>
              </Card>
              </LazyCard>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={selectedEvent?.title}
        open={Boolean(selectedEvent)}
        onCancel={() => setSelectedEvent(null)}
        footer={null}
        width={820}
      >
        {selectedEvent && (
          <LoadingContent variant="profile" label="Loading event details"><div className="event-detail-grid">
            <EventDetails event={selectedEvent}>
              {isWaitlisted(selectedEvent) && <p role="status">Waitlisted · position {(selectedEvent.waitlist || []).findIndex(id => String(id) === String(currentUserId)) + 1}. You will be registered automatically if a place opens before the event starts.</p>}
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  handleCancelParticipation(
                    selectedEvent._id,
                    selectedEvent.title,
                  )
                }
              >
                {isWaitlisted(selectedEvent) ? "Leave waitlist" : "Withdraw"}
              </Button>
            </EventDetails>
            <div className="event-conversation">
              <Title level={4}>What are people hoping to see?</Title>
              <List
                dataSource={selectedEvent.comments || []}
                locale={{ emptyText: "No comments yet." }}
                renderItem={(comment) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <UserProfilePreview user={comment.user}>
                          <Avatar
                            src={getMediaUrl(
                              comment.user?.profilePicture,
                              "profile",
                            )}
                            alt={`${comment.user?.fname || "Member"}`}
                          />
                        </UserProfilePreview>
                      }
                      title={
                        <UserProfilePreview user={comment.user}>
                          {`${comment.user?.fname || "Member"} ${comment.user?.lname || ""}`}
                        </UserProfilePreview>
                      }
                      description={comment.text}
                    />
                  </List.Item>
                )}
              />
            </div>
          </div></LoadingContent>
        )}
      </Modal>
    </div>
  );
}

export { buildCalendarFile };
