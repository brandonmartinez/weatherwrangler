import { DOM_ELEMENTS } from './constants.js';
import { WeatherAnalyzer } from './weatherAnalyzer.js';

/**
 * DOM utility functions with caching and error handling
 */
export class DOMManager {
  constructor() {
    this.elementCache = new Map();
  }

  /**
   * Toggle additional weather details visibility
   */
  toggleAdditionalWeather() {
    const additionalCards = ['humidityCard', 'visibilityCard', 'uvIndexCard', 'sunriseCard'];
    const toggleText = this.getElement('toggleText');

    const firstCard = this.getElement(additionalCards[0]);
    if (!firstCard) return;

    const isHidden = firstCard.classList.contains('hidden');

    additionalCards.forEach(cardId => {
      const card = this.getElement(cardId);
      if (card) {
        if (isHidden) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      }
    });

    if (toggleText) {
      toggleText.textContent = isHidden ? '- Less details' : '+ More details';
    }
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
  updateWeatherResults(result, settings) {
    this.hideAllStates();

    // Show weather results
    const weatherResults = this.getElement(DOM_ELEMENTS.weatherResults);
    if (weatherResults) {
      weatherResults.classList.remove('hidden');
    }

    // Update city
    const cityName = this.getElement(DOM_ELEMENTS.cityName);
    if (cityName) {
      cityName.textContent = result.cityName;
    }

    // Update Jeep image
    this.updateJeepImage(result.topOff, result.doorsOff);

    // Update weather details
    this.updateWeatherDetails(result);

    // Update rain timing and explanations
    this.updateRainTiming(result);
    this.updateWeatherExplanations(result, settings);

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
    // Format current date
    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format last updated time
    const lastUpdatedString = result.lastUpdated
      ? new Date(result.lastUpdated).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      : 'Just now';

    // Get weather description and icon
    const weatherDescription = result.weatherDescription || 'Clear skies';
    const weatherIcon = this.getWeatherIcon(result.weatherCondition);

    // Format UV Index with color coding
    const uvIndexElement = this.getElement('uvIndex');
    if (uvIndexElement && result.uvIndex !== undefined) {
      const uvValue = Math.round(result.uvIndex);
      const uvColor = this.getUVIndexColor(uvValue);
      uvIndexElement.innerHTML = `<span class="${uvColor}">${uvValue}</span>`;
    }

    // Format sunrise/sunset times
    const formatTime = (timestamp) => {
      if (!timestamp) return '--:--';
      return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const elements = {
      [DOM_ELEMENTS.weatherDate]: dateString,
      [DOM_ELEMENTS.lastUpdated]: lastUpdatedString,
      [DOM_ELEMENTS.maxTemp]: result.maxTemp,
      [DOM_ELEMENTS.rainChance]: result.minRain,
      [DOM_ELEMENTS.windSpeed]: result.maxWind,
      'weatherDescription': weatherDescription,
      'feelsLike': result.feelsLike || result.maxTemp,
      'highTemp': result.maxTemp,
      'lowTemp': result.minTemp || '--',
      'humidity': result.humidity || '--',
      'visibility': result.visibility ? Math.round(result.visibility / 1000 * 0.621371) : '--', // Convert m to miles
      'sunrise': formatTime(result.sunrise)
    };

    // Update weather icon
    const iconElement = this.getElement('weatherIcon');
    if (iconElement) {
      iconElement.textContent = weatherIcon;
    }

    Object.entries(elements).forEach(([elementId, value]) => {
      const element = this.getElement(elementId);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Get weather icon based on condition
   */
  getWeatherIcon(condition) {
    const iconMap = {
      'clear': '☀️',
      'clouds': '☁️',
      'rain': '🌧️',
      'drizzle': '🌦️',
      'thunderstorm': '⛈️',
      'snow': '❄️',
      'mist': '🌫️',
      'fog': '🌫️',
      'haze': '🌫️'
    };

    return iconMap[condition?.toLowerCase()] || '☀️';
  }

  /**
   * Get UV Index color class
   */
  getUVIndexColor(uvIndex) {
    if (uvIndex <= 2) return 'text-green-600';
    if (uvIndex <= 5) return 'text-yellow-600';
    if (uvIndex <= 7) return 'text-orange-600';
    if (uvIndex <= 10) return 'text-red-600';
    return 'text-purple-600';
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

  /**
   * Update rain timing display
   */
  updateRainTiming(result) {
    const rainTimingContainer = this.getElement(DOM_ELEMENTS.rainTiming);
    const rainTimingDetails = this.getElement(DOM_ELEMENTS.rainTimingDetails);

    if (!rainTimingContainer || !rainTimingDetails) return;

    if (result.rainTiming && result.rainTiming.hasRain && result.rainTiming.summary) {
      rainTimingDetails.textContent = result.rainTiming.summary;
      rainTimingContainer.classList.remove('hidden');
    } else {
      rainTimingContainer.classList.add('hidden');
    }
  }

  /**
   * Update weather explanations display
   */
  updateWeatherExplanations(result, settings) {
    const explanationsContainer = this.getElement(DOM_ELEMENTS.weatherExplanations);
    if (!explanationsContainer) return;

    // Get explanations from the weather analyzer
    const explanations = WeatherAnalyzer.getRecommendationExplanations(result, settings);

    // Clear existing explanations
    explanationsContainer.innerHTML = '';

    if (explanations && explanations.length > 0) {
      explanations.forEach(explanation => {
        const explanationEl = document.createElement('div');
        explanationEl.className = 'text-sm p-3 rounded-lg mb-2';

        // Style different types of explanations
        if (explanation.includes('🎯')) {
          // Time-based recommendations - make these prominent
          explanationEl.className += ' bg-gradient-to-r from-green-50 to-blue-50 text-green-800 border border-green-200 font-medium shadow-sm';
          const content = explanation.replace('🎯 ', '');
          explanationEl.innerHTML = `
            <div class="flex items-start gap-3">
              <span class="text-xl flex-shrink-0 mt-0.5">🎯</span>
              <div>
                <div class="font-semibold text-green-900 mb-1">Smart Recommendation</div>
                <div class="text-green-800">${content}</div>
              </div>
            </div>
          `;
        } else if (explanation.includes('💡')) {
          // Pro tips
          explanationEl.className += ' bg-amber-50 text-amber-800 border border-amber-200 font-medium';
          explanationEl.innerHTML = `<div class="flex items-start gap-2"><span class="text-lg">💡</span><span>${explanation.replace('💡 ', '')}</span></div>`;
        } else if (explanation.includes('ℹ️')) {
          // Info tips
          explanationEl.className += ' bg-blue-50 text-blue-800 border-l-4 border-blue-400';
          explanationEl.innerHTML = `<div class="flex items-start gap-2"><span>ℹ️</span><span>${explanation.replace('ℹ️ ', '')}</span></div>`;
        } else if (explanation.includes('📊')) {
          // Technical details - make these collapsible/secondary
          explanationEl.className += ' bg-gray-50 text-gray-700 border border-gray-200 text-xs';
          const detailsContent = explanation.replace('📊 Technical details: ', '');
          explanationEl.innerHTML = `
            <details class="cursor-pointer">
              <summary class="font-medium text-gray-800 hover:text-gray-900 flex items-center gap-2">
                <span>📊</span>
                <span>Additional Details</span>
                <span class="ml-auto text-gray-500">▼</span>
              </summary>
              <div class="mt-2 pl-6 text-gray-600 border-t border-gray-200 pt-2">${detailsContent}</div>
            </details>
          `;
        } else if (explanation.includes('too')) {
          // Warning explanations
          explanationEl.className += ' bg-yellow-50 text-yellow-800 border-l-4 border-yellow-400';
          explanationEl.textContent = explanation;
        } else {
          // Default styling
          explanationEl.className += ' bg-gray-50 text-gray-800 border-l-4 border-gray-400';
          explanationEl.textContent = explanation;
        }

        explanationsContainer.appendChild(explanationEl);
      });

      explanationsContainer.classList.remove('hidden');
    } else {
      explanationsContainer.classList.add('hidden');
    }
  }
}
