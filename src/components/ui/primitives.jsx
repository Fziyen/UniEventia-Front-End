import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button-primary",
      secondary: "ui-button-secondary",
      ghost: "ui-button-ghost",
      destructive: "ui-button-destructive",
      outline: "ui-button-outline",
    },
    size: {
      default: "ui-button-default",
      icon: "ui-button-icon",
      sm: "ui-button-sm",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }) {
  return <section className={cn("ui-card", className)} {...props} />;
}

export function Input({ className, ...props }) {
  return <input className={cn("ui-input", className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return (
    <textarea className={cn("ui-input ui-textarea", className)} {...props} />
  );
}

export function Badge({ className, variant = "muted", ...props }) {
  return (
    <span
      className={cn("ui-badge", `ui-badge-${variant}`, className)}
      {...props}
    />
  );
}

export function Avatar({ src, alt = "", fallback, className }) {
  return (
    <span className={cn("ui-avatar", className)}>
      {src ? <img src={src} alt={alt} /> : <span>{fallback || "?"}</span>}
    </span>
  );
}

export function Separator({ className }) {
  return <div className={cn("ui-separator", className)} />;
}
