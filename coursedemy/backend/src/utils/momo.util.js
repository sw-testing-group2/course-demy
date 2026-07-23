const crypto = require('crypto');

/**
 * Tạo chữ ký MoMo HMAC-SHA256.
 * rawSignature phải theo đúng thứ tự params MoMo quy định.
 */
function createMomoSignature(params, secretKey) {
  const rawSignature = [
    `accessKey=${params.accessKey}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData}`,
    `ipnUrl=${params.ipnUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${params.partnerCode}`,
    `redirectUrl=${params.redirectUrl}`,
    `requestId=${params.requestId}`,
    `requestType=${params.requestType}`,
  ].join('&');

  return crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');
}

/**
 * Xác minh chữ ký từ IPN callback của MoMo.
 * MoMo gửi các field: partnerCode, orderId, requestId, amount, orderInfo,
 * orderType, transId, resultCode, message, payType, responseTime, extraData, signature
 */
function verifyMomoSignature(body, secretKey) {
  const rawSignature = [
    `accessKey=${process.env.MOMO_ACCESS_KEY}`,
    `amount=${body.amount}`,
    `extraData=${body.extraData}`,
    `message=${body.message}`,
    `orderId=${body.orderId}`,
    `orderInfo=${body.orderInfo}`,
    `orderType=${body.orderType}`,
    `partnerCode=${body.partnerCode}`,
    `payType=${body.payType}`,
    `requestId=${body.requestId}`,
    `responseTime=${body.responseTime}`,
    `resultCode=${body.resultCode}`,
    `transId=${body.transId}`,
  ].join('&');

  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return expected === body.signature;
}

module.exports = { createMomoSignature, verifyMomoSignature };
