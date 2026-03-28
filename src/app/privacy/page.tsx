import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly when using our platform, including:

- Account information: name, email address, and password when you create an account.
- Booking information: accommodation preferences, travel dates, and group size when you use our itinerary builder.
- Communication data: messages you send to us via email or contact forms.
- Usage data: pages visited, search queries, and interaction patterns collected automatically through cookies and analytics tools.

We do not collect payment card details directly. All payments are processed securely by our payment provider (Stripe), and we do not store your full card number on our servers.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:

- Provide and improve our accommodation search and booking services.
- Send you booking confirmations and trip-related communications.
- Personalise your experience with relevant trail recommendations.
- Send marketing communications (only with your consent, and you can opt out at any time).
- Analyse usage patterns to improve our platform.
- Comply with legal obligations and protect against fraud.`,
  },
  {
    title: "3. Information Sharing",
    content: `We share your information only in the following circumstances:

- With accommodation providers when you make a booking enquiry or reservation.
- With service providers who assist us in operating the platform (hosting, analytics, email delivery).
- When required by law, such as in response to a court order or regulatory request.
- With your consent, for any other purpose disclosed at the time of collection.

We do not sell your personal information to third parties.`,
  },
  {
    title: "4. Cookies and Tracking",
    content: `We use cookies and similar technologies to:

- Remember your preferences and login status.
- Analyse how you use our site (via Google Analytics).
- Display our interactive trail map (via Mapbox).

You can control cookies through your browser settings. Disabling cookies may affect some functionality, such as staying logged in or saving itinerary preferences.`,
  },
  {
    title: "5. Data Security",
    content: `We implement appropriate technical and organisational measures to protect your personal data, including encryption in transit (TLS/SSL), secure database hosting via Supabase, and regular security reviews. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: "6. Your Rights",
    content: `Under UK data protection law (UK GDPR), you have the right to:

- Access the personal data we hold about you.
- Request correction of inaccurate data.
- Request deletion of your data (subject to legal obligations).
- Object to processing of your data for marketing purposes.
- Request data portability in a machine-readable format.
- Withdraw consent at any time where processing is based on consent.

To exercise these rights, contact us at privacy@cotswoldway.com. We will respond within 30 days.`,
  },
  {
    title: "7. Data Retention",
    content: `We retain your personal data for as long as necessary to provide our services and fulfil the purposes described in this policy. Account data is retained until you delete your account. Booking records are retained for 6 years for tax and legal compliance. Analytics data is retained in anonymised form indefinitely.`,
  },
  {
    title: "8. Children's Privacy",
    content: `Our services are not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will take steps to delete it.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this privacy policy from time to time. We will notify you of significant changes by posting a notice on our website or sending you an email. The date at the top of this policy indicates when it was last revised.`,
  },
  {
    title: "10. Contact Us",
    content: `If you have questions about this privacy policy or our data practices, contact us at:

Email: privacy@cotswoldway.com
Address: The Cotswolds Way Ltd, Bath, United Kingdom

You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe your data protection rights have been violated.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-20 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="font-body text-lg text-primary-fixed max-w-2xl mx-auto leading-relaxed">
            How we collect, use, and protect your personal data.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-8 bg-surface">
        <div className="max-w-3xl mx-auto">
          <p className="font-body text-secondary text-sm mb-8">
            Last updated: 1 January 2026
          </p>
          <p className="font-body text-secondary leading-relaxed mb-12">
            The Cotswolds Way (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we handle your personal data when you use our website and services.
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
