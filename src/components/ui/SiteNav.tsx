"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, CornerDownRight, LogOut, Menu, NotebookPen, Settings, UserRound, X } from "lucide-react";
import RollLabel from "@/components/ui/RollLabel";
import { signOutAction } from "@/app/actions/session";

type NavLink = { href: string; label: string };

const LEARNER_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/paths", label: "Learning Paths" },
  { href: "/homework", label: "Homework" },
  { href: "/ctf", label: "CTF" },
];

function isActive(pathname: string, current: string, href: string) {
  if (current === href) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNav({ current, userId }: { current: string; userId: string }) {
  const pathname = usePathname();
  const isAdmin = userId === "admin";
  const links = isAdmin ? [...LEARNER_LINKS, { href: "/admin/creator", label: "Creator" }] : LEARNER_LINKS;

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Compact, more opaque bar once the page scrolls.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 12);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Close menus after navigating (adjusted during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
    setAccountOpen(false);
  }

  // Mobile menu: lock page scroll, focus the first link, Escape closes.
  useEffect(() => {
    if (!menuOpen) return;
    const lenis = window.__cyberboxLenis;
    lenis?.stop();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      lenis?.start();
    };
  }, [menuOpen]);

  // Account dropdown: close on outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const initial = userId.slice(0, 1).toUpperCase();

  return (
    <header className="ui-nav" data-scrolled={scrolled || undefined} data-menu-open={menuOpen || undefined}>
      <div className="ui-nav-inner">
        <Link href="/dashboard" className="ui-brand" aria-label="Cyber Box home">
          <span className="ui-brand-mark" aria-hidden="true">
            <Box size={18} strokeWidth={1.8} />
          </span>
          <span className="ui-brand-word">
            Cyber <span>Box</span>
          </span>
        </Link>

        <nav className="ui-nav-bar" aria-label="Main navigation">
          <ul className="ui-nav-links">
            {links.map(({ href, label }) => {
              const active = isActive(pathname, current, href);
              return (
                <li key={href}>
                  <Link href={href} className="ui-nav-link" aria-current={active ? "page" : undefined}>
                    <RollLabel text={label} />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ui-nav-account" ref={accountRef}>
            <button
              type="button"
              className="ui-nav-link ui-nav-account-toggle"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className="ui-avatar" aria-hidden="true">{initial}</span>
              <span className="ui-nav-account-name">{userId}</span>
              <span className="ui-plus" aria-hidden="true">+</span>
            </button>

            {accountOpen && (
              <div className="ui-dropdown" role="menu" aria-label="Account">
                <Link href="/profile" className="ui-dropdown-item" role="menuitem">
                  <UserRound size={16} aria-hidden="true" />
                  <span>
                    <strong>Profile</strong>
                    <small>Your XP, level and activity</small>
                  </span>
                </Link>
                {isAdmin && (
                  <Link href="/admin/settings" className="ui-dropdown-item" role="menuitem">
                    <Settings size={16} aria-hidden="true" />
                    <span>
                      <strong>Admin settings</strong>
                      <small>Progress records and resets</small>
                    </span>
                  </Link>
                )}
                <form action={signOutAction}>
                  <button type="submit" className="ui-dropdown-item" role="menuitem">
                    <LogOut size={16} aria-hidden="true" />
                    <span>
                      <strong>Sign out</strong>
                      <small>Switch account</small>
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>

          <Link href="/paths" className="ui-btn ui-btn-primary ui-btn-sm ui-nav-cta">
            <CornerDownRight size={14} aria-hidden="true" />
            <RollLabel text="Continue learning" />
          </Link>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="ui-nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="ui-mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      <div id="ui-mobile-menu" className="ui-mobile-menu" ref={menuRef} hidden={!menuOpen}>
        <nav aria-label="Main navigation (mobile)">
          <ol className="ui-mobile-links">
            {[...links, { href: "/profile", label: "Profile" }].map(({ href, label }, index) => {
              const active = isActive(pathname, current, href);
              return (
                <li key={href} style={{ "--i": index } as CSSProperties}>
                  <Link href={href} aria-current={active ? "page" : undefined}>
                    <span className="ui-mobile-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="ui-mobile-footer">
          <span className="ui-mobile-user">
            <span className="ui-avatar" aria-hidden="true">{initial}</span>
            Signed in as <strong>{userId}</strong>
          </span>
          <div className="ui-mobile-actions">
            {isAdmin && (
              <Link href="/admin/settings" className="ui-btn ui-btn-ghost ui-btn-sm">
                <NotebookPen size={14} aria-hidden="true" />
                Admin settings
              </Link>
            )}
            <form action={signOutAction}>
              <button type="submit" className="ui-btn ui-btn-ghost ui-btn-sm">
                <LogOut size={14} aria-hidden="true" />
                Sign out
              </button>
            </form>
            <Link href="/paths" className="ui-btn ui-btn-primary ui-btn-sm">
              <CornerDownRight size={14} aria-hidden="true" />
              Continue learning
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
