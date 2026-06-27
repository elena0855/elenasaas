"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ==========================================
// BUTTON
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
          {
            "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5":
              variant === "primary",
            "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:-translate-y-0.5":
              variant === "secondary",
            "bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700/80 hover:border-slate-600 hover:text-white hover:-translate-y-0.5":
              variant === "outline",
            "bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-white":
              variant === "ghost",
            "bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800/50":
              variant === "danger",
            "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-bold hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 hover:brightness-110 transition-all duration-200":
              variant === "gradient",
          },
          {
            "h-8 px-3 text-xs gap-1.5": size === "sm",
            "h-10 px-4 py-2 text-sm gap-2": size === "md",
            "h-12 px-6 text-base gap-2": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ==========================================
// INPUT
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 backdrop-blur-sm transition-all duration-200 focus:border-cyan-500/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-950/80 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ==========================================
// CARD
// ==========================================
export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-xl border border-slate-800/70 bg-slate-900/50 backdrop-blur-md shadow-xl text-slate-100 transition-all duration-300 hover:border-slate-700/70 hover:shadow-2xl hover:bg-slate-900/70",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-bold tracking-tight text-white font-grotesk", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-xs text-slate-400", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-6 pt-0 border-t border-slate-800/40 mt-4", className)} {...props} />
);

// ==========================================
// TABLE
// ==========================================
export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto rounded-lg border border-slate-800/60 bg-slate-950/20 backdrop-blur-sm">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("[&_tr]:border-b border-slate-800/60 bg-slate-900/40", className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      "border-b border-slate-800/30 transition-colors duration-150 hover:bg-slate-900/40 data-[state=selected]:bg-slate-900",
      className
    )}
    {...props}
  />
);

export const TableHead = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-11 px-4 text-left align-middle text-[11px] font-semibold text-slate-500 uppercase tracking-wider",
      className
    )}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn("p-4 align-middle text-slate-300", className)}
    {...props}
  />
);

// ==========================================
// BADGE
// ==========================================
export const Badge = ({
  className,
  variant = "info",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "warning" | "danger" | "info" | "outline";
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors",
        {
          "bg-emerald-950/50 text-emerald-400 border-emerald-800/40": variant === "success",
          "bg-amber-950/50 text-amber-400 border-amber-800/40": variant === "warning",
          "bg-red-950/50 text-red-400 border-red-800/40": variant === "danger",
          "bg-cyan-950/50 text-cyan-400 border-cyan-800/40": variant === "info",
          "text-slate-400 border-slate-700 bg-transparent": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
};

// ==========================================
// TOAST SYSTEM
// ==========================================
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let currentToasts: Toast[] = [];

export const toast = {
  show(message: string, type: Toast["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    currentToasts = [{ id, message, type }, ...currentToasts].slice(0, 5);
    toastListeners.forEach((fn) => fn([...currentToasts]));
    setTimeout(() => {
      currentToasts = currentToasts.filter((t) => t.id !== id);
      toastListeners.forEach((fn) => fn([...currentToasts]));
    }, 4000);
  },
  success(msg: string) { this.show(msg, "success"); },
  error(msg: string) { this.show(msg, "error"); },
  info(msg: string) { this.show(msg, "info"); },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl backdrop-blur-xl max-w-xs pointer-events-auto animate-slide-right",
            {
              "bg-emerald-950/90 border-emerald-700/50 text-emerald-300": t.type === "success",
              "bg-red-950/90 border-red-700/50 text-red-300": t.type === "error",
              "bg-slate-900/90 border-slate-700/60 text-slate-200": t.type === "info",
            }
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// SHEET (Drawer)
// ==========================================
interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Sheet = ({ isOpen, onClose, children }: SheetProps) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-md border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl p-6 shadow-2xl flex flex-col text-slate-100 animate-slide-right">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 opacity-60 hover:opacity-100 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-left mb-6", className)} {...props} />
);

export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-bold text-white font-grotesk", className)} {...props} />
);

export const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-slate-400", className)} {...props} />
);

// ==========================================
// DIALOG (Modal)
// ==========================================
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Dialog = ({ isOpen, onClose, children }: DialogProps) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl text-slate-100 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 opacity-60 hover:opacity-100 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left mb-5", className)} {...props} />
);

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-xl font-bold text-white font-grotesk", className)} {...props} />
);
