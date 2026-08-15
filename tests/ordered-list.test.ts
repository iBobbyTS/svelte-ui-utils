import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';
import OrderedListEditorHarness from './fixtures/OrderedListEditorHarness.svelte';

it('renders a right-aligned trash icon without move arrows', async () => {
  const { container } = render(OrderedListEditorHarness);

  expect(container.querySelectorAll('button.ordered-list-up, button.ordered-list-down')).toHaveLength(0);
  expect(container.querySelectorAll('.suu-ordered-list-editor__remove')).toHaveLength(2);
  expect(container.querySelectorAll('.suu-ordered-list-editor__remove svg')).toHaveLength(2);
  await fireEvent.click(screen.getByRole('button', { name: 'Remove second' }));
  expect(container.querySelector('[data-removed]')).toHaveTextContent('second');
});
