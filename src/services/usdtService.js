import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env.js";

/**
 * Builds the HMAC-SHA256 signature required by the USDT payment gateway.
 *
 * Signature string format:
 *   {METHOD}&{URL_PATH}&{accessKey}&{timestamp}&{nonce}
 *
 * Then HMAC-SHA256 with accessSecret as key, Base64-encoded.
 */
function buildSignature(method, urlPath, timestamp, nonce) {
  const data = `${method.toUpperCase()}&${urlPath}&${env.USDT_ACCESS_KEY}&${timestamp}&${nonce}`;
  return crypto
    .createHmac("sha256", env.USDT_ACCESS_SECRET)
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
    accessKey: env.USDT_ACCESS_KEY,
    timestamp,
    nonce,
    sign,
    "Content-Type": "application/json",
  };
}

/**
 * Verifies the signature from an incoming USDT gateway callback.
 */
export function verifyUsdtCallbackSignature(method, urlPath, headers) {
  const accessKey = headers["accesskey"] ?? headers["accessKey"];
  const timestamp = headers["timestamp"];
  const nonce = headers["nonce"];
  const sign = headers["sign"];

  if (!env.USDT_ACCESS_SECRET) return true;

  const data = `${method.toUpperCase()}&${urlPath}&${accessKey}&${timestamp}&${nonce}`;
  const expected = crypto
    .createHmac("sha256", env.USDT_ACCESS_SECRET)
    .update(data)
    .digest("base64");

  return expected === sign;
}

/**
 * Creates a USDT deposit order with the gateway.
 * Returns an object with { orderId, address, network, amount, expireTime, ... }
 *
 * @param {object} params
 * @param {string} params.merchantOrderNo - Unique order ID from our side
 * @param {number} params.amount          - Amount in USDT
 * @param {string} params.network         - "TRC20" | "ERC20" | "BEP20"
 * @param {string} params.callbackUrl     - Our server's callback URL
 * @param {string} params.jumpUrl         - Redirect URL after payment
 */
export async function createUsdtDepositOrder({
  merchantOrderNo,
  amount,
  network,
  callbackUrl,
  jumpUrl,
}) {
  const urlPath = "/api/order/create";
  const headers = buildHeaders("POST", urlPath);

  const body = {
    McorderNo: merchantOrderNo,
    Amount: String(amount),
    Type: "usdt",
    Network: network,
    CallBackUrl: callbackUrl,
    JumpUrl: jumpUrl,
  };

  const response = await axios.post(
    `${env.USDT_GATEWAY_URL}${urlPath}`,
    body,
    { headers, timeout: 15000 }
  );

  console.log("USDT gateway createOrder response ==>", response.data);

  const data = response.data;
  if (data.code !== 200) {
    throw new Error(data.message || "USDT gateway returned error");
  }

  return data.result;
}

/**
 * Queries the status of a USDT deposit order.
 *
 * @param {string} orderNo - Platform or merchant order number
 */
export async function queryUsdtDepositOrder(orderNo) {
  const urlPath = "/api/order/queryorder";
  const headers = buildHeaders("POST", urlPath);

  const response = await axios.post(
    `${env.USDT_GATEWAY_URL}${urlPath}`,
    { orderNo },
    { headers, timeout: 10000 }
  );

  const data = response.data;
  if (data.code !== 200) {
    throw new Error(data.message || "USDT gateway query failed");
  }

  return data.result;
}
