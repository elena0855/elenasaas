"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ iconOnly = false, size = "md", className, ...props }: LogoProps) => {
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex items-center space-x-3 select-none", className)} {...props}>
      {/* Icon with custom glow styling */}
      <div className={cn("relative flex items-center justify-center", iconSizes[size])}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full drop-shadow-[0_0_12px_rgba(6,182,212,0.65)] hover:scale-105 transition-transform duration-300"
        >
          {/* Gradients definition */}
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" /> {/* Cyan */}
              <stop offset="100%" stopColor="#10B981" /> {/* Emerald Green */}
            </linearGradient>
          </defs>

          {/* 3 Horizontal bars of E */}
          <rect x="15" y="20" width="45" height="10" rx="3" fill="url(#logo-gradient)" />
          <rect x="15" y="45" width="35" height="10" rx="3" fill="url(#logo-gradient)" />
          <rect x="15" y="70" width="45" height="10" rx="3" fill="url(#logo-gradient)" />

          {/* Gradient Arrow wrapping or pointing right-up */}
          <path
            d="M75 50L55 30V42H48V58H55V70L75 50Z"
            fill="url(#logo-gradient)"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Brand Name */}
      {!iconOnly && (
        <span
          className={cn(
            "font-grotesk font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300",
            textSizes[size]
          )}
        >
          ELENA
          <span className="text-cyan-500 font-normal">.</span>
        </span>
      )}
    </div>
  );
};
export default Logo;
