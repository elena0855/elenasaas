"use server";

import { adminDb, admin } from "@/lib/firebase-admin";

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

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      // 1. First, check stocks and load all product docs
      const productDocsToUpdate = [];

      for (const item of cart) {
        const productRef = adminDb.collection("products").doc(item.id);
        const docSnap = await transaction.get(productRef);

        if (!docSnap.exists) {
          throw new Error(`Le produit "${item.name}" n'existe plus.`);
        }

        const data = docSnap.data()!;
        const currentStock = data.quantity || 0;

        if (currentStock < item.quantity) {
          throw new Error(
            `Stock insuffisant pour "${item.name}". Dispo: ${currentStock}, Demandé: ${item.quantity}`
          );
        }

        productDocsToUpdate.push({
          ref: productRef,
          currentStock,
          soldQty: item.quantity,
          price: data.price || 0,
          name: data.name,
        });
      }

      // 2. Perform database updates (only after all reads are done)
      for (const p of productDocsToUpdate) {
        const newStock = p.currentStock - p.soldQty;
        const totalAmount = p.price * p.soldQty;

        // Update product stock
        transaction.update(p.ref, {
          quantity: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log sale
        const saleRef = adminDb.collection("sales").doc();
        transaction.set(saleRef, {
          productName: p.name,
          productId: p.ref.id,
          quantity: p.soldQty,
          price: p.price,
          amount: totalAmount,
          clientName: clientName.trim(),
          companyId: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    });

    return result;
  } catch (error: any) {
    console.error("POS transaction failed:", error);
    return { success: false, error: error.message };
  }
}
