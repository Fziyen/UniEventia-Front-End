import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './authContext';
import { expireSession } from './session';
const tokenWithExpiry = exp => `header.${btoa(JSON.stringify({ exp }))}.signature`;
const seed = token => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({ _id: '1', fname: 'Ada' }));
};
function Harness() {
  const auth = useAuth();
  return <>
    <span>{auth.isAuthenticated ? 'Signed in' : 'Guest'}</span>
    {auth.authDialog?.sessionExpired && <p role="alert">Sign in again</p>}
    <button onClick={() => { seed(tokenWithExpiry(Math.floor(Date.now() / 1000) + 3600)); auth.login({ _id: '1', fname: 'Ada' }); auth.closeAuth(); }}>Finish login</button>
  </>;
}
beforeEach(() => localStorage.clear());
afterEach(() => jest.useRealTimers());
it('prompts on startup when the stored session has expired', () => {
  seed(tokenWithExpiry(1));
  render(<AuthProvider><Harness /></AuthProvider>);
  expect(screen.getByText('Guest')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Sign in again');
  expect(localStorage.getItem('token')).toBeNull();
});
it('expires an open session and restores access after a fresh login', () => {
  jest.useFakeTimers();
  seed(tokenWithExpiry(Math.floor(Date.now() / 1000) + 2));
  render(<AuthProvider><Harness /></AuthProvider>);
  expect(screen.getByText('Signed in')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(2100));
  expect(screen.getByText('Guest')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Finish login'));
  expect(screen.getByText('Signed in')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('reacts to server rejection immediately and synchronizes logout from another tab', () => {
  seed('current-session');
  const { unmount } = render(<AuthProvider><Harness /></AuthProvider>);
  act(() => expireSession('current-session'));
  expect(screen.getByText('Guest')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  unmount();
  seed('another-session');
  render(<AuthProvider><Harness /></AuthProvider>);
  act(() => { localStorage.removeItem('token'); window.dispatchEvent(new StorageEvent('storage', { key: 'token' })); });
  expect(screen.getByText('Guest')).toBeInTheDocument();
});
