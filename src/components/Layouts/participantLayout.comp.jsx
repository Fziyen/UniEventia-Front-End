import React from "react";
import AppShell from "./appShell.comp";
import Events from "../tabs/events.comp";
import MyEvents from "../tabs/myEvents.comp";
import PastEvents from "../tabs/pastEvents.comp";
import Users from "../tabs/users.comp";
import Notifications from "../tabs/notifications.comp";
import Profile from "../tabs/profile.comp";

export default function ParticipantLayout() {
  return (
    <AppShell
      role="Participant"
      renderPage={(page) => {
        switch (page) {
          case "My Events":
            return <MyEvents />;
          case "Past Events":
            return <PastEvents />;
          case "Users":
            return <Users />;
          case "Notifications":
            return <Notifications />;
          case "Profile":
            return <Profile />;
          default:
            return <Events />;
        }
      }}
    />
  );
}
