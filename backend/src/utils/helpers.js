const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Generate a unique bill number
 */
const generateBillNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BILL-${year}${month}-${random}`;
};

/**
 * Format a date to YYYY-MM-DD
 */
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency
  }).format(amount || 0);
};

/**
 * Sanitize a string (remove HTML, trim)
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Generate time slots between start and end times, skipping break window if provided
 */
const generateTimeSlots = (startTime, endTime, durationMinutes, breakStart = null, breakEnd = null) => {
  const slots = [];
  if (!startTime || !endTime || !durationMinutes) return slots;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  let bStart = null;
  let bEnd = null;
  if (breakStart && breakEnd) {
    const [bsh, bsm] = breakStart.split(':').map(Number);
    const [beh, bem] = breakEnd.split(':').map(Number);
    bStart = bsh * 60 + bsm;
    bEnd = beh * 60 + bem;
  }

  while (current + durationMinutes <= end) {
    const slotMinutes = current;
    const slotEndMinutes = current + durationMinutes;

    // Check if slot overlaps with break window [bStart, bEnd)
    let isBreak = false;
    if (bStart !== null && bEnd !== null && bStart < bEnd) {
      if (slotMinutes < bEnd && slotEndMinutes > bStart) {
        isBreak = true;
      }
    }

    if (!isBreak) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    current += durationMinutes;
  }

  return slots;
};

/**
 * Get day of week name from a date string (YYYY-MM-DD)
 */
const getDayOfWeek = (dateStr) => {
  if (!dateStr) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return days[new Date(y, m - 1, d).getDay()];
  }
  return days[new Date(dateStr).getDay()];
};

module.exports = {
  generateToken,
  calculateAge,
  generateBillNumber,
  formatDate,
  formatCurrency,
  sanitizeString,
  generateTimeSlots,
  getDayOfWeek
};
