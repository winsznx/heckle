"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { WalletPill } from "@/components/WalletPill";
import { Divider } from "@/components/ui/Divider";

const PRIMARY = [
  { href: "/zero-cup", label: "Zero Cup" },
  { href: "/events/world-cup", label: "World Cup" },
  { href: "/proof", label: "Proof" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/about", label: "About" },
] as const;

const ALL_LINKS = [
  { href: "/create", label: "Create" },
  { href: "/zero-cup", label: "Zero Cup" },
  { href: "/events/zero-cup-r16", label: "Zero Cup R16" },
  { href: "/events/world-cup", label: "World Cup" },
  { href: "/events/1", label: "Events" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/proof", label: "Proof" },
  { href: "/judge", label: "For judges" },
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

        <nav className="hidden lg:flex items-center gap-6">
          {PRIMARY.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-wide hover:-translate-y-px transition-transform"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/create">
            <Button size="sm">Create heckler</Button>
          </Link>
          <WalletPill />
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden border border-rule px-3 py-2 font-mono text-xs uppercase tracking-wide"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink opacity-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-64 bg-paper border-l border-rule flex flex-col overflow-y-auto">
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
              {ALL_LINKS.map((link) => (
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
