import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function LuggageTransfersPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative py-32 px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Cotswold countryside path"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=1920&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 text-center text-white">
          <span className="text-tertiary-fixed font-bold uppercase tracking-[0.3em] text-xs mb-4 block">
            Walk Light
          </span>
          <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Luggage Transfers
          </h1>
          <p className="font-body text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Walk freely with just a daypack. Your bags travel door-to-door between
            accommodations, guaranteed to arrive before you do.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-tertiary font-bold uppercase tracking-[0.3em] text-xs mb-4 block">
              Simple &amp; Reliable
            </span>
            <h2 className="font-headline text-4xl md:text-5xl text-primary font-bold">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard
              number="01"
              icon="luggage"
              title="Leave Your Bags"
              description="Place your luggage at reception by 9am. Our driver collects from every partner property along the trail each morning."
            />
            <StepCard
              number="02"
              icon="local_shipping"
              title="We Transfer"
              description="GPS-tracked vehicles move your bags along the trail corridor. Real-time notifications let you know exactly when they arrive."
            />
            <StepCard
              number="03"
              icon="hotel"
              title="Bags Waiting"
              description="Arrive at your next accommodation to find your luggage already in your room. Guaranteed delivery by 3pm."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl text-primary font-bold mb-4">
              Pricing
            </h2>
            <p className="text-secondary max-w-xl mx-auto">
              Transparent, per-day pricing with no hidden fees. Add luggage transfer
              to any itinerary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl p-10 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-secondary mb-4">
                Standard Transfer
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-headline text-5xl font-bold text-primary">£25</span>
                <span className="text-secondary text-sm">/bag /day</span>
              </div>
              <p className="text-secondary text-sm mb-8">
                Per bag, per transfer between consecutive trail stops.
              </p>
              <ul className="space-y-3 mb-10">
                <CheckItem text="Up to 20kg per bag" />
                <CheckItem text="GPS-tracked delivery" />
                <CheckItem text="Guaranteed by 3pm" />
                <CheckItem text="Real-time notifications" />
                <CheckItem text="Weather-proof covers included" />
              </ul>
              <Link
                href="/itinerary"
                className="block text-center bg-primary text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-all"
              >
                Add to Itinerary
              </Link>
            </div>

            <div className="bg-primary rounded-2xl p-10 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-tertiary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Best Value
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-primary-fixed mb-4">
                Full Trail Package
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-headline text-5xl font-bold text-white">£150</span>
                <span className="text-primary-fixed text-sm">/whole trail</span>
              </div>
              <p className="text-primary-fixed text-sm mb-8">
                One bag, every day of a 7-day classic itinerary. Save over 15%.
              </p>
              <ul className="space-y-3 mb-10">
                <CheckItemLight text="Everything in Standard" />
                <CheckItemLight text="7 consecutive transfers" />
                <CheckItemLight text="Priority morning collection" />
                <CheckItemLight text="Emergency re-routing included" />
                <CheckItemLight text="Free walking pole storage" />
              </ul>
              <Link
                href="/itinerary"
                className="block text-center bg-tertiary text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-tertiary-container transition-all"
              >
                Plan My Trek
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-8 bg-surface">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-headline text-4xl text-primary font-bold mb-16 text-center">
            Common Questions
          </h2>
          <div className="space-y-0 divide-y divide-outline-variant/20">
            <FAQItem
              question="What's the maximum bag weight?"
              answer="Each bag can weigh up to 20kg. If you have oversized items like bike boxes or musical instruments, contact us for a custom quote."
            />
            <FAQItem
              question="What if I need to change my route mid-walk?"
              answer="No problem. Use our app or call our trail support line before 8am and we'll reroute your luggage to any partner property on the trail."
            />
            <FAQItem
              question="Is the service available year-round?"
              answer="Our luggage transfer runs daily from March through October. Winter transfers (November–February) are available on weekends and can be arranged with 48 hours' notice."
            />
            <FAQItem
              question="What happens in bad weather?"
              answer="All bags are transported in weather-proof covers inside enclosed vehicles. Deliveries are guaranteed regardless of conditions — rain, wind, or shine."
            />
            <FAQItem
              question="Can I add luggage transfer after booking accommodation?"
              answer="Absolutely. You can add luggage transfer at any point before your walk. Just update your itinerary in your account or contact our team."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 bg-surface-container-highest">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl text-primary font-bold mb-4">
            Ready to walk light?
          </h2>
          <p className="text-secondary mb-8 max-w-lg mx-auto">
            Add luggage transfers when building your itinerary. Toggle it on and
            the cost is calculated automatically.
          </p>
          <Link
            href="/itinerary"
            className="bg-tertiary text-white px-10 py-4 rounded-lg font-bold text-xs uppercase tracking-[0.2em] hover:bg-tertiary-container transition-all inline-flex items-center gap-2"
          >
            Build Your Itinerary
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center w-20 h-20 bg-surface-container-low rounded-2xl mb-6">
        <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
        <span className="absolute -top-2 -right-2 text-[10px] font-bold text-tertiary bg-tertiary-fixed w-6 h-6 rounded-full flex items-center justify-center">
          {number}
        </span>
      </div>
      <h3 className="font-headline text-xl font-bold text-primary mb-3">{title}</h3>
      <p className="text-secondary text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-secondary">
      <span className="material-symbols-outlined text-tertiary text-base">check_circle</span>
      {text}
    </li>
  );
}

function CheckItemLight({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-primary-fixed">
      <span className="material-symbols-outlined text-tertiary-fixed text-base">check_circle</span>
      {text}
    </li>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group py-6 cursor-pointer">
      <summary className="flex items-center justify-between font-headline text-lg font-bold text-primary list-none">
        {question}
        <span className="material-symbols-outlined text-secondary group-open:rotate-180 transition-transform">
          expand_more
        </span>
      </summary>
      <p className="text-secondary leading-relaxed mt-4 pr-8">{answer}</p>
    </details>
  );
}
