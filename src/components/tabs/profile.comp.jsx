import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  MailOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Upload,
} from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL, getMediaUrl } from "../../api";
import "../../Styles/Profile.css";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function Profile() {
  const [form] = Form.useForm();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const displayName = useMemo(
    () => `${user?.fname || ""} ${user?.lname || ""}`.trim() || "Member",
    [user],
  );
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUser(response.data);
        form.setFieldsValue(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          form.setFieldsValue(storedUser);
        } else {
          message.error("Your profile could not be loaded.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [form]);

  const handleSave = async (values) => {
    setIsSaving(true);
    try {
      const response = await axios.put(`${API_URL}/users/profile`, values, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUser(response.data);
      form.setFieldsValue(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setIsEditing(false);

      const nextPath =
        response.data.role === "Organizer"
          ? "/organizer-layout"
          : "/participant-layout";

      if (window.location.pathname !== nextPath) {
        navigate(nextPath, { replace: true });
      }

      message.success("Profile updated.");
    } catch (error) {
      console.error("Failed to update profile:", error);
      message.error(
        error.response?.data?.message || "Profile could not be updated.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePictureUpload = async () => {
    if (!profileFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", profileFile);
      const response = await axios.put(
        `${API_URL}/users/profile-picture`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setProfileFile(null);
      message.success("Profile photo updated.");
    } catch (error) {
      console.error("Failed to update profile picture:", error);
      message.error(
        error.response?.data?.message || "Profile photo could not be updated.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const cancelEditing = () => {
    form.setFieldsValue(user);
    setIsEditing(false);
  };

  const handleDeleteAccount = () => {
    let confirmText = "";

    Modal.confirm({
      title: "Delete your account?",
      width: 520,
      okText: "Delete permanently",
      okType: "danger",
      cancelText: "Keep account",
      content: (
        <div>
          <p>
            This will permanently remove your account, profile, and access to
            UniEventia. This action cannot be undone.
          </p>
          <p style={{ marginTop: 12, marginBottom: 8 }}>
            Type <strong>DELETE</strong> to confirm.
          </p>
          <Input
            placeholder="DELETE"
            onChange={(event) => {
              confirmText = event.target.value;
            }}
          />
        </div>
      ),
      onOk: async () => {
        if (confirmText.trim() !== "DELETE") {
          message.error("Please type DELETE to confirm account deletion.");
          return Promise.reject(new Error("Confirmation required"));
        }

        try {
          await axios.delete(`${API_URL}/users/profile`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          message.success("Your account has been deleted.");
          navigate("/login", { replace: true });
        } catch (error) {
          console.error("Failed to delete account:", error);
          message.error(
            error.response?.data?.message ||
              "Your account could not be deleted.",
          );
        }
      },
    });
  };

  if (isLoading)
    return <div className="profile-loading">Loading your profile...</div>;
  if (!user) return null;

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-identity">
          <Avatar
            className="profile-avatar"
            size={84}
            src={getMediaUrl(user.profilePicture, "profile")}
            icon={!user.profilePicture ? <UserOutlined /> : null}
          >
            {!user.profilePicture && initials}
          </Avatar>
          <div>
            <h2>{displayName}</h2>
            <p>{user.email}</p>
            <span className="profile-role">{user.role}</span>
          </div>
        </div>
        <div className="profile-hero-actions">
          <Button
            icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
            onClick={() => (isEditing ? form.submit() : setIsEditing(true))}
            loading={isSaving}
          >
            {isEditing ? "Save changes" : "Edit profile"}
          </Button>
        </div>
      </section>

      <div className="profile-grid">
        <Card
          className="profile-card"
          title={
            <div className="profile-card-title">
              <strong>Personal details</strong>
              <span>
                Keep the information used across your workspace up to date.
              </span>
            </div>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <div className="profile-form-grid">
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: "Enter your username." }]}
              >
                <Input disabled={!isEditing} prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item
                label="First name"
                name="fname"
                rules={[{ required: true, message: "Enter your first name." }]}
              >
                <Input disabled={!isEditing} />
              </Form.Item>
              <Form.Item
                label="Last name"
                name="lname"
                rules={[{ required: true, message: "Enter your last name." }]}
              >
                <Input disabled={!isEditing} />
              </Form.Item>
              <Form.Item
                label="Email address"
                name="email"
                rules={[
                  { required: true, message: "Enter your email address." },
                  { type: "email", message: "Enter a valid email address." },
                ]}
              >
                <Input disabled={!isEditing} prefix={<MailOutlined />} />
              </Form.Item>
              <Form.Item
                label="Account role"
                name="role"
                rules={[{ required: true, message: "Choose a role." }]}
              >
                <Select
                  disabled={!isEditing}
                  prefix={<SafetyCertificateOutlined />}
                >
                  <Select.Option value="Participant">Participant</Select.Option>
                  <Select.Option value="Organizer">Organizer</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item label="Bio" name="bio">
                <Input.TextArea
                  rows={3}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
              </Form.Item>
            </div>
            <p className="profile-readonly-note">
              Keep your contact details and workspace role aligned with your
              current account usage.
            </p>
            {isEditing && (
              <div className="profile-actions">
                <Button onClick={cancelEditing}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSaving}
                  icon={<SaveOutlined />}
                >
                  Save changes
                </Button>
              </div>
            )}
          </Form>
        </Card>

        <div className="profile-side-column">
          <Card
            className="profile-card"
            title={
              <div className="profile-card-title">
                <strong>Profile photo</strong>
                <span>Use a clear image your community will recognize.</span>
              </div>
            }
          >
            <div className="profile-upload">
              <Avatar
                size={58}
                src={getMediaUrl(user.profilePicture, "profile")}
                icon={!user.profilePicture ? <UserOutlined /> : null}
              >
                {!user.profilePicture && initials}
              </Avatar>
              <div className="profile-upload-copy">
                <strong>{profileFile?.name || "Choose a new photo"}</strong>
                <span>JPG, PNG, or GIF up to 5 MB</span>
                <Upload
                  beforeUpload={() => false}
                  maxCount={1}
                  accept="image/png,image/jpeg,image/gif"
                  showUploadList={false}
                  onChange={({ fileList }) =>
                    setProfileFile(fileList[0]?.originFileObj || null)
                  }
                >
                  <Button size="small" icon={<CameraOutlined />}>
                    Choose image
                  </Button>
                </Upload>
              </div>
            </div>
            {profileFile && (
              <Button
                type="primary"
                block
                loading={isUploading}
                onClick={handlePictureUpload}
                style={{ marginTop: "1rem" }}
              >
                Upload photo
              </Button>
            )}
          </Card>

          <Card
            className="profile-card"
            title={
              <div className="profile-card-title">
                <strong>Account status</strong>
                <span>A quick view of your account safeguards.</span>
              </div>
            }
          >
            <div className="profile-status-list">
              <div className="profile-status-row">
                <span className="profile-status-icon">
                  <CheckCircleOutlined />
                </span>
                <div>
                  <strong>Account active</strong>
                  <span>You can access your workspace.</span>
                </div>
              </div>
              <div className="profile-status-row">
                <span className="profile-status-icon">
                  <LockOutlined />
                </span>
                <div>
                  <strong>Password protected</strong>
                  <span>Credentials are securely stored.</span>
                </div>
              </div>
            </div>
          </Card>
          <Card
            className="profile-card danger-zone"
            title={
              <div className="profile-card-title danger-zone-title">
                <strong>Danger zone</strong>
                <span>Permanent account actions.</span>
              </div>
            }
          >
            <div className="danger-zone-content">
              <p>
                Delete your account and remove all access to your UniEventia
                workspace.
              </p>
              <Button
                danger
                block
                icon={<DeleteOutlined />}
                onClick={handleDeleteAccount}
                className="danger-zone-button"
              >
                Delete account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
