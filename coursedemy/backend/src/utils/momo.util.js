const crypto = require('crypto');

/**
 * Tạo HMAC-SHA256 signature cho request tạo payment MoMo.
 * rawSignature theo thứ tự bắt buộc của MoMo v2:
 * accessKey & amount & extraData & ipnUrl & orderId & orderInfo & partnerCode & redirectUrl & requestId & requestType
 */
function createMomoSignature(params, secretKey) {
  const {
    accessKey,
    amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode,
    redirectUrl,
    requestId,
    requestType,
  } = params;

  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${ipnUrl}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}

/**
 * Verify signature từ IPN callback của MoMo.
 * MoMo gửi body với signature field, ta tái tạo và so sánh.
 */
function verifyMomoSignature(body, secretKey) {
  const {
    accessKey,
    amount,
    extraData,
    message,
    orderId,
    orderInfo,
    orderType,
    partnerCode,
    payType,
    requestId,
    responseTime,
    resultCode,
    transId,
  } = body;

  // rawSignature IPN theo doc MoMo v2
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `message=${message}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join('&');

  const expected = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  return expected === body.signature;
}

module.exports = { createMomoSignature, verifyMomoSignature };
