import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Input, List, Typography } from "antd";
import axios from "axios";
import moment from "moment";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { API_URL } from "../../api";
import { useAuth } from "../../authContext";
import { compressImage } from "../../lib/compressImage";
import { ContentSkeleton } from "../ui/loading.comp";
import EventDetails from "../ui/eventDetails.comp";
import "../../Styles/Events.css";
import "../../Styles/EventCreation.css";

const steps = ["Event details", "Date & location", "Practical details & cover", "Preview & confirm"];
const emptyDraft = { title: "", description: "", startDay: "", endDay: "", startTime: "", endTime: "", location: "", maxParticipants: 50, language: "", wheelchairAccess: "unknown", cost: "", transport: "", whatToBring: "" };

export function eventDates(draft) {
  return {
    start: new Date(`${draft.startDay}T${draft.startTime}:00`),
    end: new Date(`${draft.endDay}T${draft.endTime}:00`),
  };
}

export function validateEventStep(draft, step) {
  if (step === 0 && (!draft.title.trim() || !draft.description.trim())) return "Enter a title and description.";
  if (step === 1) {
    if (!draft.startTime || !draft.endTime) return "Select both a start time and an end time.";
    const { start, end } = eventDates(draft);
    if (!draft.startDay || !draft.endDay || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Select valid start and end dates.";
    if (draft.startDay < moment().format("YYYY-MM-DD")) return "The start date cannot be in the past.";
    if (end <= start) return "End time must be after the start time.";
    if (!draft.location.trim()) return "Enter an event location.";
    if (!Number.isInteger(Number(draft.maxParticipants)) || Number(draft.maxParticipants) < 1 || Number(draft.maxParticipants) > 100000) return "Maximum participants must be a whole number between 1 and 100,000.";
  }
  return "";
}

export default function UploadEvent() {
  const { user, requireAuth } = useAuth();
  const [draft, setDraft] = useState(emptyDraft);
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [image, setImage] = useState(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [preparingImage, setPreparingImage] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [remaining, setRemaining] = useState(null);
  const [limitError, setLimitError] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const heading = useRef(null);
  const submitting = useRef(false);
  const imageVersion = useRef(0);

  useEffect(() => { heading.current?.focus(); }, [step, loadingLimits, created]);
  useEffect(() => {
    if (!image) { setCoverUrl(""); return; }
    const url = URL.createObjectURL(image);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => () => { imageVersion.current += 1; }, []);

  const loadLimits = async () => {
    setLoadingLimits(true);
    setLimitError(false);
    try {
      const { data } = await axios.get(`${API_URL}/events/organizer`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const recent = (data || []).filter((event) => new Date(event.createdAt).getTime() >= Date.now() - 86400000);
      setRemaining(Math.max(0, 8 - recent.length));
    } catch {
      setLimitError(true);
    } finally { setLoadingLimits(false); }
  };
  useEffect(() => { loadLimits(); }, []);

  const update = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
    setConfirmed(false);
    setError("");
  };
  const selectImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/gif"].includes(file.type)) return setError("Choose a PNG, JPEG, or GIF image.");
    if (file.size > 5 * 1024 * 1024) return setError("Choose an image smaller than 5 MB.");
    const version = ++imageVersion.current;
    setPreparingImage(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 1.5, maxWidthOrHeight: 1920 });
      if (version === imageVersion.current) { setImage(compressed); setConfirmed(false); }
    } catch { if (version === imageVersion.current) setError("Could not prepare this image. Please try another."); }
    finally { if (version === imageVersion.current) setPreparingImage(false); }
  };
  const moveTo = (next) => { setError(""); setConfirmed(false); setStep(next); };
  const advance = (event) => {
    event.preventDefault();
    if (busy || preparingImage) return;
    const invalid = validateEventStep(draft, step);
    if (invalid) return setError(invalid);
    moveTo(step + 1);
  };
  const publish = async () => {
    if (submitting.current || !confirmed || preparingImage || remaining === 0) return;
    if (!requireAuth("create an event")) return;
    for (const section of [0, 1]) {
      const invalid = validateEventStep(draft, section);
      if (invalid) { setStep(section); setConfirmed(false); setError(invalid); return; }
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    const { start, end } = eventDates(draft);
    const data = new FormData();
    data.append("title", draft.title.trim());
    data.append("description", draft.description.trim());
    data.append("location", draft.location.trim());
    data.append("maxParticipants", String(Number(draft.maxParticipants)));
    data.append("startDate", start.toISOString());
    data.append("endDate", end.toISOString());
    for (const key of ["language", "wheelchairAccess", "cost", "transport", "whatToBring"]) data.append(key, draft[key].trim());
    if (image) data.append("coverImage", image);
    try {
      const response = await axios.post(`${API_URL}/events`, data, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setRemaining(response.data?.rateLimit?.remaining ?? (remaining === null ? null : Math.max(0, remaining - 1)));
      setCreated(true);
    } catch (err) {
      if (err.response?.status === 429) setRemaining(0);
      setError(err.response?.data?.message || "Could not create the event. Your information is saved here; please try again.");
    } finally { setBusy(false); submitting.current = false; }
  };
  const reset = () => { setDraft(emptyDraft); setImage(null); setCreated(false); moveTo(0); loadLimits(); };
  const { start, end } = eventDates(draft);
  const preview = { ...draft, title: draft.title.trim(), description: draft.description.trim(), location: draft.location.trim(), maxParticipants: Number(draft.maxParticipants), startDate: Number.isNaN(start.getTime()) ? null : start.toISOString(), endDate: Number.isNaN(end.getTime()) ? null : end.toISOString(), organizer: user, participants: [] };

  if (loadingLimits) return <ContentSkeleton variant="profile" label="Loading event form" />;
  if (created) return <div className="event-create-success"><Check size={28} /><h2 tabIndex={-1} ref={heading}>Event created</h2><p>{draft.title} is now available in Discover.</p><Button type="primary" onClick={reset}>Create another event</Button></div>;

  return <section className="event-create">
    <ol className="event-create-steps" aria-label="Event creation progress">{steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={index <= step ? "is-reached" : ""}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol>
    <div className="event-create-meta"><span>Step {step + 1} of 4</span>{remaining !== null && <span>{remaining} of 8 events available in the next 24 hours</span>}</div>
    {limitError && <Alert type="warning" message="Could not check your event allowance. It will be checked when you publish." />}
    {remaining === 0 && <Alert type="warning" message="You have reached the limit of 8 events per 24 hours. You can prepare your event and publish when your allowance resets." />}
    <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
    {step < 3 ? <form className="event-create-form" onSubmit={advance}>
      <div key={step} className="event-create-stage">
        {step === 0 && <>
          <label htmlFor="event-title">Title</label><Input id="event-title" required value={draft.title} onChange={update("title")} placeholder="Enter event title" />
          <label htmlFor="event-description">Description</label><Input.TextArea id="event-description" required rows={6} value={draft.description} onChange={update("description")} placeholder="Enter event description" />
        </>}
        {step === 1 && <>
          <div className="event-create-row"><label>Start date<input aria-label="Start date" type="date" required min={moment().format("YYYY-MM-DD")} value={draft.startDay} onChange={update("startDay")} /></label><label>End date<input aria-label="End date" type="date" required min={draft.startDay || moment().format("YYYY-MM-DD")} value={draft.endDay} onChange={update("endDay")} /></label></div>
          <div className="event-create-row"><label>Start time<input aria-label="Start time" type="time" required value={draft.startTime} onChange={update("startTime")} /></label><label>End time<input aria-label="End time" type="time" required value={draft.endTime} onChange={update("endTime")} /></label></div>
          <p className="event-create-hint">Start and end times are required and use your local timezone.</p>
          <label htmlFor="event-location">Location</label><Input id="event-location" required value={draft.location} onChange={update("location")} />
          <label htmlFor="event-capacity">Maximum participants</label><input id="event-capacity" type="number" min={1} max={100000} step={1} required value={draft.maxParticipants} onChange={update("maxParticipants")} />
        </>}
        {step === 2 && <>
          <h3>Accessibility and practical details (optional)</h3>
          <label htmlFor="event-language">Language</label><Input id="event-language" maxLength={100} value={draft.language} onChange={update("language")} placeholder="e.g. English and Finnish" />
          <label htmlFor="event-access">Wheelchair access</label><select id="event-access" value={draft.wheelchairAccess} onChange={update("wheelchairAccess")}><option value="unknown">Not specified</option><option value="yes">Accessible</option><option value="partial">Partially accessible</option><option value="no">Not accessible</option></select>
          <label htmlFor="event-cost">Cost</label><Input id="event-cost" maxLength={200} value={draft.cost} onChange={update("cost")} placeholder="e.g. Free, or €5 payable at the door" />
          <label htmlFor="event-transport">Transport</label><Input.TextArea id="event-transport" maxLength={2000} rows={3} value={draft.transport} onChange={update("transport")} placeholder="Public transport, parking, or meeting point" />
          <label htmlFor="event-bring">What to bring</label><Input.TextArea id="event-bring" maxLength={2000} rows={3} value={draft.whatToBring} onChange={update("whatToBring")} placeholder="e.g. Laptop, water bottle, student ID" />
          <label htmlFor="event-image">Cover image (optional)</label><input id="event-image" type="file" accept="image/png,image/jpeg,image/gif" onChange={selectImage} disabled={preparingImage} />
          <p className="event-create-hint">PNG, JPEG, or GIF, up to 5 MB.</p>
          {preparingImage && <p role="status">Preparing image…</p>}
          {coverUrl && <div className="event-cover-selection"><img src={coverUrl} alt="Selected event cover" /><span>{image?.name}</span><Button onClick={() => { setImage(null); setConfirmed(false); }} disabled={preparingImage}>Remove image</Button></div>}
        </>}
      </div>
      {error && <Alert type="error" role="alert" message={error} />}
      <div className="event-create-actions">{step > 0 && <Button onClick={() => moveTo(step - 1)}><ArrowLeft size={15} /> Back</Button>}<Button type="primary" htmlType="submit" disabled={preparingImage}>{step === 2 ? "Preview event" : "Continue"}<ArrowRight size={15} /></Button></div>
    </form> : <>
      <div className="event-preview-tools"><span>Expanded card preview · interactions disabled</span><div>{steps.slice(0, 3).map((label, index) => <Button key={label} size="small" onClick={() => moveTo(index)} disabled={busy}>Edit {label.toLowerCase()}</Button>)}</div></div>
      <div className="event-create-preview">
        <div className="ant-modal-title">{preview.title}</div>
        <div className="event-detail-grid">
          <EventDetails event={preview} coverUrl={coverUrl} preview><Button type="primary" block disabled>Participate</Button></EventDetails>
          <div className="event-conversation"><Typography.Title level={4}>What are you hoping to see?</Typography.Title><List dataSource={[]} locale={{ emptyText: "No comments yet." }} /><Input.TextArea rows={3} disabled placeholder="Share an idea or what you are looking forward to..." /><Button type="primary" disabled style={{ marginTop: 12 }}>Add comment</Button></div>
        </div>
      </div>
      <Checkbox className="event-confirmation" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={busy}>I have reviewed the event details and confirm they are correct.</Checkbox>
      {error && <Alert type="error" role="alert" message={error} />}
      <div className="event-create-actions"><Button onClick={() => moveTo(2)} disabled={busy}><ArrowLeft size={15} /> Back</Button><Button type="primary" onClick={publish} loading={busy} disabled={!confirmed || remaining === 0}>Confirm and create event</Button></div>
    </>}
  </section>;
}
