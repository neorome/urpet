const HINT_KEY = "urpet-install-hint-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: minimal-ui)").matches
    || window.navigator.standalone === true;
}

function isIosShareInstall() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

function ensureBanner(className, { live = "polite" } = {}) {
  let banner = document.querySelector(`.${className}`);
  if (banner) return banner;
  banner = document.createElement("aside");
  banner.className = className;
  banner.hidden = true;
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-live", live);
  document.body.prepend(banner);
  return banner;
}

const SHELL_VERSION = "urpet-shell-20260825b";

function dropPosterCaches() {
  if (!("caches" in window)) return Promise.resolve();
  return caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("urpet-shell-") && key !== SHELL_VERSION).map((key) => caches.delete(key))
  ));
}

function requestWorkerUpdate() {
  return navigator.serviceWorker.getRegistration("/").then((registration) => registration?.update());
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", () => {
    dropPosterCaches().catch(() => {});
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestWorkerUpdate()?.catch(() => {});
  });
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "urpet-reload") window.location.reload();
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (window.sessionStorage.getItem("urpet-sw-reload")) return;
    try {
      window.sessionStorage.setItem("urpet-sw-reload", "1");
    } catch {
      // Reload once even if session storage is blocked.
    }
    window.location.reload();
  });
}

function watchOffline() {
  const banner = ensureBanner("offline-banner");
  const sync = () => {
    banner.hidden = navigator.onLine;
    banner.textContent = navigator.onLine
      ? ""
      : "You are offline. The matcher still works from this device; maps, sources, and the optional guide need a connection.";
  };
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
}

function markStandalone() {
  if (isStandalone()) document.documentElement.classList.add("is-standalone");
}

function dismissHint(banner) {
  banner.hidden = true;
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    // Private storage can block the dismissal flag; hiding for this visit is enough.
  }
}

function hintCopy(deferredPrompt) {
  if (deferredPrompt) {
    return {
      title: "Keep this brief on your home screen",
      body: "Install urpet as an app to reopen the matcher offline. Nothing is uploaded.",
      action: "add to this device"
    };
  }
  if (isIosShareInstall()) {
    return {
      title: "Keep urpet on this iPhone or iPad",
      body: "Use Share, then Add to Home Screen. The matcher stays on this device and works offline.",
      action: ""
    };
  }
  return {
    title: "Use urpet like an app",
    body: "Your browser can add urpet to the dock or home screen. The matcher stays free, anonymous, and usable offline.",
    action: ""
  };
}

export function showInstallHint({ force = false } = {}) {
  if (isStandalone()) return;
  try {
    if (!force && window.localStorage.getItem(HINT_KEY)) return;
  } catch {
    // Continue without a stored dismissal.
  }

  const banner = ensureBanner("pwa-hint");
  const copy = hintCopy(window.urpetInstallPrompt);
  banner.replaceChildren();

  const text = document.createElement("div");
  const title = document.createElement("strong");
  const body = document.createElement("p");
  title.textContent = copy.title;
  body.textContent = copy.body;
  text.append(title, body);

  const actions = document.createElement("div");
  actions.className = "pwa-hint__actions";
  if (copy.action && window.urpetInstallPrompt) {
    const installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "button button--secondary";
    installButton.textContent = copy.action;
    installButton.addEventListener("click", async () => {
      const prompt = window.urpetInstallPrompt;
      if (!prompt) return;
      window.urpetInstallPrompt = null;
      await prompt.prompt();
      dismissHint(banner);
    });
    actions.append(installButton);
  }
  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "button button--text";
  dismissButton.textContent = "not now";
  dismissButton.addEventListener("click", () => dismissHint(banner));
  actions.append(dismissButton);

  banner.append(text, actions);
  banner.hidden = false;
}

function listenForInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.urpetInstallPrompt = event;
  });
}

registerServiceWorker();
markStandalone();
watchOffline();
listenForInstallPrompt();
