import { useLocation } from "wouter";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-display text-xl text-[#FF5500] tracking-widest mb-4 uppercase">{title}</h2>
      <div className="font-mono text-sm text-white/70 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <button
          onClick={() => navigate("/")}
          className="font-mono text-xs text-white/40 tracking-widest hover:text-white/70 transition-colors"
        >
          ← BACK
        </button>
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
        <div className="w-16" />
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-white tracking-widest mb-2">PRIVACY POLICY</h1>
        <p className="font-mono text-xs text-white/30 tracking-widest mb-10">
          Last updated: June 2026 — 6+1 Sports Day 002
        </p>

        <Section title="1. Who We Are">
          <p>
            This Privacy Policy explains how 6+1 ("we", "us", "our") collects, uses, and protects
            your personal data when you register for Sports Day 002 via this platform.
          </p>
          <p>
            We are the data controller for the personal data you provide. For any privacy-related
            enquiries, contact us at{" "}
            <a href="mailto:hello@6plus1.co.uk" className="text-[#FF5500] hover:underline">
              hello@6plus1.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p>When you register for Sports Day 002, we collect:</p>
          <ul className="list-none space-y-2 pl-0">
            {[
              "Full name",
              "Email address",
              "Instagram handle (optional)",
              "Shirt size and fit preference",
              "Event preferences and form responses",
              "Health notes (optional, treated as sensitive data)",
              "Marketing consent preference",
              "IP address and browser/device information (collected automatically)",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#FF5500] shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            If you purchase the Priority Player Pass, Stripe processes your payment details directly.
            We do not store your card number, CVV, or full payment details on our systems.
          </p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use your personal data to:</p>
          <ul className="list-none space-y-2 pl-0">
            {[
              "Process your registration and manage your participation in Sports Day 002",
              "Assign you to a team and manage the team reveal process",
              "Process payments via Stripe for the Priority Player Pass",
              "Send you event-related communications (confirmation, updates, day-of information)",
              "Send marketing emails about future 6+1 events if you opted in",
              "Improve our platform and user experience",
              "Comply with legal obligations",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#FF5500] shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            Our legal basis for processing is: <strong className="text-white/90">contract performance</strong> (to
            deliver the event you registered for), <strong className="text-white/90">legitimate interests</strong> (to
            operate and improve our platform), and <strong className="text-white/90">consent</strong> (for marketing
            emails, where you opted in).
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>We share your data with the following trusted third parties to operate this service:</p>

          <div className="space-y-5 mt-2">
            <div className="border border-white/10 p-4">
              <p className="text-white/90 font-semibold mb-1">Stripe (Payment Processing)</p>
              <p>
                Stripe processes payments for the Priority Player Pass. When you pay, your card details
                are handled directly by Stripe and are subject to{" "}
                <a
                  href="https://stripe.com/gb/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF5500] hover:underline"
                >
                  Stripe's Privacy Policy
                </a>
                . We receive a payment confirmation and a customer reference — we do not receive or
                store your full card details.
              </p>
            </div>

            <div className="border border-white/10 p-4">
              <p className="text-white/90 font-semibold mb-1">Klaviyo (Email Marketing)</p>
              <p>
                We use Klaviyo to send event communications and, where you have consented, marketing
                emails. Your name and email address are stored in Klaviyo. Klaviyo is GDPR-compliant
                and processes data in accordance with their{" "}
                <a
                  href="https://www.klaviyo.com/legal/privacy-notice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF5500] hover:underline"
                >
                  Privacy Notice
                </a>
                . You can unsubscribe from emails at any time using the link in any email we send.
              </p>
            </div>

            <div className="border border-white/10 p-4">
              <p className="text-white/90 font-semibold mb-1">Meta Pixel &amp; Conversions API (Advertising)</p>
              <p>
                We use the Meta Pixel and Meta Conversions API to measure the effectiveness of our
                advertising on Facebook and Instagram. This involves sending anonymised event data
                (such as registrations and purchases) to Meta. Your email address is hashed (SHA-256)
                before being sent — Meta cannot reverse this to identify you directly. You can manage
                your ad preferences in your Facebook/Instagram account settings or opt out of
                interest-based advertising at{" "}
                <a
                  href="https://www.youronlinechoices.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF5500] hover:underline"
                >
                  youronlinechoices.com
                </a>
                .
              </p>
            </div>
          </div>
        </Section>

        <Section title="5. Data Storage and Security">
          <p>
            Your data is stored securely in an encrypted database hosted on TiDB Cloud (MySQL-compatible),
            operated within the EU/UK. We implement appropriate technical and organisational measures
            to protect your personal data against unauthorised access, loss, or disclosure.
          </p>
          <p>
            Profile photos and uploaded files are stored in secure cloud object storage (S3-compatible)
            with access controls in place.
          </p>
          <p>
            We retain your data for as long as necessary to deliver the event and fulfil our legal
            obligations, typically no longer than 2 years after the event date.
          </p>
        </Section>

        <Section title="6. Your Rights (UK GDPR)">
          <p>Under UK data protection law, you have the following rights:</p>
          <ul className="list-none space-y-2 pl-0">
            {[
              "Right of access — request a copy of the personal data we hold about you",
              "Right to rectification — ask us to correct inaccurate data",
              "Right to erasure — ask us to delete your data ('right to be forgotten')",
              "Right to restrict processing — ask us to limit how we use your data",
              "Right to data portability — receive your data in a structured, machine-readable format",
              "Right to object — object to processing based on legitimate interests or for marketing",
              "Right to withdraw consent — withdraw marketing consent at any time",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#FF5500] shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:hello@6plus1.co.uk" className="text-[#FF5500] hover:underline">
              hello@6plus1.co.uk
            </a>
            . We will respond within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with the UK Information Commissioner's Office
            (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF5500] hover:underline"
            >
              ico.org.uk
            </a>
            .
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            This platform uses a session cookie to keep you logged in during your visit. We do not
            use advertising cookies directly — the Meta Pixel uses browser-based tracking which is
            governed by Meta's cookie policy. You can manage cookies through your browser settings.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Sports Day 002 is for participants aged 18 and over. We do not knowingly collect personal
            data from anyone under 18. If you believe we have inadvertently collected data from a minor,
            please contact us immediately at{" "}
            <a href="mailto:hello@6plus1.co.uk" className="text-[#FF5500] hover:underline">
              hello@6plus1.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify registered participants
            of material changes by email. The date at the top of this page indicates when it was last
            updated.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            For any questions about this Privacy Policy or how we handle your data, contact us at{" "}
            <a href="mailto:hello@6plus1.co.uk" className="text-[#FF5500] hover:underline">
              hello@6plus1.co.uk
            </a>
            .
          </p>
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-6 flex items-center justify-between">
        <img src={LOGO_URL} alt="6+1" className="h-5 w-auto opacity-30" style={{ filter: "invert(1)" }} />
        <div className="flex gap-6">
          <a href="/terms" className="font-mono text-white/30 text-xs tracking-wider hover:text-white/60 transition-colors">T&amp;Cs</a>
          <a href="/privacy" className="font-mono text-[#FF5500] text-xs tracking-wider hover:underline">Privacy</a>
        </div>
        <p className="font-mono text-[#333] text-xs tracking-wider">© 6+1 2026</p>
      </div>
    </div>
  );
}
