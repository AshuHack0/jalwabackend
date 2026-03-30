import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env.js";

/**
 * OxPay / Oxoxmg signing:
 * 1. Collect all non-empty params except `sign`
 * 2. Sort keys by ASCII ascending
 * 3. Concatenate as key=value&key=value (trim values)
 * 4. Append &key=<md5_key>
 * 5. MD5 → lowercase
 */
function buildSign(params) {
  const sorted = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "" && params[k] != null)
    .sort();

  const signString =
    sorted.map((k) => `${k}=${String(params[k]).trim()}`).join("&") +
    `&key=${env.OXOXMG_MD5_KEY}`;

  return crypto.createHash("md5").update(signString).digest("hex");
}

function toFormBody(params) {
  // Only send non-empty params so the form body matches what was signed
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
  ).toString();
}

export function verifyOxoxmgCallbackSignature(body) {
  if (!env.OXOXMG_MD5_KEY) return true;

  const { sign, ...rest } = body;
  const expected = buildSign(rest);
  return expected === sign;
}

export async function createOxoxmgOrder({
  merchantOrderNo,
  amount,
  notifyUrl,
  callbackUrl,
  passageCode,
  payerId,
}) {
  const params = {
    merchantid: env.OXOXMG_MERCHANT_ID,
    merchant_orderno: merchantOrderNo,
    passage_code: passageCode || env.OXOXMG_PASSAGE_CODE,
    currency: "INR",
    amount: Number(amount).toFixed(2),
    notify_url: notifyUrl,
    callback_url: callbackUrl,
    payer_id: payerId || "",
  };

  console.log("Oxoxmg create order params:", params);

  params.sign = buildSign(params);

  const response = await axios.post(
    `${env.OXOXMG_GATEWAY_URL}/mcapi/prepaidorder`,
    toFormBody(params),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    }
  );

  const data = response.data;

  console.log("Oxoxmg create order response:", data);

  if (data.code !== 200) {
    throw new Error(data.errmsg || "Oxoxmg gateway returned error");
  }

  return data.data;
}

export async function queryOxoxmgOrder(merchantOrderNo) {
  const params = {
    merchantid: env.OXOXMG_MERCHANT_ID,
    merchant_orderno: merchantOrderNo,
    type: "collect",
  };

  params.sign = buildSign(params);

  const response = await axios.post(
    `${env.OXOXMG_GATEWAY_URL}/mcapi/query`,
    toFormBody(params),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    }
  );

  const data = response.data;

  if (data.code !== 200) {
    throw new Error(data.errmsg || "Oxoxmg order query failed");
  }

  return data.data;
}
