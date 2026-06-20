import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmDialog,
  CsvUploadDialog,
  Dialog,
  ImagePreviewDialog,
  InputDialog,
} from '../src/lib/dialog/index.js';

describe('dialog', () => {
  it('renders dialog content and asks to close from the close button', async () => {
    const onClose = vi.fn();

    render(Dialog, {
      props: {
        open: true,
        title: 'Edit item',
        description: 'Change the selected record.',
        closeLabel: 'Close dialog',
        onClose,
      },
    });

    const dialog = screen.getByRole('dialog', { name: 'Edit item' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Change the selected record.')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape when enabled', async () => {
    const onClose = vi.fn();

    render(Dialog, {
      props: {
        open: true,
        title: 'Keyboard dialog',
        onClose,
      },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores Escape while closed', async () => {
    const onClose = vi.fn();

    render(Dialog, {
      props: {
        open: false,
        title: 'Closed dialog',
        onClose,
      },
    });

    await fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('can render without dimming or blurring the backdrop', () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Plain backdrop',
        dimBackdrop: false,
        blurBackdrop: false,
      },
    });

    const backdrop = document.querySelector('.suu-dialog-backdrop');
    expect(backdrop).toHaveAttribute('data-dimmed', 'false');
    expect(backdrop).toHaveAttribute('data-blurred', 'false');
  });

  it('renders a top countdown bar when requested', () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Timed dialog',
        showCountdown: true,
        countdownDurationMs: 30000,
        countdownLabel: 'Auto close countdown',
      },
    });

    const countdown = screen.getByRole('timer', { name: 'Auto close countdown' });
    expect(countdown).toHaveClass('suu-dialog__countdown');
    expect(countdown).toHaveAttribute(
      'style',
      '--suu-dialog-countdown-duration: 30000ms;',
    );
  });
});

describe('confirm dialog', () => {
  it('renders the message only in the dialog body', () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Check out',
        message: '14 seconds remaining.',
      },
    });

    expect(screen.getAllByText('14 seconds remaining.')).toHaveLength(1);
  });

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

describe('input dialog', () => {
  it('submits the entered value', async () => {
    const onConfirm = vi.fn();

    render(InputDialog, {
      props: {
        open: true,
        title: 'Rename',
        inputLabel: 'Name',
        inputValue: 'Old name',
        confirmLabel: 'Save',
        onConfirm,
      },
    });

    const input = screen.getByLabelText('Name');
    await fireEvent.input(input, { target: { value: 'New name' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledWith('New name');
  });
});

describe('csv upload dialog', () => {
  it('requires a file before upload', async () => {
    const onUpload = vi.fn();

    render(CsvUploadDialog, {
      props: {
        open: true,
        title: 'Import users',
        uploadLabel: 'Import',
        onUpload,
      },
    });

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    expect(onUpload).not.toHaveBeenCalled();
  });
});

describe('image preview dialog', () => {
  it('renders preview image', () => {
    render(ImagePreviewDialog, {
      props: {
        open: true,
        title: 'Preview',
        imageUrl: '/sample.png',
        fileName: 'sample.png',
      },
    });

    expect(screen.getByRole('img', { name: 'sample.png' })).toHaveAttribute(
      'src',
      '/sample.png',
    );
  });
});
