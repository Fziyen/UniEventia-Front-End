import { ContentSkeleton, LoadingContent } from "../ui/loading.comp";
import React, { useEffect, useMemo, useState } from "react";
import {
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  SaveOutlined,
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
  Switch,
  Upload,
} from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL, getMediaUrl } from "../../api";
import { compressImage } from "../../lib/compressImage";
import { useAuth } from "../../authContext";
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
  const { updateUser } = useAuth();
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
      updateUser(response.data);
      setIsEditing(false);

      const nextPath = "/Dashboard";

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
      const compressedImage = await compressImage(profileFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
      });
      formData.append("profilePicture", compressedImage);
      const response = await axios.put(
        `${API_URL}/users/profile-picture`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      updateUser(response.data);
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
    return <ContentSkeleton variant="profile" label="Loading your profile" />;
  if (!user) return null;

  return (
    <LoadingContent variant="profile" label="Loading your profile"><div className={`profile-page${isEditing ? " is-editing" : ""}`}>
      <section className="profile-hero">
        <div className="profile-identity">
          <Avatar
            className="profile-avatar"
            alt={`Profile of ${displayName}`}
            size={88}
            src={getMediaUrl(user.profilePicture, "profile")}
            icon={!user.profilePicture ? <UserOutlined /> : null}
          >
            {!user.profilePicture && initials}
          </Avatar>
          <div className="profile-identity-copy">
            <h2>{displayName}</h2>
            {user.username && <p>@{user.username}</p>}
            <span className="profile-role">{user.role}</span>
          </div>
        </div>
        <div className="profile-hero-actions">
          <Button
            type="primary"
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
              <h3><UserOutlined aria-hidden="true" /> Personal details</h3>
            </div>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <div className="profile-form-grid">
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
                label="Username"
                name="username"
                rules={[{ required: true, message: "Enter your username." }]}
              >
                <Input disabled={!isEditing} prefix={<UserOutlined />} />
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
                <Select disabled={!isEditing}>
                  <Select.Option value="Participant">Participant</Select.Option>
                  <Select.Option value="Organizer">Organizer</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="Email visibility"
                name="emailPublic"
                valuePropName="checked"
                extra="Show your email to other members."
              >
                <Switch
                  disabled={!isEditing}
                  checkedChildren="Public"
                  unCheckedChildren="Private"
                />
              </Form.Item>
              <Form.Item className="profile-bio-field" label="About you" name="bio">
                <Input.TextArea
                  rows={3}
                  disabled={!isEditing}
                  placeholder={isEditing ? "A little about you and what you enjoy." : "No bio added yet."}
                  maxLength={500}
                />
              </Form.Item>
            </div>
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
                <h3><CameraOutlined aria-hidden="true" /> Profile photo</h3>
              </div>
            }
          >
            <div className="profile-upload">
              <Avatar
                className="profile-photo-preview"
                size={72}
                alt={`Profile of ${displayName}`}
                src={getMediaUrl(user.profilePicture, "profile")}
                icon={!user.profilePicture ? <UserOutlined /> : null}
              >
                {!user.profilePicture && initials}
              </Avatar>
              <div className="profile-upload-copy">
                <strong>{profileFile?.name || "Make it yours"}</strong>
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
                  <Button icon={<CameraOutlined />} disabled={isUploading}>
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
                className="profile-upload-submit"
              >
                Upload photo
              </Button>
            )}
          </Card>

          <Card
            className="profile-card danger-zone"
            title={
              <div className="profile-card-title danger-zone-title">
                <h3><DeleteOutlined aria-hidden="true" /> Account removal</h3>
              </div>
            }
          >
            <div className="danger-zone-content">
              <p>
                Permanently delete your profile and associated data. This cannot be undone.
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
    </div></LoadingContent>
  );
}
