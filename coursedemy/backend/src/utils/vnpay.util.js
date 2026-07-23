const crypto = require('crypto');
const querystring = require('querystring');

/**
 * Build URL thanh toán VNPay với chữ ký HMAC-SHA512.
 * Key được sort theo alphabet, querystring KHÔNG encode dấu cách thành +.
 */
function buildVnpayUrl(params, hashSecret, baseUrl) {
  // Sắp xếp key theo thứ tự alphabet
  const sortedKeys = Object.keys(params).sort();

  // Build query string thủ công để tránh encode dấu cách thành '+'
  const queryParts = sortedKeys.map(
    (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`
  );
  // VNPay yêu cầu %20 cho dấu cách trong giá trị hash, nhưng dùng & để nối
  // Thực tế VNPay dùng encodeURIComponent (space → %20) cho raw hash
  const rawHash = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const secureHash = crypto
    .createHmac('sha512', hashSecret)
    .update(rawHash)
    .digest('hex');

  const queryString = queryParts.join('&') + `&vnp_SecureHash=${secureHash}`;
  return `${baseUrl}?${queryString}`;
}

/**
 * Xác minh chữ ký từ VNPay return/IPN.
 * Tách vnp_SecureHash ra khỏi query, sort phần còn lại, tính HMAC-SHA512.
 */
function verifyVnpaySignature(query, hashSecret) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;

  const sortedKeys = Object.keys(rest).sort();
  const rawHash = sortedKeys
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const expected = crypto
    .createHmac('sha512', hashSecret)
    .update(rawHash)
    .digest('hex');

  return expected === vnp_SecureHash;
}

module.exports = { buildVnpayUrl, verifyVnpaySignature };
