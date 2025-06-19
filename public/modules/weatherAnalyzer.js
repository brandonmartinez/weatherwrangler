import { WEATHER_CONFIG } from './constants.js';

/**
 * Weather condition analysis utilities
 */
export class WeatherAnalyzer {
  /**
   * Evaluate weather conditions for Jeep recommendations
   */
  static evaluateConditions(weatherData, settings) {
    const cityName = weatherData.city ? weatherData.city.name : "Unknown Location";
    const lastUpdated = weatherData.cacheTimestamp || Date.now();
    const todayForecasts = this.getTodayForecasts(weatherData);

    if (todayForecasts.length === 0) {
      throw new Error('No weather forecast data available for today');
    }

    const conditions = this.analyzeForecasts(todayForecasts);
    const recommendations = this.generateRecommendations(conditions, settings);

    return {
      ...recommendations,
      ...conditions,
      cityName,
      lastUpdated
    };
  }

  /**
   * Get today's weather forecasts from the API response
   * Takes into account the timezone of the weather location, not the browser's timezone
   * Enriches forecasts with timezone information for easier processing
   */
  static getTodayForecasts(weatherData) {
    // Get timezone offset in milliseconds for the weather location
    const timezoneOffsetMs = this.getLocationTimezoneOffset(weatherData);

    // Calculate "today" in the location's timezone
    const now = new Date();
    const locationTime = new Date(now.getTime() + timezoneOffsetMs);
    const todayStart = new Date(locationTime.getFullYear(), locationTime.getMonth(), locationTime.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter forecasts for today based on location timezone
    let todayForecasts = weatherData.list.filter((forecast) => {
      const forecastUtc = new Date(forecast.dt * 1000);
      const forecastLocalTime = new Date(forecastUtc.getTime() + timezoneOffsetMs);
      return forecastLocalTime >= todayStart && forecastLocalTime < todayEnd;
    });

    // If no forecasts for today, use the first few available
    if (todayForecasts.length === 0) {
      todayForecasts = weatherData.list.slice(0, 8);
    }

    // Enrich forecasts with timezone information for easier processing
    return todayForecasts.map(forecast => ({
      ...forecast,
      _timezoneOffsetMs: timezoneOffsetMs
    }));
  }

  /**
   * Get timezone offset for the weather location in milliseconds
   * Uses the timezone offset provided by the OpenWeatherMap API
   */
  static getLocationTimezoneOffset(weatherData) {
    // The API provides timezone offset in seconds from UTC
    if (weatherData.city && typeof weatherData.city.timezone === 'number') {
      return weatherData.city.timezone * 1000; // Convert to milliseconds
    }

    // Fallback to browser's timezone if location data is unavailable
    return -new Date().getTimezoneOffset() * 60 * 1000; // Convert minutes to milliseconds
  }

  /**
   * Analyze forecast data to extract max conditions and rain timing
   */
  static analyzeForecasts(forecasts) {
    let maxTemp = -Infinity;
    let maxRainChance = 0;
    let maxWind = -Infinity;

    for (const forecast of forecasts) {
      // Temperature analysis
      const temp = Math.round(forecast.main.temp);
      maxTemp = Math.max(maxTemp, temp);

      // Rain chance analysis
      const rainChance = this.calculateRainChance(forecast);
      maxRainChance = Math.max(maxRainChance, rainChance);

      // Wind analysis (convert m/s to mph)
      const windMph = Math.round(forecast.wind.speed * 2.237);
      maxWind = Math.max(maxWind, windMph);
    }

    // Analyze rain timing for better planning
    const rainTiming = this.analyzeRainTiming(forecasts);

    return {
      maxTemp,
      minRain: Math.round(maxRainChance),
      maxWind,
      rainTiming
    };
  }

  /**
   * Analyze rain timing throughout the day to help with planning
   */
  static analyzeRainTiming(forecasts) {
    const rainPeriods = [];
    let currentPeriod = null;
    const RAIN_THRESHOLD = 10; // Consider 10%+ as meaningful rain chance

    // Get timezone offset from the first forecast (all should have the same)
    const timezoneOffsetMs = forecasts.length > 0 ? forecasts[0]._timezoneOffsetMs || 0 : 0;

    forecasts.forEach((forecast, index) => {
      const rainChance = this.calculateRainChance(forecast);
      const utcTime = new Date(forecast.dt * 1000);
      const localTime = new Date(utcTime.getTime() + timezoneOffsetMs);
      const timeStr = localTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      if (rainChance >= RAIN_THRESHOLD) {
        if (!currentPeriod) {
          // Start of a new rain period
          currentPeriod = {
            startTime: timeStr,
            startHour: localTime.getHours(),
            endTime: timeStr,
            endHour: localTime.getHours(),
            maxChance: rainChance,
            forecasts: [{ time: timeStr, chance: rainChance }]
          };
        } else {
          // Continue current rain period
          currentPeriod.endTime = timeStr;
          currentPeriod.endHour = localTime.getHours();
          currentPeriod.maxChance = Math.max(currentPeriod.maxChance, rainChance);
          currentPeriod.forecasts.push({ time: timeStr, chance: rainChance });
        }
      } else {
        if (currentPeriod) {
          // End of current rain period
          rainPeriods.push(currentPeriod);
          currentPeriod = null;
        }
      }
    });

    // Add the last period if it exists
    if (currentPeriod) {
      rainPeriods.push(currentPeriod);
    }

    return {
      periods: rainPeriods,
      hasRain: rainPeriods.length > 0,
      summary: this.generateRainSummary(rainPeriods)
    };
  }

  /**
   * Generate a human-readable rain timing summary
   */
  static generateRainSummary(rainPeriods) {
    if (rainPeriods.length === 0) {
      return "No significant rain expected today";
    }

    if (rainPeriods.length === 1) {
      const period = rainPeriods[0];
      if (period.startTime === period.endTime) {
        return `Rain expected around ${period.startTime} (${Math.round(period.maxChance)}% chance)`;
      }
      return `Rain expected from ${period.startTime} to ${period.endTime} (up to ${Math.round(period.maxChance)}% chance)`;
    }

    // Multiple rain periods
    const periodSummaries = rainPeriods.map(period => {
      if (period.startTime === period.endTime) {
        return `${period.startTime} (${Math.round(period.maxChance)}%)`;
      }
      return `${period.startTime}-${period.endTime} (${Math.round(period.maxChance)}%)`;
    });

    return `Rain expected: ${periodSummaries.join(', ')}`;
  }

  /**
   * Calculate rain chance from weather conditions
   * Prioritizes the 'pop' (probability of precipitation) field from the API
   */
  static calculateRainChance(forecast) {
    // Always use 'pop' (probability of precipitation) if available
    // This is the most accurate predictor regardless of current weather conditions
    if (typeof forecast.pop === 'number') {
      return forecast.pop * 100; // Convert from decimal (0-1) to percentage (0-100)
    }

    // Fallback to weather condition analysis if 'pop' is not available
    if (!forecast.weather || !forecast.weather[0]) {
      return 0;
    }

    const weatherId = forecast.weather[0].id;
    const { THUNDERSTORM_MIN, THUNDERSTORM_MAX, DRIZZLE_MIN, DRIZZLE_MAX, RAIN_MIN, RAIN_MAX } = WEATHER_CONFIG.RAIN_WEATHER_IDS;

    // Check if weather indicates precipitation
    const isRainy = (weatherId >= THUNDERSTORM_MIN && weatherId <= THUNDERSTORM_MAX) ||
                    (weatherId >= DRIZZLE_MIN && weatherId <= DRIZZLE_MAX) ||
                    (weatherId >= RAIN_MIN && weatherId <= RAIN_MAX);

    // Return 50% chance if currently raining but no 'pop' data available
    return isRainy ? 50 : 0;
  }

  /**
   * Generate Jeep configuration recommendations based on conditions and settings
   */
  static generateRecommendations(conditions, settings) {
    const { maxTemp, minRain, maxWind } = conditions;

    const topOff = maxTemp >= settings.tempThresholdTopOff &&
                   minRain < settings.rainChanceThreshold;

    const doorsOff = maxTemp >= settings.tempThresholdDoorsOff &&
                     minRain < settings.rainChanceThreshold &&
                     maxWind < settings.windSpeedThreshold;

    return {
      topOff,
      doorsOff
    };
  }

  /**
   * Get recommendation explanations for user display
   */
  static getRecommendationExplanations(conditions, settings) {
    const { maxTemp, minRain, maxWind, rainTiming } = conditions;
    const explanations = [];

    // Temperature explanations
    if (maxTemp < settings.tempThresholdTopOff) {
      explanations.push(`Temperature too low (${maxTemp}°F < ${settings.tempThresholdTopOff}°F)`);
    }

    if (maxTemp < settings.tempThresholdDoorsOff) {
      explanations.push(`Temperature too low for doors off (${maxTemp}°F < ${settings.tempThresholdDoorsOff}°F)`);
    }

    // Rain explanations with timing
    if (minRain >= settings.rainChanceThreshold) {
      let rainExplanation = `Rain chance too high (${minRain}% >= ${settings.rainChanceThreshold}%)`;
      if (rainTiming && rainTiming.summary) {
        rainExplanation += ` - ${rainTiming.summary}`;
      }
      explanations.push(rainExplanation);
    }

    // Wind explanations
    if (maxWind >= settings.windSpeedThreshold) {
      explanations.push(`Wind too strong for doors off (${maxWind} mph >= ${settings.windSpeedThreshold} mph)`);
    }

    // Add helpful rain timing info even when conditions are good
    if (minRain < settings.rainChanceThreshold && rainTiming && rainTiming.hasRain) {
      explanations.push(`ℹ️ Planning tip: ${rainTiming.summary}`);
    }

    return explanations;
  }
}
