export const generateTripId = () => {
  const now = new Date();

  const datePart = now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);

  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `TRIP-${datePart}-${randomPart}`;
};
