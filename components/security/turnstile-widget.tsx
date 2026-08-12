"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render(container: HTMLElement, options: Record<string, unknown>): string; remove(widgetId: string): void };
  }
}

export function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const labelId = useId();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
        theme: "light",
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-mymz-turnstile="true"]');
    if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.mymzTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    render();
    return () => { cancelled = true; if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); widgetId.current = null; };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div aria-labelledby={labelId}><p id={labelId} className="mb-2 text-xs font-semibold text-slate-500">Security check</p><div ref={container} /></div>;
}
