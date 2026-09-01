import React, { useState, useEffect } from "react";
import {
  Card,
  Input,
  Row,
  Col,
  Avatar,
  Empty,
  Pagination,
  Tag,
  Modal,
  Typography,
  Spin,
  message,
} from "antd";
import axios from "axios";
import { getMediaUrl, API_URL } from "../../api";

const { Search } = Input;
const { Text, Paragraph } = Typography;

const Users = () => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/users`, {
          params: { page, limit: 15, search: searchText },
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = response.data;
        const items = Array.isArray(result) ? result : result.items || [];
        setFilteredUsers(items);
        setTotal(Array.isArray(result) ? result.length : result.total || 0);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        message.error("Failed to load users. Please try again.");
        setFilteredUsers([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [page, searchText]);

  const handleSearch = (value) => {
    setPage(1);
    setSearchText(value.trim());
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedUser(null);
  };

  const getAvatarUrl = (profilePicture) => {
    return getMediaUrl(profilePicture, "profile");
  };

  const displayName = selectedUser
    ? `${selectedUser.fname || ""} ${selectedUser.lname || ""}`.trim() ||
      "Member"
    : "";

  return (
    <div>
      <Search
        placeholder="Search users by name or username"
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
      />
      <Spin spinning={isLoading} tip="Loading users...">
        <Row gutter={[16, 16]}>
          {filteredUsers.map((user) => (
            <Col key={user._id} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card
                hoverable
                className="community-user-card"
                onClick={() => handleUserClick(user)}
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <Avatar
                    src={getAvatarUrl(user.profilePicture)}
                    size={96}
                    style={{ marginBottom: 12 }}
                  />
                  <h3 style={{ margin: "8px 0 0 0" }}>{user.username}</h3>
                </div>
                <Card.Meta
                  title={`${user.fname} ${user.lname}`}
                  description={
                    <div>
                      <Tag
                        color={user.role === "Organizer" ? "gold" : "blue"}
                        style={{ marginTop: 8 }}
                      >
                        {user.role}
                      </Tag>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
        {!isLoading && filteredUsers.length === 0 && (
          <Empty description="No users found" />
        )}
      </Spin>
      {total > 15 && (
        <Pagination
          current={page}
          pageSize={15}
          total={total}
          onChange={setPage}
          showSizeChanger={false}
          style={{ marginTop: 24, textAlign: "center" }}
        />
      )}

      {/* User Detail Modal */}
      <Modal
        title={null}
        footer={null}
        onCancel={handleCloseModal}
        open={modalVisible}
        centered
        width={500}
        bodyStyle={{ padding: 0 }}
      >
        {selectedUser && (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Avatar
              src={getAvatarUrl(selectedUser.profilePicture)}
              size={120}
              style={{ marginBottom: 16 }}
            />
            <h2 style={{ margin: "12px 0 4px 0" }}>{displayName}</h2>
            <Text
              type="secondary"
              style={{ fontSize: 16, display: "block", marginBottom: 16 }}
            >
              @{selectedUser.username}
            </Text>
            <div style={{ marginBottom: 16 }}>
              <Tag
                color={selectedUser.role === "Organizer" ? "gold" : "blue"}
                style={{ marginRight: 8 }}
              >
                {selectedUser.role}
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
                  padding: "12px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px",
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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users;
