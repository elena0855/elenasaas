"use server";

import { query, getPool } from "@/lib/pg";

interface VoiceResult {
  success: boolean;
  action: string;
  result: string;
  speechText: string;
}

export async function executeVoiceCommand(uid: string, commandText: string): Promise<VoiceResult> {
  const text = commandText.toLowerCase().trim();
  console.log(`Executing voice command for user ${uid}: "${text}"`);

  try {
    // 1. Command: "ajouter stock [produit] quantité [nombre]"
    const addRegex = /ajouter\s+(?:de\s+)?stock\s+(.+?)\s+quantit[eé]\s+(\d+)/i;
    const addMatch = text.match(addRegex);
    if (addMatch) {
      const productName = addMatch[1].trim();
      const quantity = parseInt(addMatch[2], 10);

      const prodRes = await query("SELECT id, quantity FROM products WHERE company_id = $1 AND name_lower = $2", [
        uid,
        productName.toLowerCase(),
      ]);

      let newStock = quantity;
      if (prodRes.rows.length > 0) {
        const product = prodRes.rows[0];
        newStock = (product.quantity || 0) + quantity;
        await query("UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2", [newStock, product.id]);
      } else {
        const uuid = "prod-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        await query(
          `INSERT INTO products (id, name, name_lower, price, quantity, company_id)
           VALUES ($1, $2, $3, 5.0, $4, $5)`,
          [uuid, productName, productName.toLowerCase(), quantity, uid]
        );
      }

      return {
        success: true,
        action: `Ajout Stock (${productName})`,
        result: `${quantity} unité(s) ajoutée(s). Nouveau stock: ${newStock}`,
        speechText: `D'accord. J'ai ajouté ${quantity} ${productName} au stock. Le stock total est maintenant de ${newStock} unités.`,
      };
    }

    // 2. Command: "vendre [nombre] [produit] client [nom]"
    const sellRegex = /vendre\s+(\d+)\s+(.+?)\s+client\s+(.+)/i;
    const sellMatch = text.match(sellRegex);
    if (sellMatch) {
      const quantity = parseInt(sellMatch[1], 10);
      const productName = sellMatch[2].trim();
      const clientName = sellMatch[3].trim();

      const prodRes = await query("SELECT id, name, price, quantity FROM products WHERE company_id = $1 AND name_lower = $2", [
        uid,
        productName.toLowerCase(),
      ]);

      if (prodRes.rows.length === 0) {
        return {
          success: false,
          action: "Vente échouée",
          result: `Le produit "${productName}" n'existe pas en stock.`,
          speechText: `Désolé, je ne trouve pas le produit ${productName} dans votre inventaire.`,
        };
      }

      const product = prodRes.rows[0];
      const currentStock = product.quantity || 0;

      if (currentStock < quantity) {
        return {
          success: false,
          action: "Vente échouée",
          result: `Stock insuffisant pour "${productName}" (${currentStock} dispo, ${quantity} requis).`,
          speechText: `Opération impossible. Vous n'avez que ${currentStock} unités de ${productName} en stock, mais vous essayez d'en vendre ${quantity}.`,
        };
      }

      const price = product.price || 0;
      const totalAmount = price * quantity;
      const newStock = currentStock - quantity;

      const pool = getPool();
      if (!pool) return { success: false, action: "Vente échouée", result: "Base de données non connectée", speechText: "Erreur technique" };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("UPDATE products SET quantity = $1, updated_at = NOW() WHERE id = $2", [newStock, product.id]);

        const saleId = "sale-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        await client.query(
          `INSERT INTO sales (id, product_name, product_id, quantity, price, amount, client_name, company_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [saleId, product.name, product.id, quantity, price, totalAmount, clientName, uid]
        );

        const clientRes = await client.query(
          "SELECT id, total_spent, orders_count FROM clients WHERE company_id = $1 AND LOWER(name) = LOWER($2)",
          [uid, clientName]
        );
        if (clientRes.rows.length > 0) {
          const dbClientObj = clientRes.rows[0];
          await client.query(
            `UPDATE clients
             SET total_spent = $1, orders_count = $2, updated_at = NOW()
             WHERE id = $3`,
            [dbClientObj.total_spent + totalAmount, dbClientObj.orders_count + 1, dbClientObj.id]
          );
        }
        await client.query("COMMIT");
      } catch (err: any) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      return {
        success: true,
        action: `Vente (${productName})`,
        result: `${quantity} vendu(s) à ${clientName} pour ${totalAmount} FCFA.`,
        speechText: `Très bien. J'ai enregistré la vente de ${quantity} ${productName} à ${clientName} pour un montant total de ${totalAmount} francs CFA. Le stock restant est de ${newStock} unités.`,
      };
    }

    // 3. Command: "afficher stock [produit]"
    const showRegex = /afficher\s+(?:de\s+)?stock\s+(.+)/i;
    const showMatch = text.match(showRegex);
    if (showMatch) {
      const productName = showMatch[1].trim();

      const prodRes = await query("SELECT quantity FROM products WHERE company_id = $1 AND name_lower = $2", [
        uid,
        productName.toLowerCase(),
      ]);

      if (prodRes.rows.length === 0) {
        return {
          success: true,
          action: `Affichage Stock (${productName})`,
          result: "0 unité en stock (produit non créé).",
          speechText: `Le produit ${productName} n'existe pas encore dans votre inventaire. Son stock est de 0.`,
        };
      }

      const currentStock = prodRes.rows[0].quantity || 0;

      return {
        success: true,
        action: `Affichage Stock (${productName})`,
        result: `${currentStock} unité(s) en stock.`,
        speechText: `Vous avez actuellement ${currentStock} unités de ${productName} en stock.`,
      };
    }

    // 4. Command: "générer facture montant [nombre]"
    const invoiceRegex = /g[eé]n[eé]rer\s+facture\s+montant\s+(\d+)/i;
    const invoiceMatch = text.match(invoiceRegex);
    if (invoiceMatch) {
      const amount = parseFloat(invoiceMatch[1]);
      
      const saleId = "sale-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      await query(
        `INSERT INTO sales (id, product_name, product_id, quantity, price, amount, client_name, company_id)
         VALUES ($1, 'Service voix / Facture express', 'express-voice', 1, $2, $2, 'Client Express', $3)`,
        [saleId, amount, uid]
      );

      return {
        success: true,
        action: "Facturation express",
        result: `Facture de ${amount} FCFA générée.`,
        speechText: `D'accord, j'ai généré une facture rapide d'un montant de ${amount} francs CFA pour le Client Express.`,
      };
    }

    // Command unrecognized
    return {
      success: false,
      action: "Commande vocale inconnue",
      result: `Impossible d'analyser la commande: "${commandText}"`,
      speechText: `Je n'ai pas compris la commande. Vous pouvez dire par exemple : "ajouter stock riz quantité 10" ou "vendre 5 riz client Jean".`,
    };
  } catch (error: any) {
    console.error("Error executing voice command: ", error);
    return {
      success: false,
      action: "Erreur technique",
      result: error.message,
      speechText: `Une erreur technique s'est produite lors de l'exécution de la commande.`,
    };
  }
}
