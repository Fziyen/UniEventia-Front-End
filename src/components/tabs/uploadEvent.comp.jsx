import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Button,
  DatePicker,
  TimePicker,
  Upload,
  message,
  Card,
  Space,
  Alert,
  Progress,
} from "antd";
import { UploadOutlined, WarningOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";
import { API_URL } from "../../api";

const { RangePicker } = DatePicker;

const UploadEvent = () => {
  const [form] = Form.useForm();
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch organizer's events to calculate rate limit status
  useEffect(() => {
    fetchRateLimitInfo();
  }, []);

  const fetchRateLimitInfo = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/events/organizer`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Calculate events created in the last 24 hours
      const events = response.data || [];
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentEvents = events.filter((event) => {
        const createdAt = new Date(event.createdAt);
        return createdAt >= twentyFourHoursAgo;
      });

      const LIMIT = 8;
      const currentCount = recentEvents.length;
      const remainingCount = Math.max(0, LIMIT - currentCount);

      setRateLimitInfo({
        limit: LIMIT,
        current: currentCount,
        remaining: remainingCount,
        percentage: Math.round((currentCount / LIMIT) * 100),
      });
    } catch (error) {
      console.error("Failed to fetch rate limit info:", error);
      // Default rate limit info if fetch fails
      setRateLimitInfo({
        limit: 8,
        current: 0,
        remaining: 8,
        percentage: 0,
      });
    }
  };

  const onFinish = async (values) => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      message.error("Please log in before uploading an event.");
      return;
    }

    if (!values.dateRange || values.dateRange.length < 2) {
      message.error("Please select a date range.");
      return;
    }

    const [selectedStartDate, selectedEndDate] = values.dateRange;
    const startDate = selectedStartDate.clone();
    const endDate = selectedEndDate.clone().endOf("day");
    if (values.startTime) {
      startDate
        .hour(values.startTime.hour())
        .minute(values.startTime.minute())
        .second(0)
        .millisecond(0);
    }
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("description", values.description);
    formData.append("startDate", startDate.toISOString());
    formData.append("endDate", endDate.toISOString());
    formData.append("location", values.location);
    formData.append("maxParticipants", String(values.maxParticipants));
    const image = values.image?.[0]?.originFileObj;
    if (image) {
      formData.append("coverImage", image);
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/events`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      message.success("Event uploaded successfully!");
      form.resetFields();
      // Refresh rate limit info after successful upload
      fetchRateLimitInfo();
    } catch (error) {
      console.error("Failed to upload event:", error);

      // Handle rate limit errors
      if (error.response?.status === 429) {
        const errorData = error.response.data;
        const remainingEvents = errorData.remaining || 0;
        const totalLimit = errorData.limit || 8;

        let errorMessage = `You have reached the maximum limit of ${totalLimit} events per 24 hours.`;
        if (remainingEvents === 0) {
          errorMessage += " Please try again after 24 hours.";
        } else {
          errorMessage += ` You can create ${remainingEvents} more event(s) in the next 24 hours.`;
        }

        message.error({
          content: errorMessage,
          duration: 5,
        });
      } else if (error.response?.status === 400) {
        // Handle validation errors
        message.error(
          error.response.data?.message ||
            "Invalid event details. Please check your input.",
        );
      } else if (error.response?.status === 403) {
        // Handle authorization errors
        message.error("Access denied. Only organizers can create events.");
      } else {
        // Handle generic errors
        message.error("Failed to upload event. Please try again.");
      }
    }
  };

  return (
    <Card
      title="Upload New Event"
      bordered={false}
      style={{
        maxWidth: 800,
        margin: "auto",
        borderRadius: 10,
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
        padding: 24,
      }}
    >
      {rateLimitInfo && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <strong>Events Created (24 hours)</strong>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {rateLimitInfo.current} of {rateLimitInfo.limit} events created
            </div>
          </div>
          <Progress
            percent={rateLimitInfo.percentage}
            strokeColor={
              rateLimitInfo.percentage >= 75
                ? "#ff4d4f"
                : rateLimitInfo.percentage >= 50
                  ? "#faad14"
                  : "#52c41a"
            }
            format={(percent) => `${percent}%`}
          />
          {rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
            <Alert
              message="Approaching Rate Limit"
              description={`You can create ${rateLimitInfo.remaining} more event(s) in the next 24 hours.`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginTop: 12 }}
            />
          )}
          {rateLimitInfo.remaining === 0 && (
            <Alert
              message="Rate Limit Reached"
              description="You have reached the maximum of 8 events per 24 hours. Please try again after 24 hours."
              type="error"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </div>
      )}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="title"
          label="Title"
          rules={[
            { required: true, message: "Please input the title of the event!" },
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
          rules={[{ required: true, message: "Please select the date range!" }]}
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
          initialValue={50}
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
        <Form.Item name="startTime" label="Start time (optional)">
          <TimePicker
            format="HH:mm"
            minuteStep={5}
            placeholder="Select a start time"
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          name="image"
          label="Event Image"
          valuePropName="fileList"
          getValueFromEvent={(event) => event?.fileList || []}
        >
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            accept="image/png,image/jpeg,image/gif"
          >
            <Button icon={<UploadOutlined />}>Click to Upload</Button>
          </Upload>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
            <Button htmlType="button" onClick={() => form.resetFields()}>
              Reset
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UploadEvent;
