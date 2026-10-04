import { LoadingContent, LazyCard } from "../ui/loading.comp";
import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Input,
  Space,
  Row,
  Col,
  Modal,
  List,
  Empty,
  Button,
  message,
  Typography,
  Avatar,
  Form,
  DatePicker,
  TimePicker,
  Upload,
  InputNumber,
  Select,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import moment from "moment";
import { getMediaUrl, API_URL } from "../../api";
import { formatEventDateRange, sortEventsByStart } from "../../lib/eventDates";
import { compressImage } from "../../lib/compressImage";
import EventDetails from "../ui/eventDetails.comp";
import UserProfilePreview from "../ui/userProfilePreview.comp";
import "../../Styles/Events.css";

const { Meta } = Card;
const { Text } = Typography;
const { RangePicker } = DatePicker;

const hasEnded = event => new Date(event?.endDate).getTime() <= Date.now();

const ManageEvents = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [events, setEvents] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [isUpdating, setIsUpdating] = useState(false);

  const summary = useMemo(() => {
    const totalParticipants = events.reduce(
      (sum, event) => sum + (event.participants?.length || 0),
      0,
    );
    const totalReviews = events.reduce(
      (sum, event) => sum + (event.reviews?.length || 0),
      0,
    );
    const upcomingEvents = events.filter((event) => {
      const startDate = event.startDate ? new Date(event.startDate) : null;
      return startDate && startDate >= new Date();
    }).length;

    return {
      totalEvents: events.length,
      totalParticipants,
      totalReviews,
      upcomingEvents,
    };
  }, [events]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setLoadError(false);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setLoadError(true);
      message.error("Please log in again to continue.");
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/events/organizer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data || [];
      const sortedEvents = sortEventsByStart(data);
      setEvents(sortedEvents);
      setFilteredEvents(sortedEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      setLoadError(true);
      message.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchText(value);
    const filtered = events.filter((event) =>
      event.title.toLowerCase().includes(value.toLowerCase()),
    );
    setFilteredEvents(sortEventsByStart(filtered));
  };

  const showModal = (event) => {
    setSelectedEvent(event);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSelectedEvent(null);
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/events/${selectedEvent._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Event deleted successfully");
      setEvents((prev) =>
        prev.filter((event) => event._id !== selectedEvent._id),
      );
      setFilteredEvents((prev) =>
        prev.filter((event) => event._id !== selectedEvent._id),
      );
      handleCancel();
    } catch (err) {
      console.error("Error deleting event:", err);
      message.error("Failed to delete event");
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (hasEnded(selectedEvent)) {
      message.info("Participants cannot be removed after the event has ended.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/events/${selectedEvent._id}/participants/${participantId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const { data: updatedEvent } = await axios.get(`${API_URL}/events/${selectedEvent._id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedEvent(updatedEvent);
      setEvents((prev) =>
        prev.map((event) =>
          event._id === updatedEvent._id ? updatedEvent : event,
        ),
      );
      setFilteredEvents((prev) =>
        prev.map((event) =>
          event._id === updatedEvent._id ? updatedEvent : event,
        ),
      );
      message.success("Participant removed successfully");
    } catch (err) {
      console.error("Error removing participant:", err);
      message.error(err.response?.data?.message || "Failed to remove participant");
    }
  };

  const showEditModal = () => {
    if (hasEnded(selectedEvent)) {
      message.info("This event has ended and can no longer be edited.");
      return;
    }
    const startDate = moment(selectedEvent.startDate);
    const endDate = moment(selectedEvent.endDate);

    editForm.setFieldsValue({
      title: selectedEvent.title,
      description: selectedEvent.description,
      dateRange: [startDate, endDate],
      startTime: startDate,
      endTime: endDate,
      location: selectedEvent.location,
      maxParticipants: selectedEvent.maxParticipants || 50,
      language: selectedEvent.language || "",
      wheelchairAccess: selectedEvent.wheelchairAccess || "unknown",
      cost: selectedEvent.cost || "",
      transport: selectedEvent.transport || "",
      whatToBring: selectedEvent.whatToBring || "",
    });
    setIsEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
  };

  const handleUpdateEvent = async (values) => {
    if (hasEnded(selectedEvent)) {
      message.info("This event has ended and can no longer be edited.");
      handleEditCancel();
      return;
    }
    setIsUpdating(true);
    try {
      if (!values.dateRange || values.dateRange.length < 2) {
        message.error("Please select a date range.");
        setIsUpdating(false);
        return;
      }

      if (!values.startTime || !values.endTime) {
        message.error("Select both a start time and an end time.");
        return;
      }
      const [selectedStartDate, selectedEndDate] = values.dateRange;
      const startDate = selectedStartDate.clone().hour(values.startTime.hour()).minute(values.startTime.minute()).second(0).millisecond(0);
      const endDate = selectedEndDate.clone().hour(values.endTime.hour()).minute(values.endTime.minute()).second(0).millisecond(0);
      if (!endDate.isAfter(startDate)) {
        message.error("End time must be after the start time.");
        setIsUpdating(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("startDate", startDate.toISOString());
      formData.append("endDate", endDate.toISOString());
      formData.append("location", values.location);
      formData.append("maxParticipants", String(values.maxParticipants));

      for (const key of ["language", "wheelchairAccess", "cost", "transport", "whatToBring"]) formData.append(key, values[key] || (key === "wheelchairAccess" ? "unknown" : ""));

      const image = values.coverImage?.[0]?.originFileObj;
      if (image) {
        const compressedImage = await compressImage(image, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
        });
        formData.append("coverImage", compressedImage);
      }

      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/events/${selectedEvent._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      message.success(
        "Event updated successfully! Notifications sent to all participants.",
      );

      // Update the local state with the updated event
      const updatedEvent = response.data.event;
      setSelectedEvent(updatedEvent);
      setEvents((prev) =>
        prev.map((event) =>
          event._id === updatedEvent._id ? updatedEvent : event,
        ),
      );
      setFilteredEvents((prev) =>
        prev.map((event) =>
          event._id === updatedEvent._id ? updatedEvent : event,
        ),
      );

      handleEditCancel();
    } catch (error) {
      console.error("Failed to update event:", error);
      message.error(error.response?.data?.message || "Failed to update event. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search your events by title"
          value={searchText}
          onChange={handleSearch}
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
        />
      </Space>

      <LoadingContent waitForImages={false} loading={loading} label="Loading your events">
      {loadError ? <div className="events-empty"><p>Failed to load your events.</p><Button onClick={fetchEvents}>Try again</Button></div> : <>
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Text type="secondary">Total events</Text>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalEvents}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Text type="secondary">Participants</Text>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalParticipants}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Text type="secondary">Reviews</Text>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.totalReviews}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Text type="secondary">Upcoming</Text>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {summary.upcomingEvents}
            </div>
          </Card>
        </Col>
      </Row>

      {filteredEvents.length === 0 ? (
        <div className="empty-container">
          <Empty
            description={<span>You aren't organizing any events for now</span>}
          />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredEvents.map((event) => (
            <Col key={event._id} xs={24} sm={12} md={8} lg={6}>
              <LazyCard label="Loading event">
              <Card
                className="event-card"
                hoverable
                cover={
                  <img
                    className="event-card-image"
                    alt={`Cover for ${event.title || "this event"}`}
                    src={getMediaUrl(event.coverImage, "event")}
                  />
                }
                onClick={() => showModal(event)}
              >
                <Meta
                  title={event.title}
                  description={
                    <>
                      <Text className="event-card-description">
                        {event.description}
                      </Text>
                      <p className="event-card-info">
                        <CalendarOutlined /> {formatEventDateRange(event)}
                      </p>
                      <p className="event-card-info">
                        <EnvironmentOutlined /> <b>{event.location}</b>
                      </p>
                      <p className="event-card-info">
                        Participants:{" "}
                        <b>
                          {event.participants?.length || 0} /{" "}
                          {event.maxParticipants || 50}
                        </b>
                      </p>
                    </>
                  }
                />
              </Card>
              </LazyCard>
            </Col>
          ))}
        </Row>
      )}
      </>}
      </LoadingContent>
      {selectedEvent && (
        <Modal
          title={selectedEvent.title}
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <Button key="cancel" onClick={handleCancel}>
              Cancel
            </Button>,
            <Button key="edit" type="primary" onClick={showEditModal} disabled={hasEnded(selectedEvent)}>
              Edit Event
            </Button>,
            <Button key="delete" type="primary" danger onClick={handleDelete}>
              Delete
            </Button>,
          ]}
        >
          {hasEnded(selectedEvent) && <p className="event-ended-notice" role="status">This event has ended. Its details and participant list are read-only.</p>}
          <EventDetails event={selectedEvent} />
          <h3>Participants</h3>
          {(selectedEvent.participants || []).length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={selectedEvent.participants}
              renderItem={(participant) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <UserProfilePreview user={participant}>
                        <Avatar
                          src={getMediaUrl(
                            participant.profilePicture,
                            "profile",
                          )}
                        />
                      </UserProfilePreview>
                    }
                    title={
                      <UserProfilePreview user={participant}>
                        {`${participant.fname || "Member"} ${participant.lname || ""}`}
                      </UserProfilePreview>
                    }
                    description={
                      <span>
                        {participant.email}{" "}
                        <Button
                          danger
                          disabled={hasEnded(selectedEvent)}
                          size="small"
                          onClick={() =>
                            handleRemoveParticipant(participant._id)
                          }
                        >
                          Remove
                        </Button>
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <p>No participants yet.</p>
          )}
          <h3>Reviews</h3>
          {(selectedEvent.reviews || []).length > 0 ? (
            <List
              itemLayout="horizontal"
              dataSource={selectedEvent.reviews}
              renderItem={(review) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <UserProfilePreview user={review.user}>
                        <Avatar
                          src={getMediaUrl(
                            review.user?.profilePicture,
                            "profile",
                          )}
                        />
                      </UserProfilePreview>
                    }
                    title={
                      <UserProfilePreview user={review.user}>
                        {`${review.user?.fname || "Member"} ${review.user?.lname || ""}`}
                      </UserProfilePreview>
                    }
                    description={
                      <>
                        <p>Rating: {review.rating}</p>
                        <p>{review.comment}</p>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <p>No reviews yet.</p>
          )}
        </Modal>
      )}
      {selectedEvent && (
        <Modal
          title="Edit Event"
          open={isEditModalVisible}
          onCancel={handleEditCancel}
          footer={[
            <Button key="cancel" onClick={handleEditCancel}>
              Cancel
            </Button>,
            <Button
              key="save"
              type="primary"
              loading={isUpdating}
              disabled={hasEnded(selectedEvent)}
              onClick={() => editForm.submit()}
            >
              Save Changes
            </Button>,
          ]}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdateEvent}
            style={{ marginTop: 20 }}
          >
            <Form.Item
              name="title"
              label="Title"
              rules={[
                {
                  required: true,
                  message: "Please input the title of the event!",
                },
              ]}
            >
              <Input placeholder="Enter event title" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
              rules={[
                {
                  required: true,
                  message: "Please input the description of the event!",
                },
              ]}
            >
              <Input.TextArea rows={4} placeholder="Enter event description" />
            </Form.Item>
            <Form.Item
              name="dateRange"
              label="Date Range"
              rules={[
                { required: true, message: "Please select the date range!" },
              ]}
            >
              <RangePicker
                disabledDate={(current) =>
                  current && current < moment().startOf("day")
                }
                format="YYYY-MM-DD"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="location"
              label="Location"
              rules={[
                {
                  required: true,
                  message: "Please input the location of the event!",
                },
              ]}
            >
              <Input placeholder="Enter event location" />
            </Form.Item>
            <Form.Item
              name="maxParticipants"
              label="Maximum participants"
              rules={[
                { required: true, message: "Set a participant limit." },
                { type: "number", min: 1, max: 100000 },
              ]}
            >
              <InputNumber
                min={1}
                max={100000}
                style={{ width: "100%" }}
                placeholder="e.g. 50"
              />
            </Form.Item>
            <h3>Accessibility and practical details</h3>
            <Form.Item name="language" label="Language"><Input maxLength={100} /></Form.Item>
            <Form.Item name="wheelchairAccess" label="Wheelchair access"><Select options={[{ value: "unknown", label: "Not specified" }, { value: "yes", label: "Accessible" }, { value: "partial", label: "Partially accessible" }, { value: "no", label: "Not accessible" }]} /></Form.Item>
            <Form.Item name="cost" label="Cost"><Input maxLength={200} placeholder="e.g. Free, or €5 payable at the door" /></Form.Item>
            <Form.Item name="transport" label="Transport"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
            <Form.Item name="whatToBring" label="What to bring"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="startTime" label="Start time" rules={[{ required: true, message: "Choose a start time." }]}>
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="endTime" label="End time" rules={[{ required: true, message: "Choose an end time." }]}>
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="coverImage" label="Cover Image (optional)">
              <Upload
                maxCount={1}
                accept=".jpg,.jpeg,.png,.gif"
                beforeUpload={() => false}
              >
                <Button icon={<UploadOutlined />}>Select Image</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </>
  );
};

export default ManageEvents;
