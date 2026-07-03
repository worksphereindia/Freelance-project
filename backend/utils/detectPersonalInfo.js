// Detects attempts to share personal contact / payment details in chat.
// Returns { flagged: boolean, types: string[] }.
// Kept in sync with frontend/src/utils/personalInfo.js

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'oh', 'double', 'triple'];

// Standard email
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Obfuscated email: "name at gmail dot com", "name [at] gmail [dot] com"
const obfuscatedEmailRegex = /\b[a-z0-9._%+-]+\s*(?:@|\(?\s*at\s*\)?|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(?:\.|\(?\s*dot\s*\)?|\[\s*dot\s*\])\s*(?:com|in|org|net|co|io|edu|gov|me)\b/i;

// UPI VPA handles (name@ybl, name@okicici, etc.)
const upiRegex = /\b[a-z0-9.\-_]{2,}@(?:ybl|okaxis|oksbi|okicici|okhdfcbank|paytm|apl|upi|ibl|axl|hdfcbank|sbi|icici|axis|kotak|fbl|pnb)\b/i;

// Contact-sharing link / handle keywords
const socialRegex = /\b(?:whats\s?app|wa\.me|t\.me|tele\s?gram|\btg\b|insta(?:gram)?|snap\s?chat|linktr\.ee|calendly|face\s?book|\bfb\b|\bdm\b|\bvpa\b)\b/i;

// Phone-like digit runs (allow +, spaces, dashes, brackets)
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

function detectPersonalInfo(text) {
  const types = [];
  if (!text || typeof text !== 'string') return { flagged: false, types };

  if (emailRegex.test(text) || obfuscatedEmailRegex.test(text)) types.push('email');
  if (upiRegex.test(text)) types.push('upi');
  if (hasPhone(text) || hasSpelledOutNumber(text)) types.push('phone');
  if (socialRegex.test(text)) types.push('social');

  return { flagged: types.length > 0, types: [...new Set(types)] };
}

module.exports = { detectPersonalInfo };
