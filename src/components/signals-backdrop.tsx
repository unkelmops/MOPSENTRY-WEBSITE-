// Decorative 3D scene (CSS transforms only, cheap on phones) behind Signals.
export function SignalsBackdrop() {
  return (
    <div aria-hidden className="mops-scene">
      <div className="mops-grid" />
      <div className="mops-cube mops-cube-a">{[0,1,2,3,4,5].map((i) => <span key={i} className={`f f${i}`} />)}</div>
      <div className="mops-cube mops-cube-b">{[0,1,2,3,4,5].map((i) => <span key={i} className={`f f${i}`} />)}</div>
      <div className="mops-ring3d mops-ring-a" />
      <div className="mops-ring3d mops-ring-b" />
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="mops-particle" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${10 + (i % 5) * 3}s` }} />
      ))}
    </div>
  );
}
