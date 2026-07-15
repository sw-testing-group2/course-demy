const crypto = require('crypto');
const querystring = require('querystring');

/**
 * Build VNPay payment URL với HMAC-SHA512 signature.
 * Thứ tự: sort key alphabet, build querystring, ký, append vnp_SecureHash.
 * @param {object} params  - các vnp_* params (KHÔNG bao gồm vnp_SecureHash)
 * @param {string} hashSecret
 * @param {string} baseUrl - VNPAY_URL (https://sandbox.vnpayment.vn/paymentv2/vpcpay.html)
 * @returns {string} full payment URL
 */
function buildVnpayUrl(params, hashSecret, baseUrl) {
  // Sort key alphabet
  const sortedKeys = Object.keys(params).sort();

  // Build query string — encode theo percent-encoding chuẩn (không thay space → +)
  const signData = sortedKeys.map((k) => `${k}=${encodeURIComponent(params[k])}`).join('&');

  const signature = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return `${baseUrl}?${signData}&vnp_SecureHash=${signature}`;
}

/**
 * Verify VNPay return/IPN signature.
 * Tách vnp_SecureHash ra, sort phần còn lại, tính lại HMAC-SHA512.
 * @param {object} query - req.query chứa tất cả vnp_* params
 * @param {string} hashSecret
 * @returns {boolean}
 */
function verifyVnpaySignature(query, hashSecret) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;

  const sortedKeys = Object.keys(rest).sort();
  const signData = sortedKeys.map((k) => `${k}=${encodeURIComponent(rest[k])}`).join('&');

  const expected = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return expected === vnp_SecureHash;
}

module.exports = { buildVnpayUrl, verifyVnpaySignature };
