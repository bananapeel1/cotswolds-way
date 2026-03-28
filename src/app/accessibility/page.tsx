import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AccessibilityPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Accessibility Statement
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            Our commitment to making The Cotswolds Way platform accessible to everyone.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-3xl mx-auto">
          <p className="font-body text-secondary text-sm mb-8">
            Last updated: 1 January 2026
          </p>

          <div className="space-y-10">
            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Our Commitment</h2>
              <p className="font-body text-secondary text-sm leading-relaxed">
                The Cotswolds Way is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA.
              </p>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Measures We Take</h2>
              <ul className="space-y-3">
                {[
                  "Semantic HTML structure with proper heading hierarchy throughout all pages.",
                  "Sufficient colour contrast ratios between text and background colours, meeting WCAG AA standards.",
                  "Keyboard navigation support for all interactive elements including our map search and itinerary builder.",
                  "Alt text for all meaningful images and decorative images marked appropriately.",
                  "Form labels and error messages that are clearly associated with their inputs.",
                  "Responsive design that works across screen sizes and supports browser zoom up to 200%.",
                  "No content that flashes more than three times per second.",
                  "Skip navigation links for keyboard users to bypass repetitive content.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-secondary text-sm leading-relaxed">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5 shrink-0">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Known Limitations</h2>
              <p className="font-body text-secondary text-sm leading-relaxed mb-4">
                While we strive for full accessibility, some areas of our platform may have limitations:
              </p>
              <ul className="space-y-3">
                {[
                  "Interactive map: The Mapbox-powered trail map may have limited screen reader support. We provide alternative text-based accommodation listings on the search page.",
                  "Third-party content: Some embedded content from accommodation providers may not meet our accessibility standards.",
                  "PDF downloads: Some downloadable documents may not be fully accessible. Contact us for alternative formats.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-secondary text-sm leading-relaxed">
                    <span className="material-symbols-outlined text-sm text-secondary mt-0.5 shrink-0">info</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Trail Accessibility</h2>
              <p className="font-body text-secondary text-sm leading-relaxed mb-4">
                The Cotswolds Way National Trail includes terrain that presents physical accessibility challenges. Important information for visitors with mobility requirements:
              </p>
              <ul className="space-y-3">
                {[
                  "The trail includes stiles, steep gradients, and uneven surfaces that are not wheelchair accessible along most sections.",
                  "Some shorter sections near towns (such as Broadway and Bath) have accessible paths suitable for wheelchairs and pushchairs.",
                  "National Trails provides information about accessible sections at nationaltrail.co.uk.",
                  "We include accessibility notes in our accommodation listings where properties have provided this information.",
                  "Many of our listed B&Bs and hotels have ground-floor rooms and accessible facilities. Use our search filters to find suitable properties.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-secondary text-sm leading-relaxed">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5 shrink-0">accessible</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Assistive Technologies</h2>
              <p className="font-body text-secondary text-sm leading-relaxed">
                Our website is designed to be compatible with the following assistive technologies:
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Screen readers (NVDA, JAWS, VoiceOver)",
                  "Screen magnification software",
                  "Speech recognition software",
                  "Keyboard-only navigation",
                  "Browser extensions for colour and contrast adjustment",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 font-body text-secondary text-sm">
                    <span className="material-symbols-outlined text-sm text-tertiary">check</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Feedback and Contact</h2>
              <p className="font-body text-secondary text-sm leading-relaxed mb-4">
                We welcome your feedback on the accessibility of The Cotswolds Way platform. If you encounter any barriers or have suggestions for improvement, please contact us:
              </p>
              <div className="bg-surface-container-low rounded-xl p-6 shadow-[0_4px_24px_rgba(28,28,25,0.05)]">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 font-body text-primary text-sm">
                    <span className="material-symbols-outlined text-lg text-tertiary">mail</span>
                    accessibility@cotswoldway.com
                  </li>
                  <li className="flex items-center gap-3 font-body text-primary text-sm">
                    <span className="material-symbols-outlined text-lg text-tertiary">location_on</span>
                    The Cotswolds Way Ltd, Bath, United Kingdom
                  </li>
                </ul>
                <p className="font-body text-secondary text-xs mt-4">
                  We aim to respond to accessibility feedback within 5 working days.
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-primary mb-4">Enforcement</h2>
              <p className="font-body text-secondary text-sm leading-relaxed">
                If you are not satisfied with our response to your accessibility concern, you can contact the Equality Advisory Support Service (EASS) at equalityadvisoryservice.com. The Equality and Human Rights Commission (EHRC) is responsible for enforcing the accessibility regulations in England, Scotland, and Wales.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
