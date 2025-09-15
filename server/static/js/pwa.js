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

const iosModal = document.createElement("div");
iosModal.innerHTML = `
  <div class="modal fade" id="iosModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Install on iOS</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>To install this app on iOS:</p>
          <ol>
            <li>Tap the <strong>Share</strong> icon</li>
            <li>Select <strong>"Add to Home Screen"</strong></li>
          </ol>
        </div>
      </div>
    </div>
  </div>
`;
document.body.appendChild(iosModal.firstElementChild);

installBtn.addEventListener("click", () => {
  if (platform === "android" && deferredPrompt) {
    deferredPrompt.prompt();
  } else {
    // Show Bootstrap modal
    const modal = new bootstrap.Modal(document.getElementById("iosModal"));
    modal.show();
  }
});
