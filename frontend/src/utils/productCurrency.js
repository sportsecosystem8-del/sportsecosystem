export const PRODUCT_CURRENCY_CODE = 'PKR';

export function formatProductPrice(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: PRODUCT_CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(n);
}
