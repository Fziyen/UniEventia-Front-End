import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Rate,
  Row,
  Col,
  Space,
  Typography,
  message,
  Avatar,
} from "antd";
import axios from "axios";
import moment from "moment";
import { API_URL, getMediaUrl } from "../../api";
import "../../Styles/Events.css";

const { Meta } = Card;
const { Title, Text } = Typography;

const getEventStart = (event) => event.startDate || event.StartDate;
const getEventEnd = (event) => event.endDate || event.EndDate;
const isPastEvent = (event) => moment(getEventEnd(event)).isBefore(moment());

export default function Events({ view = "upcoming" }) {
  const [events, setEvents] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    try {
      setCurrentUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setCurrentUser(null);
    }
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/events`);
      setEvents(response.data || []);
    } catch (error) {
      console.error("Failed to load events:", error);
      message.error("Failed to load events.");
    }
  };

  const visibleEvents = useMemo(() => {
    const normalizedSearch = searchText.toLowerCase();
    return events
      .filter((event) =>
        view === "past" ? isPastEvent(event) : !isPastEvent(event),
      )
      .filter((event) => event.title.toLowerCase().includes(normalizedSearch));
  }, [events, searchText, view]);

  const participationState =
    selectedEvent && currentUser
      ? String(selectedEvent.organizer?._id || selectedEvent.organizer) ===
        String(currentUser._id)
        ? "organizer"
        : (selectedEvent.participants || []).some(
              (participant) =>
                String(participant?._id || participant) ===
                String(currentUser._id),
            )
          ? "joined"
          : "available"
      : "guest";

  const participantCount = selectedEvent?.participants?.length || 0;
  const capacity = selectedEvent?.maxParticipants || 50;
  const isParticipant = participationState === "joined";

  const handleParticipate = async () => {
    try {
      await axios.put(
        `${API_URL}/events/${selectedEvent._id}/participate`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      message.success("You joined this event.");
      await fetchEvents();
      setSelectedEvent(null);
    } catch (error) {
      if (error.response?.status === 404) {
        message.error("This event no longer exists or has been deleted.");
        setSelectedEvent(null);
        await fetchEvents();
      } else {
        message.error(
          error.response?.data?.message || "Could not join this event.",
        );
      }
    }
  };

  const submitComment = async ({ text }) => {
    try {
      await axios.post(
        `${API_URL}/events/${selectedEvent._id}/comments`,
        { text },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      commentForm.resetFields();
      message.success("Comment added.");
      await fetchEvents();
    } catch (error) {
      if (error.response?.status === 404) {
        message.error("This event no longer exists or has been deleted.");
        setSelectedEvent(null);
        await fetchEvents();
      } else {
        message.error(
          error.response?.data?.message || "Could not add comment.",
        );
      }
    }
  };

  const submitReview = async (values) => {
    try {
      await axios.post(
        `${API_URL}/events/${selectedEvent._id}/reviews`,
        values,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      reviewForm.resetFields();
      message.success("Review submitted.");
      await fetchEvents();
    } catch (error) {
      if (error.response?.status === 404) {
        message.error("This event no longer exists or has been deleted.");
        setSelectedEvent(null);
        await fetchEvents();
      } else {
        message.error(
          error.response?.data?.message || "Could not submit review.",
        );
      }
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search events"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          prefix={<SearchOutlined />}
        />
      </Space>
      {visibleEvents.length === 0 ? (
        <Empty
          description={
            view === "past"
              ? "No past events yet"
              : "No upcoming events available"
          }
        />
      ) : (
        <Row gutter={[16, 16]}>
          {visibleEvents.map((event) => {
            const count = event.participants?.length || 0;
            const limit = event.maxParticipants || 50;
            return (
              <Col key={event._id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => setSelectedEvent(event)}
                  cover={
                    <img
                      alt={event.title}
                      src={
                        getMediaUrl(event.coverImage) ||
                        require("../../uploads/SCR-20240701-oifn.jpeg")
                      }
                    />
                  }
                >
                  <Meta
                    title={event.title}
                    description={
                      <>
                        <Text>{event.description}</Text>
                        <p>
                          <CalendarOutlined />{" "}
                          {moment(getEventStart(event)).format(
                            "MMM D, YYYY h:mm A",
                          )}
                        </p>
                        <p>
                          <EnvironmentOutlined /> <b>{event.location}</b>
                        </p>
                        <p>
                          <TeamOutlined /> {count} / {limit} participants
                        </p>
                      </>
                    }
                  />
                </Card>
              </Col>
            );
          })}
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
          <div className="event-detail-grid">
            <div>
              <img
                className="event-detail-image"
                src={
                  getMediaUrl(selectedEvent.coverImage) ||
                  require("../../uploads/SCR-20240701-oifn.jpeg")
                }
                alt={selectedEvent.title}
              />
              <Title level={4}>{selectedEvent.title}</Title>
              <Text>{selectedEvent.description}</Text>
              <p>
                <CalendarOutlined />{" "}
                {moment(getEventStart(selectedEvent)).format(
                  "dddd, MMMM D YYYY, h:mm A",
                )}{" "}
                - {moment(getEventEnd(selectedEvent)).format("h:mm A")}
              </p>
              <p>
                <EnvironmentOutlined /> {selectedEvent.location}
              </p>
              <p>
                <TeamOutlined /> <strong>{participantCount}</strong> of{" "}
                <strong>{capacity}</strong> participant spots
              </p>
              {view === "upcoming" && participationState === "available" && (
                <Button
                  type="primary"
                  block
                  disabled={participantCount >= capacity}
                  onClick={handleParticipate}
                >
                  {participantCount >= capacity ? "Event full" : "Participate"}
                </Button>
              )}
              {view === "upcoming" && participationState === "joined" && (
                <Button block disabled>
                  You are participating
                </Button>
              )}
            </div>
            <div className="event-conversation">
              {view === "upcoming" ? (
                <>
                  <Title level={4}>What are you hoping to see?</Title>
                  <List
                    dataSource={selectedEvent.comments || []}
                    locale={{ emptyText: "No comments yet." }}
                    renderItem={(comment) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              src={getMediaUrl(comment.user?.profilePicture)}
                              alt={`${comment.user?.fname || "Member"}`}
                            />
                          }
                          title={`${comment.user?.fname || "Member"} ${comment.user?.lname || ""}`}
                          description={comment.text}
                        />
                      </List.Item>
                    )}
                  />
                  <Form form={commentForm} onFinish={submitComment}>
                    <Form.Item
                      name="text"
                      rules={[
                        { required: true, message: "Write a comment first." },
                      ]}
                    >
                      <Input.TextArea
                        rows={3}
                        maxLength={500}
                        placeholder="Share an idea or what you are looking forward to..."
                      />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      Add comment
                    </Button>
                  </Form>
                </>
              ) : (
                <>
                  <Title level={4}>Reviews from participants</Title>
                  <List
                    dataSource={selectedEvent.reviews || []}
                    locale={{ emptyText: "No reviews yet." }}
                    renderItem={(review) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              src={getMediaUrl(review.user?.profilePicture)}
                              alt={`${review.user?.fname || "Participant"}`}
                            />
                          }
                          title={`${review.user?.fname || "Participant"} ${review.user?.lname || ""}`}
                          description={
                            <>
                              <Rate disabled value={review.rating} />
                              <p>{review.comment}</p>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                  {isParticipant && (
                    <Form form={reviewForm} onFinish={submitReview}>
                      <Form.Item
                        name="rating"
                        label="Rating"
                        rules={[
                          { required: true, message: "Choose a rating." },
                        ]}
                      >
                        <Rate />
                      </Form.Item>
                      <Form.Item
                        name="comment"
                        label="Review"
                        rules={[
                          { required: true, message: "Write a review first." },
                        ]}
                      >
                        <Input.TextArea
                          rows={3}
                          maxLength={1000}
                          placeholder="How was the event?"
                        />
                      </Form.Item>
                      <Button type="primary" htmlType="submit">
                        Submit review
                      </Button>
                    </Form>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export { isPastEvent };
