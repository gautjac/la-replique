import { useEffect, type ReactNode } from "react";

export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const pad = props.size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <div className="inline-flex rounded-full bg-desk-light p-0.5 ring-1 ring-desk-rule">
      {props.options.map((o) => {
        const active = o.value === props.value;
        return (
          <button
            key={o.value}
            onClick={() => props.onChange(o.value)}
            className={`${pad} rounded-full font-medium transition-colors ${
              active ? "bg-gel text-white shadow-gel" : "text-ink-faint hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal(props: { onClose: () => void; children: ReactNode; wide?: boolean; label?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={props.label}
    >
      <div
        className={`rise my-auto w-full ${
          props.wide ? "max-w-3xl" : "max-w-lg"
        } rounded-2xl bg-desk-light ring-1 ring-desk-rule shadow-lift`}
      >
        {props.children}
      </div>
    </div>
  );
}

export function Drawer(props: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div className="no-print fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={props.title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={props.onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-desk-light shadow-lift ring-1 ring-desk-rule">
        <header className="flex items-center justify-between border-b border-desk-rule px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-white">{props.title}</h2>
          <button
            onClick={props.onClose}
            className="rounded-full p-1.5 text-ink-faint transition hover:bg-desk-rule hover:text-white"
            aria-label="close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="thin-scroll flex-1 overflow-y-auto p-5">{props.children}</div>
      </aside>
    </div>
  );
}

export function GhostDots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-gel-bright animate-ghostlight" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-gel-bright animate-ghostlight" style={{ animationDelay: "180ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-gel-bright animate-ghostlight" style={{ animationDelay: "360ms" }} />
    </span>
  );
}
