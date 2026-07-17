const db = require('../config/database');

// ─── GET /api/wallet ─────────────────────────────────────────────────────────
function getWallet(req, res) {
  try {
    const user = db
      .prepare('SELECT balance FROM users WHERE id = ?')
      .get(req.user.id);

    const transactions = db.prepare(`
      SELECT id, amount, type, status, description, created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        balance: user.balance,
        transactions,
      },
    });
  } catch (err) {
    console.error('[getWallet]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

// ─── POST /api/wallet/deposit ────────────────────────────────────────────────
function deposit(req, res) {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền nạp không hợp lệ',
      });
    }

    const doDeposit = db.transaction(() => {
      // 1. Cộng số dư
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
        .run(amount, req.user.id);

      // 2. Ghi giao dịch
      db.prepare(`
        INSERT INTO wallet_transactions (user_id, amount, type, status, description)
        VALUES (?, ?, 'deposit', 'success', 'Nạp tiền vào ví')
      `).run(req.user.id, amount);

      // 3. Lấy số dư mới
      const user = db
        .prepare('SELECT balance FROM users WHERE id = ?')
        .get(req.user.id);

      return user.balance;
    });

    const new_balance = doDeposit();

    return res.status(200).json({
      success: true,
      message: 'Nạp tiền vào ví thành công',
      data: { new_balance },
    });
  } catch (err) {
    console.error('[deposit]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

module.exports = { getWallet, deposit };
