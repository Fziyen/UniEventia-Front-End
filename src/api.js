export const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5030/api";
export const MEDIA_URL =
  process.env.REACT_APP_MEDIA_URL || "http://localhost:5030";

export const getMediaUrl = (value) => {
  if (!value) return undefined;
  if (value.includes("default-pfp")) return undefined;
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
