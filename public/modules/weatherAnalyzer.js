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
   */
  static getTodayForecasts(weatherData) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter forecasts for today
    let todayForecasts = weatherData.list.filter((forecast) => {
      const forecastTime = new Date(forecast.dt * 1000);
      return forecastTime >= todayStart && forecastTime < todayEnd;
    });

    // If no forecasts for today, use the first few available
    if (todayForecasts.length === 0) {
      todayForecasts = weatherData.list.slice(0, 8);
    }

    return todayForecasts;
  }

  /**
   * Analyze forecast data to extract max conditions
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

    return {
      maxTemp,
      minRain: Math.round(maxRainChance),
      maxWind
    };
  }

  /**
   * Calculate rain chance from weather conditions
   */
  static calculateRainChance(forecast) {
    if (!forecast.weather || !forecast.weather[0]) {
      return 0;
    }

    const weatherId = forecast.weather[0].id;
    const { THUNDERSTORM_MIN, THUNDERSTORM_MAX, DRIZZLE_MIN, DRIZZLE_MAX, RAIN_MIN, RAIN_MAX } = WEATHER_CONFIG.RAIN_WEATHER_IDS;

    // Check if weather indicates precipitation
    const isRainy = (weatherId >= THUNDERSTORM_MIN && weatherId <= THUNDERSTORM_MAX) ||
                    (weatherId >= DRIZZLE_MIN && weatherId <= DRIZZLE_MAX) ||
                    (weatherId >= RAIN_MIN && weatherId <= RAIN_MAX);

    if (isRainy) {
      // Use probability of precipitation if available, otherwise default to 50%
      return forecast.pop ? forecast.pop * 100 : 50;
    }

    return 0;
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
    const { maxTemp, minRain, maxWind } = conditions;
    const explanations = [];

    // Temperature explanations
    if (maxTemp < settings.tempThresholdTopOff) {
      explanations.push(`Temperature too low (${maxTemp}°F < ${settings.tempThresholdTopOff}°F)`);
    }

    if (maxTemp < settings.tempThresholdDoorsOff) {
      explanations.push(`Temperature too low for doors off (${maxTemp}°F < ${settings.tempThresholdDoorsOff}°F)`);
    }

    // Rain explanations
    if (minRain >= settings.rainChanceThreshold) {
      explanations.push(`Rain chance too high (${minRain}% >= ${settings.rainChanceThreshold}%)`);
    }

    // Wind explanations
    if (maxWind >= settings.windSpeedThreshold) {
      explanations.push(`Wind too strong for doors off (${maxWind} mph >= ${settings.windSpeedThreshold} mph)`);
    }

    return explanations;
  }
}
