import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const statuses = ["Paid", "Pending", "Late"];
const colors = {
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Late: "bg-rose-50 text-rose-700",
};

export default function PaymentStatusSelect({ value, name, onChange }) {
  const [position, setPosition] = useState(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();

  const close = () => {
    setPosition(null);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector('[aria-checked="true"]')?.focus();
    const dismiss = (event) => {
      if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) {
        setPosition(null);
      }
    };
    const reposition = () => setPosition(null);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [position]);

  const open = () => {
    const rect = trigger.current.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 192)),
      top: rect.bottom + 184 > window.innerHeight ? Math.max(8, rect.top - 180) : rect.bottom + 6,
    });
  };

  return <>
    <button ref={trigger} type="button" aria-label={`Payment status for ${name}: ${value}`}
      aria-haspopup="menu" aria-expanded={Boolean(position)} aria-controls={position ? id : undefined}
      onClick={() => position ? close() : open()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); open(); }
      }}
      className={`inline-flex min-h-11 w-32 items-center gap-2 rounded-xl border border-current/15 px-3 py-2 text-sm font-semibold transition-colors hover:brightness-95 ${colors[value]}`}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {value}<ChevronDown aria-hidden="true" size={16} className={`ml-auto transition-transform ${position ? "rotate-180" : ""}`} />
    </button>
    {position && createPortal(
      <div ref={menu} id={id} role="menu" aria-label={`Payment status for ${name}`}
        style={position} className="fixed z-[90] w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        onKeyDown={(event) => {
          const options = [...menu.current.querySelectorAll('[role="menuitemradio"]')];
          const index = options.indexOf(document.activeElement);
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
            options[next].focus();
          }
          if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); close(); }
        }}>
        {statuses.map(status => <button key={status} type="button" role="menuitemradio" aria-checked={status === value}
          onClick={() => { onChange(status); close(); }}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${status === value ? colors[status] : "text-slate-700 hover:bg-slate-50"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status === "Paid" ? "bg-emerald-600" : status === "Pending" ? "bg-amber-600" : "bg-rose-600"}`} />
          {status}{status === value && <Check size={16} aria-hidden="true" className="ml-auto" />}
        </button>)}
      </div>, document.body
    )}
  </>;
}
