/**
 * MemoKit - in-page replacement for alert()/confirm().
 * Builds its own DOM on first use; styles live in shared/dialog.css.
 */

let overlay = null;

function ensureDialog() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "custom-dialog-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = `
    <div class="custom-dialog-box" role="dialog" aria-modal="true">
      <h3 class="custom-dialog-title"></h3>
      <p class="custom-dialog-message"></p>
      <div class="custom-dialog-actions">
        <button class="btn-dialog secondary" data-result="false">Cancel</button>
        <button class="btn-dialog primary" data-result="true">OK</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function show(title, message, isConfirm) {
  const el = ensureDialog();
  const cancelBtn = el.querySelector('[data-result="false"]');
  const confirmBtn = el.querySelector('[data-result="true"]');

  el.querySelector(".custom-dialog-title").textContent = title;
  el.querySelector(".custom-dialog-message").textContent = message;
  cancelBtn.style.display = isConfirm ? "inline-block" : "none";

  return new Promise((resolve) => {
    const finish = (result) => {
      el.classList.remove("show");
      setTimeout(() => { el.style.display = "none"; }, 200);
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    };
    const onConfirm = () => finish(true);
    const onCancel = () => finish(false);

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);

    el.style.display = "flex";
    void el.offsetWidth; // force reflow so the transition runs
    el.classList.add("show");
    confirmBtn.focus();
  });
}

/** Show a message with a single OK button. */
export const showAlert = (title, message) => show(title, message, false);

/** Ask for confirmation. Resolves to true (OK) or false (Cancel). */
export const showConfirm = (title, message) => show(title, message, true);
