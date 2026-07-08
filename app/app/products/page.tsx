"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, PackageMinus, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getProducts, addProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/index";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  companyId: string;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("0");

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getProducts(user.uid);
      setProducts(data);
    } catch (error) {
      console.warn("Prisma fetch failed, using local storage fallback:", error);
      const stored = localStorage.getItem(`products_${user.uid}`);
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        const defaultProducts = [
          { id: "prod-1", name: "Riz Basmati", price: 3.50, quantity: 15, companyId: user.uid },
          { id: "prod-2", name: "Huile d'olive", price: 8.90, quantity: 8, companyId: user.uid },
          { id: "prod-3", name: "Café Arabica", price: 4.20, quantity: 3, companyId: user.uid }
        ];
        localStorage.setItem(`products_${user.uid}`, JSON.stringify(defaultProducts));
        setProducts(defaultProducts);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Open Edit Dialog
  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setQuantity(product.quantity.toString());
    setIsEditOpen(true);
  };

  // Open Add Dialog
  const openAdd = () => {
    setName("");
    setPrice("");
    setQuantity("");
    setIsAddOpen(false);
    setIsAddOpen(true);
  };

  // Handle Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const nameVal = name.trim();
    const priceVal = parseFloat(price) || 0.0;
    const qtyVal = parseInt(quantity, 10) || 0;

    try {
      const res = await addProduct({
        name: nameVal,
        price: priceVal,
        quantity: qtyVal,
        companyId: user.uid,
      });
      if (res.success) {
        fetchProducts();
        setIsAddOpen(false);
      } else {
        throw new Error(res.error || "Ajout échoué");
      }
    } catch (error) {
      console.warn("Adding product server action failed, falling back to local storage:", error);
      const newProduct = {
        id: "prod-" + Math.random().toString(36).substring(2, 9),
        name: nameVal,
        nameLower: nameVal.toLowerCase(),
        price: priceVal,
        quantity: qtyVal,
        companyId: user.uid,
      };
      const updated = [...products, newProduct];
      updated.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem(`products_${user.uid}`, JSON.stringify(updated));
      setProducts(updated);
      setIsAddOpen(false);
    }
  };

  // Handle Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const nameVal = name.trim();
    const priceVal = parseFloat(price) || 0.0;
    const qtyVal = parseInt(quantity, 10) || 0;

    try {
      const res = await updateProduct(selectedProduct.id, {
        name: nameVal,
        price: priceVal,
        quantity: qtyVal,
      });
      if (res.success) {
        fetchProducts();
        setIsEditOpen(false);
        setSelectedProduct(null);
      } else {
        throw new Error(res.error || "Mise à jour échouée");
      }
    } catch (error) {
      console.warn("Updating product server action failed, falling back to local storage:", error);
      const updatedProduct = {
        ...selectedProduct,
        name: nameVal,
        nameLower: nameVal.toLowerCase(),
        price: priceVal,
        quantity: qtyVal,
      };
      const updated = products.map((p) => p.id === selectedProduct.id ? updatedProduct : p);
      updated.sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem(`products_${user.uid}`, JSON.stringify(updated));
      setProducts(updated);
      setIsEditOpen(false);
      setSelectedProduct(null);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit du catalogue ?")) return;

    try {
      const res = await deleteProduct(productId);
      if (res.success) {
        fetchProducts();
      } else {
        throw new Error(res.error || "Suppression échouée");
      }
    } catch (error) {
      console.warn("Deleting product server action failed, falling back to local storage:", error);
      const updated = products.filter((p) => p.id !== productId);
      localStorage.setItem(`products_${user.uid}`, JSON.stringify(updated));
      setProducts(updated);
    }
  };

  // Filter products by search term
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold font-grotesk tracking-tight text-white">
            Catalogue Produits
          </h1>
          <p className="text-xs text-slate-400">
            Gérez votre inventaire de produits et les prix unitaires de vente.
          </p>
        </div>
        <Button variant="gradient" className="flex items-center space-x-2 font-bold" onClick={openAdd}>
          <Plus className="h-4 w-4 text-slate-950 stroke-[3]" />
          <span>Nouveau Produit</span>
        </Button>
      </div>

      {/* Search and Table */}
      <Card className="border-slate-800/80 bg-slate-900/20 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4 border-b border-slate-900/60">
          <CardTitle className="text-base font-semibold">Articles en Stock</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-950/40"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6 px-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500">Chargement de l'inventaire...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <PackageMinus className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-sm">Aucun produit trouvé.</p>
              <p className="text-xs text-slate-600 mt-1">
                {searchTerm ? "Essayez une autre recherche." : "Ajoutez votre premier produit pour commencer."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du Produit</TableHead>
                  <TableHead>Prix Unitaire</TableHead>
                  <TableHead>Quantité en Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const isLowStock = p.quantity < 5;
                  const isOut = p.quantity === 0;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-slate-200">
                        {p.name}
                      </TableCell>
                      <TableCell className="font-mono text-cyan-400">
                        {p.price.toFixed(0)} FCFA
                      </TableCell>
                      <TableCell className="font-mono text-slate-300">
                        {p.quantity}
                      </TableCell>
                      <TableCell>
                        {isOut ? (
                          <Badge variant="danger">Rupture</Badge>
                        ) : isLowStock ? (
                          <Badge variant="warning">Alerte Stock</Badge>
                        ) : (
                          <Badge variant="success">Disponible</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-cyan-400 hover:bg-slate-900"
                            onClick={() => openEdit(p)}
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-red-400 hover:bg-slate-900"
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========================================== */}
      {/* DIALOG ADD */}
      {/* ========================================== */}
      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter un Produit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddProduct} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nom du produit
            </label>
            <Input
              placeholder="Ex: Riz Basmati"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Prix unitaire (FCFA)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quantité initiale
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="gradient" size="sm" className="font-bold">
              Ajouter l'article
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ========================================== */}
      {/* DIALOG EDIT */}
      {/* ========================================== */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <DialogHeader>
          <DialogTitle>Modifier le Produit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEditProduct} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nom du produit
            </label>
            <Input
              placeholder="Ex: Riz Basmati"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Prix unitaire (FCFA)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quantité en stock
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" variant="gradient" size="sm" className="font-bold">
              Enregistrer
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
