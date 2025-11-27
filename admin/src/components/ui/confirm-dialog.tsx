import React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from './dialog';
import { Button } from './button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} closeOnBackdropClick={!isLoading}>
      <DialogHeader onClose={isLoading ? undefined : onClose}>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <DialogDescription>{description}</DialogDescription>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={isDestructive ? 'destructive' : 'default'}
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
