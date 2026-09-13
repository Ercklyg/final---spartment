import { HttpError } from '../middleware/errors.js';

export function object(value, label = 'Request body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${label} must be an object.`);
  return value;
}
export function text(value, label, max = 254, optional = false) {
  if (optional && value == null) return '';
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) throw new HttpError(400, `Enter a valid ${label} (up to ${max} characters).`);
  return value.trim();
}
export function uuid(value, label = 'record ID') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, `Invalid ${label}.`);
  return value;
}
export function choice(value, choices, label) {
  if (!choices.includes(value)) throw new HttpError(400, `Invalid ${label}.`);
  return value;
}
export function number(value, label, min, max, integer = false) {
  if (!['string','number'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (integer && !Number.isInteger(Number(value)))) throw new HttpError(400, `Enter a valid ${label} between ${min} and ${max}.`);
  return Number(value);
}
export function amount(value, label = 'amount', min = 0.01) {
  if (!['string','number'].includes(typeof value) || !/^\d+(\.\d{1,2})?$/.test(String(value))) throw new HttpError(400, `Enter a valid ${label} with up to two decimal places.`);
  return number(value, label, min, 9999999999.99);
}
export function date(value, label = 'date', optional = false) {
  if (optional && (value == null || value === '')) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new HttpError(400, `Enter a valid ${label}.`);
  return value;
}
export function email(value) {
  const result = text(value, 'email address');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpError(400, 'Enter a valid email address.');
  return result.toLowerCase();
}
export function ids(value) {
  if (!Array.isArray(value) || value.length > 1000) throw new HttpError(400, 'Provide up to 1000 record IDs.');
  return [...new Set(value.map(id => uuid(id)))];
}
export function page(query) {
  return {p_offset:number(query.offset??0,'offset',0,10000000,true),p_limit:number(query.limit??25,'page size',1,100,true)};
}
