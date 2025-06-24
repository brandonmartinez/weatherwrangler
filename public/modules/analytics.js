/**
 * Google Analytics telemetry utility for tracking user interactions
 */
export class AnalyticsService {
  constructor() {
    this.isEnabled = typeof gtag !== 'undefined';
    if (!this.isEnabled) {
      console.warn('Google Analytics not available - telemetry disabled');
    }
  }

  /**
   * Track a custom event in Google Analytics
   * @param {string} action - The action being tracked
   * @param {string} category - The category of the event
   * @param {string} label - Optional label for the event
   * @param {number} value - Optional numeric value for the event
   */
  trackEvent(action, category, label = null, value = null) {
    if (!this.isEnabled) {
      console.log(`Analytics (disabled): ${category} - ${action}${label ? ` - ${label}` : ''}`);
      return;
    }

    const eventData = {
      event_category: category,
      event_label: label,
      value: value
    };

    // Remove null values
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === null) {
        delete eventData[key];
      }
    });

    console.log(`Analytics: Tracking ${category} - ${action}`, eventData);
    gtag('event', action, eventData);
  }

  /**
   * Track toolbar button interactions
   * @param {string} buttonName - Name of the button clicked
   */
  trackToolbarButton(buttonName) {
    this.trackEvent('click', 'toolbar', buttonName);
  }

  /**
   * Track location changes
   * @param {string} method - How the location was changed (zip_code, current_location, etc.)
   * @param {string} location - Optional location identifier (zip code, coordinates, etc.)
   */
  trackLocationChange(method, location = null) {
    this.trackEvent('location_change', 'navigation', method, null);

    // Track additional details if location is provided
    if (location) {
      this.trackEvent('location_set', 'navigation', location);
    }
  }

  /**
   * Track settings changes
   * @param {string} setting - Name of the setting changed
   * @param {any} value - New value of the setting
   */
  trackSettingsChange(setting, value) {
    this.trackEvent('settings_change', 'configuration', setting, typeof value === 'number' ? value : null);
  }

  /**
   * Track weather data requests
   * @param {string} source - Source of the weather data (api, cache)
   * @param {string} method - Method used (coordinates, zip_code)
   */
  trackWeatherRequest(source, method) {
    this.trackEvent('weather_request', 'data', `${source}_${method}`);
  }

  /**
   * Track modal interactions
   * @param {string} modalName - Name of the modal (settings, location)
   * @param {string} action - Action performed (open, close, submit)
   */
  trackModalInteraction(modalName, action) {
    this.trackEvent(`modal_${action}`, 'ui', modalName);
  }

  /**
   * Track errors for debugging purposes
   * @param {string} errorType - Type of error (api_error, validation_error, etc.)
   * @param {string} details - Error details or message
   */
  trackError(errorType, details) {
    this.trackEvent('error', 'application', errorType);

    // Track error details separately to avoid PII
    if (details && !this.containsSensitiveData(details)) {
      this.trackEvent('error_detail', 'application', details.substring(0, 100));
    }
  }

  /**
   * Track weather display interactions
   * @param {string} action - Action performed (toggle_details, view_explanation, etc.)
   */
  trackWeatherDisplay(action) {
    this.trackEvent(action, 'weather_display');
  }

  /**
   * Track user engagement metrics
   * @param {string} action - Engagement action (refresh, extended_view, etc.)
   */
  trackEngagement(action) {
    this.trackEvent(action, 'engagement');
  }

  /**
   * Check if data contains sensitive information that shouldn't be tracked
   * @param {string} data - Data to check
   * @returns {boolean} - True if data contains sensitive information
   */
  containsSensitiveData(data) {
    const sensitivePatterns = [
      /api.*key/i,
      /token/i,
      /password/i,
      /secret/i,
      /credential/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(data));
  }
}

// Create and export a singleton instance
export const analytics = new AnalyticsService();
