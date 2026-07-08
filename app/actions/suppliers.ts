"use server";

import { query } from "@/lib/pg";
import { revalidatePath } from "next/cache";

export async function getSuppliers(companyId: string) {
  try {
    const res = await query(
      `SELECT id, name, email, phone, website, category, 
              products_count as "productsCount", rating, 
              company_id as "companyId", created_at as "createdAt"
       FROM suppliers WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId]
    );
    return res.rows;
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    throw new Error(error.message || "Erreur de chargement des fournisseurs");
  }
}

export async function addSupplier(data: {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  category?: string;
  companyId: string;
}) {
  try {
    const uuid = "sup-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const res = await query(
      `INSERT INTO suppliers (id, name, email, phone, website, category, products_count, rating, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 5, $7)
       RETURNING id, name, email, phone, website, category, products_count as "productsCount", rating, company_id as "companyId"`,
      [uuid, data.name, data.email || null, data.phone || null, data.website || null, data.category || "Autre", data.companyId]
    );
    revalidatePath("/app/suppliers");
    return { success: true, supplier: res.rows[0] };
  } catch (error: any) {
    console.error("Error adding supplier:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSupplier(
  id: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    category?: string;
  }
) {
  try {
    const res = await query(
      `UPDATE suppliers
       SET name = $1, email = $2, phone = $3, website = $4, category = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, phone, website, category, products_count as "productsCount", rating, company_id as "companyId"`,
      [data.name, data.email || null, data.phone || null, data.website || null, data.category || "Autre", id]
    );
    revalidatePath("/app/suppliers");
    return { success: true, supplier: res.rows[0] };
  } catch (error: any) {
    console.error("Error updating supplier:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await query("DELETE FROM suppliers WHERE id = $1", [id]);
    revalidatePath("/app/suppliers");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    return { success: false, error: error.message };
  }
}
