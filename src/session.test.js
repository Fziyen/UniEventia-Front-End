import axios from 'axios';
import { expireSession, installSessionInterceptor, isSessionExpired, sessionExpiresAt, subscribeToSessionExpiry } from './session';
const api = 'https://api.example.com/api';
const tokenWithExpiry = exp => `header.${btoa(JSON.stringify({ exp }))}.signature`;
let client, uninstall;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'current-session');
  localStorage.setItem('user', JSON.stringify({ _id: 'user' }));
  localStorage.setItem('activePage', 'Profile');
  client = axios.create();
  uninstall = installSessionInterceptor(client, api);
});
afterEach(() => uninstall());
const reject = async (status, url = `${api}/users/profile`, token = 'current-session') => {
  client.defaults.adapter = config => Promise.reject({ config, response: { status } });
  await expect(client.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).rejects.toBeDefined();
};
it('clears a rejected session and notifies once across multiple failed requests', async () => {
  const listener = jest.fn();
  const unsubscribe = subscribeToSessionExpiry(listener);
  try {
    await Promise.all([reject(401), reject(401)]);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('activePage')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  } finally { unsubscribe(); }
});
it.each([403, 429, 500, 503])('keeps the session for HTTP %s', async status => {
  await reject(status);
  expect(localStorage.getItem('token')).toBe('current-session');
});
it('keeps the session for network failures', async () => {
  client.defaults.adapter = config => Promise.reject({ config, message: 'Network unavailable' });
  await expect(client.get(`${api}/events`)).rejects.toBeDefined();
  expect(localStorage.getItem('token')).toBe('current-session');
});
it('does not expire a new login because an older request failed', async () => {
  localStorage.setItem('token', 'new-session');
  await reject(401);
  expect(localStorage.getItem('token')).toBe('new-session');
});
it('ignores external APIs, similar path prefixes, and failed login attempts', async () => {
  await reject(401, 'https://other.example.com/api/users');
  await reject(401, 'https://api.example.com/api-other/users');
  await reject(401, `${api}/auth/login`, null);
  expect(localStorage.getItem('token')).toBe('current-session');
});
it('reads expiry precisely without treating opaque tokens as verified JWTs', () => {
  const expiry = Math.floor(Date.now() / 1000) + 60;
  expect(sessionExpiresAt(tokenWithExpiry(expiry))).toBe(expiry * 1000);
  expect(isSessionExpired(tokenWithExpiry(expiry))).toBe(false);
  expect(isSessionExpired(tokenWithExpiry(1))).toBe(true);
  expect(sessionExpiresAt('malformed')).toBeNull();
  expect(expireSession('unrelated-token')).toBe(false);
});
