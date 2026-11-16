import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../api";
import LegalLinks from "./legalLinks.comp";
import { PRIVACY_VERSION } from "./eligibility";
import "../../Styles/Legal.css";

const knownOperator = { operatorName: "Lena Fziyen", country: "Finland", privacyEmail: "Lena@fziyen.dev", hosting: "Vercel", ready: false };
const Email = ({ legal, subject = "UniEventia privacy request" }) => <a href={`mailto:${legal.privacyEmail}?subject=${encodeURIComponent(subject)}`}>{legal.privacyEmail}</a>;

function Privacy({ legal }) {
  return <>
    <p className="legal-lead">This notice explains how UniEventia handles personal information when you browse events, create an account or participate in the community.</p>
    <h2>1. Who is responsible and how to contact us</h2>
    <p>{legal.operatorName}, based in {legal.country}, operates UniEventia as a personal, noncommercial demonstration project and is the controller of personal data handled by the platform. Contact <Email legal={legal} /> for privacy questions, requests, appeals or reports of an underage account.</p>
    {legal.address && <p>Correspondence address: {legal.address}</p>}
    {legal.representative && <p>EU representative: {legal.representative}</p>}
    {legal.dpo && <p>Data protection contact: {legal.dpo}</p>}
    <h2>2. Information, purposes and legal bases</h2>
    <p>We collect information you enter, activity you carry out on the platform and technical information generated when your browser connects. We do not buy personal information from data brokers.</p>
    <div className="legal-table-wrap"><table>
      <thead><tr><th scope="col">Information</th><th scope="col">Purpose and GDPR basis</th><th scope="col">Retention in the application</th></tr></thead>
      <tbody>
        <tr><td>Name, username, email, password hash and role</td><td>Creating, authenticating and managing your account; performing our agreement with you.</td><td>Until account deletion.</td></tr>
        <tr><td>Organizer access request, decision, timestamps and reviewing administrator identifier</td><td>Processing your request to organize events and controlling access to publishing features.</td><td>Until account deletion or replacement by a later request.</td></tr>
        <tr><td>Role changes, organizer self-removal, request decisions and moderation audit records (identifiers, roles and timestamps)</td><td>Investigating misuse of administrator access; legitimate interests in platform security.</td><td>Scheduled for database expiry after 90 days, including after account deletion. These records contain no passwords, tokens or deleted content.</td></tr>
        <tr><td>Banned email addresses, administrator identifier and ban timestamp</td><td>Preventing repeated misuse and enforcing account restrictions; legitimate interests in platform security.</td><td>Until an administrator lifts the ban, including after account deletion. Contact the operator to request a review.</td></tr>
        <tr><td>Date of birth, adult-confirmation result, terms acceptance and notice version</td><td>Enforcing the 18+ account rule and recording the agreement; legitimate interests in an adult community and administering our contract.</td><td>Birthday is checked in memory and is not saved in the database. Confirmation and agreement records remain until account deletion.</td></tr>
        <tr><td>Optional biography, photo and email visibility choice</td><td>Displaying your chosen profile and enabling community interaction; providing the profile features you request. You can remove your bio or photo or hide your email in Profile.</td><td>Until you replace or remove it, or delete your account.</td></tr>
        <tr><td>Events, event covers, participation, waitlists, comments, reviews and notifications</td><td>Publishing and managing events and community interactions; performing our agreement with you.</td><td>Until deletion; events and their associated records are scheduled for deletion five years after they end, in the next daily cleanup run.</td></tr>
        <tr><td>IP address, request time, browser/request information and errors</td><td>Delivering pages, limiting abuse and troubleshooting; legitimate interests in service reliability and security.</td><td>Pseudonymous request rate-limit counters reset every 15 minutes and are then removed by database expiry cleanup. Hosting logs: {legal.logRetention || "operator retention details awaiting publication"}.</td></tr>
        <tr><td>Privacy requests, content reports and related correspondence</td><td>Responding to requests, handling disputes and complying with applicable legal duties; legal obligation or legitimate interests in resolving complaints.</td><td>As needed to resolve the request and meet applicable recordkeeping or legal-claim requirements. Ask the contact above for the period relevant to your request.</td></tr>
      </tbody>
    </table></div>
    <p>Account details and confirmation of adult eligibility are required to hold an account. Optional profile content is voluntary. You can browse public events without an account. Please do not post sensitive information, private addresses, identity documents or information about other people without a lawful basis. Event choices and posts can reveal sensitive interests; consider what you make public.</p>
    <h2>3. What other people can see</h2>
    <p>Your name, username, role, profile photo, biography and account creation date can appear in public profiles and event views, including to visitors without accounts. Event details, organizers, participant lists, reviews and comments are public. Waitlist membership identifiers appear in event data. Your email is private by default; enabling public email visibility makes it accessible to visitors, not only signed-in members. Past participation and written-review histories appear on your profile by default, with separate visibility switches in Profile settings. Hiding a profile history does not remove attendance or reviews from individual event pages. Hosted-event history and the overall organizer score stay public for organizers, administrators and former hosts with retained events. Your password, birthday and adult-confirmation records are not public profile information.</p>
    <p>Organizers and other visitors may save public information. Removing content from UniEventia does not automatically remove copies independently retained by others. Organizers are responsible for their own lawful use of information outside the platform; participation does not authorize unrelated marketing.</p>
    <h2>4. Providers, disclosures and international transfers</h2>
    <p>We use Vercel for hosting and MongoDB Atlas for the database and uploaded images. Service providers may process information to host the application, operate its database, maintain backups and provide security and support. Details of providers and processing locations: {legal.processors || "Vercel serves pages through its global network; MongoDB Atlas stores data in the cloud provider and region selected for the cluster. The operator is confirming the selected region and any additional providers."}</p>
    <p>International processing and safeguards: {legal.transfers || "The operator is confirming processing locations and the applicable transfer safeguards before opening registration."}</p>
    <p>Where information leaves the EEA, applicable GDPR transfer requirements must be met, for example an adequacy decision or standard contractual clauses with appropriate safeguards. Contact us for the safeguards applicable to your data and how to obtain a copy. Information may also be disclosed when legally required or necessary to establish, exercise or defend legal claims.</p>
    <h2>5. Local storage, cookies and tracking choices</h2>
    <p>The application uses local storage for your login token, cached profile and last dashboard section. Tokens expire after four hours; the app clears its cached session when it detects expiry or you log out. Session storage may remember a rejected age check until that browser tab session ends. These functions support authentication, navigation and age restrictions. Clearing browser storage signs you out but does not delete your server account.</p>
    <p>UniEventia does not run advertising, sell personal information, share it for cross-context behavioral advertising, or use analytics or advertising trackers in the application. It does not load Google reCAPTCHA. Do Not Track and Global Privacy Control signals do not change this default: sale, targeted advertising and cross-site tracking are already disabled for everyone. There is no optional tracking consent to accept. If optional tracking is introduced, the notice and controls must be updated before it begins.</p>
    <h2>6. Access, correction, export and deletion</h2>
    <p>In Profile you can edit your details, change email visibility, remove a photo, download account data in JSON and delete your account using your current password. Export includes your own events, participation, reviews, comments, registrations and notifications; download your images from their listed URLs before deletion. Deletion removes your account, profile image, hosted events and covers, your comments and reviews, participation and waitlist entries and notifications held for you. It also ends access using existing account tokens.</p>
    <p>Backup arrangements and retention: {legal.backupRetention || "The operator is confirming the database plan and whether backups exist"}. Backups, if maintained, are separate from the live database. Some records may need to be retained outside the app to meet a specific legal obligation or resolve a legal claim; we will explain any applicable exception. Contact us to request deletion from provider systems, logs or correspondence not covered by the account button.</p>
    <h2>7. Your EU/EEA and US privacy rights</h2>
    <p>Depending on applicable law, you may request access, correction, deletion, restriction, portability, information about disclosures or objection to processing based on legitimate interests. Where processing relies on consent, you may withdraw it at any time without affecting earlier lawful processing. The privacy notice itself is information, not consent to advertising or unrelated uses.</p>
    <p>Send requests to <Email legal={legal} />. You can use this route without an account, including if you cannot sign in or are under 18. Describe the request and account involved; do not email your password or identity document. We may ask for proportionate information to verify your identity or an authorized agent's authority. We respond to GDPR requests without undue delay and normally within one month; any lawful extension will be explained within that month. For US requests, applicable state deadlines and permitted extensions apply, commonly 45 days.</p>
    <p>US residents may also have rights to opt out of sale, sharing, targeted advertising or certain profiling, and to limit specified uses of sensitive information. These activities are not part of UniEventia's current service. We do not make decisions with legal or similarly significant effects using profiling. If a request is denied, reply to the contact above with “Privacy appeal” for a review and explanation. We do not discriminate against people for exercising applicable privacy rights.</p>
    <p>You may complain to a supervisory authority, including the <a href="https://tietosuoja.fi/en/notification-to-the-data-protection-ombudsman">Finnish Data Protection Ombudsman</a> or the authority where you live or work in the EEA. US residents can contact their state attorney general or applicable privacy regulator.</p>
    <h2>8. Account eligibility</h2>
    <p>Accounts are limited to people aged 18 or older. New users supply their date of birth before account details; the server checks it again on registration and saves only an adult-confirmation record. This is a self-declaration, not identity or government-ID verification. Existing users must also confirm eligibility. Accounts that declare an age below 18 are restricted while access to privacy controls remains available. Contact us if you believe we hold information about a child so we can investigate and take appropriate action, including deletion.</p>
    <h2>9. Security and changes</h2>
    <p>We use password hashing, access checks, request limits and controls over file uploads. No service can guarantee absolute security. Report a suspected security issue privately to <Email legal={legal} subject="UniEventia security report" /> without sharing other users' data.</p>
    <p>The version date above identifies this notice. We will publish changes here and communicate material changes through the service or another appropriate channel before they take effect. Changes requiring a new permission will not be treated as accepted solely because you continue browsing.</p>
  </>;
}
function Terms({ legal }) {
  return <>
    <p className="legal-lead">UniEventia helps people discover, organize and participate in community events. This is a noncommercial demonstration project with no profit-making purpose. These terms govern use of the platform operated by {legal.operatorName} in {legal.country}.</p>
    <h2>Accounts and eligibility</h2><p>You must be at least 18, provide accurate account and age information, and keep your login secure. You may browse public events without an account. Do not impersonate others, evade an age restriction or share accounts to bypass access controls.</p>
    <h2>Events and costs</h2><p>UniEventia does not process payments or show advertising. Event cost text is information supplied by the organizer. Before making arrangements outside the platform, check the organizer's identity, full price, cancellation terms, venue access and safety arrangements. Organizers must give accurate details, honor their commitments, obtain necessary permissions and comply with applicable event, consumer, accessibility and safety requirements. A place on a waitlist is not a confirmed reservation.</p>
    <p>You can withdraw or leave a waitlist from My Events. Organizers can update or cancel events; check the latest event details and notifications before attending. Platform account deletion also deletes events you organize and their associated records. Nothing here removes an organizer's obligations to attendees.</p>
    <h2>Community rules and your content</h2><p>Do not post unlawful content, harassment, threats, discrimination, scams, private information without authorization, malware, spam or content that infringes others' rights. Do not use participant information for unrelated marketing or scrape the service to build personal profiles. Only upload content you have the right to use. You retain ownership of your content and grant the operator permission to store, display and technically process it as needed to provide the features you request. That permission ends when the content is removed, subject to necessary backup expiration and lawful preservation.</p>
    <h2>Reports, moderation and appeals</h2><p>Use <Link to="/report">Report a concern</Link> to identify unlawful content, infringements, unsafe behavior, underage accounts or an accessibility problem. Provide the item location, why it is problematic and supporting context. Reports are reviewed by the operator. Content or accounts may be restricted or removed for violations of these rules or applicable law. We will explain a moderation decision and available ways to challenge it unless prohibited by law or disclosure would jeopardize safety or an investigation. Contact <Email legal={legal} subject="UniEventia moderation appeal" /> to request review; include the decision and reasons for appeal. Applicable regulator, out-of-court and judicial remedies remain available.</p>
    <h2>Your data and leaving</h2><p>The <Link to="/privacy">Privacy Policy</Link> explains collection, public visibility and privacy rights. You can edit or export your data and delete your account in Profile. Event records are scheduled for removal five years after the event ends, so keep a copy of information you need.</p>
    <h2>Responsibility, applicable rights and changes</h2><p>Organizers are responsible for their events and posted details. Contact the operator about service problems at <Email legal={legal} subject="UniEventia support" />. Nothing in these terms excludes liability that cannot lawfully be excluded or limits mandatory consumer, data protection or other statutory rights, including rights in your country of residence. Changes to these terms will be published with a version date, and material changes will be communicated before they take effect. The app asks you to accept a new terms version before resuming account features; privacy controls remain available.</p>
    <p>Operator: {legal.operatorName}, {legal.country}. {legal.address && `Correspondence address: ${legal.address}.`}</p>
  </>;
}
function Report({ legal }) {
  const location = useLocation();
  const item = new URLSearchParams(location.search).get("item");
  return <>
    <p className="legal-lead">Contact the operator about unlawful content, privacy, copyright, safety, underage accounts or accessibility. You do not need an account to report a concern.</p>
    {item && <p>Item reference: <strong>{item.slice(0, 200)}</strong></p>}
    <h2>Send a report</h2>
    <p>Email <Email legal={legal} subject={item ? `UniEventia report: ${item.slice(0, 200)}` : "UniEventia content report"} />. This link opens your email application; you must send the message there. You can also copy the address into your preferred email service.</p>
    <ol><li>Identify the exact event, profile, comment or review with its link or ID. Include the author, title and quoted text if necessary to locate it.</li><li>Explain why you believe it is unlawful or violates the rules, including the relevant country or law if known.</li><li>Provide your name and email so the operator can acknowledge receipt, request information and communicate a decision. If identifying yourself would expose you or a child to harm, explain this and provide only what is necessary.</li><li>State that you believe in good faith that the information and allegations in your report are accurate and complete.</li></ol>
    <p>Do not attach illegal imagery, passwords or identity documents. For copyright reports, identify the protected work, the allegedly infringing material, your contact information, your authority to act and your signature, and state the accuracy of your notice and your good-faith belief that the use is unauthorized.</p>
    <h2>Review and appeals</h2><p>The operator will review sufficiently detailed reports, communicate receipt and a decision using the contact you provide, and explain available review options. To challenge a decision, reply with the reference and reasons for appeal. Reporting does not automatically remove content. For immediate danger, contact the appropriate local emergency service.</p>
    <h2>Privacy requests and accessibility</h2><p>You can use the same address to request access, correction, erasure, restriction, portability or an appeal, or to report an accessibility barrier. Tell us which page and function are affected and your preferred way to receive a response. See the <Link to="/privacy">Privacy Policy</Link> for request handling and regulatory complaint options.</p>
  </>;
}
export default function LegalPage({ type = "privacy" }) {
  const [legal, setLegal] = useState(knownOperator);
  const [status, setStatus] = useState("loading");
  const title = type === "privacy" ? "Privacy Policy" : type === "terms" ? "Terms of Use" : "Report a concern";
  useEffect(() => {
    let active = true;
    axios.get(`${API_URL}/legal`).then(({ data }) => {
      if (!data || !data.operatorName) throw new Error("Legal information unavailable");
      if (active) { setLegal(data); setStatus("loaded"); }
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);
  useEffect(() => { document.title = `${title} | UniEventia`; window.scrollTo(0, 0); return () => { document.title = "UniEventia"; }; }, [title]);
  return <div className="legal-page">
    <header className="legal-header"><Link to="/" className="legal-brand">UniEventia</Link><Link to="/Dashboard">Explore events</Link></header>
    <main id="main-content" tabIndex={-1} className="legal-document">
      <p className="legal-eyebrow">UniEventia · Community events</p><h1>{title}</h1>
      {type !== "report" && <p>Version: {PRIVACY_VERSION}</p>}
      {status === "loading" && <p role="status">Loading operator information…</p>}
      {status === "error" && <p role="alert">We could not load the full operator information. Please try again later or contact Lena@fziyen.dev.</p>}
      {status === "loaded" && !legal.ready && <aside className="legal-notice" role="status">This notice is awaiting the operator's infrastructure and retention details. New production registrations remain closed while those details are incomplete. The privacy contact and existing account privacy controls remain available.</aside>}
      {type === "privacy" ? <Privacy legal={legal} /> : type === "terms" ? <Terms legal={legal} /> : <Report legal={legal} />}
    </main><footer className="legal-footer"><LegalLinks /><Link to="/">Back to home</Link></footer>
  </div>;
}
