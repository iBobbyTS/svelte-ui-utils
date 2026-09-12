import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import SegmentedDateInput from '../src/lib/segmented-date/SegmentedDateInput.svelte';

const props = { name: 'dob', ariaLabel: 'Birthday', yearLabel: 'Year', monthLabel: 'Month', dayLabel: 'Day' };

it('keeps partial input, normalizes digits, pads on blur and submits the combined date', async () => {
  const onvalueinput = vi.fn();
  const { container } = render(SegmentedDateInput, { ...props, onvalueinput });
  await fireEvent.input(screen.getByLabelText('Year'), { target: { value: '２０００' } });
  await fireEvent.input(screen.getByLabelText('Month'), { target: { value: '2' } });
  expect(screen.getByLabelText('Month')).toHaveValue('2');
  await fireEvent.blur(screen.getByLabelText('Month'));
  expect(screen.getByLabelText('Month')).toHaveValue('02');
  await fireEvent.input(screen.getByLabelText('Day'), { target: { value: '9' } });
  expect(container.querySelector('input[type=hidden]')).toHaveValue('2000-02-09');
  expect(onvalueinput).toHaveBeenLastCalledWith('2000-02-09');
});

it('pastes a full date into any segment and submits individual birthday fields', async () => {
  const { container } = render(SegmentedDateInput, { ...props, submitParts: true, autocomplete: 'bday' });
  await fireEvent.paste(screen.getByLabelText('Month'), { clipboardData: { getData: () => '２００１/３/４' } });
  expect(screen.getByLabelText('Year')).toHaveValue('2001');
  expect(screen.getByLabelText('Month')).toHaveValue('03');
  expect(screen.getByLabelText('Day')).toHaveValue('04');
  expect(container.querySelector('input[type=hidden]')).toBeNull();
  for (const part of ['Year', 'Month', 'Day']) {
    expect(screen.getByLabelText(part)).toHaveAttribute('name', `dob${part}`);
    expect(screen.getByLabelText(part)).toHaveAttribute('autocomplete', `bday-${part.toLowerCase()}`);
  }
});

it('supports month-only values and externally controlled updates without a day field', async () => {
  const { rerender } = render(SegmentedDateInput, { ...props, precision: 'month', value: '06' });
  expect(screen.getByLabelText('Year')).toHaveValue('');
  expect(screen.getByLabelText('Month')).toHaveValue('06');
  expect(screen.queryByLabelText('Day')).toBeNull();
  await rerender({ ...props, precision: 'month', value: '2026' });
  expect(screen.getByLabelText('Year')).toHaveValue('2026');
  expect(screen.getByLabelText('Month')).toHaveValue('');
});

it('forwards field constraints, custom styling and disabled submission state', () => {
  const { container } = render(SegmentedDateInput, { ...props, precision: 'year', id: 'birth-year', required: true, readonly: true, disabled: true, inputClass: 'consumer-input' });
  const year = screen.getByLabelText('Year');
  expect(year).toBeDisabled();
  expect(year).toBeRequired();
  expect(year).toHaveAttribute('readonly');
  expect(year).toHaveAttribute('id', 'birth-year');
  expect(year).toHaveClass('consumer-input');
  expect(year).not.toHaveClass('suu-segmented-date__input--default');
  expect(container.querySelector('input[type=hidden]')).toBeDisabled();
  expect(screen.queryByLabelText('Month')).toBeNull();
});
