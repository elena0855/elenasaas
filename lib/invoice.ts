import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { jsPDF } from "jspdf";

export interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  items: InvoiceItem[];
  total: number;
  createdAt: any;
}

export const createInvoice = async (
  clientName: string,
  items: InvoiceItem[]
): Promise<Invoice> => {
  const total = items.reduce((s, it) => s + it.qty * it.price, 0);
  const docRef = await addDoc(collection(db, "invoices"), {
    clientName,
    items,
    total,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, clientName, items, total, createdAt: null };
};

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.setTextColor(6, 182, 212);
  doc.text("FACTURE", 105, 20, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Client : " + invoice.clientName, 20, 36);
  doc.text("ID     : " + invoice.id, 20, 43);
  doc.text("Date   : " + new Date().toLocaleDateString("fr-FR"), 20, 50);
  doc.setDrawColor(6, 182, 212);
  doc.line(20, 55, 190, 55);
  let y = 63;
  doc.setFont("helvetica", "bold");
  doc.text("Description", 20, y);
  doc.text("Total", 185, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 7;
  invoice.items.forEach((it) => {
    doc.text(it.description, 20, y);
    doc.text((it.qty * it.price).toFixed(0) + " FCFA", 185, y, { align: "right" });
    y += 7;
  });
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL : " + invoice.total.toFixed(0) + " FCFA", 185, y, { align: "right" });
  doc.save("facture_" + invoice.id + ".pdf");
};

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const d = doc.data() as any;
    return {
      id: doc.id,
      clientName: d.clientName,
      items: d.items,
      total: d.total,
      createdAt: d.createdAt,
    };
  });
};
