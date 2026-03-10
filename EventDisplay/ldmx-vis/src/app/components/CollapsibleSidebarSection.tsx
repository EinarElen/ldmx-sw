import { useState, type ReactNode } from 'react';

type CollapsibleSidebarSectionProps = {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  title: string;
};

export function CollapsibleSidebarSection({
  children,
  className = '',
  defaultOpen = false,
  title
}: CollapsibleSidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`sidebar-section sidebar-section--collapsible${open ? ' sidebar-section--open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        aria-expanded={open}
        className="sidebar-section__toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="sidebar-section__header">{title}</span>
        <span className="sidebar-section__toggle-icon">{open ? '−' : '+'}</span>
      </button>
      {open ? children : null}
    </section>
  );
}
