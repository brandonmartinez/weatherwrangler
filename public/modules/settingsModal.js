import { DOM_ELEMENTS } from './constants.js';

/**
 * Settings modal management
 */
export class SettingsModal {
  constructor(domManager, settingsManager, onSettingsChange) {
    this.domManager = domManager;
    this.settingsManager = settingsManager;
    this.onSettingsChange = onSettingsChange;
    this.isOpen = false;
  }

  /**
   * Toggle settings modal visibility
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open settings modal
   */
  open() {
    const settingsModal = this.domManager.getElement(DOM_ELEMENTS.settingsModal);
    if (!settingsModal) return;

    // Show modal
    settingsModal.style.display = "flex";
    this.isOpen = true;

    // Populate with current values
    const settings = this.settingsManager.getSettings();
    this.domManager.populateSettingsForm(settings);

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Focus on first input for accessibility
    const firstInput = this.domManager.getElement(DOM_ELEMENTS.tempTopOff);
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  /**
   * Close settings modal
   */
  close() {
    const settingsModal = this.domManager.getElement(DOM_ELEMENTS.settingsModal);
    if (!settingsModal) return;

    settingsModal.style.display = "none";
    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = "auto";
  }

  /**
   * Handle settings form submission
   */
  handleSubmit(event) {
    event.preventDefault();

    try {
      const newSettings = this.domManager.getSettingsFromForm();
      const validatedSettings = this.settingsManager.saveSettings(newSettings);

      this.close();

      // Notify about settings change
      if (this.onSettingsChange) {
        this.onSettingsChange(validatedSettings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Could show an error message to user here
    }
  }

  /**
   * Handle clicking outside modal to close
   */
  handleBackdropClick(event) {
    if (event.target.id === DOM_ELEMENTS.settingsModal) {
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
}
