interface LoaderOverlayProps {
  show: boolean;
  label: string;
}

export function LoaderOverlay({ show, label }: LoaderOverlayProps) {
  if (!show) return null;
  return (
    <div className="loader-overlay" role="status" aria-busy="true" aria-live="polite">
      <div className="loader-card">
        <div className="loader-ring" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
    </div>
  );
}
