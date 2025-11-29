// smsService.js
const axios = require("axios");

const sendSMS = async (to, message) => {
  const url = process.env.TERMII_BASE_URL;

  const payload = {
    api_key: process.env.TERMII_API_KEY,
    to,
    from: process.env.TERMII_FROM_NAME,
    sms: message,
    type: process.env.TERMII_SMS_TYPE,
    channel: process.env.TERMII_SMS_CHANNEL,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (error) {
    console.error("SMS sending failed:", error.response?.data || error.message);
    throw new Error("Failed to send SMS");
  }
};

module.exports = { sendSMS };
