"use server";

import { query } from "@/lib/pg";
import { revalidatePath } from "next/cache";

export async function getClients(companyId: string) {
  try {
    const res = await query(
      `SELECT id, name, email, phone, address, 
              total_spent as "totalSpent", orders_count as "ordersCount", 
              company_id as "companyId", created_at as "createdAt"
       FROM clients WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId]
    );
    return res.rows;
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    throw new Error(error.message || "Erreur de chargement des clients");
  }
}

export async function addClient(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyId: string;
}) {
  try {
    const uuid = "cli-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const res = await query(
      `INSERT INTO clients (id, name, email, phone, address, total_spent, orders_count, company_id)
       VALUES ($1, $2, $3, $4, $5, 0.0, 0, $6)
       RETURNING id, name, email, phone, address, total_spent as "totalSpent", orders_count as "ordersCount", company_id as "companyId"`,
      [uuid, data.name, data.email || null, data.phone || null, data.address || null, data.companyId]
    );
    revalidatePath("/app/clients");
    return { success: true, client: res.rows[0] };
  } catch (error: any) {
    console.error("Error adding client:", error);
    return { success: false, error: error.message };
  }
}

export async function updateClient(
  id: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }
) {
  try {
    const res = await query(
      `UPDATE clients
       SET name = $1, email = $2, phone = $3, address = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, phone, address, total_spent as "totalSpent", orders_count as "ordersCount", company_id as "companyId"`,
      [data.name, data.email || null, data.phone || null, data.address || null, id]
    );
    revalidatePath("/app/clients");
    return { success: true, client: res.rows[0] };
  } catch (error: any) {
    console.error("Error updating client:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteClient(id: string) {
  try {
    await query("DELETE FROM clients WHERE id = $1", [id]);
    revalidatePath("/app/clients");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return { success: false, error: error.message };
  }
}
