import React from 'react';
import { render, screen } from '@testing-library/react';
import EventPracticalDetails from './eventPracticalDetails.comp';

it('omits the entire optional section for missing or blank values', () => {
  const { container } = render(<EventPracticalDetails event={{ language: '  ', transport: '', wheelchairAccess: 'unknown' }} />);
  expect(container).toBeEmptyDOMElement();
});
it('only displays supplied facts with descriptive labels', () => {
  render(<EventPracticalDetails event={{ cost: 'Free', whatToBring: 'Laptop', wheelchairAccess: 'unknown' }} />);
  expect(screen.getByText('Cost')).toBeInTheDocument();
  expect(screen.getByText('Free')).toBeInTheDocument();
  expect(screen.getByText('Laptop')).toBeInTheDocument();
  expect(screen.queryByText('Language')).not.toBeInTheDocument();
  expect(screen.queryByText('Wheelchair access')).not.toBeInTheDocument();
  expect(screen.queryByText('Transport')).not.toBeInTheDocument();
  expect(screen.queryByText('Not specified')).not.toBeInTheDocument();
});
it('shows an explicitly stated lack of wheelchair access', () => {
  render(<EventPracticalDetails event={{ wheelchairAccess: 'no' }} />);
  expect(screen.getByText('Not wheelchair accessible')).toBeInTheDocument();
});
