import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { today } from '../lib/billing.js';
import './ReportMonthPicker.css';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthValue = (year, index) => `${year}-${String(index + 1).padStart(2, '0')}`;

export default function ReportMonthPicker({ value, months: available = [], onChange, label }) {
  const id = useId(), root = useRef(null), panel = useRef(null), trigger = useRef(null);
  const [open, setOpen] = useState(false);
  const [shownYear, setShownYear] = useState(Number(value.slice(0, 4)));
  const years = [...new Set(available.map(month => Number(month.slice(0, 4))))].sort((a,b) => a-b);
  const previous = years.filter(year => year < shownYear).at(-1), next = years.find(year => year > shownYear);
  const current = today().slice(0,7);
  const monthLabel = available.length ? new Date(value + '-01T12:00:00').toLocaleDateString('en-PH', { month:'long', year:'numeric' }) : 'No reporting data';
  const close = (restore = false) => {
    panel.current?.hidePopover();
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll:true });
  };
  const toggle = () => {
    if (open) { close(); return; }
    setShownYear(Number(value.slice(0,4)));
    panel.current.showPopover();
    const bounds = trigger.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    panel.current.style.width = `${width}px`;
    const height = panel.current.getBoundingClientRect().height;
    panel.current.style.left = `${Math.max(12, Math.min(bounds.right - width, window.innerWidth - width - 12))}px`;
    panel.current.style.top = `${Math.max(12, bounds.bottom + height + 8 < window.innerHeight ? bounds.bottom + 8 : bounds.top - height - 8)}px`;
    setOpen(true);
    requestAnimationFrame(() => (panel.current?.querySelector('[aria-pressed="true"]:not(:disabled)') || panel.current?.querySelector('button:not(:disabled)'))?.focus({ preventScroll:true }));
  };
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) { panel.current?.hidePopover(); setOpen(false); } };
    const reposition = event => { if (!panel.current?.contains(event.target)) { panel.current?.hidePopover(); setOpen(false); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
  }, [open]);
  const choose = month => { if (!available.includes(month)) return; onChange(month); close(true); };
  const changeYear = year => {
    setShownYear(year);
    requestAnimationFrame(() => panel.current?.querySelector('.report-month-grid button:not(:disabled)')?.focus({ preventScroll:true }));
  };
  return <div ref={root} className="report-month-picker" onBlur={event => { if (open && event.relatedTarget && !root.current?.contains(event.relatedTarget)) close(); }} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); } }}>
    <button ref={trigger} type="button" className="report-month-trigger" disabled={!available.length} aria-label={label || `Reporting month: ${monthLabel}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={toggle}>
      <span className="report-month-icon"><CalendarDays size={18}/></span><span className="report-month-caption"><strong>{monthLabel}</strong><small>Reporting month</small></span><ChevronDown size={16} className={open ? 'report-month-chevron is-open' : 'report-month-chevron'}/>
    </button>
    <div ref={panel} id={id} popover="manual" role="dialog" aria-label="Choose reporting month" className="report-month-panel" onMouseDown={event => event.stopPropagation()}>
      <div className="report-month-heading"><button type="button" aria-label="Previous year" disabled={previous === undefined} onClick={() => changeYear(previous)}><ChevronLeft size={18}/></button><div><strong>{shownYear}</strong><small>Choose month</small></div><button type="button" aria-label="Next year" disabled={next === undefined} onClick={() => changeYear(next)}><ChevronRight size={18}/></button></div>
      <div className="report-month-grid">{months.map((name, index) => { const month = monthValue(shownYear,index); return <button key={name} type="button" disabled={!available.includes(month)} title={!available.includes(month) ? 'No bills or payments recorded' : undefined} aria-pressed={value === month} onClick={() => choose(month)}>{name}{month === current && value !== month && <span className="report-month-today"/>}</button>; })}</div>
      <div className="report-month-footer"><button type="button" disabled={!available.includes(current)} onClick={() => choose(current)}><CalendarDays size={14}/>This month</button></div>
    </div>
  </div>;
}
