import { ContentSkeleton, LoadingContent, LazyCard } from "../ui/loading.comp";
import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  TeamOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  List,
  Modal,
  Rate,
  Typography,
  message,
  Avatar,
} from "antd";
import axios from "axios";
import moment from "moment";
import { API_URL, getMediaUrl } from "../../api";
import { formatEventDateRange, sortEventsByStart } from "../../lib/eventDates";
import EventDetails from "../ui/eventDetails.comp";
import UserProfilePreview from "../ui/userProfilePreview.comp";
import "../../Styles/Events.css";
import { useAuth } from "../../authContext";

const { Title } = Typography;

const getEventEnd = (event) => event.endDate || event.EndDate;
const isPastEvent = (event) => moment(getEventEnd(event)).isBefore(moment());

export default function Events({ view = "upcoming" }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [joining, setJoining] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { user, isAuthenticated, requireAuth } = useAuth();
  const currentUser = isAuthenticated ? user : null;
  const [commentForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await axios.get(`${API_URL}/events`);
      const nextEvents = response.data || [];
      setEvents(nextEvents);
      return nextEvents;
    } catch (error) {
      setLoadError(true);
      console.error("Failed to load events:", error);
      message.error("Failed to load events.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const visibleEvents = useMemo(() => {
    const normalizedSearch = searchText.toLowerCase();
    const filteredEvents = events
      .filter((event) =>
        view === "past" ? isPastEvent(event) : !isPastEvent(event),
      )
      .filter((event) => event.title.toLowerCase().includes(normalizedSearch));

    return sortEventsByStart(filteredEvents);
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
          : (selectedEvent.waitlist || []).some(id => String(id) === String(currentUser._id)) ? "waitlisted" : "available"
      : "guest";

  const participantCount = selectedEvent?.participants?.length || 0;
  const capacity = selectedEvent?.maxParticipants || 50;
  const isParticipant = participationState === "joined";
  const currentUserId = currentUser?._id || currentUser?.id;

  const handleParticipate = async () => {
    if (!requireAuth("join this event")) return;
    if (joining) return;
    setJoining(true);
    try {
      const response = await axios.put(
        `${API_URL}/events/${selectedEvent._id}/participate`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      message.success(response.data?.message || "You joined this event.");
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
    } finally { setJoining(false); }
  };

  const leaveWaitlist = async () => {
    if (!requireAuth("leave the waitlist") || joining) return;
    setJoining(true);
    try {
      await axios.delete(`${API_URL}/events/${selectedEvent._id}/waitlist`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      message.success("You left the waitlist.");
      const nextEvents = await fetchEvents();
      setSelectedEvent(nextEvents.find(event => event._id === selectedEvent._id) || null);
    } catch (error) { message.error(error.response?.data?.message || "Could not leave the waitlist."); }
    finally { setJoining(false); }
  };

  const submitComment = async ({ text }) => {
    if (!requireAuth("add a comment")) return;
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
      const nextEvents = await fetchEvents();
      setSelectedEvent(
        nextEvents.find((event) => event._id === selectedEvent._id) || null,
      );
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
    if (!requireAuth("review this event")) return;
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
      const nextEvents = await fetchEvents();
      setSelectedEvent(
        nextEvents.find((event) => event._id === selectedEvent._id) || null,
      );
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

  const deleteEntry = async (entry, type) => {
    if (!requireAuth("manage your contributions")) return;
    const endpoint = type === "comment" ? "comments" : "reviews";
    const entryLabel = type === "comment" ? "Comment" : "Review";
    try {
      await axios.delete(
        `${API_URL}/events/${selectedEvent._id}/${endpoint}/${entry._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const nextEvents = await fetchEvents();
      setSelectedEvent(
        nextEvents.find((event) => event._id === selectedEvent._id) || null,
      );
      message.success(`${entryLabel} deleted.`);
    } catch (error) {
      message.error(
        error.response?.data?.message || `${entryLabel} could not be deleted.`,
      );
    }
  };

  return (
    <>
      <div className="events-toolbar">
        <Input className="events-search" aria-label="Search events" placeholder="Search events" allowClear value={searchText} onChange={(event) => setSearchText(event.target.value)} prefix={<SearchOutlined />} />
      </div>
      {loading ? <ContentSkeleton variant="feed" count={6} label="Loading events" /> : loadError ? <div className="events-empty"><p>Failed to load events.</p><Button onClick={fetchEvents}>Try again</Button></div> : visibleEvents.length === 0 ? (
        <div className="events-empty">
          <p>{searchText ? "No matching events" : view === "past" ? "No past events yet" : "No upcoming events available"}</p>
          {searchText && <Button onClick={() => setSearchText("")}>Clear search</Button>}
        </div>
      ) : (
        <div className="dashboard-event-grid">
          {visibleEvents.map((event) => {
            const count = event.participants?.length || 0;
            const limit = event.maxParticipants || 50;
            return (
              <LazyCard key={event._id} variant="feed" label="Loading event"><button className="dashboard-event-card" onClick={() => setSelectedEvent(event)} aria-label={`View ${event.title}`}>
                <div className="dashboard-event-cover">
                  <img alt={`Cover for ${event.title || "this event"}`} src={getMediaUrl(event.coverImage, "event")} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaUrl(null, "event"); }} />
                </div>
                <div className="dashboard-event-body">
                  <span className="event-card-location"><EnvironmentOutlined /> {event.location || "Location to be announced"}</span>
                  <h3>{event.title}</h3>
                  <p className="event-card-description">{event.description}</p>
                  <p className="event-card-date"><CalendarOutlined /> {formatEventDateRange(event)}</p>
                  <div className="event-card-footer"><span><TeamOutlined /> {count} / {limit} participants</span></div>
                </div>
              </button></LazyCard>
            );
          })}
        </div>
      )}

      <Modal
        className="dashboard-event-modal"
        title={selectedEvent?.title}
        open={Boolean(selectedEvent)}
        onCancel={() => setSelectedEvent(null)}
        footer={null}
        width={820}
      >
        {selectedEvent && (
          <LoadingContent loading={loading} variant="profile" label="Loading event details"><div className="event-detail-grid">
            <EventDetails event={selectedEvent}>
              {view === "upcoming" && (participationState === "available" || participationState === "guest") && (participantCount >= capacity || selectedEvent.waitlist?.length > 0) && <p>Join the waitlist to be registered automatically, in signup order, if a place opens before the event starts.</p>}
              {view === "upcoming" && (participationState === "available" || participationState === "guest") && (
                <Button
                  type="primary"
                  block
                  loading={joining}
                  disabled={new Date(selectedEvent.startDate) <= new Date()}
                  onClick={handleParticipate}
                >
                  {new Date(selectedEvent.startDate) <= new Date() ? "Registration closed" : participantCount >= capacity || selectedEvent.waitlist?.length ? "Join waitlist" : "Participate"}
                </Button>
              )}
              {view === "upcoming" && participationState === "waitlisted" && <>
                <p role="status">You are on the waitlist · position {(selectedEvent.waitlist || []).findIndex(id => String(id) === String(currentUserId)) + 1}. You will be registered automatically if a place opens before the event starts.</p>
                <Button block onClick={leaveWaitlist} loading={joining}>Leave waitlist</Button>
              </>}
              {view === "upcoming" && participationState === "joined" && (
                <Button block disabled>
                  You are participating
                </Button>
              )}
            </EventDetails>
            <div className="event-conversation">
              {view === "upcoming" ? (
                <>
                  <Title level={4}>What are you hoping to see?</Title>
                  <List
                    dataSource={selectedEvent.comments || []}
                    locale={{ emptyText: "No comments yet." }}
                    renderItem={(comment) => (
                      <List.Item
                        actions={
                          currentUserId && String(comment.user?._id) === String(currentUserId)
                            ? [
                                <Button
                                  type="text"
                                  key={`delete-comment-${comment._id}`}
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label="Delete your comment"
                                  title="Delete your comment"
                                  onClick={() =>
                                    deleteEntry(comment, "comment")
                                  }
                                />,
                              ]
                            : undefined
                        }
                      >
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
                  {!isAuthenticated ? <Button type="primary" onClick={() => requireAuth("add a comment")}>Add comment</Button> : <Form form={commentForm} onFinish={submitComment}>
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
                  </Form>}
                </>
              ) : (
                <>
                  <Title level={4}>Reviews from participants</Title>
                  <List
                    dataSource={selectedEvent.reviews || []}
                    locale={{ emptyText: "No reviews yet." }}
                    renderItem={(review) => (
                      <List.Item
                        actions={
                          currentUserId && String(review.user?._id) === String(currentUserId)
                            ? [
                                <Button
                                  type="text"
                                  key={`delete-review-${review._id}`}
                                  danger
                                  icon={<DeleteOutlined />}
                                  aria-label="Delete your review"
                                  title="Delete your review"
                                  onClick={() => deleteEntry(review, "review")}
                                />,
                              ]
                            : undefined
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            <UserProfilePreview user={review.user}>
                              <Avatar
                                src={getMediaUrl(
                                  review.user?.profilePicture,
                                  "profile",
                                )}
                                alt={`${review.user?.fname || "Participant"}`}
                              />
                            </UserProfilePreview>
                          }
                          title={
                            <UserProfilePreview user={review.user}>
                              {`${review.user?.fname || "Participant"} ${review.user?.lname || ""}`}
                            </UserProfilePreview>
                          }
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
                  {!isAuthenticated && <Button type="primary" onClick={() => requireAuth("review this event")}>Write a review</Button>}
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
          </div></LoadingContent>
        )}
      </Modal>
    </>
  );
}

export { isPastEvent };
