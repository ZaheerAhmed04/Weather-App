const API_KEY = '896c649aa58840388d4133104250607';
const BASE_URL = 'http://api.weatherapi.com/v1';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function fetchWeather(query) {
  try {
    // Check cache
    const cacheKey = query.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      updateUI(cached.currentData, cached.forecastData);
      return;
    }

    // Show loading state
    document.querySelector('.weather-app').classList.add('loading');

    const currentResponse = await fetch(`${BASE_URL}/current.json?key=${API_KEY}&q=${query}&aqi=yes`);
    const forecastResponse = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${query}&days=7&aqi=no&alerts=no`);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Store in cache
    cache.set(cacheKey, {
      currentData,
      forecastData,
      timestamp: Date.now()
    });

    updateUI(currentData, forecastData);
  } catch (error) {
    console.error('Error fetching weather:', error);
    showError('Failed to fetch weather data. Please check the location or try again later.');
  } finally {
    document.querySelector('.weather-app').classList.remove('loading');
  }
}

function updateUI(currentData, forecastData) {
  const { location, current } = currentData;
  const { forecast } = forecastData;

  // Apply weather-based theming
  const condition = current.condition.text.toLowerCase();
  const hour = new Date(location.localtime).getHours();
  document.body.className = '';
  if (hour >= 18 || hour < 6) {
    document.body.classList.add('night');
  } else if (condition.includes('sunny') || condition.includes('clear')) {
    document.body.classList.add('sunny');
  } else if (condition.includes('rain') || condition.includes('shower') || condition.includes('drizzle')) {
    document.body.classList.add('rainy');
  } else if (condition.includes('cloud') || condition.includes('overcast')) {
    document.body.classList.add('cloudy');
  } else if (condition.includes('snow') || condition.includes('sleet')) {
    document.body.classList.add('snowy');
  }

  // Update main weather
  document.getElementById('weather-icon').textContent = getWeatherIcon(current.condition.code);
  document.getElementById('temperature').textContent = `${Math.round(current.temp_c)}°C`;
  document.getElementById('current-time').textContent = new Date(location.localtime).toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  document.getElementById('location').textContent = `${location.name}, ${location.region}, ${location.country}`;
  document.getElementById('condition-text').textContent = current.condition.text;
  document.getElementById('precipitation').textContent = `🌧️ Rain: ${current.precip_mm}mm`;

  // Update highlights
  document.getElementById('uv-index').textContent = current.uv;
  document.getElementById('uv-status').textContent = getUVStatus(current.uv);
  document.getElementById('wind-speed').textContent = `${current.wind_kph} km/h`;
  document.getElementById('wind-direction').textContent = current.wind_dir;
  document.getElementById('sunrise').innerHTML = `${forecast.forecastday[0].astro.sunrise} <span>+1m 46s</span>`;
  document.getElementById('sunset').innerHTML = `${forecast.forecastday[0].astro.sunset} <span>+2m 22s</span>`;
  document.getElementById('humidity').textContent = `${current.humidity}%`;
  document.getElementById('humidity-status').textContent = getHumidityStatus(current.humidity);
  document.getElementById('visibility').textContent = `${current.vis_km} km`;
  document.getElementById('visibility-status').textContent = getVisibilityStatus(current.vis_km);
  document.getElementById('air-quality').textContent = current.air_quality['us-epa-index'] || 'N/A';
  document.getElementById('air-quality-status').textContent = getAirQualityStatus(current.air_quality['us-epa-index']);

  // Update weekly forecast
  const days = forecast.forecastday;
  days.forEach((day, index) => {
    const date = new Date(day.date);
    const dayElement = document.getElementById(`day-${index + 1}`);
    if (dayElement) {
      dayElement.innerHTML = `
        <div class="weather-icon">${getWeatherIcon(day.day.condition.code)}</div>
        <div>${date.toLocaleString('en-US', { weekday: 'short' })}</div>
        <div class="condition-text">${day.day.condition.text}</div>
        <div><span>${Math.round(day.day.maxtemp_c)}°/${Math.round(day.day.mintemp_c)}°</span></div>
        <div class="precipitation">🌧️ ${day.day.daily_chance_of_rain}%</div>
      `;
    }
  });

  // Update forecast summary
  const summary = generateForecastSummary(days);
  document.getElementById('forecast-summary').textContent = summary;
}

function getWeatherIcon(code) {
  const icons = {
    1000: '☀️', // Sunny
    1003: '🌤️', // Partly cloudy
    1006: '☁️', // Cloudy
    1009: '⛅', // Overcast
    1063: '🌦️', // Patchy rain
    1183: '🌧️', // Light rain
    1189: '🌧️', // Moderate rain
    1273: '⛈️', // Thunderstorm
    1087: '⛈️', // Thunder
    1066: '❄️', // Patchy snow
    1213: '❄️', // Light snow
    1225: '❄️' // Heavy snow
  };
  return icons[code] || '🌤️';
}

function getUVStatus(uv) {
  if (uv <= 2) return 'Low 😊';
  if (uv <= 5) return 'Normal 👍';
  if (uv <= 7) return 'High ☀️';
  return 'Extreme 🛑';
}

function getHumidityStatus(humidity) {
  if (humidity <= 30) return 'Low 😓';
  if (humidity <= 60) return 'Normal 👍';
  return 'High 💧';
}

function getVisibilityStatus(visibility) {
  if (visibility >= 10) return 'Excellent 😊';
  if (visibility >= 5) return 'Average 😐';
  return 'Poor 😣';
}

function getAirQualityStatus(aqi) {
  if (!aqi) return 'N/A';
  if (aqi <= 2) return 'Good 😊';
  if (aqi <= 3) return 'Moderate 😐';
  if (aqi <= 4) return 'Unhealthy 😷';
  return 'Hazardous ⚠️';
}

function generateForecastSummary(days) {
  let summary = 'Weekly Weather Summary: ';
  const temps = days.map(day => day.day.maxtemp_c);
  const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
  const maxTempDay = days[temps.indexOf(Math.max(...temps))];
  const minTempDay = days[temps.indexOf(Math.min(...temps))];
  const rainyDays = days.filter(day => day.day.daily_chance_of_rain > 50).length;
  const snowyDays = days.filter(day => day.day.daily_chance_of_snow > 50).length;

  summary += `Expect an average high of ${Math.round(avgTemp)}°C this week. `;
  summary += `The warmest day will be ${new Date(maxTempDay.date).toLocaleString('en-US', { weekday: 'long' })} with a high of ${Math.round(maxTempDay.day.maxtemp_c)}°C. `;
  summary += `The coolest day will be ${new Date(minTempDay.date).toLocaleString('en-US', { weekday: 'long' })} with a high of ${Math.round(minTempDay.day.maxtemp_c)}°C. `;

  if (rainyDays > 2) {
    summary += `Rain is likely on ${rainyDays} days, so keep an umbrella handy. `;
  } else if (rainyDays > 0) {
    summary += `Light rain is possible on ${rainyDays} day${rainyDays > 1 ? 's' : ''}. `;
  } else {
    summary += `Mostly dry conditions expected. `;
  }

  if (snowyDays > 0) {
    summary += `Snow is likely on ${snowyDays} day${snowyDays > 1 ? 's' : ''}, so prepare for colder conditions. `;
  }

  const conditions = days.map(day => day.day.condition.text.toLowerCase());
  if (conditions.some(c => c.includes('sunny') || c.includes('clear')) && rainyDays <= 2) {
    summary += `Sunny days are expected, ideal for outdoor activities.`;
  } else if (conditions.some(c => c.includes('cloud') || c.includes('overcast'))) {
    summary += `Cloudy skies may dominate, but pleasant weather overall.`;
  }

  return summary;
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(239, 68, 68, 0.9);
    color: #fff;
    padding: 1rem 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideIn 0.5s ease forwards, slideOut 0.5s ease 3s forwards;
  `;
  document.body.appendChild(errorDiv);

  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(styleSheet);

  setTimeout(() => errorDiv.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const tabs = document.querySelectorAll('.tab');
  const todayView = document.getElementById('today-view');
  const weekView = document.getElementById('week-view');

  // Add loading state CSS
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    .weather-app.loading {
      opacity: 0.5;
      pointer-events: none;
    }
    .weather-app.loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      border: 4px solid var(--primary-color);
      border-top: 4px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      transform: translate(-50%, -50%);
    }
    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);

  // Initial fetch for default location
  fetchWeather('New Delhi'); // Default to New Delhi for Indian context

  // Search functionality
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      fetchWeather(query);
      searchInput.value = '';
    } else {
      showError('Please enter a location');
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        fetchWeather(query);
        searchInput.value = '';
      } else {
        showError('Please enter a location');
      }
    }
  });

  // Tab switching with animation
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      
      todayView.style.opacity = '0';
      weekView.style.opacity = '0';
      todayView.style.transform = 'translateY(20px)';
      weekView.style.transform = 'translateY(20px)';

      setTimeout(() => {
        if (tab.dataset.tab === 'today') {
          todayView.style.display = 'block';
          weekView.style.display = 'none';
          todayView.style.opacity = '1';
          todayView.style.transform = 'translateY(0)';
        } else {
          todayView.style.display = 'none';
          weekView.style.display = 'flex';
          weekView.style.opacity = '1';
          weekView.style.transform = 'translateY(0)';
        }
      }, 200);
    });
  });

  // Auto-refresh every 30 minutes
  setInterval(() => {
    const lastQuery = Array.from(cache.keys()).pop() || 'New Delhi';
    fetchWeather(lastQuery);
  }, 30 * 60 * 1000);
});