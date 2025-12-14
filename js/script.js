// ----------------- CONFIG -----------------
// <-- PASTE your WeatherAPI.com key here (keep quotes) -->

const apiKey = "33662cea9333448da5c52739251210";

const baseURL = "https://api.weatherapi.com/v1";
const geoURL = "https://api.weatherapi.com/v1";
const currentEndpoint = `${geoURL}/current.json`;
const forecastEndpoint = `${geoURL}/forecast.json`;
const astronomyEndpoint = `${geoURL}/astronomy.json`;
const historyEndpoint = `${geoURL}/history.json`;

// ----------------- ELEMENTS -----------------
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const useLocationBtn = document.getElementById("useLocation");

const cityEl = document.querySelector(".city");
const dateEl = document.querySelector(".date");
const tempEl = document.querySelector(".temp");
const descEl = document.querySelector(".desc");
const iconEl = document.querySelector(".weather-icon");

const humidityEl = document.querySelector(".humidity");
const windEl = document.querySelector(".wind");
const feelsEl = document.querySelector(".feels");
const pressureEl = document.querySelector(".pressure");
const visibilityEl = document.querySelector(".visibility");
const moonEl = document.querySelector(".moon");

const daysContainer = document.getElementById("daysContainer");

const uvValueEl = document.getElementById("uvValue");
const uvFillEl = document.getElementById("uvFill");
const uvLabelEl = document.getElementById("uvLabel");

const windCanvas = document.getElementById("windCanvas");
const pressureCanvas = document.getElementById("pressureCanvas");
const windSpeedEl = document.getElementById("windSpeed");
const windDegEl = document.getElementById("windDeg");
const pressureValEl = document.getElementById("pressureVal");

const dewValEl = document.getElementById("dewVal");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const moonriseEl = document.getElementById("moonrise");
const moonsetEl = document.getElementById("moonset");

const humidityValueEl = document.getElementById("humidityValue");
const humidityFillEl = document.getElementById("humidityFill");
const aqiValEl = document.getElementById("aqiVal");
const aqiLabelEl = document.getElementById("aqiLabel");
const aqiFillEl = document.getElementById("aqiFill");

const forecastGrid = document.getElementById("forecastGrid");

const clockEl = document.getElementById("clock");
const activitySelect = document.getElementById("activitySelect");
const checkActivityBtn = document.getElementById("checkActivity");
const runningMessageEl = document.getElementById("runningMessage");

// sun/moon svg elements
const sunPathEl = document.getElementById("sunPath");
const sunDot = document.getElementById("sunDot");
const moonPathEl = document.getElementById("moonPath");
const moonDot = document.getElementById("moonDot");

// ---------- Real-time clock ----------
function updateClock() {
  const now = new Date();
  if (clockEl) clockEl.textContent = now.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
setInterval(updateClock, 1000);
updateClock();

// ---------- Helpers ----------
function fmtTimeFromString(t) { // WeatherAPI often returns "06:12 AM"
  if (!t) return "--";
  return t;
}
function uvLabel(uvi) {
  if (uvi < 3) return "Low";
  if (uvi < 6) return "Moderate";
  if (uvi < 8) return "High";
  if (uvi < 11) return "Very High";
  return "Extreme";
}
function visibilityLabel(km) {
  if (km >= 10) return "Good";
  if (km >= 4) return "Moderate";
  return "Poor";
}
function kphToMs(kph) {
  return (kph * 1000 / 3600).toFixed(1);
}
function parseTimeStrToDate(localDateStr, timeStr) {
  // localDateStr "YYYY-MM-DD", timeStr "06:12 AM" -> Date object in local timezone (approx)
  try {
    const iso = `${localDateStr} ${timeStr}`;
    // create using Date.parse may depend on locale; create by splitting:
    // timeStr like "06:12 AM"
    const [hm, ampm] = timeStr.split(' ');
    const [hh, mm] = hm.split(':').map(Number);
    let hour = hh % 12;
    if ((ampm || '').toLowerCase() === 'pm') hour += 12;
    const [y, m, d] = localDateStr.split('-').map(Number);
    return new Date(y, m - 1, d, hour, mm || 0, 0);
  } catch (e) {
    return null;
  }
}

// Get point along SVG path by fraction (0..1)
function pointOnPath(pathEl, t) {
  try {
    const len = pathEl.getTotalLength();
    const p = pathEl.getPointAtLength(Math.max(0, Math.min(len, t * len)));
    return { x: p.x, y: p.y };
  } catch (e) {
    return { x: 0, y: 0 };
  }
}

// Place dot at fraction along path
function placeDotOnPath(dotEl, pathEl, fraction) {
  const p = pointOnPath(pathEl, fraction);
  if (dotEl && p) {
    dotEl.setAttribute('cx', p.x);
    dotEl.setAttribute('cy', p.y);
  }
}

// ---------- Drawing utilities ----------
function drawWindCanvas(speedMs, deg) {
  if (!windCanvas) return;
  const ctx = windCanvas.getContext("2d");
  const w = windCanvas.width, h = windCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 16;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "12px Inter, sans-serif";
  ["N","E","S","W"].forEach((ltr,i)=>{
    const angle = -Math.PI/2 + i*(Math.PI/2);
    const x = cx + Math.cos(angle)*(r-14);
    const y = cy + Math.sin(angle)*(r-14)+4;
    ctx.fillText(ltr, x-6, y);
  });

  const rad = (deg - 90) * Math.PI/180;
  const ax = cx + Math.cos(rad)*(r-10);
  const ay = cy + Math.sin(rad)*(r-10);

  ctx.beginPath();
  ctx.moveTo(cx,cy);
  ctx.lineTo(ax,ay);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ax, ay, 5, 0, Math.PI*2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  if (windSpeedEl) windSpeedEl.textContent = `${speedMs ?? "--"} m/s`;
  if (windDegEl) windDegEl.textContent = `${deg ?? "--"}°`;
}

function drawPressureGauge(value) {
  if (!pressureCanvas) return;
  const ctx = pressureCanvas.getContext("2d");
  const w = pressureCanvas.width, h = pressureCanvas.height;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h, r = Math.min(w/2 - 20, 120);
  const minP = 980, maxP = 1045;
  const clamped = Math.max(minP, Math.min(maxP, value || minP));
  const t = (clamped - minP) / (maxP - minP);

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI*2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI*t);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.stroke();

  if (pressureValEl) pressureValEl.textContent = `${value ?? "--"} hPa`;
}

// ---------- DATA FETCH ----------
async function fetchWeatherFor(query) {
  // forecast endpoint includes current + 7-day + aqi (use days=7)
  const url = `${forecastEndpoint}?key=${apiKey}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=no`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(()=>({error:"unknown"}));
    throw new Error(body.error?.message || `Weather API error ${res.status}`);
  }
  const data = await res.json();
  return data;
}

async function fetchHistoryFor(query, dateStr) {
  // dateStr format YYYY-MM-DD
  const url = `${historyEndpoint}?key=${apiKey}&q=${encodeURIComponent(query)}&dt=${dateStr}`;
  const res = await fetch(url);
  if (!res.ok) {
    // history may be unavailable for free tier
    return null;
  }
  return await res.json();
}

// ---------- RENDER ----------
function renderSummary(data) {
  const location = data.location;
  const cur = data.current;
  const forecast = data.forecast;

  if (cityEl) cityEl.textContent = `${location.name}, ${location.country}`;
  if (dateEl) dateEl.textContent = location.localtime.split(" ")[0] ?? location.localtime;
  if (tempEl) tempEl.textContent = `${Math.round(cur.temp_c)}°C`;
  if (descEl) descEl.textContent = cur.condition?.text ?? "--";
  if (iconEl) iconEl.src = cur.condition?.icon ? `https:${cur.condition.icon}` : "";

  if (humidityEl) humidityEl.textContent = `${cur.humidity}%`;
  if (windEl) windEl.textContent = `${kphToMs(cur.wind_kph)} m/s`;
  if (feelsEl) feelsEl.textContent = `${Math.round(cur.feelslike_c)}°C`;
  if (pressureEl) pressureEl.textContent = `${cur.pressure_mb} hPa`;
  if (visibilityEl) visibilityEl.textContent = `${visibilityLabel(cur.vis_km)} (${cur.vis_km} km)`;
  if (moonEl) {
    const moonPhase = (forecast.forecastday?.[0]?.astro?.moon_phase) || "--";
    moonEl.textContent = moonPhase;
  }
}

function renderDetails(data) {
  const cur = data.current;
  const forecastDay = data.forecast?.forecastday?.[0];

  // UV
  const uvi = cur.uv ?? 0;
  if (uvValueEl) uvValueEl.textContent = uvi;
  const pct = Math.min(100, (uvi / 11) * 100);
  if (uvFillEl) uvFillEl.style.width = `${pct}%`;
  if (uvLabelEl) uvLabelEl.textContent = uvLabel(uvi);

  // Wind + Pressure + Dew
  const windMs = parseFloat(kphToMs(cur.wind_kph));
  drawWindCanvas(windMs, cur.wind_degree ?? 0);
  drawPressureGauge(cur.pressure_mb ?? cur.pressure_in);

  if (dewValEl) {
    // WeatherAPI returns dewpoint_c maybe available as 'dewpoint_c' in some plans; fallback to calculating (approx)
    const dew = cur.dewpoint_c ?? cur.dewpoint_f ? Math.round(((cur.dewpoint_f - 32) * 5/9)) : (cur.dewpoint_c ?? null);
    dewValEl.textContent = (dew !== null && dew !== undefined) ? `${Math.round(dew)}°C` : "--";
  }

  // Sun / Moon times from forecast day's astro (WeatherAPI returns strings)
  if (forecastDay && forecastDay.astro) {
    const astro = forecastDay.astro;
    if (sunriseEl) sunriseEl.textContent = fmtTimeFromString(astro.sunrise);
    if (sunsetEl) sunsetEl.textContent = fmtTimeFromString(astro.sunset);
    if (moonriseEl) moonriseEl.textContent = fmtTimeFromString(astro.moonrise);
    if (moonsetEl) moonsetEl.textContent = fmtTimeFromString(astro.moonset);
  } else {
    if (sunriseEl) sunriseEl.textContent = "--";
    if (sunsetEl) sunsetEl.textContent = "--";
    if (moonriseEl) moonriseEl.textContent = "--";
    if (moonsetEl) moonsetEl.textContent = "--";
  }

  // Humidity & AQI (WeatherAPI current.air_quality)
  if (humidityValueEl && humidityFillEl) {
    humidityValueEl.textContent = `${cur.humidity ?? "--"}%`;
    humidityFillEl.style.width = `${cur.humidity ?? 0}%`;
  }

  const aq = cur.air_quality || null;
  if (aq && aqiValEl && aqiLabelEl && aqiFillEl) {
    // WeatherAPI may include 'us-epa-index' or 'gb-defra-index'
    const idx = aq["us-epa-index"] ?? aq["gb-defra-index"] ?? null;
    const aqiLabels = ["Good","Fair","Moderate","Poor","Very Poor"];
    aqiValEl.textContent = idx ?? "--";
    aqiLabelEl.textContent = (idx ? aqiLabels[idx - 1] ?? "--" : "--");
    aqiFillEl.style.width = `${(idx ? (idx/5)*100 : 0)}%`;
  } else {
    if (aqiValEl) aqiValEl.textContent = "--";
    if (aqiLabelEl) aqiLabelEl.textContent = "--";
    if (aqiFillEl) aqiFillEl.style.width = `0%`;
  }

  // Move sun and moon along path (live progress)
  try {
    const localDate = data.location.localtime.split(' ')[0]; // YYYY-MM-DD
    const sunRiseStr = forecastDay?.astro?.sunrise;
    const sunSetStr = forecastDay?.astro?.sunset;
    const moonRiseStr = forecastDay?.astro?.moonrise;
    const moonSetStr = forecastDay?.astro?.moonset;

    // Parse to Date objects (local)
    const sr = parseTimeStrToDate(localDate, sunRiseStr);
    const ss = parseTimeStrToDate(localDate, sunSetStr);
    const mr = parseTimeStrToDate(localDate, moonRiseStr);
    const ms = parseTimeStrToDate(localDate, moonSetStr);
    const now = new Date();

    let sunFrac = 0;
    if (sr && ss && ss > sr) {
      sunFrac = Math.max(0, Math.min(1, (now - sr) / (ss - sr)));
    } else if (sr && ss && ss < sr) {
      // polar or midnight wrap; clamp to 0..1
      sunFrac = (now - sr) / ((ss.getTime() + 24*3600*1000) - sr);
      sunFrac = Math.max(0, Math.min(1, sunFrac));
    }
    placeDotOnPath(sunDot, sunPathEl, sunFrac);

    let moonFrac = 0;
    if (mr && ms && ms > mr) {
      moonFrac = Math.max(0, Math.min(1, (now - mr) / (ms - mr)));
    } else if (mr && ms && ms < mr) {
      moonFrac = (now - mr) / ((ms.getTime() + 24*3600*1000) - mr);
      moonFrac = Math.max(0, Math.min(1, moonFrac));
    }
    placeDotOnPath(moonDot, moonPathEl, moonFrac);
  } catch (e) {
    // silently ignore
  }
}

// ---------- RENDER 7-DAY FORECAST (Dynamic: Yesterday → Today → Mon → Tue → Wed → Thu → Fri) ----------
function renderDays(data) {
  daysContainer.innerHTML = "";

  const daily = data.forecast?.forecastday || [];

  // Get today's real day index (0 = Sunday)
  const todayIndex = new Date().getDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Build label list dynamically
  const labels = [];
  const yesterdayIndex = (todayIndex - 1 + 7) % 7;

  labels.push("Yesterday"); // Always first
  labels.push("Today");     // Always second

  // Then add next 5 days (after today)
  for (let i = 1; i <= 5; i++) {
    const nextDayIndex = (todayIndex + i) % 7;
    labels.push(dayNames[nextDayIndex]);
  }

  // WeatherAPI returns forecast starting from today, so we fake “yesterday”
  const extendedForecast = [];

  if (daily.length > 0) {
    const yesterday = {
      ...daily[0],
      date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      day: { ...daily[0].day } // reuse same structure
    };
    extendedForecast.push(yesterday);
  }

  // Add rest of the 7-day forecast from API
  extendedForecast.push(...daily);

  // Render first 7 cards with the correct labels
  for (let i = 0; i < 7; i++) {
    const d = extendedForecast[i];
    if (!d) continue;
    const label = labels[i];
    const div = document.createElement("div");
    div.className = "day-card";

    div.innerHTML = `
      <h4>${label}</h4>
      <img src="https:${d.day.condition.icon}" alt="${d.day.condition.text}">
      <p>${d.day.condition.text}</p>
      <p class="temps">${Math.round(d.day.maxtemp_c)}° / ${Math.round(d.day.mintemp_c)}°</p>
      <p class="rain">Rain: ${d.day.daily_chance_of_rain ?? "--"}%</p>
    `;
    daysContainer.appendChild(div);
  }
}


function renderForecastGrid(data) {
  if (!forecastGrid) return;
  forecastGrid.innerHTML = "";
  (data.forecast?.forecastday || []).slice(0,7).forEach((d,i)=>{
    const date = new Date(d.date);
    const dayName = i===0 ? "Today" : date.toLocaleDateString([], {weekday:'short'});
    const icon = d.day.condition.icon ? `https:${d.day.condition.icon}` : "";
    const max = Math.round(d.day.maxtemp_c);
    const min = Math.round(d.day.mintemp_c);
    const rainProb = Math.round(d.day.daily_chance_of_rain ?? 0);

    const card = document.createElement("div");
    card.className = "forecast-day";
    card.innerHTML = `
      <div class="forecast-left"><span>${dayName}</span></div>
      <div class="forecast-right">
        <span>${rainProb}%</span>
        <img class="forecast-icon" src="${icon}" alt="">
        <span class="forecast-temp">${max}° / ${min}°</span>
      </div>
    `;
    forecastGrid.appendChild(card);
  });
}

// ---------- ACTIVITY / ADVICE ----------
function evaluateActivity(cur, activity) {
  // cur: current object
  const temp = cur.temp_c;
  const humidity = cur.humidity;
  const windKph = cur.wind_kph;
  const windMs = parseFloat(kphToMs(windKph));
  const uv = cur.uv ?? 0;
  const aqiIndex = cur.air_quality ? (cur.air_quality["us-epa-index"] ?? cur.air_quality["gb-defra-index"] ?? 0) : 0;

  let message = "";
  if (activity === "running") {
    if (aqiIndex >= 4) message = `Air quality is poor (${aqiIndex}) — avoid strenuous outdoor running.`;
    else if (temp >= 10 && temp <= 26 && humidity < 75 && windMs < 6 && uv < 8) message = `Fair weather for running now 🏃 — ${cur.condition.text}.`;
    else if (temp > 30) message = `Too hot (${Math.round(temp)}°C) for a hard run — consider early morning or indoor.`;
    else if (humidity > 80) message = `High humidity (${humidity}%) — expect discomfort; light run recommended.`;
    else message = `Conditions are moderate for a light run — ${cur.condition.text}.`;
  } else if (activity === "gardening") {
    if (aqiIndex >= 4) message = `AQI is poor — avoid prolonged outdoor gardening if sensitive.`;
    else if (uv > 8) message = `High UV (${uv}) — wear protection when gardening.`;
    else message = `Good time for gardening — ${cur.condition.text}.`;
  } else if (activity === "cycling") {
    if (aqiIndex >= 4) message = `Poor air quality — avoid heavy cycling.`;
    else if (windMs > 10) message = `Windy (${windMs} m/s) — cycling might be challenging.`;
    else message = `Good for cycling — ${cur.condition.text}.`;
  } else {
    message = `Conditions: ${cur.condition.text}.`;
  }
  if (runningMessageEl) runningMessageEl.textContent = message;
}

// ---------- MAIN FLOW ----------
let lastFetchedData = null; // cache latest data to avoid repeated fetches

async function loadWeatherFor(query) {
  try {
    const data = await fetchWeatherFor(query);
    if (!data) throw new Error("No data returned");
    lastFetchedData = data;

    renderSummary(data);
    renderDetails(data);
    await renderDays(data, query);
    renderForecastGrid(data);
    evaluateActivity(data.current, activitySelect.value);

  } catch (err) {
    console.error("LoadWeather error:", err);
    alert("Weather load failed: " + (err.message || err));
  }
}

// ---------- UI EVENTS ----------
searchBtn.addEventListener("click", ()=> {
  const q = cityInput.value.trim();
  if (q) loadWeatherFor(q);
});
cityInput.addEventListener("keypress", (e)=> { if (e.key === "Enter") searchBtn.click(); });

useLocationBtn.addEventListener("click", ()=> {
  if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    await loadWeatherFor(`${lat},${lon}`);
  }, err => {
    alert("Location denied or unavailable");
  });
});

checkActivityBtn.addEventListener("click", ()=> {
  const act = activitySelect.value;
  // Use cached current data if present, else fetch again
  if (lastFetchedData && lastFetchedData.current) {
    evaluateActivity(lastFetchedData.current, act);
  } else {
    const city = cityEl.textContent.split(",")[0] || cityInput.value || "Nairobi";
    fetchWeatherFor(city).then(data => {
      lastFetchedData = data;
      evaluateActivity(data.current, act);
    }).catch(err => {
      console.error("Activity fetch error:", err);
    });
  }
});

// ---------- Default load ----------
window.addEventListener("load", ()=> {
  if (!apiKey || apiKey === "PASTE_YOUR_WEATHERAPI_KEY_HERE") {
    console.warn("Please set your WeatherAPI key in js/script.js -> apiKey");
    // still render the page skeleton but do not attempt fetch
    return;
  }
  // default city
  loadWeatherFor("Nairobi");
});


/*
// ---------------- CONFIG ----------------
const apiKey = "33662cea9333448da5c52739251210"; // <-- Replace if needed
const baseURL = "https://api.weatherapi.com/v1";

// ---------------- ELEMENTS ----------------
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const useLocationBtn = document.getElementById("useLocation");

const cityEl = document.querySelector(".city");
const dateEl = document.querySelector(".date");
const tempEl = document.querySelector(".temp");
const descEl = document.querySelector(".desc");
const iconEl = document.querySelector(".weather-icon");

const humidityEl = document.querySelector(".humidity");
const windEl = document.querySelector(".wind");
const feelsEl = document.querySelector(".feels");
const pressureEl = document.querySelector(".pressure");
const visibilityEl = document.querySelector(".visibility");
const moonEl = document.querySelector(".moon");

const daysContainer = document.getElementById("daysContainer");

const uvValueEl = document.getElementById("uvValue");
const uvFillEl = document.getElementById("uvFill");
const uvLabelEl = document.getElementById("uvLabel");

const windCanvas = document.getElementById("windCanvas");
const pressureCanvas = document.getElementById("pressureCanvas");
const windSpeedEl = document.getElementById("windSpeed");
const windDegEl = document.getElementById("windDeg");
const pressureValEl = document.getElementById("pressureVal");

const dewValEl = document.getElementById("dewVal");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const moonriseEl = document.getElementById("moonrise");
const moonsetEl = document.getElementById("moonset");

const humidityValueEl = document.getElementById("humidityValue");
const humidityFillEl = document.getElementById("humidityFill");
const aqiValEl = document.getElementById("aqiVal");
const aqiLabelEl = document.getElementById("aqiLabel");
const aqiFillEl = document.getElementById("aqiFill");

const clockEl = document.getElementById("clock");
const activitySelect = document.getElementById("activitySelect");
const checkActivityBtn = document.getElementById("checkActivity");
const runningMessageEl = document.getElementById("runningMessage");

const sunPathEl = document.getElementById("sunPath");
const sunDot = document.getElementById("sunDot");
const moonPathEl = document.getElementById("moonPath");
const moonDot = document.getElementById("moonDot");

// ---------------- CLOCK ----------------
function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// ---------------- HELPERS ----------------
function uvLabel(uvi) {
  if (uvi < 3) return "Low";
  if (uvi < 6) return "Moderate";
  if (uvi < 8) return "High";
  if (uvi < 11) return "Very High";
  return "Extreme";
}
function visibilityLabel(km) {
  if (km >= 10) return "Good";
  if (km >= 4) return "Moderate";
  return "Poor";
}
function kphToMs(kph) {
  return (kph * 1000 / 3600).toFixed(1);
}

// ---------------- DRAW CANVASES ----------------
function drawWindCanvas(speedMs, deg) {
  const ctx = windCanvas.getContext("2d");
  const w = windCanvas.width, h = windCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = 90;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const rad = (deg - 90) * Math.PI / 180;
  const ax = cx + Math.cos(rad) * (r - 10);
  const ay = cy + Math.sin(rad) * (r - 10);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ax, ay);
  ctx.stroke();

  windSpeedEl.textContent = `${speedMs} m/s`;
  windDegEl.textContent = `${deg}°`;
}

function drawPressureGauge(value) {
  const ctx = pressureCanvas.getContext("2d");
  const w = pressureCanvas.width, h = pressureCanvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h, r = 100;
  const minP = 980, maxP = 1045;
  const t = (value - minP) / (maxP - minP);

  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * t);
  ctx.stroke();

  pressureValEl.textContent = `${value} hPa`;
}

// ---------------- FETCH ----------------
async function getWeather(query) {
  const url = `${baseURL}/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=7&aqi=yes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("City not found");
  return await res.json();
}

// ---------------- RENDER ----------------
function renderWeather(data) {
  const cur = data.current;
  const loc = data.location;
  const fday = data.forecast.forecastday[0];

  cityEl.textContent = `${loc.name}, ${loc.country}`;
  dateEl.textContent = loc.localtime;
  tempEl.textContent = `${Math.round(cur.temp_c)}°C`;
  descEl.textContent = cur.condition.text;
  iconEl.src = `https:${cur.condition.icon}`;

  humidityEl.textContent = `${cur.humidity}%`;
  windEl.textContent = `${kphToMs(cur.wind_kph)} m/s`;
  feelsEl.textContent = `${Math.round(cur.feelslike_c)}°C`;
  pressureEl.textContent = `${cur.pressure_mb} hPa`;
  visibilityEl.textContent = `${visibilityLabel(cur.vis_km)} (${cur.vis_km} km)`;
  moonEl.textContent = fday.astro.moon_phase;

  // UV
  uvValueEl.textContent = cur.uv;
  uvFillEl.style.width = `${(cur.uv / 11) * 100}%`;
  uvLabelEl.textContent = uvLabel(cur.uv);

  // Wind + Pressure
  drawWindCanvas(kphToMs(cur.wind_kph), cur.wind_degree);
  drawPressureGauge(cur.pressure_mb);

  // Humidity + AQI
  humidityValueEl.textContent = `${cur.humidity}%`;
  humidityFillEl.style.width = `${cur.humidity}%`;

  const aqi = cur.air_quality["us-epa-index"];
  aqiValEl.textContent = aqi || "--";
  const aqiTexts = ["Good", "Moderate", "Unhealthy (S)", "Unhealthy", "Very Unhealthy", "Hazardous"];
  aqiLabelEl.textContent = aqiTexts[aqi - 1] || "--";
  aqiFillEl.style.width = `${(aqi / 6) * 100}%`;

  // Sun + Moon
  sunriseEl.textContent = fday.astro.sunrise;
  sunsetEl.textContent = fday.astro.sunset;
  moonriseEl.textContent = fday.astro.moonrise;
  moonsetEl.textContent = fday.astro.moonset;

  // Dew point (approx)
  dewValEl.textContent = `${Math.round(cur.dewpoint_c || cur.temp_c - (100 - cur.humidity) / 5)}°C`;

  // 7-Day forecast
  daysContainer.innerHTML = "";
  data.forecast.forecastday.forEach(day => {
    const el = document.createElement("div");
    el.className = "day-card";
    el.innerHTML = `
      <p>${new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}</p>
      <img src="https:${day.day.condition.icon}" alt="">
      <p>${Math.round(day.day.maxtemp_c)}° / ${Math.round(day.day.mintemp_c)}°</p>
    `;
    daysContainer.appendChild(el);
  });
}

// ---------------- ACTIVITY CHECK ----------------
function checkActivity(data) {
  const cur = data.current;
  const aqi = cur.air_quality["us-epa-index"] || 0;
  const activity = activitySelect.value;
  let msg = "";

  if (aqi >= 4) msg += "Air quality is poor. Avoid long outdoor activity. ";
  if (cur.temp_c < 10) msg += "It's too cold for comfort. ";
  if (cur.temp_c > 35) msg += "Very hot — stay hydrated. ";

  if (!msg) msg = `Great! It's a nice time for ${activity}.`;
  runningMessageEl.textContent = msg;
}

// ---------------- MAIN ----------------
async function loadWeather(query) {
  try {
    const data = await getWeather(query);
    renderWeather(data);
    checkActivity(data);
  } catch (err) {
    alert(err.message);
  }
}

// ---------------- EVENTS ----------------
searchBtn.addEventListener("click", () => {
  const q = cityInput.value.trim();
  if (q) loadWeather(q);
});
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});
useLocationBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        loadWeather(coords);
      },
      () => alert("Location access denied.")
    );
  } else alert("Geolocation not supported.");
});
checkActivityBtn.addEventListener("click", () => {
  const q = cityEl.textContent.split(",")[0] || "Nairobi";
  loadWeather(q);
});

// ---------------- INIT ----------------
loadWeather("Nairobi");
*/