import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input, Modal, Pagination, Select, Space, Table, Tabs, Tag, message } from "antd";
import axios from "axios";
import { API_URL } from "../../api";
import { useAuth } from "../../authContext";

const authorization = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function Administration() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("requests");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [banEmail, setBanEmail] = useState("");
  const [nextRole, setNextRole] = useState("Participant");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const accounts = tab === "requests" || tab === "accounts";
      const { data } = await axios.get(`${API_URL}/administrator/${accounts ? "users" : tab === "bans" ? "email-bans" : "content"}`, {
        headers: authorization(), params: { page, ...(accounts ? { search, pending: tab === "requests" } : tab === "bans" ? {} : { type: tab }) },
      });
      setResult(data);
    } catch (err) { setResult({ items: [], total: 0 }); setError(err.response?.data?.message || "Unable to load administration data."); }
    finally { setLoading(false); }
  }, [tab, page, search]);
  useEffect(() => { load(); }, [load]);

  const openAction = (kind, record, decision) => {
    setPassword(""); setConfirmUsername(""); setAction({ kind, record, decision });
    if (kind === "role") setNextRole(record.role === "Organizer" ? "Participant" : "Organizer");
  };
  const closeAction = () => { if (!saving) { setAction(null); setPassword(""); setConfirmUsername(""); } };
  const submit = async () => {
    if (!action || saving) return;
    const { kind, record, decision } = action;
    setSaving(true);
    try {
      let notice = "Deleted successfully.";
      if (kind === "account") {
        await axios.delete(`${API_URL}/administrator/users/${record._id}`, { headers: authorization(), data: { password, confirmUsername } });
        if (record._id === user?._id) { logout(); return; }
      } else if (kind === "request") {
        await axios.patch(`${API_URL}/administrator/users/${record._id}/organizer-request`, { password, decision }, { headers: authorization() });
        notice = `Request ${decision}.`;
      } else if (kind === "role") {
        const { data } = await axios.patch(`${API_URL}/administrator/users/${record._id}/role`, { role: nextRole, expectedRole: record.role, password }, { headers: authorization() });
        notice = data.message;
      } else if (kind === "ban") {
        await axios.post(`${API_URL}/administrator/email-bans`, { email: record.email, password }, { headers: authorization() });
        notice = "Email banned."; setBanEmail("");
      } else if (kind === "unban") {
        await axios.delete(`${API_URL}/administrator/email-bans/${record._id}`, { headers: authorization(), data: { password } });
        notice = "Email ban removed.";
      } else {
        await axios.delete(`${API_URL}/administrator/content/${record._id}`, { headers: authorization(), params: { type: kind }, data: { password } });
      }
      message.success(notice);
      setAction(null); setPassword(""); setConfirmUsername("");
      await load();
    } catch (err) { message.error(err.response?.data?.message || "The action could not be completed."); }
    finally { setSaving(false); }
  };

  const accounts = tab === "requests" || tab === "accounts";
  const columns = accounts ? [
    { title: "Account", key: "account", render: (_, record) => <><strong>@{record.username}</strong><div>{record.fname} {record.lname}</div><div>{record.email}</div>{record.emailBanned && <Tag color="red">Email banned</Tag>}</> },
    { title: "Role", dataIndex: "role", render: role => <Tag>{role}</Tag> },
    { title: "Organizer request", key: "request", render: (_, record) => record.organizerRequest?.status || "none" },
    { title: "Actions", key: "actions", render: (_, record) => <Space wrap>
      {record.role === "Participant" && record.organizerRequest?.status === "pending" && <>
        <Button onClick={() => openAction("request", record, "approved")}>Approve</Button>
        <Button onClick={() => openAction("request", record, "rejected")}>Decline</Button>
      </>}
      {tab === "accounts" && <Button danger onClick={() => openAction("account", record)}>Delete account</Button>}
      {tab === "accounts" && ["Participant", "Organizer"].includes(record.role) && <Button onClick={() => openAction("role", record)}>Change role</Button>}
      {tab === "accounts" && record._id !== user?._id && <Button danger disabled={record.emailBanned || !record.email} onClick={() => openAction("ban", record)}>Ban email</Button>}
    </Space> },
  ] : tab === "bans" ? [
    { title: "Banned email", dataIndex: "email" },
    { title: "Banned on", dataIndex: "createdAt", render: value => new Date(value).toLocaleString() },
    { title: "Actions", key: "actions", render: (_, record) => <Button onClick={() => openAction("unban", record)}>Unban email</Button> },
  ] : [
    { title: "Author", key: "author", render: (_, record) => record.user?.username || "Deleted account" },
    { title: "Event", key: "event", render: (_, record) => record.event?.title || "Deleted event" },
    { title: "Content", key: "text", render: (_, record) => tab === "reviews" ? `${record.rating}/5 · ${record.comment || ""}` : record.text },
    { title: "Actions", key: "actions", render: (_, record) => <Button danger onClick={() => openAction(tab, record)}>Delete {tab === "reviews" ? "review" : "comment"}</Button> },
  ];
  const actionTitle = action?.kind === "request" ? `${action.decision === "approved" ? "Approve" : "Decline"} organizer request?` : action?.kind === "role" ? "Change account role?" : action?.kind === "ban" ? "Ban email address?" : action?.kind === "unban" ? "Remove email ban?" : "Confirm permanent deletion";
  const actionLabel = action?.kind === "request" ? "Confirm decision" : action?.kind === "role" ? "Save role" : action?.kind === "ban" ? "Confirm email ban" : action?.kind === "unban" ? "Remove ban" : "Delete permanently";
  return <div>
    <p>Review organizer requests, delete accounts or content, and manage email bans. Use Manage events to edit or delete any event.</p>
    <Tabs activeKey={tab} onChange={key => { setTab(key); setPage(1); setSearch(""); setResult({ items: [], total: 0 }); }} items={[
      { key: "requests", label: "Organizer requests" }, { key: "accounts", label: "All accounts" },
      { key: "comments", label: "Comments" }, { key: "reviews", label: "Reviews" },
      { key: "bans", label: "Banned emails" },
    ]} />
    {result.approvalMode && <p>Organizer approval: <strong>{result.approvalMode === "automatic" ? "Automatic (demo)" : "Manual review"}</strong></p>}
    <Space wrap style={{ marginBottom: 16 }}>
      {accounts && <Input.Search aria-label="Search accounts" placeholder="Search name, username or email" allowClear onSearch={value => { setSearch(value); setPage(1); }} />}
      <Button onClick={load} loading={loading}>Refresh</Button>
    </Space>
    {tab === "bans" && <form onSubmit={event => { event.preventDefault(); openAction("ban", { email: banEmail.trim().toLowerCase() }); }} style={{ marginBottom: 16 }}>
      <label htmlFor="ban-email">Email address to ban</label>
      <Space wrap><Input id="ban-email" type="email" required maxLength={254} value={banEmail} onChange={event => setBanEmail(event.target.value)} placeholder="email@example.com" /><Button htmlType="submit" danger disabled={loading}>Ban email</Button></Space>
      <p>Bans block registration, login and protected platform access. They remain after account deletion until an administrator removes them.</p>
    </form>}
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="_id" dataSource={result.items} columns={columns} loading={loading} pagination={false} scroll={{ x: 650 }} />
    <Pagination current={page} total={result.total} pageSize={15} showSizeChanger={false} onChange={setPage} style={{ marginTop: 16 }} />
    <Modal open={Boolean(action)} title={actionTitle}
      onCancel={closeAction} onOk={submit} confirmLoading={saving} closable={!saving} maskClosable={!saving}
      okText={actionLabel} okButtonProps={{ danger: !["request", "role", "unban"].includes(action?.kind), disabled: !password || (action?.kind === "role" && nextRole === action.record.role) || (action?.kind === "account" && confirmUsername !== action.record.username) }}>
      {action?.kind === "role" ? <>
        <p>Change @{action.record.username} from {action.record.role}. They will need to sign in again after the change.</p>
        <label htmlFor="account-next-role">New role</label>
        <Select id="account-next-role" value={nextRole} onChange={setNextRole} disabled={saving} options={[{ value: "Participant", label: "Participant" }, { value: "Organizer", label: "Organizer" }]} style={{ width: "100%", marginBottom: 12 }} />
        {nextRole === "Participant" && <p>Their existing events remain published. Only administrators can manage them until organizer access is granted again.</p>}
      </> : action?.kind === "account" ? <>
        <p>This permanently deletes @{action.record.username}, their organized events, images, comments, reviews and participation records. This cannot be undone.</p>
        {action.record._id === user?._id && <p>You are deleting your own administrator account and will be signed out.</p>}
        <label htmlFor="confirm-account">Type the account username to confirm</label>
        <Input id="confirm-account" value={confirmUsername} onChange={event => setConfirmUsername(event.target.value)} disabled={saving} autoComplete="off" />
      </> : action?.kind === "ban" ? <p>Ban <strong>{action.record.email}</strong>? Accounts using this address will lose protected platform access. Their existing content remains until you delete it or their account.</p> : action?.kind === "unban" ? <p>Allow <strong>{action.record.email}</strong> to register and access the platform again?</p> : <p>{action?.kind === "request" ? `Reviewing the request from @${action.record.username}.` : "This content will be removed permanently."}</p>}
      <label htmlFor="administrator-password">Your current administrator password</label><Input.Password id="administrator-password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={saving} />
    </Modal>
  </div>;
}
