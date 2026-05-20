import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";
import { applyThemeMode, getPreferredThemeMode } from "@/lib/theme-mode";

const router = getRouter();
const standaloneMedia = window.matchMedia("(display-mode: standalone)");
const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
const isStandalone = standaloneMedia.matches || iosNavigator.standalone === true;
const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const initialIsDark = getPreferredThemeMode();
applyThemeMode(initialIsDark);

if (isStandalone) {
  document.documentElement.classList.add("pwa-standalone");
  if (isIos) document.documentElement.classList.add("ios-pwa");
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);


if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  });
}
