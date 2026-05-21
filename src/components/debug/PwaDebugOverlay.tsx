import { useEffect, useMemo, useState } from "react";

type ThemeMeta = {
  content: string | null;
  media: string | null;
  runtime: string | null;
};

type Diagnostics = {
  displayModeStandalone: boolean;
  navigatorStandalone: boolean | null;
  htmlHasPwaStandalone: boolean;
  htmlHasIosPwa: boolean;
  htmlHasDark: boolean;
  userAgent: string;
  href: string;
  viewportWidth: number;
  viewportHeight: number;
  visualViewportWidth: number | null;
  visualViewportHeight: number | null;
  safeAreaTopVar: string;
  safeAreaBottomVar: string;
  appSafeAreaTopVar: string;
  colorBackgroundVar: string;
  backgroundVar: string;
  htmlBackgroundColor: string;
  bodyBackgroundColor: string;
  appShellSafeBackgroundColor: string | null;
  appTopHeaderBackgroundColor: string | null;
  appTopHeaderBackdropFilter: string | null;
  appTopHeaderWebkitBackdropFilter: string | null;
  appTopHeaderPaddingTop: string | null;
  themeMetaTags: ThemeMeta[];
  appleMobileWebAppCapable: string | null;
  appleMobileWebAppStatusBarStyle: string | null;
  timestamp: string;
};

function collectDiagnostics(): Diagnostics {
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  const bodyStyle = getComputedStyle(document.body);
  const appShellSafe = document.querySelector<HTMLElement>(".app-shell-safe");
  const appTopHeader = document.querySelector<HTMLElement>(".app-top-header");
  const appShellSafeStyle = appShellSafe ? getComputedStyle(appShellSafe) : null;
  const appTopHeaderStyle = appTopHeader ? getComputedStyle(appTopHeader) : null;
  const themeMetaTags = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')).map((meta) => ({
    content: meta.getAttribute("content"),
    media: meta.getAttribute("media"),
    runtime: meta.dataset.runtime ?? null,
  }));

  return {
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
    navigatorStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone ?? null,
    htmlHasPwaStandalone: root.classList.contains("pwa-standalone"),
    htmlHasIosPwa: root.classList.contains("ios-pwa"),
    htmlHasDark: root.classList.contains("dark"),
    userAgent: window.navigator.userAgent,
    href: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    visualViewportWidth: window.visualViewport?.width ?? null,
    visualViewportHeight: window.visualViewport?.height ?? null,
    safeAreaTopVar: rootStyle.getPropertyValue("--safe-area-top").trim(),
    safeAreaBottomVar: rootStyle.getPropertyValue("--safe-area-bottom").trim(),
    appSafeAreaTopVar: rootStyle.getPropertyValue("--app-safe-area-top").trim(),
    colorBackgroundVar: rootStyle.getPropertyValue("--color-background").trim(),
    backgroundVar: rootStyle.getPropertyValue("--background").trim(),
    htmlBackgroundColor: rootStyle.backgroundColor,
    bodyBackgroundColor: bodyStyle.backgroundColor,
    appShellSafeBackgroundColor: appShellSafeStyle?.backgroundColor ?? null,
    appTopHeaderBackgroundColor: appTopHeaderStyle?.backgroundColor ?? null,
    appTopHeaderBackdropFilter: appTopHeaderStyle?.backdropFilter ?? null,
    appTopHeaderWebkitBackdropFilter: appTopHeaderStyle?.getPropertyValue("-webkit-backdrop-filter") ?? null,
    appTopHeaderPaddingTop: appTopHeaderStyle?.paddingTop ?? null,
    themeMetaTags,
    appleMobileWebAppCapable: document
      .querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-capable"]')
      ?.getAttribute("content") ?? null,
    appleMobileWebAppStatusBarStyle: document
      .querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.getAttribute("content") ?? null,
    timestamp: new Date().toISOString(),
  };
}

function isEnabledByUrl(): boolean {
  return window.location.search.includes("pwaDebug=1") || window.location.hash.includes("pwaDebug");
}

function isDebugEnabled(): boolean {
  return isEnabledByUrl() || window.localStorage.getItem("pwaDebug") === "1";
}

export function PwaDebugOverlay() {
  const enabled = useMemo(() => {
    const urlEnabled = isEnabledByUrl();
    if (urlEnabled) {
      window.localStorage.setItem("pwaDebug", "1");
    }
    return isDebugEnabled();
  }, []);
  const [visible, setVisible] = useState(enabled);
  const [diag, setDiag] = useState<Diagnostics | null>(null);

  useEffect(() => {
    if (!visible) return;

    const refresh = () => setDiag(collectDiagnostics());
    refresh();

    const onResize = () => refresh();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <aside
      style={{
        position: "fixed",
        right: "12px",
        bottom: "12px",
        zIndex: 99999,
        width: "min(420px, calc(100vw - 24px))",
        maxHeight: "50vh",
        overflow: "auto",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#e2e8f0",
        border: "1px solid rgba(148, 163, 184, 0.45)",
        borderRadius: "10px",
        padding: "10px",
        fontSize: "11px",
        lineHeight: 1.4,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>PWA Debug</strong>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setDiag(collectDiagnostics())}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.55)",
              background: "rgba(30, 41, 59, 0.9)",
              color: "#f8fafc",
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem("pwaDebug");
              setVisible(false);
            }}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.55)",
              background: "rgba(51, 65, 85, 0.95)",
              color: "#f8fafc",
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Disable
          </button>
        </div>
      </div>

      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {diag ? JSON.stringify(diag, null, 2) : "Loading diagnostics..."}
      </pre>
    </aside>
  );
}
