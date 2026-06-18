import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, Modal } from '../src/lib/modal/index.js';

describe('modal', () => {
  it('renders dialog content and asks to close from the close button', async () => {
    const onClose = vi.fn();

    render(Modal, {
      props: {
        open: true,
        title: 'Edit item',
        description: 'Change the selected record.',
        closeLabel: 'Close modal',
        onClose,
      },
    });

    const dialog = screen.getByRole('dialog', { name: 'Edit item' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Change the selected record.')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape when enabled', async () => {
    const onClose = vi.fn();

    render(Modal, {
      props: {
        open: true,
        title: 'Keyboard modal',
        onClose,
      },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('confirm dialog', () => {
  it('emits confirm and cancel actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Delete file',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Keep',
        intent: 'danger',
        onConfirm,
        onCancel,
        onClose,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();

    await rerender({
      open: true,
      title: 'Delete file',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      intent: 'danger',
      onConfirm,
      onCancel,
      onClose,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
