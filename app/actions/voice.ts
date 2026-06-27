"use server";

import { adminDb, admin } from "@/lib/firebase-admin";

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
    // Regex matches: "ajouter stock [riz] quantité [10]" or "ajouter stock de [riz] quantité [10]"
    const addRegex = /ajouter\s+(?:de\s+)?stock\s+(.+?)\s+quantit[eé]\s+(\d+)/i;
    const addMatch = text.match(addRegex);
    if (addMatch) {
      const productName = addMatch[1].trim();
      const quantity = parseInt(addMatch[2], 10);

      const productsRef = adminDb.collection("products");
      const query = await productsRef
        .where("companyId", "==", uid)
        .where("nameLower", "==", productName.toLowerCase())
        .limit(1)
        .get();

      let newStock = quantity;
      let isNew = true;

      if (!query.empty) {
        const productDoc = query.docs[0];
        const currentData = productDoc.data();
        newStock = (currentData.quantity || 0) + quantity;
        await productDoc.ref.update({
          quantity: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        isNew = false;
      } else {
        await productsRef.add({
          name: productName,
          nameLower: productName.toLowerCase(),
          quantity: quantity,
          price: 5.0, // Default price
          companyId: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        success: true,
        action: `Ajout Stock (${productName})`,
        result: `${quantity} unité(s) ajoutée(s). Nouveau stock: ${newStock}`,
        speechText: `D'accord. J'ai ajouté ${quantity} ${productName} au stock. Le stock total est maintenant de ${newStock} unités.`,
      };
    }

    // 2. Command: "vendre [nombre] [produit] client [nom]"
    // Regex matches: "vendre [5] [riz] client [jean dupont]"
    const sellRegex = /vendre\s+(\d+)\s+(.+?)\s+client\s+(.+)/i;
    const sellMatch = text.match(sellRegex);
    if (sellMatch) {
      const quantity = parseInt(sellMatch[1], 10);
      const productName = sellMatch[2].trim();
      const clientName = sellMatch[3].trim();

      const productsRef = adminDb.collection("products");
      const query = await productsRef
        .where("companyId", "==", uid)
        .where("nameLower", "==", productName.toLowerCase())
        .limit(1)
        .get();

      if (query.empty) {
        return {
          success: false,
          action: "Vente échouée",
          result: `Le produit "${productName}" n'existe pas en stock.`,
          speechText: `Désolé, je ne trouve pas le produit ${productName} dans votre inventaire.`,
        };
      }

      const productDoc = query.docs[0];
      const productData = productDoc.data();
      const currentStock = productData.quantity || 0;

      if (currentStock < quantity) {
        return {
          success: false,
          action: "Vente échouée",
          result: `Stock insuffisant pour "${productName}" (${currentStock} dispo, ${quantity} requis).`,
          speechText: `Opération impossible. Vous n'avez que ${currentStock} unités de ${productName} en stock, mais vous essayez d'en vendre ${quantity}.`,
        };
      }

      const price = productData.price || 0;
      const totalAmount = price * quantity;
      const newStock = currentStock - quantity;

      // Execute as batch transaction
      const batch = adminDb.batch();
      batch.update(productDoc.ref, {
        quantity: newStock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const saleRef = adminDb.collection("sales").doc();
      batch.set(saleRef, {
        productName: productData.name,
        productId: productDoc.id,
        quantity: quantity,
        price: price,
        amount: totalAmount,
        clientName: clientName,
        companyId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        action: `Vente (${productName})`,
        result: `${quantity} vendu(s) à ${clientName} pour ${totalAmount}€.`,
        speechText: `Très bien. J'ai enregistré la vente de ${quantity} ${productName} à ${clientName} pour un montant total de ${totalAmount} euros. Le stock restant est de ${newStock} unités.`,
      };
    }

    // 3. Command: "afficher stock [produit]"
    // Regex matches: "afficher stock [riz]" or "afficher stock de [riz]"
    const showRegex = /afficher\s+(?:de\s+)?stock\s+(.+)/i;
    const showMatch = text.match(showRegex);
    if (showMatch) {
      const productName = showMatch[1].trim();

      const productsRef = adminDb.collection("products");
      const query = await productsRef
        .where("companyId", "==", uid)
        .where("nameLower", "==", productName.toLowerCase())
        .limit(1)
        .get();

      if (query.empty) {
        return {
          success: true,
          action: `Affichage Stock (${productName})`,
          result: "0 unité en stock (produit non créé).",
          speechText: `Le produit ${productName} n'existe pas encore dans votre inventaire. Son stock est de 0.`,
        };
      }

      const productData = query.docs[0].data();
      const currentStock = productData.quantity || 0;

      return {
        success: true,
        action: `Affichage Stock (${productName})`,
        result: `${currentStock} unité(s) en stock.`,
        speechText: `Vous avez actuellement ${currentStock} unités de ${productName} en stock.`,
      };
    }

    // 4. Command: "générer facture montant [nombre]"
    // Regex matches: "générer facture montant [150]"
    const invoiceRegex = /g[eé]n[eé]rer\s+facture\s+montant\s+(\d+)/i;
    const invoiceMatch = text.match(invoiceRegex);
    if (invoiceMatch) {
      const amount = parseFloat(invoiceMatch[1]);
      
      const salesRef = adminDb.collection("sales");
      await salesRef.add({
        productName: "Service voix / Facture express",
        quantity: 1,
        price: amount,
        amount: amount,
        clientName: "Client Express",
        companyId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        action: "Facturation express",
        result: `Facture de ${amount}€ générée.`,
        speechText: `D'accord, j'ai généré une facture rapide d'un montant de ${amount} euros pour le Client Express.`,
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
