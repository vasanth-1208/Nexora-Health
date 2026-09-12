import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-5">
        <div className="flex items-start space-x-3">
          <div className={`p-2.5 rounded-xl ${isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">{message}</p>
        </div>

        <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition disabled:opacity-50 ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-healthcare-600 hover:bg-healthcare-700'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
