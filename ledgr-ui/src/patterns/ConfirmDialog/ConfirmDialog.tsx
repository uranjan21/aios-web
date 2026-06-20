import type { ReactNode } from 'react';
import { Dialog, DialogFooter } from '../../interactive/Dialog/Dialog';
import { Button } from '../../primitives/Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** Use destructive styling on the confirm button. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Show loading spinner on confirm button while async. */
  loading?: boolean;
}

/**
 * Replacement for window.confirm — themed, focus-trapped, keyboard-accessible.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      hideCloseButton
    >
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          onClick={async () => {
            await onConfirm();
            onOpenChange(false);
          }}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
