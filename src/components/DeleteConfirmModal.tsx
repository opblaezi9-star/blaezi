import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  itemName?: string;
  warningNote?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  confirmText?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message = 'Are you sure you want to delete this record? This action will remove it from the system.',
  itemName,
  warningNote,
  onConfirm,
  onCancel,
  confirmText = 'Delete Record',
  isDeleting: externalIsDeleting,
}) => {
  const [internalDeleting, setInternalDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDeleting = externalIsDeleting ?? internalDeleting;

  const handleConfirm = async () => {
    try {
      setError(null);
      setInternalDeleting(true);
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete record.');
      setInternalDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in zoom-in-95"
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0 border border-rose-100">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {itemName && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50/70 border border-rose-100 rounded-lg px-2.5 py-1 mt-2 inline-block max-w-full truncate">
                {itemName}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          {message}
        </p>

        {warningNote && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="leading-snug">{warningNote}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs mb-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
