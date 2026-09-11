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
  Spin,
  message,
} from "antd";
import axios from "axios";
import { getMediaUrl, API_URL } from "../../api";
import UserProfilePreview from "../ui/userProfilePreview.comp";

const { Search } = Input;
const Users = () => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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
            <Col key={user._id} xs={24} sm={12} md={8} lg={6} xl={6}>
              <Card
                hoverable
                className="community-user-card"
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <UserProfilePreview user={user}>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <Avatar
                      src={getMediaUrl(user.profilePicture, "profile")}
                      size={96}
                      style={{ marginBottom: 12 }}
                    />
                    <h3 className="community-user-username">{user.username}</h3>
                  </div>
                  <Card.Meta
                    title={
                      <span className="community-user-name">
                        {`${user.fname || ""} ${user.lname || ""}`.trim() ||
                          "Member"}
                      </span>
                    }
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
                </UserProfilePreview>
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
    </div>
  );
};

export default Users;
