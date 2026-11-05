import { useId, useRef, useState, useEffect } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { today } from '../lib/billing.js';
import './CalendarInput.css';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = number => String(number).padStart(2, '0');
const monthValue = (year, month) => `${String(year).padStart(4, '0')}-${pad(month + 1)}`;
const dateLabel = (value, monthOnly) => value ? new Date(value + (monthOnly ? '-01' : '') + 'T12:00:00').toLocaleDateString('en-PH', { month: 'long', ...(monthOnly ? {} : { day: 'numeric' }), year: 'numeric' }) : '';

// Keeps a real date/month input for form validation, keyboard entry and ISO values.
// Other field types pass through unchanged for forms that render mapped fields.
export default function CalendarInput({ type = 'date', label, ...props }) {
  return type === 'date' || type === 'month' ? <Picker type={type} label={label} {...props}/> : <input type={type} {...props}/>;
}

function Picker({ type, value = '', onChange, className = '', label, ...props }) {
  const id = useId();
  const input = useRef(null), panel = useRef(null), root = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value || today()).slice(0, 7));
  const monthOnly = type === 'month';
  const [year, month] = view.split('-').map(Number);
  const current = today(), currentValue = monthOnly ? current.slice(0, 7) : current;
  const minimum = props.min || (monthOnly ? '0001-01' : '0001-01-01');
  const maximum = props.max || (monthOnly ? '9999-12' : '9999-12-31');
  const allowed = candidate => candidate >= minimum && candidate <= maximum;
  const close = (restoreFocus = false) => {
    panel.current?.hidePopover();
    setOpen(false);
    if (restoreFocus) input.current?.focus({ preventScroll: true });
  };
  const show = () => {
    if (input.current.matches(':disabled') || props.readOnly) return;
    if (open) { close(); return; }
    const initial = value || (currentValue < minimum ? minimum : currentValue > maximum ? maximum : currentValue);
    setView(initial.slice(0, 7));
    panel.current.showPopover();
    const rect = root.current.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    Object.assign(panel.current.style, { width: `${width}px`, maxHeight: `${window.innerHeight - 24}px`, left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px` });
    const height = panel.current.getBoundingClientRect().height;
    panel.current.style.top = `${Math.max(12, rect.bottom + height + 8 < window.innerHeight ? rect.bottom + 8 : rect.top - height - 8)}px`;
    setOpen(true);
    requestAnimationFrame(() => panel.current?.querySelector('[aria-pressed="true"]:not(:disabled), button:not(:disabled)')?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!root.current?.contains(event.target)) { panel.current?.hidePopover(); setOpen(false); }
    };
    const reposition = event => { if (!panel.current?.contains(event.target)) { panel.current?.hidePopover(); setOpen(false); } };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); document.removeEventListener('scroll', reposition, true); };
  }, [open]);
  const choose = candidate => {
    if (!allowed(candidate) || input.current.matches(':disabled') || props.readOnly) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input.current, candidate);
    input.current.dispatchEvent(new Event('input', { bubbles: true }));
    close(true);
  };
  const shift = direction => {
    const date = new Date(`${view}-01T12:00:00`);
    if (monthOnly) date.setFullYear(year + direction); else date.setMonth(month - 1 + direction);
    setView(monthValue(date.getFullYear(), date.getMonth()));
  };
  const range = direction => {
    const date = new Date(`${view}-01T12:00:00`);
    if (monthOnly) date.setFullYear(year + direction); else date.setMonth(month - 1 + direction);
    const first = monthOnly ? `${date.getFullYear()}-01` : monthValue(date.getFullYear(), date.getMonth()) + '-01';
    const last = monthOnly ? `${date.getFullYear()}-12` : monthValue(date.getFullYear(), date.getMonth()) + '-31';
    return date.getFullYear() >= 1 && date.getFullYear() <= 9999 && first <= maximum && last >= minimum;
  };
  const days = new Date(`${view}-01T12:00:00`).getDay();
  const lastDay = new Date(`${view}-01T12:00:00`);
  lastDay.setMonth(month, 0);
  const count = lastDay.getDate();
  const spacing = className.split(/\s+/).filter(name => /^(?:[\w]+:)?(?:m[trblxy]?-|w-|min-w-|max-w-)/.test(name)).join(' ');
  const accessibleLabel = props['aria-label'] || label;
  const escape = event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); } };
  return <span ref={root} className={`calendar-field ${spacing}`} onKeyDown={escape} onBlur={event => { if (open && !root.current?.contains(event.relatedTarget)) close(); }}>
    <span aria-hidden="true" className={`calendar-trigger ${open ? 'is-open' : ''}`}>
      <span className="calendar-icon"><CalendarDays size={17}/></span>
      <span className="calendar-caption"><span className={value ? 'calendar-value' : 'calendar-placeholder'}>{dateLabel(value, monthOnly) || (monthOnly ? 'Select month' : 'Select date')}</span><span className="calendar-hint">{props.readOnly ? 'Calculated automatically' : monthOnly ? 'Choose month' : 'Choose date'}</span></span>
      {!props.readOnly && <ChevronDown size={16} className="calendar-chevron"/>}
    </span>
    <input {...props} ref={input} type={type} value={value} aria-label={accessibleLabel} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onChange={onChange} className="calendar-native" onClick={event => { event.preventDefault(); show(); }} onKeyDown={event => { escape(event); if ([' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); show(); } }}/>
    <span ref={panel} id={id} popover="manual" role="dialog" aria-label={monthOnly ? 'Choose month' : 'Choose date'} className="calendar-panel" onMouseDown={event => event.stopPropagation()} onKeyDown={escape}>
      <span className="calendar-heading"><button type="button" aria-label={monthOnly ? 'Previous year' : 'Previous month'} disabled={!range(-1)} onClick={() => shift(-1)}><ChevronLeft size={17}/></button><span><strong>{monthOnly ? year : dateLabel(view, true)}</strong><small>{monthOnly ? 'Choose month' : 'Choose date'}</small></span><button type="button" aria-label={monthOnly ? 'Next year' : 'Next month'} disabled={!range(1)} onClick={() => shift(1)}><ChevronRight size={17}/></button></span>
      <span className={monthOnly ? 'calendar-months' : 'calendar-days'}>
        {monthOnly ? months.map((name, index) => { const candidate = monthValue(year, index); return <button type="button" key={name} disabled={!allowed(candidate)} aria-pressed={value === candidate} className={candidate === currentValue ? 'is-today' : ''} onClick={() => choose(candidate)}>{name}</button>; }) : <>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(name => <span key={name} className="calendar-weekday" aria-hidden="true">{name}</span>)}
          {Array.from({ length: days }, (_, index) => <span key={`blank-${index}`}/>)}
          {Array.from({ length: count }, (_, index) => { const candidate = `${view}-${pad(index + 1)}`; return <button type="button" key={candidate} aria-label={dateLabel(candidate, false)} aria-pressed={value === candidate} disabled={!allowed(candidate)} className={candidate === current ? 'is-today' : ''} onClick={() => choose(candidate)}>{index + 1}</button>; })}
        </>}
      </span>
      <span className="calendar-footer">{!props.required && !monthOnly && <button type="button" onClick={() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input.current, ''); input.current.dispatchEvent(new Event('input', { bubbles: true })); close(true); }}>Clear</button>}<button type="button" disabled={!allowed(currentValue)} onClick={() => choose(currentValue)}><CalendarDays size={13}/>{monthOnly ? 'This month' : 'Today'}</button></span>
    </span>
  </span>;
}
