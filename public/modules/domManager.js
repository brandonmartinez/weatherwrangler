import { DOM_ELEMENTS } from './constants.js';

/**
 * DOM utility functions with caching and error handling
 */
export class DOMManager {
  constructor() {
    this.elementCache = new Map();
  }

  /**
   * Get DOM element with caching
   */
  getElement(id) {
    if (this.elementCache.has(id)) {
      return this.elementCache.get(id);
    }

    const element = document.getElementById(id);
    if (element) {
      this.elementCache.set(id, element);
    } else {
      console.warn(`Element with id '${id}' not found`);
    }

    return element;
  }

  /**
   * Get multiple elements at once
   */
  getElements(ids) {
    const elements = {};
    ids.forEach(id => {
      elements[id] = this.getElement(id);
    });
    return elements;
  }

  /**
   * Clear the element cache (useful for dynamic content)
   */
  clearCache() {
    this.elementCache.clear();
  }

  /**
   * Hide all state elements
   */
  hideAllStates() {
    const stateElements = [
      DOM_ELEMENTS.loading,
      DOM_ELEMENTS.error,
      DOM_ELEMENTS.locationPrompt,
      DOM_ELEMENTS.weatherResults
    ];

    stateElements.forEach(id => {
      const element = this.getElement(id);
      if (element) {
        element.classList.add('hidden');
      }
    });
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.hideAllStates();
    const loading = this.getElement(DOM_ELEMENTS.loading);
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  /**
   * Show error state
   */
  showError(error) {
    this.hideAllStates();
    const errorElement = this.getElement(DOM_ELEMENTS.error);
    if (errorElement) {
      errorElement.textContent = `Error: ${error.message}`;
      errorElement.classList.remove('hidden');
    }
  }

  /**
   * Show location prompt
   */
  showLocationPrompt() {
    this.hideAllStates();
    const locationPrompt = this.getElement(DOM_ELEMENTS.locationPrompt);
    if (locationPrompt) {
      locationPrompt.classList.remove('hidden');
    }
  }

  /**
   * Update weather results display
   */
  updateWeatherResults(result) {
    this.hideAllStates();

    // Show weather results
    const weatherResults = this.getElement(DOM_ELEMENTS.weatherResults);
    if (weatherResults) {
      weatherResults.classList.remove('hidden');
    }

    // Update title
    const weatherTitle = this.getElement(DOM_ELEMENTS.weatherTitle);
    if (weatherTitle) {
      weatherTitle.textContent = `Weather wrangled for today in ${result.cityName}`;
    }

    // Update Jeep image
    this.updateJeepImage(result.topOff, result.doorsOff);

    // Update weather details
    this.updateWeatherDetails(result);

    // Update status
    this.updateStatus(result.topOff, result.doorsOff);
  }

  /**
   * Update Jeep image based on recommendations
   */
  updateJeepImage(topOff, doorsOff) {
    const jeepImage = this.getElement(DOM_ELEMENTS.jeepImage);
    if (!jeepImage) return;

    const topStatus = topOff ? "off" : "on";
    const doorsStatus = doorsOff ? "off" : "on";
    const imageName = `top${topStatus}-doors${doorsStatus}.jpg`;
    const imagePath = `/images/${imageName}`;

    jeepImage.src = imagePath;
    jeepImage.alt = `Jeep with top ${topStatus} and doors ${doorsStatus}`;
    jeepImage.classList.remove('hidden');
  }

  /**
   * Update weather details display
   */
  updateWeatherDetails(result) {
    const elements = {
      [DOM_ELEMENTS.maxTemp]: result.maxTemp,
      [DOM_ELEMENTS.rainChance]: result.minRain,
      [DOM_ELEMENTS.windSpeed]: result.maxWind
    };

    Object.entries(elements).forEach(([elementId, value]) => {
      const element = this.getElement(elementId);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Update status display
   */
  updateStatus(topOff, doorsOff) {
    const topStatus = this.getElement(DOM_ELEMENTS.topStatus);
    const doorsStatus = this.getElement(DOM_ELEMENTS.doorsStatus);

    if (topStatus) {
      topStatus.textContent = topOff ? "Off" : "On";
    }

    if (doorsStatus) {
      doorsStatus.textContent = doorsOff ? "Off" : "On";
    }
  }

  /**
   * Populate settings form with current values
   */
  populateSettingsForm(settings) {
    const settingsMap = {
      [DOM_ELEMENTS.tempTopOff]: settings.tempThresholdTopOff,
      [DOM_ELEMENTS.tempDoorsOff]: settings.tempThresholdDoorsOff,
      [DOM_ELEMENTS.rainThreshold]: settings.rainChanceThreshold,
      [DOM_ELEMENTS.windThreshold]: settings.windSpeedThreshold
    };

    Object.entries(settingsMap).forEach(([elementId, value]) => {
      const element = this.getElement(elementId);
      if (element) {
        element.value = value;
      }
    });
  }

  /**
   * Get settings from form
   */
  getSettingsFromForm() {
    return {
      tempThresholdTopOff: parseInt(this.getElement(DOM_ELEMENTS.tempTopOff)?.value || 0),
      tempThresholdDoorsOff: parseInt(this.getElement(DOM_ELEMENTS.tempDoorsOff)?.value || 0),
      rainChanceThreshold: parseInt(this.getElement(DOM_ELEMENTS.rainThreshold)?.value || 0),
      windSpeedThreshold: parseInt(this.getElement(DOM_ELEMENTS.windThreshold)?.value || 0)
    };
  }

  /**
   * Get ZIP code from form
   */
  getZipCode() {
    const zipElement = this.getElement(DOM_ELEMENTS.zipcode);
    return zipElement ? zipElement.value.trim() : '';
  }

  /**
   * Get ZIP code from location prompt form
   */
  getZipCodeFromPrompt() {
    const zipElement = this.getElement(DOM_ELEMENTS.zipcodePrompt);
    return zipElement ? zipElement.value.trim() : '';
  }

  /**
   * Clear ZIP code input
   */
  clearZipCode() {
    const zipElement = this.getElement(DOM_ELEMENTS.zipcode);
    if (zipElement) {
      zipElement.value = '';
    }
  }

  /**
   * Clear ZIP code input from prompt
   */
  clearZipCodePrompt() {
    const zipElement = this.getElement(DOM_ELEMENTS.zipcodePrompt);
    if (zipElement) {
      zipElement.value = '';
    }
  }
}
