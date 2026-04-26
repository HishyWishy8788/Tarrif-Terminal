interface Props {
  icon: JSX.Element;
  title: string;
  subtitle: string;
  pill?: string;
  pillLive?: boolean;
}

export function SectionHeader({ icon, title, subtitle, pill, pillLive }: Props) {
  return (
    <header className="section-header">
      <div className="section-header-icon">{icon}</div>
      <div className="section-header-text">
        <h1>{title}</h1>
        <small>{subtitle}</small>
      </div>
      {pill && (
        <span className={`section-header-pill${pillLive ? " pill-live" : ""}`}>{pill}</span>
      )}
    </header>
  );
}
