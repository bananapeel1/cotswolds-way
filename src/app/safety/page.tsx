import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SafetyPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Trail Safety Guide
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Essential safety information for walking the Cotswold Way. Be prepared, stay safe, and enjoy every mile.
          </p>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Emergency Contacts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "emergency", title: "Emergency Services", number: "999", desc: "For life-threatening emergencies. Ask for Police, Ambulance, Fire, or Mountain Rescue. If you have no signal, try 112 which connects via any available network." },
              { icon: "local_hospital", title: "NHS Non-Emergency", number: "111", desc: "For urgent medical advice that is not life-threatening. Available 24/7. Advisors can direct you to the nearest pharmacy, walk-in centre, or A&E." },
              { icon: "landscape", title: "Mountain Rescue", number: "999 (ask for Mountain Rescue)", desc: "Gloucestershire Cave Rescue Group and SARA cover the Cotswold Way. Call 999 and ask for Mountain Rescue if injured on the trail." },
            ].map((contact) => (
              <div key={contact.title} className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
                <span className="material-symbols-outlined text-3xl text-tertiary mb-3">{contact.icon}</span>
                <h3 className="font-headline text-xl font-semibold text-primary mb-1">{contact.title}</h3>
                <p className="font-label text-lg font-bold text-tertiary mb-3">{contact.number}</p>
                <p className="font-body text-secondary text-sm leading-relaxed">{contact.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-error-container rounded-xl p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-error-container text-2xl shrink-0">info</span>
              <div>
                <h4 className="font-headline text-lg font-semibold text-on-error-container mb-1">What3Words</h4>
                <p className="font-body text-on-error-container text-sm leading-relaxed">
                  Download the What3Words app before your walk. It gives your precise location as three words, making it easier for emergency services to find you in remote areas with no address or landmark.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weather Hazards */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Weather Hazards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-3">water_drop</span>
              <h3 className="font-headline text-xl font-semibold text-primary mb-3">Mud &amp; Wet Ground</h3>
              <p className="font-body text-secondary text-sm leading-relaxed">
                The Cotswold clay becomes extremely slippery when wet, especially between October and April. Sections near Coaley Peak and Standish Wood are notorious. Wear boots with deep tread and use trekking poles for stability.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-3">foggy</span>
              <h3 className="font-headline text-xl font-semibold text-primary mb-3">Fog &amp; Low Visibility</h3>
              <p className="font-body text-secondary text-sm leading-relaxed">
                Dense fog is common on the escarpment, particularly around Cleeve Hill and Leckhampton Hill. Navigation becomes difficult when waymarks are obscured. Carry a compass and have your GPS app ready with downloaded offline maps.
              </p>
            </div>
            <div className="bg-surface rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-3">thunderstorm</span>
              <h3 className="font-headline text-xl font-semibold text-primary mb-3">Lightning &amp; Storms</h3>
              <p className="font-body text-secondary text-sm leading-relaxed">
                Exposed ridgelines offer no shelter during thunderstorms. If you hear thunder within 30 seconds of lightning, descend from high ground immediately. Avoid isolated trees and metal fences. Crouch low if caught in the open.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kit Checklist */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Essential Kit Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {[
              { icon: "medical_services", label: "First aid kit", detail: "Blister plasters, antiseptic wipes, bandages, painkillers, antihistamines" },
              { icon: "flashlight_on", label: "Head torch", detail: "With spare batteries. Essential if you misjudge timing on winter days" },
              { icon: "campaign", label: "Emergency whistle", detail: "Six blasts in a minute is the international distress signal" },
              { icon: "battery_charging_full", label: "Phone charger / power bank", detail: "Keep your phone charged for navigation and emergency calls" },
              { icon: "water_drop", label: "Water (2L minimum)", detail: "Refill points are limited between some villages" },
              { icon: "rainy", label: "Waterproof jacket & trousers", detail: "Breathable waterproofs are essential year-round in the Cotswolds" },
              { icon: "thermostat", label: "Warm layers", detail: "Wind chill on the escarpment can drop temperatures significantly" },
              { icon: "restaurant", label: "Emergency food", detail: "Energy bars, nuts, dried fruit for unexpected delays" },
              { icon: "map", label: "Paper map & compass", detail: "OS Explorer maps OL45 and 167-179 as backup to digital" },
              { icon: "wb_sunny", label: "Sun protection", detail: "Sunscreen, hat, and sunglasses for exposed ridge sections in summer" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4 py-3 border-b border-outline-variant/30">
                <span className="material-symbols-outlined text-xl text-tertiary shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <h4 className="font-body text-primary font-semibold text-sm">{item.label}</h4>
                  <p className="font-body text-secondary text-xs mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trail Etiquette */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Trail Etiquette</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: "fence", title: "Gates & Stiles", desc: "Always close gates behind you, even if you found them open. Farmland relies on gates to keep livestock contained. Use stiles where provided rather than climbing fences." },
              { icon: "pets", title: "Livestock Awareness", desc: "Keep dogs on leads near livestock, especially during lambing season (March-May). If cattle approach aggressively, release your dog and move away calmly. Never position yourself between a cow and her calf." },
              { icon: "directions_walk", title: "Right of Way", desc: "The Cotswolds Way follows public rights of way. Stick to the marked path, especially through farmland. You have a right to pass through, but not to leave litter, pick crops, or disturb wildlife." },
              { icon: "delete", title: "Leave No Trace", desc: "Carry out all litter, including biodegradable waste like fruit peel. Use designated facilities where available. Wild camping is not permitted along most of the trail without landowner permission." },
            ].map((item) => (
              <div key={item.title} className="flex gap-5">
                <span className="material-symbols-outlined text-3xl text-tertiary shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-headline text-lg font-semibold text-primary mb-2">{item.title}</h3>
                  <p className="font-body text-secondary text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Water Points */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-8">Water Points &amp; Refill Stations</h2>
          <p className="font-body text-secondary mb-8 max-w-2xl leading-relaxed">
            The Cotswolds Way passes through numerous villages with shops, pubs, and cafes where you can refill water bottles. However, some stretches between settlements are long. Plan ahead.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { village: "Chipping Campden", note: "Multiple shops, cafes, and pubs. Top up before the first section." },
              { village: "Broadway", note: "Village shops and the Crown & Trumpet pub offer refills." },
              { village: "Winchcombe", note: "Well-served with shops. Last reliable stop before the long Cleeve Hill section." },
              { village: "Painswick", note: "Village stores and pubs. Refill here before the stretch to Middleyard." },
              { village: "Dursley", note: "Town with supermarket and multiple cafes." },
              { village: "Wotton-under-Edge", note: "Good facilities. Top up before the remote section to Hawkesbury Upton." },
              { village: "Cold Ashton", note: "Limited options. The White Hart pub is your best bet." },
              { village: "Bath", note: "Full urban facilities at the trail's end." },
            ].map((point) => (
              <div key={point.village} className="flex items-start gap-3 bg-surface-container-low rounded-lg p-4">
                <span className="material-symbols-outlined text-lg text-tertiary shrink-0 mt-0.5">local_drink</span>
                <div>
                  <h4 className="font-body text-primary font-semibold text-sm">{point.village}</h4>
                  <p className="font-body text-secondary text-xs mt-0.5">{point.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
