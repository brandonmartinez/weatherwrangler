import { STORAGE_KEYS } from './constants.js';

/**
 * Location management utilities
 */
export class LocationManager {
  constructor() {
    this.currentLocation = null;
  }

  /**
   * Get current location using browser geolocation
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          this.currentLocation = location;
          this.storeLocation(location);
          resolve(location);
        },
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
            default:
              errorMessage = "An unknown error occurred while retrieving location";
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Store location in localStorage
   */
  storeLocation(location) {
    try {
      localStorage.setItem(STORAGE_KEYS.WEATHER_LOCATION, JSON.stringify(location));
    } catch (error) {
      console.warn('Failed to store location:', error);
    }
  }

  /**
   * Get stored location from localStorage
   */
  getStoredLocation() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WEATHER_LOCATION);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to retrieve stored location:', error);
      return null;
    }
  }

  /**
   * Clear stored location
   */
  clearStoredLocation() {
    try {
      localStorage.removeItem(STORAGE_KEYS.WEATHER_LOCATION);
      this.currentLocation = null;
    } catch (error) {
      console.warn('Failed to clear stored location:', error);
    }
  }

  /**
   * Validate ZIP code format
   */
  static validateZipCode(zipCode) {
    const zipPattern = /^\d{5}(-\d{4})?$/;
    return zipPattern.test(zipCode.trim());
  }

  /**
   * Store ZIP code location
   */
  storeZipLocation(zipCode) {
    if (!LocationManager.validateZipCode(zipCode)) {
      throw new Error('Invalid ZIP code format');
    }

    const location = { zipCode: zipCode.trim() };
    this.storeLocation(location);
    return location;
  }

  /**
   * Get location type (coords or zip)
   */
  getLocationInfo(location = null) {
    const loc = location || this.getStoredLocation();
    if (!loc) return null;

    if (loc.zipCode) {
      return { type: 'zip', value: loc.zipCode };
    }

    if (loc.latitude && loc.longitude) {
      return { type: 'coords', value: { lat: loc.latitude, lon: loc.longitude } };
    }

    return null;
  }
}
