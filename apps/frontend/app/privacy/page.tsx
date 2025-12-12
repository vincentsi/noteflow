import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | NotePostFlow',
  description: 'Privacy Policy for NotePostFlow - AI-powered productivity platform',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-sm text-gray-600 mb-8">
        Last updated: December 12, 2024
      </p>

      <div className="space-y-8 prose prose-lg max-w-none">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Welcome to NotePostFlow (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We respect your privacy and are committed to protecting your personal data.
            This privacy policy explains how we collect, use, and safeguard your information when you use our AI-powered productivity platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold mb-2">2.1 Personal Information</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Email address</li>
            <li>Name</li>
            <li>Account credentials (securely encrypted)</li>
            <li>Subscription and billing information (processed by Stripe)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Usage Data</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>RSS articles you save</li>
            <li>AI summaries you generate</li>
            <li>Notes and posts you create</li>
            <li>Application usage statistics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and maintain our service</li>
            <li>To process AI summarization requests via OpenAI</li>
            <li>To manage your subscription and billing</li>
            <li>To send service-related notifications</li>
            <li>To improve our platform and user experience</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>

          <h3 className="text-xl font-semibold mb-2">4.1 OpenAI</h3>
          <p>
            We use OpenAI&apos;s API to generate AI summaries. The content you submit for summarization is processed by OpenAI
            according to their <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Stripe</h3>
          <p>
            Payment processing is handled by Stripe. We do not store your complete payment card details.
            Stripe&apos;s privacy policy is available at <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">stripe.com/privacy</a>.
          </p>

          <h3 className="text-xl font-semibold mb-2 mt-4">4.3 Resend</h3>
          <p>
            Email communications are sent via Resend for account verification and notifications.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Data Storage and Security</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your data is stored in secure PostgreSQL databases</li>
            <li>Passwords are encrypted using industry-standard bcrypt hashing</li>
            <li>All connections use HTTPS encryption</li>
            <li>We implement access controls and regular security audits</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Your Rights (GDPR)</h2>
          <p>Under the General Data Protection Regulation (GDPR), you have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
            <li><strong>Erasure:</strong> Request deletion of your personal data</li>
            <li><strong>Data Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Withdraw Consent:</strong> Opt-out of data processing at any time</li>
          </ul>
          <p className="mt-4">
            You can exercise these rights from your account settings at <strong>Settings → GDPR</strong> or by contacting us at privacy@notepostflow.com.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
          <p>
            We retain your personal data only as long as necessary to provide our services or as required by law.
            When you delete your account, we will delete your personal data within 30 days, except where we are legally required to retain it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
          <p>
            We use essential cookies to maintain your session and authentication. We do not use third-party tracking cookies for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
          <p>
            Our service is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your country of residence.
            We ensure appropriate safeguards are in place to protect your data in accordance with GDPR requirements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any significant changes by email or through a notice on our platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our data practices, please contact us at:
          </p>
          <ul className="list-none space-y-2 mt-4">
            <li><strong>Email:</strong> privacy@notepostflow.com</li>
            <li><strong>Website:</strong> <a href="https://notepostflow.com" className="text-blue-600 hover:underline">notepostflow.com</a></li>
          </ul>
        </section>

        <section className="border-t pt-8 mt-12">
          <p className="text-sm text-gray-600">
            This privacy policy is compliant with GDPR (EU General Data Protection Regulation) and applicable data protection laws.
          </p>
        </section>
      </div>
    </div>
  );
}
