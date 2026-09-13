import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmDialog,
  CsvUploadDialog,
  Dialog,
  ImagePreviewDialog,
  InputDialog,
  PasswordCopyDialog,
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

    const dialog = await screen.findByRole('dialog', { name: 'Edit item' });
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

    const dialog = await screen.findByRole('dialog', { name: 'Keyboard dialog' });
    await fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores Escape when closeOnEscape is disabled', async () => {
    const onClose = vi.fn();

    render(Dialog, {
      props: {
        open: true,
        title: 'Keyboard dialog',
        closeOnEscape: false,
        onClose,
      },
    });

    const dialog = await screen.findByRole('dialog', { name: 'Keyboard dialog' });
    await fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores dismiss requests when not dismissible', async () => {
    const onClose = vi.fn();

    render(Dialog, {
      props: {
        open: true,
        title: 'Locked dialog',
        dismissible: false,
        onClose,
      },
    });

    expect(
      screen.queryByRole('button', { name: 'Close dialog' }),
    ).not.toBeInTheDocument();

    await fireEvent.mouseDown(document.querySelector('.suu-dialog-backdrop')!);

    const dialog = await screen.findByRole('dialog', { name: 'Locked dialog' });
    await fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks to close from the backdrop but not from the panel', async () => {
    const onClose = vi.fn();

    render(Dialog, {
      props: {
        open: true,
        title: 'Backdrop dialog',
        onClose,
      },
    });

    const dialog = await screen.findByRole('dialog', { name: 'Backdrop dialog' });
    const backdrop = document.querySelector('.suu-dialog-backdrop')!;
    await fireEvent.mouseDown(backdrop);

    expect(onClose).toHaveBeenCalledOnce();

    await fireEvent.mouseDown(dialog.querySelector('.suu-dialog')!);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('can render without dimming or blurring the backdrop', async () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Plain backdrop',
        dimBackdrop: false,
        blurBackdrop: false,
      },
    });

    await screen.findByRole('dialog', { name: 'Plain backdrop' });
    const backdrop = document.querySelector('.suu-dialog-backdrop')!;
    expect(backdrop).toHaveAttribute('data-dimmed', 'false');
    expect(backdrop).toHaveAttribute('data-blurred', 'false');
  });

  it('renders a top countdown bar when requested', async () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Timed dialog',
        showCountdown: true,
        countdownDurationMs: 30000,
        countdownLabel: 'Auto close countdown',
      },
    });

    const countdown = await screen.findByRole('timer', {
      name: 'Auto close countdown',
    });
    expect(countdown).toHaveClass('suu-dialog__countdown');
    expect(countdown).toHaveAttribute(
      'style',
      '--suu-dialog-countdown-duration: 30000ms;',
    );
  });

  it('applies custom padding to the dialog sections', async () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Custom spacing',
        padding: '8px 12px 16px 20px',
      },
    });

    const dialog = await screen.findByRole('dialog', {
      name: 'Custom spacing',
    });
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style'),
    ).toContain('--suu-dialog-padding: 8px 12px 16px 20px;');
  });

  it('keeps the existing section defaults when padding is omitted', async () => {
    render(Dialog, { props: { open: true, title: 'Default spacing' } });

    const dialog = await screen.findByRole('dialog', {
      name: 'Default spacing',
    });
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style') ?? '',
    ).not.toContain('--suu-dialog-padding');
  });

  it('restores focus to the latest element matching the selector', async () => {
    const originalTrigger = document.createElement('button');
    originalTrigger.id = 'edit-trigger';
    document.body.append(originalTrigger);
    originalTrigger.focus();

    const { rerender } = render(Dialog, {
      props: {
        open: true,
        title: 'Edit item',
        restoreFocusSelector: '#edit-trigger',
      },
    });
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());

    const replacementTrigger = document.createElement('button');
    replacementTrigger.id = 'edit-trigger';
    originalTrigger.replaceWith(replacementTrigger);
    await rerender({
      open: false,
      title: 'Edit item',
      restoreFocusSelector: '#edit-trigger',
    });

    await waitFor(() => expect(replacementTrigger).toHaveFocus());
  });
});

describe('confirm dialog', () => {
  it('renders the message only in the dialog body', async () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Check out',
        message: '14 seconds remaining.',
      },
    });

    await screen.findByRole('dialog', { name: 'Check out' });

    expect(screen.getAllByText('14 seconds remaining.')).toHaveLength(1);
  });

  it('forwards custom padding to the base dialog', async () => {
    render(ConfirmDialog, {
      props: { open: true, message: 'Spacing', padding: '4px 10px' },
    });

    const dialog = await screen.findByRole('dialog');
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style'),
    ).toContain('--suu-dialog-padding: 4px 10px;');
  });

  it('forwards the focus restoration selector to the base dialog', async () => {
    const trigger = document.createElement('button');
    trigger.id = 'confirm-trigger';
    document.body.append(trigger);
    trigger.focus();

    const { rerender } = render(ConfirmDialog, {
      props: {
        open: true,
        message: 'Confirm action',
        restoreFocusSelector: '#confirm-trigger',
      },
    });
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await rerender({
      open: false,
      message: 'Confirm action',
      restoreFocusSelector: '#confirm-trigger',
    });

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the parent dialog open while the nested confirm handles Escape', async () => {
    const parentClose = vi.fn();
    const childClose = vi.fn();

    render(Dialog, {
      props: {
        open: true,
        title: 'Parent settings',
        closeLabel: 'Close parent',
        onClose: parentClose,
      },
    });

    const { rerender } = render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Discard changes?',
        message: 'Unsaved edits will be lost.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        closeLabel: 'Close confirm',
        onClose: childClose,
      },
    });

    const parentDialog = await screen.findByRole('dialog', {
      name: 'Parent settings',
    });
    const childDialog = await screen.findByRole('dialog', {
      name: 'Discard changes?',
    });

    await fireEvent(childDialog, new Event('cancel', { cancelable: true }));

    expect(childClose).toHaveBeenCalledOnce();
    expect(parentClose).not.toHaveBeenCalled();
    expect(parentDialog).toBeInTheDocument();
    expect(childDialog).toBeInTheDocument();

    const childBackdrop = childDialog.querySelector('.suu-dialog-backdrop')!;
    await fireEvent.mouseDown(childBackdrop);

    expect(childClose).toHaveBeenCalledTimes(2);
    expect(parentClose).not.toHaveBeenCalled();

    await rerender({
      open: false,
      title: 'Discard changes?',
      message: 'Unsaved edits will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      closeLabel: 'Close confirm',
      onClose: childClose,
    });

    expect(
      screen.queryByRole('dialog', { name: 'Discard changes?' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Parent settings' }),
    ).toBeInTheDocument();
    expect(parentClose).not.toHaveBeenCalled();
  });

  it('traps Tab inside the topmost dialog and skips the parent dialog', async () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Parent settings',
        closeLabel: 'Close parent',
      },
    });

    render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Discard changes?',
        message: 'Unsaved edits will be lost.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        closeLabel: 'Close confirm',
      },
    });

    const childDialog = await screen.findByRole('dialog', {
      name: 'Discard changes?',
    });
    await waitFor(() => expect(childDialog).toHaveFocus());

    const childClose = screen.getByRole('button', { name: 'Close confirm' });
    const discard = screen.getByRole('button', { name: 'Discard' });

    discard.focus();
    await fireEvent.keyDown(discard, { key: 'Tab' });
    expect(childClose).toHaveFocus();

    await fireEvent.keyDown(childClose, { key: 'Tab', shiftKey: true });
    expect(discard).toHaveFocus();

    const parentClose = screen.getByRole('button', { name: 'Close parent' });
    parentClose.focus();
    await fireEvent.keyDown(parentClose, { key: 'Tab' });
    expect(parentClose).toHaveFocus();
  });

  it('restores focus into the parent dialog when the nested confirm closes', async () => {
    render(Dialog, {
      props: {
        open: true,
        title: 'Parent settings',
        closeLabel: 'Close parent',
      },
    });

    const parentClose = await screen.findByRole('button', {
      name: 'Close parent',
    });
    parentClose.focus();

    const { rerender } = render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Discard changes?',
        message: 'Unsaved edits will be lost.',
      },
    });

    const childDialog = await screen.findByRole('dialog', {
      name: 'Discard changes?',
    });
    await waitFor(() => expect(childDialog).toHaveFocus());

    await rerender({
      open: false,
      title: 'Discard changes?',
      message: 'Unsaved edits will be lost.',
    });

    await waitFor(() => expect(parentClose).toHaveFocus());
  });

  it('forwards custom padding through the CSV upload wrapper', async () => {
    render(CsvUploadDialog, { props: { open: true, padding: '6px 10px' } });
    const dialog = await screen.findByRole('dialog');
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style'),
    ).toContain('--suu-dialog-padding: 6px 10px;');
  });

  it('forwards custom padding through the image preview wrapper', async () => {
    render(ImagePreviewDialog, { props: { open: true, padding: '6px 10px' } });
    const dialog = await screen.findByRole('dialog');
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style'),
    ).toContain('--suu-dialog-padding: 6px 10px;');
  });

  it('forwards custom padding through the input wrapper', async () => {
    render(InputDialog, { props: { open: true, padding: '6px 10px' } });
    const dialog = await screen.findByRole('dialog');
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style'),
    ).toContain('--suu-dialog-padding: 6px 10px;');
  });

  it('forwards custom padding through the password copy wrapper', async () => {
    render(PasswordCopyDialog, { props: { open: true, padding: '6px 10px' } });
    const dialog = await screen.findByRole('dialog');
    expect(
      dialog.querySelector('.suu-dialog')?.getAttribute('style'),
    ).toContain('--suu-dialog-padding: 6px 10px;');
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

    const input = await screen.findByLabelText('Name');
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

    expect(
      await screen.findByRole('button', { name: 'Import' }),
    ).toBeDisabled();
    expect(onUpload).not.toHaveBeenCalled();
  });
});

describe('image preview dialog', () => {
  it('renders preview image', async () => {
    render(ImagePreviewDialog, {
      props: {
        open: true,
        title: 'Preview',
        imageUrl: '/sample.png',
        fileName: 'sample.png',
      },
    });

    expect(
      await screen.findByRole('img', { name: 'sample.png' }),
    ).toHaveAttribute('src', '/sample.png');
  });
});

describe('password copy dialog', () => {
  it('renders a monospace value and copies it to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(PasswordCopyDialog, {
      props: {
        open: true,
        title: 'Temporary password',
        message: 'Save this value now.',
        value: 'Abc123xy',
        valueLabel: 'Password',
        copyLabel: 'Copy password',
        copiedLabel: 'Copied',
      },
    });

    expect(
      await screen.findByRole('dialog', { name: 'Temporary password' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Save this value now.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password').querySelector('code')).toHaveTextContent('Abc123xy');

    await fireEvent.click(screen.getByRole('button', { name: 'Copy password' }));

    expect(writeText).toHaveBeenCalledWith('Abc123xy');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
