export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5030/api";
export const MEDIA_URL =
  process.env.REACT_APP_MEDIA_URL || "http://localhost:5030";

export const getDefaultMediaUrl = (type = "profile") => {
  const variant = type === "event" ? "event" : "profile";
  return `${process.env.PUBLIC_URL || ""}/default-${variant}-placeholder.svg`;
};

export const getMediaUrl = (value, type = "profile") => {
  if (!value || value === "null" || value === "undefined") {
    return getDefaultMediaUrl(type);
  }
  if (value.includes("default-pfp")) {
    return getDefaultMediaUrl("profile");
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const origin = new URL(value).origin;
      if (origin === new URL(MEDIA_URL).origin || origin === window.location.origin) return value;
    } catch { /* Invalid or untrusted media uses a local placeholder. */ }
    return getDefaultMediaUrl(type);
  }
  return `${MEDIA_URL}${value.startsWith("/") ? value : `/${value}`}`;
};
