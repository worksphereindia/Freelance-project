// Client-side mirror of the server's personal-info detector (for instant UX feedback).
// The server remains the source of truth and will block/log regardless.
// Kept in sync with backend/utils/detectPersonalInfo.js

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'oh', 'double', 'triple'];

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const obfuscatedEmailRegex = /\b[a-z0-9._%+-]+\s*(?:@|\(?\s*at\s*\)?|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(?:\.|\(?\s*dot\s*\)?|\[\s*dot\s*\])\s*(?:com|in|org|net|co|io|edu|gov|me)\b/i;
const upiRegex = /\b[a-z0-9.\-_]{2,}@(?:ybl|okaxis|oksbi|okicici|okhdfcbank|paytm|apl|upi|ibl|axl|hdfcbank|sbi|icici|axis|kotak|fbl|pnb)\b/i;
const socialRegex = /\b(?:whats\s?app|wa\.me|t\.me|tele\s?gram|\btg\b|insta(?:gram)?|snap\s?chat|linktr\.ee|calendly|face\s?book|\bfb\b|\bdm\b|\bvpa\b)\b/i;
const phoneCandidateRegex = /(?:\+?\d[\d\s\-().]{7,}\d)/g;

function hasPhone(text) {
  const candidates = text.match(phoneCandidateRegex) || [];
  return candidates.some((c) => {
    const digits = c.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  });
}

function hasSpelledOutNumber(text) {
  const words = (text.toLowerCase().match(/\b[a-z]+\b/g) || []).filter((w) => NUMBER_WORDS.includes(w));
  return words.length >= 7;
}

export function detectPersonalInfo(text) {
  const types = [];
  if (!text || typeof text !== 'string') return { flagged: false, types };

  if (emailRegex.test(text) || obfuscatedEmailRegex.test(text)) types.push('email');
  if (upiRegex.test(text)) types.push('upi');
  if (hasPhone(text) || hasSpelledOutNumber(text)) types.push('phone');
  if (socialRegex.test(text)) types.push('social');

  return { flagged: types.length > 0, types: [...new Set(types)] };
}

export function containsPersonalInfo(text) {
  return detectPersonalInfo(text).flagged;
}
