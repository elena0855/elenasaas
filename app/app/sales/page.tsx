"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getProducts } from "@/app/actions/products";
import { processSaleTransaction } from "@/app/actions/sales";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Badge,
} from "@/components/ui/index";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number; // Stock quantity
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number; // Cart quantity
}

export default function SalesPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
          { id: "prod-1", name: "Riz Basmati", price: 3.50, quantity: 15 },
          { id: "prod-2", name: "Huile d'olive", price: 8.90, quantity: 8 },
          { id: "prod-3", name: "Café Arabica", price: 4.20, quantity: 3 }
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

  // Add item to cart
  const addToCart = (product: Product) => {
    setError(null);
    setSuccess(false);
    
    // Check stock limit
    if (product.quantity <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      
      if (existing) {
        if (existing.quantity >= product.quantity) {
          setError(`Stock maximum atteint pour ${product.name} (${product.quantity} disponibles)`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      return [...prevCart, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  // Decrement item quantity in cart
  const decrementQty = (productId: string) => {
    setError(null);
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.id === productId);
      if (item && item.quantity > 1) {
        return prevCart.map((i) => (i.id === productId ? { ...i, quantity: i.quantity - 1 } : i));
      }
      return prevCart.filter((i) => i.id !== productId);
    });
  };

  // Increment item quantity in cart
  const incrementQty = (productId: string) => {
    setError(null);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prevCart) => {
      const item = prevCart.find((i) => i.id === productId);
      if (item) {
        if (item.quantity >= product.quantity) {
          setError(`Stock maximum atteint pour ${product.name} (${product.quantity} disponibles)`);
          return prevCart;
        }
        return prevCart.map((i) => (i.id === productId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return prevCart;
    });
  };

  // Remove item completely from cart
  const deleteFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((i) => i.id !== productId));
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Validate sale
  const handleValidateSale = async () => {
    if (!user) return;
    if (cart.length === 0) return;
    if (!clientName.trim()) {
      setError("Le nom du client est requis.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = (await processSaleTransaction(user.uid, cart, clientName)) as {
        success: boolean;
        error?: string;
      };
      if (res.success) {
        setSuccess(true);
        setCart([]);
        setClientName("");
        fetchProducts();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(res.error || "La vente a échoué.");
      }
    } catch (err: any) {
      console.warn("Server sale failed, falling back to local storage validation:", err);
      try {
        const storedProducts = localStorage.getItem(`products_${user.uid}`);
        if (!storedProducts) {
          throw new Error("Catalogue de produits introuvable.");
        }
        const localProducts = JSON.parse(storedProducts) as Product[];

        for (const item of cart) {
          const prod = localProducts.find((p) => p.id === item.id);
          if (!prod) {
            throw new Error(`Le produit "${item.name}" n'existe plus.`);
          }
          if (prod.quantity < item.quantity) {
            throw new Error(`Stock insuffisant pour "${item.name}". Dispo: ${prod.quantity}, Demandé: ${item.quantity}`);
          }
        }

        const updatedProducts = localProducts.map((prod) => {
          const cartItem = cart.find((c) => c.id === prod.id);
          if (cartItem) {
            return {
              ...prod,
              quantity: prod.quantity - cartItem.quantity,
            };
          }
          return prod;
        });

        localStorage.setItem(`products_${user.uid}`, JSON.stringify(updatedProducts));
        setProducts(updatedProducts);

        setSuccess(true);
        setCart([]);
        setClientName("");
        setTimeout(() => setSuccess(false), 3000);
      } catch (localErr: any) {
        setError(localErr.message || "Erreur lors de la validation locale.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
      {/* LEFT COLUMN: Inventory Selection (8/12 width) */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
          <CardHeader className="pb-4 border-b border-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Articles Disponibles</CardTitle>
              <CardDescription>Cliquez pour ajouter l'article au panier</CardDescription>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950/40"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500">Chargement des articles...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Aucun produit disponible.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isOut = p.quantity <= 0;
                  const inCartQty = cart.find((i) => i.id === p.id)?.quantity || 0;
                  const maxedOut = inCartQty >= p.quantity;

                  return (
                    <button
                      key={p.id}
                      disabled={isOut || maxedOut}
                      onClick={() => addToCart(p)}
                      className={`p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-32 select-none relative ${
                        isOut
                          ? "bg-slate-950/40 border-slate-900 opacity-40 cursor-not-allowed"
                          : maxedOut
                          ? "bg-slate-900/20 border-cyan-900/30 opacity-70 cursor-not-allowed"
                          : "bg-slate-900/40 hover:bg-slate-900/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="w-full flex items-start justify-between">
                        <span className="font-bold text-slate-100 truncate pr-2">{p.name}</span>
                        {inCartQty > 0 && (
                          <Badge variant="info" className="shrink-0 font-mono">
                            {inCartQty} dans panier
                          </Badge>
                        )}
                      </div>

                      <div className="w-full flex items-end justify-between mt-auto">
                        <span className="text-lg font-bold font-mono text-cyan-400">
                          {p.price.toFixed(0)} FCFA
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Stock: {p.quantity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Shopping Cart Overview (5/12 width) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl flex flex-col h-[580px]">
          <CardHeader className="pb-4 border-b border-slate-900/60 flex flex-row items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Panier de Vente</CardTitle>
              <CardDescription>Composition de la transaction</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Error or Success banners */}
            {error && (
              <div className="p-3 text-xs bg-red-950/40 border border-red-800/40 text-red-400 rounded-lg mb-4 flex items-center space-x-2 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-lg mb-4 flex items-center space-x-2 shrink-0">
                <Check className="h-4 w-4 shrink-0" />
                <span>Vente enregistrée avec succès !</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                  <ShoppingCart className="h-10 w-10 text-slate-850 mb-2" />
                  <p className="text-sm">Le panier est vide.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Sélectionnez des articles dans la colonne de gauche.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-950/40 border border-slate-900 flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                      <span className="text-xs text-cyan-400/80 font-mono">
                        {item.price.toFixed(0)} FCFA / unité
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-slate-900 border border-slate-850 rounded-lg h-8">
                        <button
                          onClick={() => decrementQty(item.id)}
                          className="px-2 hover:text-white text-slate-400"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-mono text-xs text-slate-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => incrementQty(item.id)}
                          className="px-2 hover:text-white text-slate-400"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-red-400 hover:bg-slate-900/60"
                        onClick={() => deleteFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total, Client Input, and Checkout Actions */}
            <div className="pt-4 border-t border-slate-900 space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400 font-medium">Montant Total</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {cartTotal.toFixed(0)} FCFA
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nom du Client
                </label>
                <Input
                  placeholder="Ex: Jean Dupont"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={cart.length === 0 || submitting}
                  required
                />
              </div>

              <Button
                variant="gradient"
                className="w-full py-6 flex items-center justify-center space-x-2 text-slate-950 font-bold"
                onClick={handleValidateSale}
                disabled={cart.length === 0 || submitting || !clientName.trim()}
              >
                {submitting ? (
                  <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Enregistrer la Vente</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
