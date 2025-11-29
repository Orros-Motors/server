// utils/generateTripId.js

/**
 * Generates a unique Trip ID
 * Format: TRIP-YYYYMMDDHHMMSS-RAND
 */
const generateTripId = () => {
  const now = new Date();

  // Format date as YYYYMMDDHHMMSS
  const datePart = now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);

  // Generate a random 4-character uppercase string
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `TRIP-${datePart}-${randomPart}`;
};

module.exports = { generateTripId };