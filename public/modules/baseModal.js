/**
 * Base modal class for consistent modal behavior
 */
export class BaseModal {
  constructor(domManager, modalId) {
    this.domManager = domManager;
    this.modalId = modalId;
    this.isOpen = false;
  }

  /**
   * Toggle modal visibility
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open modal
   */
  open() {
    const modal = this.domManager.getElement(this.modalId);
    if (!modal) return;

    // Show modal
    modal.style.display = "flex";
    this.isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Call subclass hook
    this.onOpen();
  }

  /**
   * Close modal
   */
  close() {
    const modal = this.domManager.getElement(this.modalId);
    if (!modal) return;

    modal.style.display = "none";
    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = "auto";

    // Call subclass hook
    this.onClose();
  }

  /**
   * Handle clicking outside modal to close
   */
  handleBackdropClick(event) {
    if (event.target.id === this.modalId) {
      this.close();
    }
  }

  /**
   * Handle escape key to close modal
   */
  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  /**
   * Hook called when modal is opened (override in subclasses)
   */
  onOpen() {
    // Default implementation - focus on first input
    const firstInput = this.getFirstInput();
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  /**
   * Hook called when modal is closed (override in subclasses)
   */
  onClose() {
    // Override in subclasses if needed
  }

  /**
   * Get the first input element in the modal
   */
  getFirstInput() {
    const modal = this.domManager.getElement(this.modalId);
    if (!modal) return null;

    const inputs = modal.querySelectorAll('input, select, textarea');
    return inputs.length > 0 ? inputs[0] : null;
  }
}
