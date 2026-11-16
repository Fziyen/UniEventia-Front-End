import { ContentSkeleton, LoadingContent } from "../ui/loading.comp";
import React, { useEffect, useMemo, useState } from "react";
import {
  CameraOutlined,
  DeleteOutlined,
  DownloadOutlined,
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
  Switch,
  Upload,
} from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_URL, getMediaUrl } from "../../api";
import { compressImage } from "../../lib/compressImage";
import { useAuth } from "../../authContext";
import "../../Styles/Profile.css";
import Eligibility from "../legal/eligibility.comp";
import { isEligible } from "../legal/eligibility";
import UserProfilePreview from "../ui/userProfilePreview.comp";

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
  const { user: sessionUser, updateUser, logout } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
        updateUser(response.data);
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
  }, [form, updateUser]);

  const requestOrganizer = async () => {
    setIsRequesting(true);
    try {
      const { data } = await axios.post(`${API_URL}/users/profile/organizer-request`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUser(data.user);
      updateUser(data.user);
      message.success(data.message);
    } catch (error) {
      message.error(error.response?.data?.message || "Unable to request organizer access.");
    } finally { setIsRequesting(false); }
  };
  const removeOrganizerRole = () => {
    Modal.confirm({
      title: "Return to Participant?",
      content: "Your existing events will remain published. You will lose access to creating and managing events. You can request organizer access again from Profile; administrators can still manage your published events.",
      okText: "Return to Participant",
      cancelText: "Keep organizer access",
      onOk: async () => {
        try {
          const { data } = await axios.delete(`${API_URL}/users/profile/organizer-role`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          setUser(data.user); updateUser(data.user); message.success(data.message);
        } catch (error) {
          message.error(error.response?.data?.message || "Unable to remove organizer access.");
          throw error;
        }
      },
    });
  };
  const refreshRequest = async () => {
    setIsRequesting(true);
    try {
      const { data } = await axios.get(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setUser(data); updateUser(data);
    } catch { message.error("Unable to refresh your request."); }
    finally { setIsRequesting(false); }
  };

  const handleSave = async (values) => {
    setIsSaving(true);
    try {
      const response = await axios.put(`${API_URL}/users/profile`, Object.fromEntries(["fname", "lname", "username", "email", "bio", "emailPublic", "participationHistoryPublic", "reviewHistoryPublic"].filter(key => values[key] !== undefined).map(key => [key, values[key]])), {
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
    let currentPassword = "";

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
            UniEventia, including events you organize, their covers, your comments, reviews, participation and waitlist entries. Download your data first. This action cannot be undone.
          </p>
          <p style={{ marginTop: 12, marginBottom: 8 }}>
            Type <strong>DELETE</strong> to confirm.
          </p>
          <Input
            aria-label="Type DELETE to confirm"
            placeholder="DELETE"
            onChange={(event) => {
              confirmText = event.target.value;
            }}
          />
          <label htmlFor="delete-password">Current password</label>
          <Input.Password id="delete-password" autoComplete="current-password" onChange={e => { currentPassword = e.target.value; }} />
        </div>
      ),
      onOk: async () => {
        if (confirmText.trim() !== "DELETE") {
          message.error("Please type DELETE to confirm account deletion.");
          return Promise.reject(new Error("Confirmation required"));
        }

        try {
          await axios.delete(`${API_URL}/users/profile`, {
            data: { password: currentPassword },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          logout();
          message.success("Your account has been deleted.");
          navigate("/login", { replace: true });
        } catch (error) {
          console.error("Failed to delete account:", error);
          message.error(
            error.response?.data?.message ||
              "Your account could not be deleted.",
          );
          return Promise.reject(new Error("Deletion failed"));
        }
      },
    });
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      const { data } = await axios.get(`${API_URL}/users/profile/export`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "unieventia-data.json";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.success("Your data download is ready.");
    } catch (err) { message.error(err.response?.data?.message || "Could not export your data. Please try again."); }
    finally { setIsExporting(false); }
  };
  const removePhoto = async () => {
    setIsUploading(true);
    try {
      const { data } = await axios.delete(`${API_URL}/users/profile-picture`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setUser(data); updateUser(data); setProfileFile(null); message.success("Profile photo removed.");
    } catch (err) { message.error(err.response?.data?.message || "Could not remove your photo."); }
    finally { setIsUploading(false); }
  };

  if (isLoading)
    return <ContentSkeleton variant="profile" label="Loading your profile" />;
  if (!user) return null;

  return (
    <LoadingContent variant="profile" label="Loading your profile"><div className={`profile-page${isEditing ? " is-editing" : ""}`}>
      {user.emailBanned && <p role="status">Your email address has been restricted. Existing sessions retain access to your profile and privacy controls, but you cannot change your email to bypass the restriction. Contact <a href="mailto:Lena@fziyen.dev">Lena@fziyen.dev</a> for a review.</p>}
      {!isEligible(sessionUser) && <Eligibility />}
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
          <UserProfilePreview user={user} triggerClassName="profile-public-preview">View public profile</UserProfilePreview>
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
          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ participationHistoryPublic: true, reviewHistoryPublic: true }}>
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
                label="Email visibility"
                name="emailPublic"
                valuePropName="checked"
                extra="Make your email public to everyone, including visitors without accounts. You can turn this off at any time."
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
              <div className="profile-history-settings">
                <h3>Profile history visibility</h3>
                <p>Choose which histories appear on your public profile. Attendance and reviews on individual event pages remain visible. Hosted events and organizer ratings always remain public.</p>
                <Form.Item label="Show past participation on my profile" name="participationHistoryPublic" valuePropName="checked">
                  <Switch disabled={!isEditing} checkedChildren="Public" unCheckedChildren="Private" />
                </Form.Item>
                <Form.Item label="Show written reviews on my profile" name="reviewHistoryPublic" valuePropName="checked">
                  <Switch disabled={!isEditing} checkedChildren="Public" unCheckedChildren="Private" />
                </Form.Item>
              </div>
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
                <span>JPG, PNG, or GIF up to 5 MB. Photos are public; remove location metadata before uploading.</span>
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
            {user.profilePicture && <Button onClick={removePhoto} loading={isUploading}>Remove photo</Button>}
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

          {user.role === "Organizer" && <Card className="profile-card" title="Organizer settings">
            <p>Return to a participant account to use UniEventia only for discovering and joining events. Your existing events will remain published, with management available to administrators.</p>
            <Button onClick={removeOrganizerRole}>Remove organizer role</Button>
          </Card>}
          {user.role === "Participant" && !user.emailBanned && isEligible(user) && <Card className="profile-card" title="Organize events">
            <p>Request organizer access to create and manage events.</p>
            {user.organizerRequest?.status === "pending" ? <>
              <p role="status">Your request is awaiting administrator review.</p>
              <Button loading={isRequesting} onClick={refreshRequest}>Check request status</Button>
            </> : <>
              {user.organizerRequest?.status === "rejected" && <p>Your last request was declined. You can submit a new request.</p>}
              <Button type="primary" loading={isRequesting} onClick={requestOrganizer}>Request organizer access</Button>
            </>}
          </Card>}
          <Card className="profile-card" title="Privacy and your data">
            <div className="privacy-actions">
              <p>Download your account, event and participation records. Your images can be downloaded using the URLs in the export before deleting your account.</p>
              <Button icon={<DownloadOutlined />} onClick={exportData} loading={isExporting}>Download my data</Button>
              <a href="/privacy">Read the Privacy Policy</a>
              <a href="mailto:Lena@fziyen.dev?subject=UniEventia%20privacy%20request">Contact Lena about a privacy request</a>
            </div>
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
