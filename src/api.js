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
    return value;
  }
  return `${MEDIA_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

// export const register = async (userData) => {
//   const response = await axios.post(`${API_URL}/auth/register`, userData);
//   return response.data;
// };

// export const login = async (userData) => {
//   const response = await axios.post(`${API_URL}/auth/login`, userData);
//   return response.data;
// };
