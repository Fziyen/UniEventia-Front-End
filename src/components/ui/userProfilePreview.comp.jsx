import React, { useEffect, useRef, useState } from "react";
import { Alert, Avatar, Button, Modal, Pagination, Tabs, Tag } from "antd";
import { CalendarDays, ChevronDown, MapPin, Star, UserRound } from "lucide-react";
import axios from "axios";
import { API_URL, getMediaUrl } from "../../api";
import { useAuth } from "../../authContext";
import { ContentSkeleton } from "./loading.comp";
import "../../Styles/MemberProfile.css";
import { formatDateInput } from "../../lib/dates";

const date = value => {
  const parsed = new Date(value);
  return value && !Number.isNaN(parsed.getTime()) ? formatDateInput(parsed) : "Date unavailable";
};
const initialPages = { hostedPage: 1, participationPage: 1, reviewsPage: 1 };

function EventHistoryCard({ event }) {
  return <details className="member-event-card">
    <summary>
      <img src={getMediaUrl(event.coverImage, "event")} alt="" loading="lazy" />
      <span className="member-event-copy"><strong>{event.title}</strong><span><CalendarDays size={13} aria-hidden="true" /> {date(event.startDate)}</span><span><MapPin size={13} aria-hidden="true" /> {event.location}</span></span>
      <ChevronDown className="member-event-chevron" size={17} aria-hidden="true" />
    </summary>
    <div className="member-event-description"><p>{event.description}</p><p>Ended {date(event.endDate)}</p></div>
  </details>;
}

function HistorySection({ history, kind, onPage }) {
  if (!history?.visible) return <div className="member-history-empty">This member keeps {kind === "reviews" ? "their written review history" : "their past participation history"} private on their profile.</div>;
  return <div className="member-history-section">
    {!history.items.length && <div className="member-history-empty">{kind === "reviews" ? "No written reviews yet." : "No past events to show yet."}</div>}
    <div className="member-history-list">
      {history.items.map(item => kind === "reviews" ? <article className="member-review-card" key={item._id}>
        <div className="member-review-heading"><strong>{item.event.title}</strong><span><Star size={14} aria-hidden="true" /> {item.rating}/5</span></div>
        <p>{item.comment}</p><time dateTime={item.createdAt}>{date(item.createdAt)}</time>
      </article> : <EventHistoryCard key={item._id} event={item} />)}
    </div>
    {history.total > 10 && <Pagination size="small" current={history.page} total={history.total} pageSize={10} showSizeChanger={false} onChange={onPage} />}
  </div>;
}

export default function UserProfilePreview({ user, children, triggerClassName }) {
  const { requireAuth } = useAuth();
  const [profileId, setProfileId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pages, setPages] = useState(initialPages);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const trigger = useRef(null);

  useEffect(() => {
    if (!profileId) return;
    let active = true;
    setLoading(true); setError("");
    // Always load by exact identifier; props and community results are not a history cache.
    axios.get(`${API_URL}/users/${profileId}/public`, { params: pages })
      .then(({ data }) => { if (active) setProfile(data); })
      .catch(() => { if (active) { setProfile(null); setError("This profile could not be loaded. Please try again."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profileId, pages, reload]);

  const openProfile = () => {
    if (!requireAuth("view member profiles")) return;
    const id = typeof user === "string" ? user : user?._id || user?.id;
    if (!id) return;
    setProfile(null); setActiveTab(null); setPages(initialPages); setLoading(true); setProfileId(String(id));
  };
  const close = () => { setProfileId(null); setProfile(null); setError(""); };
  const name = `${profile?.fname || ""} ${profile?.lname || ""}`.trim() || "Member";
  const hosting = profile?.hosting;
  const tabs = profile ? [
    ...(hosting?.visible ? [{ key: "hosted", label: `Hosted events (${profile.hostedEvents.total})`, children: <HistorySection history={profile.hostedEvents} kind="hosted" onPage={hostedPage => setPages(current => ({ ...current, hostedPage }))} /> }] : []),
    { key: "participation", label: "Past participation", children: <HistorySection history={profile.participatedEvents} kind="participation" onPage={participationPage => setPages(current => ({ ...current, participationPage }))} /> },
    { key: "reviews", label: "Written reviews", children: <HistorySection history={profile.writtenReviews} kind="reviews" onPage={reviewsPage => setPages(current => ({ ...current, reviewsPage }))} /> },
  ] : [];

  return <>
    <div ref={trigger} className={triggerClassName} role="button" tabIndex={0} onClick={openProfile} onKeyDown={event => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); openProfile(); } }} style={{ cursor: "pointer" }}>{children}</div>
    <Modal title="Member profile" footer={null} open={Boolean(profileId)} onCancel={close} afterClose={() => trigger.current?.focus()} width={800} className="member-profile-modal" destroyOnHidden>
      {loading ? <ContentSkeleton variant="profile" label="Loading member profile" /> : error ? <div><Alert type="error" message={error} /><Button onClick={() => setReload(value => value + 1)}>Retry profile</Button></div> : profile && <div className="member-profile">
        <header className="member-profile-hero">
          <Avatar size={88} src={getMediaUrl(profile.profilePicture, "profile")} icon={<UserRound size={32} />} />
          <div className="member-profile-identity"><Tag color={profile.role === "Administrator" ? "purple" : profile.role === "Organizer" ? "green" : "blue"}>{profile.role}</Tag><h2>{name}</h2><p>@{profile.username}</p><p>Member since {date(profile.createdAt)}</p>{profile.emailPublic && profile.email && <p>{profile.email}</p>}</div>
          {hosting?.visible && <div className="member-profile-score" aria-label="Overall organizer rating"><span><Star size={17} aria-hidden="true" /> Organizer score</span><strong>{hosting.score.toFixed(1)}<small>/5</small></strong><span>{hosting.reviewCount ? `${hosting.reviewCount} ${hosting.reviewCount === 1 ? "review" : "reviews"} across hosted events` : "No reviews yet"}</span></div>}
        </header>
        <section className="member-profile-bio"><h3>About</h3><p>{profile.bio || "This member hasn’t added a bio yet."}</p></section>
        <div className="member-profile-stats">
          {hosting?.visible && <div><strong>{hosting.eventCount}</strong><span>Events hosted</span></div>}
          <div><strong>{profile.participatedEvents?.visible ? profile.participatedEvents.total : "Private"}</strong><span>Past events attended</span></div>
          <div><strong>{profile.writtenReviews?.visible ? profile.writtenReviews.total : "Private"}</strong><span>Reviews written</span></div>
        </div>
        {hosting?.visible && <p className="member-profile-note">Hosted events and the organizer score are always public. Each retained review contributes equally to the score.</p>}
        <Tabs activeKey={tabs.some(tab => tab.key === activeTab) ? activeTab : tabs[0]?.key} onChange={setActiveTab} items={tabs} />
      </div>}
    </Modal>
  </>;
}
