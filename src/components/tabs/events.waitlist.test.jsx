import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from '../../authContext';
import Events from './events.comp';
jest.mock('axios', () => ({ get: jest.fn(), put: jest.fn(), delete: jest.fn() }));
window.matchMedia = query => ({ matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.getComputedStyle = () => ({ getPropertyValue: () => '', display: 'block', visibility: 'visible', overflow: 'visible' });
const event = { _id: 'event1', title: 'Full workshop', description: 'Workshop details', location: 'Hall', startDate: '2099-01-01', endDate: '2099-01-02', organizer: { _id: 'owner', fname: 'Ada' }, participants: [{ _id: 'other' }], maxParticipants: 1, waitlist: [], language: 'English', cost: 'Free', wheelchairAccess: 'yes', transport: 'Tram 2', whatToBring: 'Notebook' };
let imageComplete;
afterEach(() => imageComplete.mockRestore());
beforeEach(() => {
  imageComplete = jest.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  jest.clearAllMocks(); localStorage.clear();
  localStorage.setItem('token', 'session');
  localStorage.setItem('user', JSON.stringify({ _id: 'visitor', role: 'Participant' }));
  axios.get.mockResolvedValue({ data: [event] });
});
const open = async () => {
  render(<MemoryRouter><AuthProvider><Events /></AuthProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'View Full workshop' }));
};
it('offers a waitlist for full events and submits authenticated registration', async () => {
  await open();
  expect(screen.getByText('Wheelchair accessible')).toBeInTheDocument();
  expect(screen.getByText('Notebook')).toBeInTheDocument();
  axios.put.mockResolvedValue({ data: { status: 'waitlisted', message: 'You joined the waitlist.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Join waitlist' }));
  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(expect.stringMatching(/event1\/participate$/), {}, { headers: { Authorization: 'Bearer session' } }));
});
it('shows queue position and lets a waiting user leave', async () => {
  axios.get.mockResolvedValue({ data: [{ ...event, waitlist: ['first', 'visitor'] }] });
  await open();
  expect(screen.getByRole('status')).toHaveTextContent('position 2');
  axios.delete.mockResolvedValue({ data: {} });
  axios.get.mockResolvedValue({ data: [event] });
  fireEvent.click(screen.getByRole('button', { name: 'Leave waitlist' }));
  await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringMatching(/event1\/waitlist$/), { headers: { Authorization: 'Bearer session' } }));
  expect(await screen.findByRole('button', { name: 'Join waitlist' })).toBeInTheDocument();
});
it('closes registration once the event starts', async () => {
  axios.get.mockResolvedValue({ data: [{ ...event, startDate: '2020-01-01' }] });
  await open();
  expect(screen.getByRole('button', { name: 'Registration closed' })).toBeDisabled();
});
