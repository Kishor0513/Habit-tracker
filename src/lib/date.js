const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoToDate(iso) {
  if (!ISO_RE.test(iso)) throw new Error(`Invalid ISO date: ${iso}`);
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  // Noon avoids DST issues when adding days.
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isoToday() {
  return dateToISO(new Date());
}

export function addDays(iso, days) {
  const dt = isoToDate(iso);
  dt.setDate(dt.getDate() + days);
  return dateToISO(dt);
}

export function dayOfWeek(iso) {
  // 1..7 (Mon..Sun)
  const dt = isoToDate(iso);
  const js = dt.getDay(); // 0..6 (Sun..Sat)
  return js === 0 ? 7 : js;
}

export function startOfISOWeek(iso) {
  const dow = dayOfWeek(iso); // Mon=1
  return addDays(iso, -(dow - 1));
}

export function lastNDays(n, endIso = isoToday()) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) days.push(addDays(endIso, -i));
  return days;
}

