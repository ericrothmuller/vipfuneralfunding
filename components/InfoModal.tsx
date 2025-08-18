// components/InfoModal.tsx
"use client";

export default function InfoModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
      <div className="modal">
        <div className="modal-header">
          <h3 id="info-modal-title">{title}</h3>
          <button className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p>{children}</p>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}
