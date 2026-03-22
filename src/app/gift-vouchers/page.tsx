import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const VOUCHER_OPTIONS = [
  { amount: "50", label: "Day Walker", covers: "A night at a cosy campsite or hostel, or a contribution towards a B&B stay along the trail." },
  { amount: "100", label: "Weekend Explorer", covers: "A comfortable B&B night with breakfast, or two nights of camping plus a pub dinner." },
  { amount: "200", label: "Trail Adventurer", covers: "Two nights at a quality B&B or inn, or a full weekend of accommodation and dining." },
];

export default function GiftVouchersPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Gift the Trail
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Give the gift of adventure. Our vouchers can be used towards any accommodation booking along the Cotswold Way.
          </p>
        </div>
      </section>

      {/* Coming Soon Notice */}
      <section className="py-6 px-8 bg-tertiary/10">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
          <span className="material-symbols-outlined text-xl text-tertiary">info</span>
          <p className="font-body text-tertiary font-semibold text-sm">
            Gift vouchers are coming soon. Payments are not yet active, but you can preview the options below.
          </p>
        </div>
      </section>

      {/* Voucher Options */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-3 text-center">Choose a Voucher</h2>
          <p className="font-body text-secondary text-center mb-12 max-w-xl mx-auto">
            Select from our curated amounts or choose your own. All vouchers are valid for 12 months from purchase.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {VOUCHER_OPTIONS.map((voucher) => (
              <div
                key={voucher.amount}
                className="bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)] text-center flex flex-col"
              >
                <span className="material-symbols-outlined text-4xl text-tertiary mb-3">redeem</span>
                <p className="font-label text-xs uppercase tracking-widest text-secondary mb-1">{voucher.label}</p>
                <p className="font-headline text-5xl font-bold text-primary mb-4">&pound;{voucher.amount}</p>
                <p className="font-body text-secondary text-sm leading-relaxed flex-1">{voucher.covers}</p>
                <button
                  disabled
                  className="mt-6 bg-tertiary/30 text-tertiary px-6 py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mt-8 bg-surface-container-low rounded-xl p-8 shadow-[0_4px_24px_rgba(28,28,25,0.05)] text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="material-symbols-outlined text-3xl text-tertiary">tune</span>
              <h3 className="font-headline text-2xl font-bold text-primary">Custom Amount</h3>
            </div>
            <p className="font-body text-secondary text-sm max-w-md mx-auto mb-6">
              Choose any amount between &pound;25 and &pound;1,000. Perfect for splitting the cost of a multi-day trek with friends or family.
            </p>
            <div className="flex items-center justify-center gap-3 max-w-xs mx-auto">
              <span className="font-headline text-2xl text-primary font-bold">&pound;</span>
              <input
                type="number"
                placeholder="150"
                disabled
                className="bg-surface border border-outline-variant/30 rounded-lg px-4 py-3 font-body text-lg text-primary w-full text-center cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-8 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-headline text-3xl font-bold text-primary mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "shopping_cart", title: "Choose Your Amount", desc: "Pick from our suggested amounts or set your own custom value. All vouchers work as credit towards accommodation bookings." },
              { step: "2", icon: "edit", title: "Personalise", desc: "Add a personal message and the recipient's name. We will generate a beautifully designed digital voucher with a unique redemption code." },
              { step: "3", icon: "send", title: "Send It", desc: "Choose email delivery for instant gifting, or download a printable PDF to include with a card. The recipient redeems online when booking." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white font-headline text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <span className="material-symbols-outlined text-3xl text-tertiary mb-3">{item.icon}</span>
                <h3 className="font-headline text-xl font-semibold text-primary mb-2">{item.title}</h3>
                <p className="font-body text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
