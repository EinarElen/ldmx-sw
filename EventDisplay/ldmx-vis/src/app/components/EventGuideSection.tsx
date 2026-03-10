type EventGuideSectionProps = {
  lines: string[];
};

export function EventGuideSection({ lines }: EventGuideSectionProps) {
  if (!lines.length) return null;

  return (
    <section className="sidebar-section">
      <header className="sidebar-section__header">event brief</header>
      <div className="inspector__log">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`} className="inspector-line inspector-line--info">
            <span className="inspector-line__icon">·</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
