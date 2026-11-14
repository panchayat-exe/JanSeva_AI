class WeatherProvider {
  constructor() {
    this.endpoint = 'https://api.open-meteo.com/v1/forecast';
  }

  async fetchCurrentConditions(lat, lng, signal) {
    const url = `${this.endpoint}?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code`;
    
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this._formatWeather(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Weather query aborted.");
      } else {
        console.error("Weather Context Fetch Failed:", error);
      }
      return null; // Graceful fallback
    }
  }

  _formatWeather(data) {
    if (!data || !data.current) return null;
    
    const { temperature_2m, precipitation, wind_speed_10m, wind_direction_10m, weather_code } = data.current;
    
    return {
      temperature: `${temperature_2m} °C`,
      precipitation: `${precipitation} mm`,
      wind: `${wind_speed_10m} km/h`,
      condition: this._getConditionString(weather_code),
      source: 'Open-Meteo',
      timestamp: data.current.time
    };
  }

  _getConditionString(code) {
    // WMO Weather interpretation codes
    if (code === 0) return 'Clear sky';
    if (code === 1 || code === 2 || code === 3) return 'Partly cloudy / Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95 && code <= 99) return 'Thunderstorm';
    return 'Unknown';
  }
}

export const weatherProvider = new WeatherProvider();
