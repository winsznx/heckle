"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletPill } from "@/components/WalletPill";
import { Divider } from "@/components/ui/Divider";

const LINKS = [
  { href: "/create", label: "Create" },
  { href: "/events/1", label: "Events" },
  { href: "/zero-cup", label: "Zero Cup" },
  { href: "/characters", label: "Characters" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-rule bg-paper sticky top-0 z-40">
      <div className="mx-auto max-w-content flex items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display text-2xl font-black tracking-tight"
          onClick={() => setOpen(false)}
        >
          Heckle
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-wide hover:-translate-y-px transition-transform"
            >
              {link.label}
            </Link>
          ))}
          <WalletPill />
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden border border-rule px-3 py-2 font-mono text-xs uppercase tracking-wide"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink opacity-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-64 bg-paper border-l border-rule flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-rule">
              <span className="font-display text-xl font-black">Heckle</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="border border-rule px-3 py-1 font-mono text-xs uppercase"
              >
                Close
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="font-mono text-sm uppercase tracking-wide"
                >
                  {link.label}
                </Link>
              ))}
              <Divider className="my-2" />
              <WalletPill />
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
