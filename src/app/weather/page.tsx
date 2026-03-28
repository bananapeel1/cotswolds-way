import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const FORECAST = [
  { day: "Mon", icon: "cloud", temp: "14", low: "7", desc: "Overcast", rain: "20%" },
  { day: "Tue", icon: "rainy", temp: "12", low: "6", desc: "Light rain", rain: "75%" },
  { day: "Wed", icon: "partly_cloudy_day", temp: "15", low: "8", desc: "Partly cloudy", rain: "10%" },
  { day: "Thu", icon: "wb_sunny", temp: "17", low: "9", desc: "Sunny spells", rain: "5%" },
  { day: "Fri", icon: "cloudy", temp: "13", low: "7", desc: "Cloudy", rain: "35%" },
];

const SEASONAL_AVERAGES = [
  { season: "Spring (Mar-May)", tempHigh: "14", tempLow: "5", rainfall: "55mm/mo", daylight: "12-16 hrs", notes: "Wildflower season. Muddy paths drying out. Lambing on farms." },
  { season: "Summer (Jun-Aug)", tempHigh: "21", tempLow: "12", rainfall: "60mm/mo", daylight: "15-17 hrs", notes: "Best walking conditions. Longest days. Can be hot on exposed ridges." },
  { season: "Autumn (Sep-Nov)", tempHigh: "14", tempLow: "6", rainfall: "75mm/mo", daylight: "9-13 hrs", notes: "Spectacular foliage. Paths become muddy. Shorter days require planning." },
  { season: "Winter (Dec-Feb)", tempHigh: "7", tempLow: "1", rainfall: "70mm/mo", daylight: "7-10 hrs", notes: "Frosty mornings. Limited daylight. Some B&Bs close for the season." },
];

export default function WeatherPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Cotswold Way Weather
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Check conditions before you walk. The Cotswolds enjoy a temperate maritime climate, but weather on the escarpment can change quickly.
          </p>
        </div>
      </section>

      {/* Current Conditions */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Current Conditions</h2>
          <div className="bg-surface-container-low rounded-xl p-8 md:p-12 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="text-center md:text-left">
                <span className="material-symbols-outlined text-7xl text-tertiary">partly_cloudy_day</span>
              </div>
              <div className="text-center md:text-left">
                <p className="font-label text-xs uppercase tracking-widest text-secondary mb-1">Cotswold Escarpment</p>
                <p className="font-headline text-6xl font-bold text-primary">14&deg;C</p>
                <p className="font-body text-secondary mt-1">Partly cloudy with light breeze</p>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 md:ml-auto">
                <div className="text-center">
                  <span className="material-symbols-outlined text-xl text-secondary mb-1">air</span>
                  <p className="font-body text-xs text-secondary">Wind</p>
                  <p className="font-body text-primary font-semibold text-sm">12 mph SW</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-xl text-secondary mb-1">humidity_percentage</span>
                  <p className="font-body text-xs text-secondary">Humidity</p>
                  <p className="font-body text-primary font-semibold text-sm">72%</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-xl text-secondary mb-1">visibility</span>
                  <p className="font-body text-xs text-secondary">Visibility</p>
                  <p className="font-body text-primary font-semibold text-sm">Good</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-xl text-secondary mb-1">water_drop</span>
                  <p className="font-body text-xs text-secondary">Rain chance</p>
                  <p className="font-body text-primary font-semibold text-sm">15%</p>
                </div>
              </div>
            </div>
            <p className="font-body text-xs text-secondary/60 mt-6 text-center">
              Sample data for illustration. See Met Office link below for live conditions.
            </p>
          </div>
        </div>
      </section>

      {/* 5-Day Forecast */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">5-Day Forecast</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {FORECAST.map((day) => (
              <div key={day.day} className="bg-surface rounded-xl p-6 text-center shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
                <p className="font-label text-xs uppercase tracking-widest text-secondary mb-3">{day.day}</p>
                <span className="material-symbols-outlined text-4xl text-tertiary">{day.icon}</span>
                <p className="font-headline text-2xl font-bold text-primary mt-2">{day.temp}&deg;</p>
                <p className="font-body text-secondary text-xs">Low: {day.low}&deg;C</p>
                <p className="font-body text-secondary text-xs mt-1">{day.desc}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="material-symbols-outlined text-sm text-secondary">water_drop</span>
                  <p className="font-body text-secondary text-xs">{day.rain}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="font-body text-xs text-secondary/60 mt-4 text-center">
            Illustrative forecast only. Always check the Met Office for accurate predictions before walking.
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
              <div key={pack.season} className="bg-surface rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-2xl text-tertiary">{pack.icon}</span>
                  <h3 className="font-headline text-xl font-semibold text-primary">{pack.season}</h3>
                </div>
                <ul className="space-y-2">
                  {pack.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 font-body text-secondary text-sm">
                      <span className="material-symbols-outlined text-sm text-tertiary mt-0.5">check</span>
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
          <span className="material-symbols-outlined text-5xl text-tertiary mb-4">open_in_new</span>
          <h2 className="font-headline text-3xl font-bold text-primary mb-4">Live Weather Data</h2>
          <p className="font-body text-secondary max-w-xl mx-auto mb-8 leading-relaxed">
            For real-time forecasts and weather warnings, visit the Met Office. Check conditions for Cheltenham, Stroud, and Bath to cover the full trail.
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
