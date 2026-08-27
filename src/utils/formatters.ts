/**
 * Date and numerical formatting utilities for PharmaCare
 */

/**
 * Formats any date string (ISO YYYY-MM-DD, YYYY-MM, or timestamp)
 * into strict MM/YY (Month/Year, no day) format.
 * Example: '2028-07-31' -> '07/28'
 * Example: '2024-01-15' -> '01/24'
 */
export function formatMonthYear(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  const str = String(dateStr).trim();
  if (!str || str === 'N/A' || str === 'undefined' || str === 'null') return 'N/A';

  // If already in MM/YY format (e.g. "08/26" or "8/26")
  const mmYyMatch = str.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmYyMatch) {
    return `${mmYyMatch[1].padStart(2, '0')}/${mmYyMatch[2]}`;
  }

  // If in MM/YYYY format (e.g. "08/2026")
  const mmYyyyMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyyMatch) {
    return `${mmYyMatch ? mmYyMatch[1] : mmYyyyMatch[1].padStart(2, '0')}/${mmYyyyMatch[2].slice(-2)}`;
  }

  // If ISO format YYYY-MM or YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1].slice(-2);
    const month = isoMatch[2].padStart(2, '0');
    return `${month}/${year}`;
  }

  // Parse using Date constructor
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${month}/${year}`;
  }

  return str;
}

/**
 * Converts a stored date string to a YYYY-MM value compatible with <input type="month" />
 */
export function toMonthInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str) return '';

  const isoMatch = str.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
  }

  const mmYyMatch = str.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmYyMatch) {
    const yrNum = parseInt(mmYyMatch[2], 10);
    const fullYear = yrNum > 50 ? `19${mmYyMatch[2]}` : `20${mmYyMatch[2]}`;
    return `${fullYear}-${mmYyMatch[1].padStart(2, '0')}`;
  }

  const mmYyyyMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyyMatch) {
    return `${mmYyyyMatch[2]}-${mmYyyyMatch[1].padStart(2, '0')}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return '';
}

/**
 * Converts a YYYY-MM or MM/YY string to end-of-month or standard ISO date string
 * for storage and backend comparisons.
 */
export function monthInputToIso(monthVal: string): string {
  if (!monthVal) return '';
  const parts = monthVal.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    // Find last day of month
    const lastDay = new Date(year, month, 0).getDate();
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }
  return monthVal;
}
