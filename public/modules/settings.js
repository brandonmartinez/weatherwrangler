import { DEFAULT_SETTINGS, STORAGE_KEYS, DOM_ELEMENTS } from './constants.js';
import { BaseModal } from './baseModal.js';

/**
 * Settings management utilities
 */
export class SettingsManager {
  static getSettings() {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch (e) {
        console.warn("Failed to parse stored settings, using defaults");
      }
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings) {
    // Validate settings before saving
    const validatedSettings = this.validateSettings(settings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(validatedSettings));
    return validatedSettings;
  }

  static validateSettings(settings) {
    const validated = { ...settings };

    // Ensure numeric values are within reasonable ranges
    validated.tempThresholdTopOff = Math.max(20, Math.min(100, Number(validated.tempThresholdTopOff) || DEFAULT_SETTINGS.tempThresholdTopOff));
    validated.tempThresholdDoorsOff = Math.max(20, Math.min(100, Number(validated.tempThresholdDoorsOff) || DEFAULT_SETTINGS.tempThresholdDoorsOff));
    validated.rainChanceThreshold = Math.max(0, Math.min(100, Number(validated.rainChanceThreshold) || DEFAULT_SETTINGS.rainChanceThreshold));
    validated.windSpeedThreshold = Math.max(0, Math.min(50, Number(validated.windSpeedThreshold) || DEFAULT_SETTINGS.windSpeedThreshold));

    return validated;
  }

  static resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
}

/**
 * Settings modal management
 */
export class SettingsModal extends BaseModal {
  constructor(domManager, settingsManager, onSettingsChange) {
    super(domManager, DOM_ELEMENTS.settingsModal);
    this.settingsManager = settingsManager;
    this.onSettingsChange = onSettingsChange;
  }

  /**
   * Hook called when modal is opened
   */
  onOpen() {
    // Populate with current values
    const settings = this.settingsManager.getSettings();
    this.domManager.populateSettingsForm(settings);

    // Focus on first input for accessibility
    const firstInput = this.domManager.getElement(DOM_ELEMENTS.tempTopOff);
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
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
   * Handle reset to defaults button click
   */
  handleReset() {
    // Reset settings to defaults
    const defaultSettings = SettingsManager.resetToDefaults();

    // Update the form with default values
    this.domManager.populateSettingsForm(defaultSettings);

    // Notify about settings change
    if (this.onSettingsChange) {
      this.onSettingsChange(defaultSettings);
    }
  }
}