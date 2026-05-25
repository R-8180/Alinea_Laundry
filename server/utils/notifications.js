const pool = require('../db');

/**
 * Helper to notify admins (both global and specific branch admins) about order events.
 * @param {number} orderId - The order ID.
 * @param {string} eventType - 'new_order' or 'completed'
 */
async function notifyAdmins(orderId, eventType) {
  try {
    // 1. Fetch order details including branch name
    const orderRes = await pool.query(
      `SELECT o.order_code, o.branch_id, b.name AS branch_name 
       FROM orders o 
       LEFT JOIN branches b ON o.branch_id = b.id 
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) return;
    const { order_code, branch_id, branch_name } = orderRes.rows[0];
    const bName = branch_name || 'Global';

    // 2. Fetch all admin users
    const adminsRes = await pool.query(`SELECT id, branch_id FROM users WHERE role = 'admin'`);
    const admins = adminsRes.rows;

    // 3. Define titles and messages
    let title = '';
    let msgBranch = '';
    let msgGlobal = '';

    if (eventType === 'new_order') {
      title = 'Pesanan Baru 🆕';
      msgBranch = `Ada pesanan baru masuk #${order_code}`;
      msgGlobal = `Cabang ${bName} ada pesanan baru #${order_code}`;
    } else if (eventType === 'completed') {
      title = 'Pesanan Selesai 🎉';
      msgBranch = `Pesanan #${order_code} telah selesai`;
      msgGlobal = `Cabang ${bName} - Pesanan #${order_code} telah selesai`;
    } else {
      return;
    }

    // 4. Send notification to each matching admin using a high-performance single Bulk Insert query
    const insertValues = [];
    const valuePlaceholders = [];
    let paramIndex = 1;

    for (const admin of admins) {
      const isGlobalAdmin = admin.branch_id === null;
      const isMatchingBranchAdmin = admin.branch_id !== null && Number(admin.branch_id) === Number(branch_id);

      if (isGlobalAdmin) {
        valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        insertValues.push(admin.id, orderId, title, msgGlobal);
      } else if (isMatchingBranchAdmin) {
        valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        insertValues.push(admin.id, orderId, title, msgBranch);
      }
    }

    if (valuePlaceholders.length > 0) {
      const sql = `INSERT INTO notifications (user_id, order_id, title, message) VALUES ${valuePlaceholders.join(', ')}`;
      await pool.query(sql, insertValues);
    }
  } catch (err) {
    console.error('Error notifying admins:', err);
  }
}

module.exports = { notifyAdmins };
