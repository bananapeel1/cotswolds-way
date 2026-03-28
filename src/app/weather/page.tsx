import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

// Three points along the trail: north, middle, south
const TRAIL_LOCATIONS = [
  { name: "Chipping Campden", lat: 52.0536, lon: -1.7798 },
  { name: "Cheltenham", lat: 51.8985, lon: -2.0748 },
  { name: "Bath", lat: 51.3848, lon: -2.3648 },
];

// Open-Meteo WMO weather codes → Material icon + description
function weatherCodeToInfo(code: number): { icon: string; desc: string } {
  if (code === 0) return { icon: "wb_sunny", desc: "Clear sky" };
  if (code === 1) return { icon: "wb_sunny", desc: "Mainly clear" };
  if (code === 2) return { icon: "partly_cloudy_day", desc: "Partly cloudy" };
  if (code === 3) return { icon: "cloud", desc: "Overcast" };
  if (code === 45 || code === 48) return { icon: "foggy", desc: "Fog" };
  if (code >= 51 && code <= 55) return { icon: "grain", desc: "Drizzle" };
  if (code >= 56 && code <= 57) return { icon: "grain", desc: "Freezing drizzle" };
  if (code >= 61 && code <= 65) return { icon: "rainy", desc: "Rain" };
  if (code >= 66 && code <= 67) return { icon: "rainy", desc: "Freezing rain" };
  if (code >= 71 && code <= 77) return { icon: "ac_unit", desc: "Snow" };
  if (code >= 80 && code <= 82) return { icon: "rainy", desc: "Rain showers" };
  if (code >= 85 && code <= 86) return { icon: "ac_unit", desc: "Snow showers" };
  if (code >= 95) return { icon: "thunderstorm", desc: "Thunderstorm" };
  return { icon: "cloud", desc: "Cloudy" };
}

type CurrentWeather = {
  name: string;
  temp: number;
  icon: string;
  desc: string;
  windSpeed: number;
  humidity: number;
  precip: number;
};

type DayForecast = {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  icon: string;
  desc: string;
  precipProb: number;
};

async function fetchWeatherData() {
  const lats = TRAIL_LOCATIONS.map((l) => l.lat).join(",");
  const lons = TRAIL_LOCATIONS.map((l) => l.lon).join(",");

  // Fetch current weather for all 3 locations
  const currentRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Europe/London`,
    { next: { revalidate: 1800 } } // cache 30 min
  );

  // Fetch 7-day forecast for Cheltenham (middle of trail)
  const forecastRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=51.8985&longitude=-2.0748&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Europe/London&forecast_days=7`,
    { next: { revalidate: 1800 } }
  );

  if (!currentRes.ok || !forecastRes.ok) return null;

  const currentData = await currentRes.json();
  const forecastData = await forecastRes.json();

  // Parse current conditions for each location
  // Open-Meteo returns an array when multiple lat/lons are passed
  const currentArray = Array.isArray(currentData) ? currentData : [currentData];
  const current: CurrentWeather[] = currentArray.map((d: Record<string, Record<string, number>>, i: number) => {
    const c = d.current;
    const info = weatherCodeToInfo(c.weather_code);
    return {
      name: TRAIL_LOCATIONS[i].name,
      temp: Math.round(c.temperature_2m),
      icon: info.icon,
      desc: info.desc,
      windSpeed: Math.round(c.wind_speed_10m),
      humidity: Math.round(c.relative_humidity_2m),
      precip: c.precipitation,
    };
  });

  // Parse 7-day forecast
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const forecast: DayForecast[] = forecastData.daily.time.map((date: string, i: number) => {
    const d = new Date(date);
    const info = weatherCodeToInfo(forecastData.daily.weather_code[i]);
    return {
      date,
      dayName: days[d.getDay()],
      tempMax: Math.round(forecastData.daily.temperature_2m_max[i]),
      tempMin: Math.round(forecastData.daily.temperature_2m_min[i]),
      icon: info.icon,
      desc: info.desc,
      precipProb: forecastData.daily.precipitation_probability_max[i],
    };
  });

  return { current, forecast };
}

const SEASONAL_AVERAGES = [
  { season: "Spring (Mar–May)", tempHigh: "14", tempLow: "5", rainfall: "55mm/mo", daylight: "12–16 hrs", notes: "Wildflower season. Muddy paths drying out. Lambing on farms." },
  { season: "Summer (Jun–Aug)", tempHigh: "21", tempLow: "12", rainfall: "60mm/mo", daylight: "15–17 hrs", notes: "Best walking conditions. Longest days. Can be hot on exposed ridges." },
  { season: "Autumn (Sep–Nov)", tempHigh: "14", tempLow: "6", rainfall: "75mm/mo", daylight: "9–13 hrs", notes: "Spectacular foliage. Paths become muddy. Shorter days require planning." },
  { season: "Winter (Dec–Feb)", tempHigh: "7", tempLow: "1", rainfall: "70mm/mo", daylight: "7–10 hrs", notes: "Frosty mornings. Limited daylight. Some B&Bs close for the season." },
];

export default async function WeatherPage() {
  const weather = await fetchWeatherData();

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            Trail Weather
          </h1>
          <p className="font-body text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Live conditions along the Cotswold Way. The Cotswolds enjoy a temperate maritime climate, but weather on the escarpment can change quickly.
          </p>
        </div>
      </section>

      {/* Current Conditions — 3 locations */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Current Conditions</h2>
          {weather ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {weather.current.map((loc) => (
                <div key={loc.name} className="bg-surface-container-low rounded-2xl p-8 text-center">
                  <p className="font-label text-[10px] uppercase tracking-[1px] text-secondary mb-3">{loc.name}</p>
                  <span className="material-symbols-outlined text-5xl text-primary mb-2">{loc.icon}</span>
                  <p className="font-headline text-5xl font-extrabold text-primary">{loc.temp}&deg;</p>
                  <p className="font-body text-secondary text-sm mt-1 mb-6">{loc.desc}</p>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline-variant/10">
                    <div>
                      <span className="material-symbols-outlined text-base text-secondary">air</span>
                      <p className="font-body text-primary font-semibold text-sm">{loc.windSpeed} km/h</p>
                      <p className="font-body text-xs text-secondary">Wind</p>
                    </div>
                    <div>
                      <span className="material-symbols-outlined text-base text-secondary">humidity_percentage</span>
                      <p className="font-body text-primary font-semibold text-sm">{loc.humidity}%</p>
                      <p className="font-body text-xs text-secondary">Humidity</p>
                    </div>
                    <div>
                      <span className="material-symbols-outlined text-base text-secondary">water_drop</span>
                      <p className="font-body text-primary font-semibold text-sm">{loc.precip} mm</p>
                      <p className="font-body text-xs text-secondary">Precip</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">Unable to load live weather data. Please check the Met Office link below.</p>
          )}
        </div>
      </section>

      {/* 7-Day Forecast */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-2">7-Day Forecast</h2>
          <p className="text-secondary text-sm mb-8">Cheltenham area (mid-trail)</p>
          {weather ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
              {weather.forecast.map((day) => (
                <div key={day.date} className="bg-surface rounded-2xl p-5 text-center">
                  <p className="font-label text-xs font-bold text-secondary mb-3">{day.dayName}</p>
                  <span className="material-symbols-outlined text-3xl text-primary">{day.icon}</span>
                  <p className="font-headline text-2xl font-extrabold text-primary mt-2">{day.tempMax}&deg;</p>
                  <p className="font-body text-secondary text-xs">{day.tempMin}&deg; low</p>
                  <p className="font-body text-secondary text-xs mt-1">{day.desc}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-sm text-secondary">water_drop</span>
                    <p className="font-body text-secondary text-xs">{day.precipProb}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">Unable to load forecast data.</p>
          )}
          <p className="font-body text-xs text-secondary/60 mt-6 text-center">
            Powered by Open-Meteo. Data updates every 30 minutes.
          </p>
        </div>
      </section>

      {/* Seasonal Averages */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Seasonal Averages</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="font-label text-xs uppercase tracking-widest text-secondary py-4 pr-4">Season</th>
                  <th className="font-label text-xs uppercase tracking-widest text-secondary py-4 pr-4">High</th>
                  <th className="font-label text-xs uppercase tracking-widest text-secondary py-4 pr-4">Low</th>
                  <th className="font-label text-xs uppercase tracking-widest text-secondary py-4 pr-4">Rainfall</th>
                  <th className="font-label text-xs uppercase tracking-widest text-secondary py-4 pr-4">Daylight</th>
                  <th className="font-label text-xs uppercase tracking-widest text-secondary py-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {SEASONAL_AVERAGES.map((row) => (
                  <tr key={row.season} className="border-b border-outline-variant/20">
                    <td className="font-body text-primary font-semibold text-sm py-4 pr-4">{row.season}</td>
                    <td className="font-body text-primary text-sm py-4 pr-4">{row.tempHigh}&deg;C</td>
                    <td className="font-body text-primary text-sm py-4 pr-4">{row.tempLow}&deg;C</td>
                    <td className="font-body text-primary text-sm py-4 pr-4">{row.rainfall}</td>
                    <td className="font-body text-primary text-sm py-4 pr-4">{row.daylight}</td>
                    <td className="font-body text-secondary text-sm py-4">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What to Pack */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">What to Pack by Season</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { season: "Spring", icon: "local_florist", items: ["Layering system (base, mid, shell)", "Waterproof jacket & trousers", "Walking boots with good grip", "Gaiters for muddy sections", "Sun hat + sunscreen for clear days"] },
              { season: "Summer", icon: "wb_sunny", items: ["Lightweight breathable clothing", "Wide-brimmed hat & sunglasses", "SPF 30+ sunscreen", "2L+ water capacity", "Light waterproof (rain is still possible)"] },
              { season: "Autumn", icon: "eco", items: ["Warm fleece or down mid-layer", "Waterproofs (expect rain)", "Head torch (shorter days)", "Warm hat & gloves for mornings", "High-visibility element for dusk walking"] },
              { season: "Winter", icon: "ac_unit", items: ["Insulated waterproof jacket", "Thermal base layers", "Warm hat, gloves & neck gaiter", "Head torch (essential)", "Emergency bivvy bag"] },
            ].map((pack) => (
              <div key={pack.season} className="bg-surface rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-2xl text-primary">{pack.icon}</span>
                  <h3 className="font-headline text-xl font-bold text-primary">{pack.season}</h3>
                </div>
                <ul className="space-y-2">
                  {pack.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 font-body text-secondary text-sm">
                      <span className="material-symbols-outlined text-sm text-primary mt-0.5">check</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Met Office Link */}
      <section className="py-16 px-8 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-3xl font-bold text-primary mb-4">Detailed Forecasts</h2>
          <p className="font-body text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            For weather warnings and hour-by-hour forecasts, visit the Met Office.
          </p>
          <Link
            href="https://www.metoffice.gov.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-label text-sm font-bold hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">open_in_new</span>
            Visit Met Office
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
