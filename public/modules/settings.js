import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants.js';

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
