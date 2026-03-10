type ProfileStripProps = {
  accent?: 'amber' | 'blue' | 'cyan' | 'magenta';
  label: string;
  meta?: string | null;
  values: number[];
};

export function ProfileStrip({
  accent = 'blue',
  label,
  meta = null,
  values
}: ProfileStripProps) {
  const peak = values.reduce((largest, value) => Math.max(largest, value), 0);

  if (!values.length || peak <= 0) return null;

  return (
    <div className="profile-strip">
      <div className="profile-strip__header">
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
      </div>
      <div className={`profile-strip__bars profile-strip__bars--${accent}`}>
        {values.map((value, index) => (
          <span
            key={`${label}-${index}`}
            className="profile-strip__bar"
            style={{ height: `${Math.max(10, (value / peak) * 100)}%` }}
            title={`${label} ${index}: ${value.toFixed(3)}`}
          />
        ))}
      </div>
    </div>
  );
}
