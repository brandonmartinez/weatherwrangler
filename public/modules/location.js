import { STORAGE_KEYS } from './constants.js';
import { BaseModal } from './baseModal.js';
import { analytics } from './analytics.js';

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

          analytics.trackLocationChange('geolocation_success', `${position.coords.latitude},${position.coords.longitude}`);
          analytics.trackEngagement('geolocation_granted');

          this.currentLocation = location;
          this.storeLocation(location);
          resolve(location);
        },
        (error) => {
          let errorMessage;
          let errorType = 'geolocation_error';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              errorType = 'geolocation_denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable";
              errorType = 'geolocation_unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              errorType = 'geolocation_timeout';
              break;
            default:
              errorMessage = "An unknown error occurred while retrieving location";
              errorType = 'geolocation_unknown';
              break;
          }

          analytics.trackError(errorType, errorMessage);
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

/**
 * Location modal management
 */
export class LocationModal extends BaseModal {
  constructor(domManager, locationManager) {
    super(domManager, 'locationModal');
    this.locationManager = locationManager;
  }

  /**
   * Hook called when modal is opened
   */
  onOpen() {
    // Focus on zipcode input for accessibility
    const zipcodeInput = this.domManager.getElement('zipcode');
    if (zipcodeInput) {
      setTimeout(() => zipcodeInput.focus(), 100);
    }
  }

  /**
   * Handle location form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    try {
      const zipCode = this.domManager.getElement('zipcode').value;
      if (!zipCode) {
        alert('Please enter a valid ZIP code.');
        return;
      }

      if (!LocationManager.validateZipCode(zipCode)) {
        alert('Please enter a valid 5-digit ZIP code.');
        return;
      }

      const location = this.locationManager.storeZipLocation(zipCode);
      analytics.trackLocationChange('zip_code_modal', zipCode);
      analytics.trackModalInteraction('location', 'submit');
      this.close();

      // Trigger weather refresh after location change
      if (window.weatherApp) {
        await window.weatherApp.fetchWeatherForLocation(location);
      }

      console.log('Location updated:', location);
    } catch (error) {
      console.error('Error updating location:', error);
      analytics.trackError('location_change_error', error.message);
      alert('Error updating location: ' + error.message);
    }
  }
}
