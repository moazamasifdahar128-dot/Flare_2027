import { lazy, Suspense, useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { Phone } from "@/components/shola/shell";
import { LangProvider } from "@/lib/shola/i18n";
import appCss from "../styles.css?url";

const PreviewHostBridge = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/preview-host-bridge").then((mod) => ({
        default: mod.PreviewHostBridge,
      })),
    )
  : null;

function FontAfterPaint() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

function ZoomLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.touchAction = "pan-x pan-y";
    document.body.style.touchAction = "pan-x pan-y";
    const block = (event: Event) => event.preventDefault();
    const pinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const keys = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "-" || event.key === "=" || event.key === "0")) event.preventDefault();
    };
    document.addEventListener("gesturestart", block, { capture: true });
    document.addEventListener("gesturechange", block, { capture: true });
    document.addEventListener("gestureend", block, { capture: true });
    document.addEventListener("touchstart", pinch, { passive: false, capture: true });
    document.addEventListener("touchmove", pinch, { passive: false, capture: true });
    document.addEventListener("wheel", wheel, { passive: false, capture: true });
    document.addEventListener("keydown", keys, { capture: true });
    return () => {
      document.removeEventListener("gesturestart", block, { capture: true });
      document.removeEventListener("gesturechange", block, { capture: true });
      document.removeEventListener("gestureend", block, { capture: true });
      document.removeEventListener("touchstart", pinch, { capture: true });
      document.removeEventListener("touchmove", pinch, { capture: true });
      document.removeEventListener("wheel", wheel, { capture: true });
      document.removeEventListener("keydown", keys, { capture: true });
    };
  }, []);
  return null;
}

function AppFrame() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/login") return <Outlet />;
  return (
    <Phone>
      <Outlet />
    </Phone>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Flare - Freelance Platform" },
      { name: "theme-color", content: "#000000" },
      { property: "og:title", content: "Flare" },
      { property: "og:image", content: "/icons/icon-512.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: () => (
    <html lang="en" dir="ltr" style={{ touchAction: "pan-x pan-y" }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body style={{ touchAction: "pan-x pan-y" }}>
        <ZoomLock />
        <FontAfterPaint />
        {PreviewHostBridge ? (
          <Suspense fallback={null}>
            <PreviewHostBridge />
          </Suspense>
        ) : null}
        <AuthProvider>
          <LangProvider>
            <AppFrame />
          </LangProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
