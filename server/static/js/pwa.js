// for Add to Home Screen
const getPlatform = () => {
  const ua = window.navigator.userAgent;

  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
  return "desktop";
};

let deferredPrompt;
const installBtn = document.getElementById("installBtn");
const userAgent = navigator.userAgent.toLowerCase();
const platform = getPlatform();
console.debug(platform);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener("appinstalled", () => {
  installBtn.style.display = "none";
});

if (platform === "ios" || platform === "android") {
  installBtn.style.display = "inline-block";
}

installBtn.addEventListener("click", () => {
  if (platform === "android" && deferredPrompt) {
    deferredPrompt.prompt();
  } else {
    // Show Bootstrap modal
    const modal = new bootstrap.Modal(document.getElementById("iosModal"));
    modal.show();
  }
});
