import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env.js";

/**
 * Builds the HMAC-SHA256 signature required by the payment gateway.
 *
 * Signature string format:
 *   {METHOD}&{URL_PATH}&{accessKey}&{timestamp}&{nonce}
 *
 * Then HMAC-SHA256 with accessSecret as key, Base64-encoded.
 */
function buildSignature(method, urlPath, timestamp, nonce) {
  const data = `${method.toUpperCase()}&${urlPath}&${env.PAYMENT_ACCESS_KEY}&${timestamp}&${nonce}`;
  return crypto
    .createHmac("sha256", env.PAYMENT_ACCESS_SECRET)
    .update(data)
    .digest("base64");
}

/**
 * Generates gateway request headers.
 */
function buildHeaders(method, urlPath) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = String(Math.floor(100000 + Math.random() * 900000));
  const sign = buildSignature(method, urlPath, timestamp, nonce);

  return {
    accessKey: env.PAYMENT_ACCESS_KEY,
    timestamp,
    nonce,
    sign,
    "Content-Type": "application/json",
  };
}

/**
 * Verifies the signature from an incoming gateway callback.
 * The gateway sends the same headers as we send to it.
 */
export function verifyCallbackSignature(method, urlPath, headers) {
  const accessKey = headers["accesskey"] ?? headers["accessKey"];
  const timestamp = headers["timestamp"];
  const nonce = headers["nonce"];
  const sign = headers["sign"];

  // Only verify if we have a configured secret (skip in dev if not set)
  if (!env.PAYMENT_ACCESS_SECRET) return true;

  const data = `${method.toUpperCase()}&${urlPath}&${accessKey}&${timestamp}&${nonce}`;
  const expected = crypto
    .createHmac("sha256", env.PAYMENT_ACCESS_SECRET)
    .update(data)
    .digest("base64");

  return expected === sign;
}

/**
 * Creates a collection (deposit) order with the payment gateway.
 *
 * @param {object} params
 * @param {string} params.merchantOrderNo - Unique order ID from our side
 * @param {number} params.amount          - Amount in INR
 * @param {string} params.callbackUrl     - Our server's callback URL
 * @param {string} params.jumpUrl         - Redirect URL after payment
 * @param {string} [params.channelCode]   - Payment channel (default from env)
 * @returns {Promise<object>} Gateway response result object
 */
export async function createPaymentOrder({
  merchantOrderNo,
  amount,
  callbackUrl,
  jumpUrl,
  channelCode,
}) {
  const urlPath = "/api/order/create";
  const headers = buildHeaders("POST", urlPath);

  const body = {
    McorderNo: merchantOrderNo,
    Amount: String(amount),
    Type: "inr",
    ChannelCode: channelCode || env.PAYMENT_CHANNEL_CODE,
    CallBackUrl: callbackUrl,
    JumpUrl: jumpUrl,
  };

  const response = await axios.post(
    `${env.PAYMENT_GATEWAY_URL}${urlPath}`,
    body,
    { headers, timeout: 15000 }
  );

  const data = response.data;

  if (data.code !== 200) {
    throw new Error(data.message || "Gateway returned error");
  }

  return data.result;
}

/**
 * Queries the status of a collection order from the payment gateway.
 *
 * @param {string} orderNo - Either gateway order number or merchant order number
 * @returns {Promise<object>} Order status object from gateway
 */
export async function queryPaymentOrder(orderNo) {
  const urlPath = "/api/order/queryorder";
  const headers = buildHeaders("POST", urlPath);

  const response = await axios.post(
    `${env.PAYMENT_GATEWAY_URL}${urlPath}`,
    { orderNo },
    { headers, timeout: 10000 }
  );

  const data = response.data;

  if (data.code !== 200) {
    throw new Error(data.message || "Gateway query failed");
  }

  return data.result;
}

/**
 * Creates a payout (withdrawal) order with the payment gateway.
 *
 * @param {object} params
 * @param {string} params.merchantOrderNo - Unique order ID from our side
 * @param {number} params.amount          - Amount in INR
 * @param {string} params.name            - Account holder name
 * @param {string} params.bankName        - Bank name
 * @param {string} params.bankAccount     - Bank account number
 * @param {string} params.ifsc            - IFSC code
 * @param {string} params.notifyUrl       - Our server's payout callback URL
 * @param {string} [params.channelCode]   - Payment channel (default from env)
 * @returns {Promise<object>} Gateway response result object
 */
export async function createPayoutOrder({
  merchantOrderNo,
  amount,
  name,
  bankName,
  bankAccount,
  ifsc,
  notifyUrl,
  channelCode,
}) {
  const urlPath = "/api/payorder/create";
  const headers = buildHeaders("POST", urlPath);

  const body = {
    McorderNo: merchantOrderNo,
    Amount: String(amount),
    Type: "inr",
    ChannelCode: channelCode || env.PAYMENT_CHANNEL_CODE,
    Address: "",
    name,
    BankName: bankName,
    BankAccount: bankAccount,
    Ifsc: ifsc,
    NotifyUrl: notifyUrl,
  };

  const response = await axios.post(
    `${env.PAYMENT_GATEWAY_URL}${urlPath}`,
    body,
    { headers, timeout: 15000 }
  );

  const data = response.data;

  if (data.code !== 200) {
    throw new Error(data.message || "Gateway payout error");
  }

  return data.result;
}

/**
 * Queries the status of a payout order from the payment gateway.
 *
 * @param {string} orderNo - Gateway payout order number
 * @returns {Promise<object>} Payout status object from gateway
 */
export async function queryPayoutOrder(orderNo) {
  const urlPath = "/api/payorder/queryorder";
  const headers = buildHeaders("POST", urlPath);

  const response = await axios.post(
    `${env.PAYMENT_GATEWAY_URL}${urlPath}`,
    { orderNo },
    { headers, timeout: 10000 }
  );

  const data = response.data;

  if (data.code !== 200) {
    throw new Error(data.message || "Payout query failed");
  }

  return data.result;
}

/**
 * Queries the merchant's balance from the payment gateway.
 *
 * @returns {Promise<Array>} Array of { currency, balance } objects
 */
export async function getMerchantBalance() {
  const urlPath = "/api/merchant/Balance";
  const headers = buildHeaders("GET", urlPath);

  const response = await axios.get(
    `${env.PAYMENT_GATEWAY_URL}${urlPath}`,
    { headers, timeout: 10000 }
  );

  const data = response.data;

  if (data.code !== 200) {
    throw new Error(data.message || "Balance query failed");
  }

  return data.result;
}
