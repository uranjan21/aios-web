import React, { useState, ReactElement, cloneElement } from 'react';
import { ConfirmDialog } from '@ledgr/ui';

export interface PopconfirmProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  onConfirm: (e?: any) => void | Promise<void>;
  children: ReactElement;
  okText?: string;
  cancelText?: string;
  okButtonProps?: { danger?: boolean; [key: string]: any };
}

export function Popconfirm({
  title,
  description,
  onConfirm,
  children,
  okText = 'Confirm',
  cancelText = 'Cancel',
  okButtonProps,
}: PopconfirmProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const trigger = cloneElement(children, {
    onClick: (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      setOpen(true);
      if (children.props.onClick) {
        children.props.onClick(e);
      }
    },
  });

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      {trigger}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        onConfirm={handleConfirm}
        confirmLabel={okText}
        cancelLabel={cancelText}
        destructive={okButtonProps?.danger}
        loading={loading}
      />
    </>
  );
}
