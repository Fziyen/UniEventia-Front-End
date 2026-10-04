// JWT expiry is a UI hint only. The API remains responsible for verification.
export function sessionExpiresAt(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch { return null; }
}

export const isSessionExpired = token => {
  const expiresAt = sessionExpiresAt(token);
  return expiresAt !== null && expiresAt <= Date.now();
};

const listeners = new Set();
export function subscribeToSessionExpiry(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function expireSession(rejectedToken) {
  // An old request must never sign out a newly established session.
  if (!rejectedToken || localStorage.getItem('token') !== rejectedToken) return false;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('activePage');
  listeners.forEach(listener => listener());
  return true;
}

export function installSessionInterceptor(client, apiUrl) {
  const id = client.interceptors.response.use(response => response, error => {
    const config = error.config;
    if (error.response?.status === 401 && config) {
      try {
        const api = new URL(apiUrl, window.location.origin);
        const request = new URL(config.url, config.baseURL || window.location.origin);
        const basePath = api.pathname.replace(/\/+$/, '');
        const isOurApi = request.origin === api.origin &&
          (request.pathname === basePath || request.pathname.startsWith(`${basePath}/`));
        const header = config.headers?.get?.('Authorization') || config.headers?.Authorization || config.headers?.authorization;
        const token = typeof header === 'string' ? header.match(/^Bearer\s+(\S+)$/i)?.[1] : null;
        if (isOurApi && token) expireSession(token);
      } catch { /* A malformed URL must not affect the current session. */ }
    }
    return Promise.reject(error);
  });
  return () => client.interceptors.response.eject(id);
}
