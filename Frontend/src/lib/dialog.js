export function closeFromBackdrop(event, onClose, disabled = false) {
  if (disabled || typeof onClose !== "function") return;
  const element = event.currentTarget;
  if (element instanceof HTMLDialogElement) {
    const bounds = element.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) onClose();
    return;
  }
  if (event.target === element) onClose();
}
