"use server";

import { query } from "@/lib/pg";
import { revalidatePath } from "next/cache";

export async function getProducts(companyId: string) {
  try {
    const res = await query(
      "SELECT id, name, price, quantity, company_id as \"companyId\" FROM products WHERE company_id = $1 ORDER BY name ASC",
      [companyId]
    );
    return res.rows;
  } catch (error: any) {
    console.error("Error fetching products:", error);
    throw new Error(error.message || "Erreur de chargement des produits");
  }
}

export async function addProduct(data: {
  name: string;
  price: number;
  quantity: number;
  companyId: string;
}) {
  try {
    const uuid = "prod-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const res = await query(
      `INSERT INTO products (id, name, name_lower, price, quantity, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, price, quantity, company_id as "companyId"`,
      [uuid, data.name, data.name.toLowerCase(), data.price, data.quantity, data.companyId]
    );
    revalidatePath("/app/products");
    return { success: true, product: res.rows[0] };
  } catch (error: any) {
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    price: number;
    quantity: number;
  }
) {
  try {
    const res = await query(
      `UPDATE products
       SET name = $1, name_lower = $2, price = $3, quantity = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, price, quantity, company_id as "companyId"`,
      [data.name, data.name.toLowerCase(), data.price, data.quantity, id]
    );
    revalidatePath("/app/products");
    return { success: true, product: res.rows[0] };
  } catch (error: any) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    await query("DELETE FROM products WHERE id = $1", [id]);
    revalidatePath("/app/products");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}
