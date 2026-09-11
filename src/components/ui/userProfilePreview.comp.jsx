import React, { useMemo, useState } from "react";
import { Avatar, Modal, Spin, Tag, Typography, message } from "antd";
import axios from "axios";
import { API_URL, getMediaUrl } from "../../api";

const { Paragraph, Text } = Typography;

const formatJoinedDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Join date unavailable";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function UserProfilePreview({ user, children }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const displayName = useMemo(
    () =>
      `${selectedUser?.fname || ""} ${selectedUser?.lname || ""}`.trim() ||
      "Member",
    [selectedUser],
  );

  const openProfile = async () => {
    if (!user) return;

    setSelectedUser(user);
    if (user.username && user.createdAt && user.role) return;

    setIsLoading(true);
    try {
      const search = `${user.fname || ""} ${user.lname || ""}`.trim();
      if (!search) {
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/users`, {
        params: { search, page: 1, limit: 15 },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const users = Array.isArray(response.data)
        ? response.data
        : response.data.items || [];
      const matchedUser = users.find(
        (candidate) =>
          candidate.fname === user.fname && candidate.lname === user.lname,
      );
      if (matchedUser) setSelectedUser(matchedUser);
    } catch (error) {
      console.error("Failed to load user profile:", error);
      message.error("This profile could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openProfile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openProfile();
        }}
        style={{ cursor: "pointer" }}
      >
        {children}
      </div>
      <Modal
        title={null}
        footer={null}
        open={Boolean(selectedUser)}
        onCancel={() => setSelectedUser(null)}
        centered
        width={500}
        bodyStyle={{ padding: 0 }}
      >
        {selectedUser && (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin spinning={isLoading}>
              <Avatar
                src={getMediaUrl(selectedUser.profilePicture, "profile")}
                size={120}
                style={{ marginBottom: 16 }}
              />
              <h2 style={{ margin: "12px 0 4px" }}>{displayName}</h2>
              <Text
                type="secondary"
                style={{ fontSize: 16, display: "block", marginBottom: 16 }}
              >
                @{selectedUser.username || "member"}
              </Text>
              <Text
                type="secondary"
                style={{ display: "block", marginBottom: 16 }}
              >
                Member since {formatJoinedDate(selectedUser.createdAt)}
              </Text>
              <div style={{ marginBottom: 16 }}>
                <Tag
                  color={selectedUser.role === "Organizer" ? "gold" : "blue"}
                  style={{ marginRight: 8 }}
                >
                  {selectedUser.role || "Participant"}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Email hidden for privacy
                </Text>
              </div>
              {selectedUser.bio ? (
                <div
                  style={{
                    textAlign: "left",
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: "#f5f5f5",
                    borderRadius: 4,
                  }}
                >
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    Bio
                  </Text>
                  <Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {selectedUser.bio}
                  </Paragraph>
                </div>
              ) : (
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: 16 }}
                >
                  No bio yet
                </Text>
              )}
            </Spin>
          </div>
        )}
      </Modal>
    </>
  );
}
