import { useEffect } from 'react';

// Reusable confirmation modal (custom — never window.confirm).
// Blurred overlay; X button or outside-click or Escape cancels.
function CautionIcon({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      stroke="#B45309"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5 22 20H2L12 3.5Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="16.8" r="0.6" fill="#B45309" stroke="none" />
    </svg>
  );
}

function CloseIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export default function ConfirmModal({
  open,
  title,
  description,
  yesLabel,
  cancelLabel,
  onYes,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(32, 28, 43, 0.5)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 pt-12 text-center"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label={cancelLabel}
          title={cancelLabel}
          className="absolute top-2 right-2 inline-flex items-center justify-center text-ac-muted"
          style={{ width: '48px', height: '48px' }}
        >
          <CloseIcon size={20} />
        </button>
        <div className="flex justify-center" aria-hidden="true">
          <CautionIcon size={48} />
        </div>
        <h2
          className="mt-3 font-bold text-ink break-words"
          style={{ fontSize: '20px', lineHeight: 1.3 }}
        >
          {title}
        </h2>
        <p className="mt-2 text-ac-muted" style={{ fontSize: '16px' }}>
          {description}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onYes}
            className="btn-ac w-full bg-white text-accent border-2 border-accent rounded-full"
          >
            {yesLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="btn-ac w-full bg-primary text-white rounded-full border-0"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
