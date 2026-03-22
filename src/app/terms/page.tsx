import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SECTIONS = [
  {
    title: "1. About These Terms",
    content: `These terms and conditions govern your use of The Cotswold Way website and booking platform. By using our services, you agree to be bound by these terms. If you do not agree, please do not use our services.

"The Cotswold Way", "we", "our", and "us" refer to The Cotswold Way Ltd. "You" and "your" refer to the user of our services.`,
  },
  {
    title: "2. Our Services",
    content: `We provide an accommodation discovery and booking platform for the Cotswold Way National Trail. Our services include:

- Searchable listings of accommodation along the trail.
- An interactive trail map with property locations.
- An itinerary builder for planning multi-day walks.
- Links to book directly with accommodation providers.

We act as an information platform connecting walkers with accommodation providers. We are not a travel agent and do not act as a party to any booking contract between you and an accommodation provider.`,
  },
  {
    title: "3. Account Registration",
    content: `To access certain features, you may need to create an account. You agree to:

- Provide accurate and complete registration information.
- Keep your login credentials secure and confidential.
- Notify us immediately of any unauthorised use of your account.
- Accept responsibility for all activity that occurs under your account.

We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: "4. Bookings and Payments",
    content: `When you book accommodation through our platform, you enter into a contract directly with the accommodation provider. We facilitate the introduction but are not a party to this contract.

- Pricing is set by each accommodation provider and displayed in GBP.
- Payment terms, cancellation policies, and refund conditions are determined by each provider.
- We may charge a service fee for certain platform features, which will be clearly disclosed before you commit.
- All payments processed through our platform are handled securely by Stripe.`,
  },
  {
    title: "5. User Content and Reviews",
    content: `You may submit reviews, ratings, and other content to our platform. By doing so, you:

- Grant us a non-exclusive, royalty-free licence to use, display, and distribute your content on our platform.
- Confirm that your content is honest, accurate, and based on genuine experience.
- Agree not to post content that is defamatory, offensive, fraudulent, or that infringes third-party rights.

We reserve the right to remove content that violates these terms without notice.`,
  },
  {
    title: "6. Intellectual Property",
    content: `All content on our website, including text, graphics, logos, maps, and software, is owned by us or our licensors and is protected by copyright and other intellectual property laws.

You may not reproduce, distribute, or create derivative works from our content without written permission. Trail map data is provided by OpenStreetMap contributors under the Open Database Licence. Mapping services are provided by Mapbox under their terms of service.`,
  },
  {
    title: "7. Trail Safety Disclaimer",
    content: `Walking the Cotswold Way involves inherent risks including but not limited to uneven terrain, adverse weather, and encounters with livestock. We provide safety information as general guidance only.

- We are not responsible for your safety on the trail.
- You are responsible for assessing your own fitness and ability.
- Trail conditions change and our information may not always be current.
- Always check conditions with National Trails and the Met Office before setting out.
- In an emergency, call 999 and ask for the appropriate service.`,
  },
  {
    title: "8. Limitation of Liability",
    content: `To the fullest extent permitted by law:

- We provide our services "as is" without warranties of any kind.
- We are not liable for any indirect, incidental, or consequential damages arising from your use of our services.
- Our total liability to you for any claim shall not exceed the amount you paid to us in the 12 months preceding the claim.
- We are not liable for the actions, omissions, or quality of service provided by accommodation providers listed on our platform.

Nothing in these terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law.`,
  },
  {
    title: "9. Modifications to Terms",
    content: `We may update these terms from time to time. We will notify you of material changes by posting the updated terms on our website with a revised date. Your continued use of our services after changes take effect constitutes acceptance of the new terms.`,
  },
  {
    title: "10. Governing Law",
    content: `These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.`,
  },
  {
    title: "11. Contact",
    content: `For questions about these terms, contact us at:

Email: legal@cotswoldway.com
Address: The Cotswold Way Ltd, Bath, United Kingdom`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            The terms governing your use of The Cotswold Way platform.
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
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="font-headline text-xl font-bold text-primary mb-4">{section.title}</h2>
                <div className="font-body text-secondary text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
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
