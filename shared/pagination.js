export function pageNumber(value) {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,5}$/.test(value)) return null;
  const page = Number(value);
  return page <= 100000 ? page : null;
}
