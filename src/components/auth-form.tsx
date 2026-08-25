"use client";

import { ButtonHTMLAttributes, forwardRef, InputHTMLAttributes, ReactNode } from "react";

export const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function AuthInput({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-[14px] text-text-primary placeholder-text-faint outline-none focus:border-text-primary transition-colors ${className}`}
        {...rest}
      />
    );
  },
);

export function AuthLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label className="text-sm font-medium text-text-secondary" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

interface AuthSubmitProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function AuthSubmit({ loading, disabled, children, className = "", ...rest }: AuthSubmitProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`h-11 w-full rounded-md bg-action-primary text-[14px] font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-action-primary/30 bg-action-primary-soft px-3 py-2 text-sm text-action-primary-text"
    >
      {message}
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm uppercase tracking-[0.12em] text-text-muted">
      <span className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
