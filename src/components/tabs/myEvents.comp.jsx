import React, { useEffect, useState } from "react";
import {
  CalendarOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Spin,
  Typography,
  message,
  Modal,
} from "antd";
import axios from "axios";
import moment from "moment";
import { API_URL, getMediaUrl } from "../../api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyEvents = async () => {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?._id || user?.id;

      if (!userId) {
        setError("We could not identify your account. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/events`);
        const joinedEvents = (response.data || []).filter((event) =>
          (event.participants || []).some(
            (participant) =>
              String(participant?._id || participant) === String(userId),
          ),
        );
        joinedEvents.sort(
          (first, second) =>
            moment(first.startDate || first.StartDate).valueOf() -
            moment(second.startDate || second.StartDate).valueOf(),
        );
        setEvents(joinedEvents);
      } catch (requestError) {
        console.error("Failed to load participating events:", requestError);
        setError("Your participating events could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, []);

  const downloadCalendar = () => {
    const content = buildCalendarFile(events);
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
    Modal.confirm({
      title: "Cancel Participation",
      content: `Are you sure you want to withdraw from "${eventTitle}"?`,
      okText: "Yes, withdraw",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(`${API_URL}/events/${eventId}/participate`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          message.success("You have withdrawn from this event.");
          // Refresh events list
          setEvents((prevEvents) =>
            prevEvents.filter((event) => event._id !== eventId),
          );
        } catch (error) {
          console.error("Failed to cancel participation:", error);
          message.error(
            error.response?.data?.message || "Failed to withdraw from event.",
          );
        }
      },
    });
  };

  if (loading) return <Spin />;

  return (
    <div className="my-events-page">
      <div className="my-events-toolbar">
        <div>
          <Title level={3}>My events</Title>
          <Text type="secondary">
            Events you have joined, ready to add to your calendar.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadCalendar}
          disabled={!events.length}
        >
          Download calendar
        </Button>
      </div>

      {error && <Alert type="error" showIcon message={error} />}
      {!error && !events.length && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="You have not joined any events yet"
        />
      )}
      {!error && events.length > 0 && (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2 }}
          dataSource={events}
          renderItem={(event) => (
            <List.Item>
              <Card
                hoverable
                cover={
                  <img
                    alt={event.title}
                    src={getMediaUrl(event.coverImage, "event")}
                    style={{ height: 200, objectFit: "cover" }}
                  />
                }
              >
                <Title level={4}>{event.title}</Title>
                <p>{event.description}</p>
                <Text>
                  <CalendarOutlined />{" "}
                  {moment(event.startDate || event.StartDate).format(
                    "ddd, MMM D YYYY, h:mm A",
                  )}
                  {(event.endDate || event.EndDate) &&
                    ` - ${moment(event.endDate || event.EndDate).format("h:mm A")}`}
                </Text>
                <br />
                <Text type="secondary">
                  <EnvironmentOutlined /> {event.location}
                </Text>
                <br />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    handleCancelParticipation(event._id, event.title)
                  }
                  style={{ marginTop: 12 }}
                >
                  Withdraw
                </Button>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

export { buildCalendarFile };
