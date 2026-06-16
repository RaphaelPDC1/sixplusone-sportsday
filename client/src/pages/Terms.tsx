import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-display text-xl text-[#FF5500] tracking-widest mb-4 uppercase">{title}</h2>
      <div className="font-mono text-sm text-white/70 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function Terms() {
  const [, navigate] = useLocation();

  useSEO({
    title: "Terms & Conditions — 6+1 Sports Day 002",
    description: "Read the terms and conditions for 6+1 Sports Day 002. Understand your rights and responsibilities as a participant in our July 2026 event in Sheffield.",
    keywords: "6+1 sports day terms, event terms and conditions, participant agreement, sports day 002",
  });

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
        <h1 className="font-display text-4xl text-white tracking-widest mb-2">TERMS &amp; CONDITIONS</h1>
        <p className="font-mono text-xs text-white/30 tracking-widest mb-10">
          Last updated: June 2026 — 6+1 Sports Day 002
        </p>

        <Section title="1. About These Terms">
          <p>
            These Terms and Conditions govern your use of the 6+1 Sports Day 002 registration platform
            operated by 6+1 ("we", "us", "our"). By registering for Sports Day 002, you agree to these terms.
          </p>
          <p>
            If you have any questions, contact us at{" "}
            <a href="mailto:hello@6plus1.co.uk" className="text-[#FF5500] hover:underline">
              hello@6plus1.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="2. Registration">
          <p>
            Registration for Sports Day 002 is free. By completing the registration form, you confirm that
            the information you provide is accurate and that you are aged 18 or over.
          </p>
          <p>
            Registration does not guarantee a place at the event. We reserve the right to cancel or
            modify the event and will notify registered participants by email.
          </p>
        </Section>

        <Section title="3. App Unlock (Paid Access)">
          <p>
            The Sports Day app unlock (£15) grants <strong className="text-white/90">early access to your team reveal</strong> before
            the public reveal date. Once payment is confirmed, your team is revealed immediately.
            Payment is processed securely by Stripe. By purchasing, you agree to Stripe's Terms of Service.
          </p>
          <p>
            The app unlock is non-refundable once your team has been revealed. If the event
            is cancelled by us, you will receive a full refund.
          </p>
          <p>
            Participants who do not unlock will have their team revealed
            automatically on <strong className="text-white/90">4 July 2026 at 8pm BST</strong> — one week before the event.
            The app unlock gives you early access ahead of this date.
          </p>
        </Section>

        <Section title="4. Your Data">
          <p>
            We collect your name, email address, shirt size, and event preferences during registration.
            This data is used to manage your participation in Sports Day 002 and to communicate with
            you about the event.
          </p>
          <p>
            If you opt in to marketing communications, we may also contact you about future 6+1 events
            and community news. You can unsubscribe at any time using the link in any email we send.
          </p>
          <p>
            For full details of how we handle your data, please read our{" "}
            <a href="/privacy" className="text-[#FF5500] hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </Section>

        <Section title="5. Event Rules">
          <p>
            Participants must follow all event rules and instructions from 6+1 staff on the day.
            We reserve the right to remove any participant from the event for unsafe or disruptive
            behaviour without refund.
          </p>
          <p>
            Sports Day 002 involves physical activity. By registering, you confirm you are fit to
            participate and accept that 6+1 is not liable for injury arising from participation,
            except where caused by our negligence.
          </p>
        </Section>

        <Section title="6. Photography and Content">
          <p>
            The event may be photographed and filmed for promotional purposes. If you consented to
            content use during registration, your image may appear in 6+1 social media and marketing
            materials. You can withdraw consent at any time by emailing{" "}
            <a href="mailto:hello@6plus1.co.uk" className="text-[#FF5500] hover:underline">
              hello@6plus1.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            All content on this platform — including the 6+1 brand, team reveal animations, and
            generated team identity content — is owned by 6+1. You may not reproduce or distribute
            this content without our written permission.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, 6+1 is not liable for any indirect, incidental,
            or consequential loss arising from your use of this platform or participation in the event.
            Our total liability to you shall not exceed the amount you paid for the Sports Day app unlock.
          </p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify registered participants of
            material changes by email. Continued use of the platform after changes constitutes
            acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These Terms are governed by the laws of England and Wales. Any disputes shall be subject
            to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For any questions about these Terms, please contact us at{" "}
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
          <a href="/terms" className="font-mono text-[#FF5500] text-xs tracking-wider hover:underline">T&amp;Cs</a>
          <a href="/privacy" className="font-mono text-white/30 text-xs tracking-wider hover:text-white/60 transition-colors">Privacy</a>
        </div>
        <p className="font-mono text-[#333] text-xs tracking-wider">© 6+1 2026</p>
      </div>
    </div>
  );
}
