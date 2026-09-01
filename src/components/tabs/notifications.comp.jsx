import React, { useEffect, useState } from "react";
import { List, Avatar, Spin, message, Empty, Button, Typography } from "antd";
import axios from "axios";
import { API_URL } from "../../api";
import { formatDistanceToNow } from "date-fns";
import { BellOutlined } from "@ant-design/icons";

const { Text } = Typography;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const items = Array.isArray(response.data)
        ? response.data
        : response.data.items || [];
      setNotifications(items);
      setUnreadCount(items.filter((item) => !item.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      message.error("Failed to fetch notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotifications((current) =>
        current.map((item) =>
          item._id === id || item.id === id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      message.error("Unable to update this notification.");
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      );
      setUnreadCount(0);
      message.success("All notifications marked as read.");
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      message.error("Unable to update notifications.");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "20%" }}>
        <Spin tip="Loading..." />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {notifications.some((item) => !item.read) && (
          <Button type="primary" ghost onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {unreadCount > 0 && (
        <Text type="secondary">{unreadCount} unread notifications</Text>
      )}

      {notifications.length === 0 ? (
        <Empty description={<span>No notifications available</span>} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(notification) => {
            const notificationId = notification._id || notification.id;
            return (
              <List.Item
                actions={
                  notification.read
                    ? []
                    : [
                        <Button
                          key="read"
                          size="small"
                          onClick={() => markAsRead(notificationId)}
                        >
                          Mark read
                        </Button>,
                      ]
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={<BellOutlined />}
                      style={{
                        backgroundColor: notification.read
                          ? "#d9d9d9"
                          : "#1890ff",
                      }}
                    />
                  }
                  title={
                    <span>
                      {notification.message}
                      {!notification.read && (
                        <span style={{ color: "#1890ff", marginLeft: 8 }}>
                          Unread
                        </span>
                      )}
                    </span>
                  }
                  description={formatDistanceToNow(
                    new Date(notification.createdAt || Date.now()),
                    { addSuffix: true },
                  )}
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default Notifications;
