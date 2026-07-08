"use server";

import { getPool } from "@/lib/pg";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number; // Quantity in cart
}

export async function processSaleTransaction(
  uid: string,
  cart: CartItem[],
  clientName: string
) {
  if (!uid) return { success: false, error: "Non authentifié" };
  if (cart.length === 0) return { success: false, error: "Le panier est vide" };
  if (!clientName.trim()) return { success: false, error: "Le nom du client est requis" };

  const pool = getPool();
  if (!pool) return { success: false, error: "Base de données non connectée" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productDocsToUpdate = [];
    let totalTransactionAmount = 0;

    for (const item of cart) {
      const prodRes = await client.query(
        "SELECT id, name, price, quantity FROM products WHERE id = $1 FOR UPDATE",
        [item.id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`Le produit "${item.name}" n'existe plus.`);
      }

      const product = prodRes.rows[0];
      const currentStock = product.quantity || 0;

      if (currentStock < item.quantity) {
        throw new Error(
          `Stock insuffisant pour "${item.name}". Dispo: ${currentStock}, Demandé: ${item.quantity}`
        );
      }

      const totalAmount = product.price * item.quantity;
      totalTransactionAmount += totalAmount;

      productDocsToUpdate.push({
        id: product.id,
        currentStock,
        soldQty: item.quantity,
        price: product.price,
        name: product.name,
        totalAmount,
      });
    }

    // 2. Perform database updates
    for (const p of productDocsToUpdate) {
      const newStock = p.currentStock - p.soldQty;

      // Update product stock
      await client.query("UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2", [
        newStock,
        p.id,
      ]);

      // Log sale
      const saleId = "sale-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      await client.query(
        `INSERT INTO sales (id, product_name, product_id, quantity, price, amount, client_name, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [saleId, p.name, p.id, p.soldQty, p.price, p.totalAmount, clientName.trim(), uid]
      );
    }

    // 3. Update client stats if client matches
    const clientRes = await client.query(
      "SELECT id, total_spent, orders_count FROM clients WHERE company_id = $1 AND LOWER(name) = LOWER($2)",
      [uid, clientName.trim()]
    );

    if (clientRes.rows.length > 0) {
      const dbClientObj = clientRes.rows[0];
      await client.query(
        `UPDATE clients
         SET total_spent = $1, orders_count = $2, updated_at = NOW()
         WHERE id = $3`,
        [dbClientObj.total_spent + totalTransactionAmount, dbClientObj.orders_count + 1, dbClientObj.id]
      );
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("POS transaction failed:", error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
