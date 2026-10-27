import { ExternalLink } from "lucide-react";
import Link from "next/link";

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-r-lg px-4 py-3 my-4 text-sm text-zinc-700 dark:text-zinc-300">
      {children}
    </div>
  );
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold tracking-widest uppercase text-amber-500 mb-0.5">
        {num}
      </div>
      <h2 className="text-xl font-semibold font-serif text-zinc-900 dark:text-zinc-50">{title}</h2>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-0">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-xs font-semibold tracking-widest uppercase text-amber-500 mb-2">Legal</div>
        <h1 className="text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 mb-3">
          Privacy Policy
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          <span>Effective: 26 October 2026</span>
          <span>IT Act 2000 · DPDP Act 2023</span>
        </div>
        <div className="mt-4">
          <Link
            href="/terms"
            className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline"
          >
            View Terms of Service <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Intro */}
      <section className="py-6 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu Technologies (&ldquo;Virunnu&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;)
            operates the Virunnu platform for booking convention halls, wedding venues, and
            connecting with catering services across Kerala. This Privacy Policy explains what
            personal data we collect, why we collect it, how we use and protect it, and what rights
            you have over it.
          </p>
          <p>
            This policy applies to all users of the platform — customers, venue owners, and
            caterers. By using Virunnu, you consent to the practices described here.
          </p>
          <Callout>
            <strong>Our commitment:</strong> We collect only what is necessary to operate the
            platform. We do not sell, rent, or trade your personal data. We do not serve
            advertisements or build behavioural profiles.
          </Callout>
        </div>
      </section>

      {/* 01 Collect */}
      <section id="collect" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="01" title="Information We Collect" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Information you provide</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Mobile number:</strong> Collected at registration; used for OTP authentication
              and account identification. This is your primary identifier on the platform.
            </li>
            <li>
              <strong>Name:</strong> Collected during onboarding; displayed on booking confirmations
              and shared with venue owners when you make a booking.
            </li>
            <li>
              <strong>Venue &amp; hall details:</strong> Provided by venue owners — business name,
              address, city, hall descriptions, capacity, amenities, and slot pricing.
            </li>
            <li>
              <strong>Hall photos:</strong> Images uploaded by venue owners to describe their halls.
              These are displayed publicly to all visitors.
            </li>
            <li>
              <strong>Caterer details:</strong> Provided by caterers — business name, service area,
              cuisine type, menu items with prices, and contact information.
            </li>
          </ul>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Data generated by platform use
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Booking records:</strong> Venue, hall, date, slot, amount paid (advance and
              remaining), payment method, and booking status for every reservation.
            </li>
            <li>
              <strong>Session data:</strong> An encrypted, HTTP-only session cookie that identifies
              your account across requests. It contains your user ID and role; it does not contain
              personal data in readable form.
            </li>
            <li>
              <strong>Access logs:</strong> IP address, browser type, pages accessed, and time of
              access — retained for security, fraud detection, and debugging.
            </li>
          </ul>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Data from third parties
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Razorpay:</strong> When you pay online, Razorpay returns a payment reference
              ID and a status (success / failure). We do not receive or store your card number, UPI
              ID, bank account number, or CVV. Those are handled by Razorpay under their own privacy
              policy and PCI-DSS certification.
            </li>
          </ul>
        </div>
      </section>

      {/* 02 Use */}
      <section id="use" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="02" title="How We Use Your Data" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <Table
            headers={["Purpose", "Data used", "Legal basis"]}
            rows={[
              ["Account creation & login (OTP)", "Mobile number, OTP code", "Contractual necessity"],
              ["Booking creation & confirmation", "User ID, slot ID, payment reference", "Contractual necessity"],
              ["Displaying your bookings to you", "Booking records, venue details", "Contractual necessity"],
              ["Notifying venue owners of new bookings", "Customer name, booking details", "Contractual necessity"],
              ["Caterer discovery (listing views)", "No personal data — public content only", "Legitimate interest"],
              ["Admin review & approval of listings", "Venue / caterer details submitted", "Contractual necessity"],
              ["Customer support & dispute resolution", "Name, booking ID, mobile number", "Legitimate interest"],
              ["Security, fraud, & abuse prevention", "Access logs, IP address", "Legitimate interest"],
              ["Platform improvement", "Aggregated, anonymised usage statistics", "Legitimate interest"],
              ["Legal compliance & regulatory requests", "Any data required by law", "Legal obligation"],
            ]}
          />
          <p>
            We do not use your data for advertising, retargeting, or any form of commercial
            profiling. We do not create inferred attributes or interest categories about you.
          </p>
        </div>
      </section>

      {/* 03 OTP */}
      <section id="otp" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="03" title="OTP Authentication" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu uses one-time passwords sent to your registered mobile number as its only
            authentication method. There are no passwords stored on the platform. OTP codes are
            generated fresh for each login request, expire after 10 minutes, and are permanently
            deleted after use or expiry — whichever comes first.
          </p>
          <p>
            OTPs are currently delivered via SMS. The SMS delivery service receives only your mobile
            number and the OTP code; it does not receive any other personal data.
          </p>
          <Callout>
            <strong>Never share your OTP.</strong> Virunnu staff will never ask for your OTP
            through any channel — call, SMS, or email. If anyone requests it, it is a fraud attempt.
          </Callout>
        </div>
      </section>

      {/* 04 Sharing */}
      <section id="sharing" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="04" title="Data Sharing" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            We share personal data only when necessary and only as described below. We never sell
            or share data with advertisers, data brokers, or marketing companies.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-1">Venue owners</h3>
          <p>
            When you make a booking at a venue, the venue owner receives your name, mobile number,
            booking date, slot, and amount. This is the minimum required for them to manage and
            honour your reservation. Venue owners may not use this information for any purpose
            beyond serving your booking.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Caterers</h3>
          <p>
            Virunnu does not share customer personal data with caterers automatically. Caterer
            listings are publicly visible. If a customer contacts a caterer through a phone number
            or contact detail published on the listing, that engagement is direct and outside
            Virunnu&apos;s data-processing scope. Caterers who receive customer inquiries through
            Virunnu may not use contact details for unsolicited marketing.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Razorpay (payment processing)
          </h3>
          <p>
            When you initiate a payment, Virunnu passes your booking amount and a unique order
            reference to Razorpay. Razorpay collects and processes your payment credentials
            directly and independently under their own privacy policy. Virunnu receives only a
            payment status confirmation and reference ID in return.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Legal requirements</h3>
          <p>
            We may disclose personal data if required by Indian law, a court order, or a direction
            from a lawful government authority. We will, where legally permitted, attempt to notify
            the affected user before disclosure.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Business transfers</h3>
          <p>
            If Virunnu Technologies is acquired by or merges with another entity, personal data
            held by us may be transferred to the successor, subject to equivalent privacy
            protections. You will be notified of any such transfer.
          </p>
        </div>
      </section>

      {/* 05 Retention */}
      <section id="retention" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="05" title="Data Retention" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            We retain your data for as long as your account is active, or as required to deliver
            services, meet legal obligations, resolve disputes, and enforce our agreements.
          </p>
          <Table
            headers={["Data type", "How long we keep it"]}
            rows={[
              ["OTP codes", "Deleted immediately after first use or 10-minute expiry"],
              ["Session cookie", "7 days from last activity, or until logout"],
              ["Booking records & payments", "7 years (GST / income tax compliance)"],
              ["Access & server logs", "90 days"],
              ["Hall photos (uploaded by owners)", "For the duration the listing is active; deleted within 30 days of listing removal"],
              ["Account information", "Until a deletion request is honoured; anonymised stub retained for legal records"],
            ]}
          />
          <p>
            After account deletion, we may retain anonymised or aggregated data that cannot be
            linked back to you for the purpose of analytics and platform improvement.
          </p>
        </div>
      </section>

      {/* 06 Rights */}
      <section id="rights" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="06" title="Your Rights" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Under the Information Technology Act, 2000 and the Digital Personal Data Protection
            Act, 2023, you have the following rights in relation to your personal data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Access:</strong> Request a summary of the personal data we hold about you and
              how it is being used
            </li>
            <li>
              <strong>Correction:</strong> Ask us to correct data that is inaccurate or incomplete
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your account and associated personal
              data, subject to our legal retention obligations (e.g., tax records cannot be deleted
              early)
            </li>
            <li>
              <strong>Withdrawal of consent:</strong> Where processing is based on consent, you may
              withdraw it at any time; this will not affect processing already carried out
            </li>
            <li>
              <strong>Grievance redressal:</strong> Lodge a complaint with our Grievance Officer if
              you believe your data rights have not been respected
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">privacy@virunnu.in</span>{" "}
            with your registered mobile number and a description of your request. We will respond
            within 30 days as required under Indian law.
          </p>
          <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-sm">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Grievance Officer</p>
            <p className="text-zinc-600 dark:text-zinc-400">Virunnu Technologies, Kerala, India</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              Email:{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                grievance@virunnu.in
              </span>
            </p>
            <p className="text-xs text-zinc-400 mt-1">Response within 30 days as required by law</p>
          </div>
        </div>
      </section>

      {/* 07 Security */}
      <section id="security" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="07" title="Security" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>We protect your data with the following technical and organisational measures:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>HTTPS / TLS encryption for all data transmitted between your device and our servers</li>
            <li>
              HTTP-only, Secure session cookies — inaccessible to browser scripts, preventing
              client-side theft
            </li>
            <li>
              No password storage — OTP-only authentication eliminates the risk of password breaches
            </li>
            <li>Database access restricted to application services within a private network</li>
            <li>
              Payment credentials handled entirely by Razorpay under PCI-DSS Level 1 compliance —
              Virunnu never touches your card or banking details
            </li>
            <li>Regular security reviews of application code and infrastructure</li>
          </ul>
          <p>
            No system can guarantee absolute security. If you discover a security vulnerability in
            Virunnu, please report it responsibly to{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">security@virunnu.in</span>{" "}
            before public disclosure. We take all reports seriously and will respond promptly.
          </p>
        </div>
      </section>

      {/* 08 Cookies */}
      <section id="cookies" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="08" title="Cookies & Local Storage" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu uses a single session cookie (
            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
              vr_session
            </code>
            ) to maintain your authenticated session. It is:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>HTTP-only</strong> — cannot be accessed or modified by JavaScript running in
              your browser
            </li>
            <li>
              <strong>Secure</strong> — transmitted only over HTTPS connections
            </li>
            <li>
              <strong>Scoped to this domain</strong> — not shared with any third-party site
            </li>
            <li>
              <strong>Session-lived</strong> — automatically expires after 7 days or when you
              log out
            </li>
          </ul>
          <p>
            We do not use advertising cookies, tracking pixels, analytics cookies (including Google
            Analytics), or any third-party cookie. Blocking the{" "}
            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">
              vr_session
            </code>{" "}
            cookie will prevent you from logging in, as it is strictly necessary for authenticated
            platform use.
          </p>
        </div>
      </section>

      {/* 09 Children */}
      <section id="children" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="09" title="Children's Privacy" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu is intended exclusively for users who are 18 years of age or older. We do not
            knowingly collect personal data from minors. If you believe that a person under 18 has
            created an account, please notify us immediately at{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">privacy@virunnu.in</span>{" "}
            and we will delete the account without delay.
          </p>
        </div>
      </section>

      {/* 10 Third-party links */}
      <section id="thirdparty" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="10" title="Third-Party Links & Services" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Catering listings may include links to external websites or social media profiles. We
            have no control over these third-party sites and their privacy practices. Clicking such
            links takes you outside Virunnu&apos;s platform and this Privacy Policy no longer
            applies. We encourage you to review the privacy notice of any third-party site you
            visit.
          </p>
          <p>
            Razorpay is our sole payment processing partner. Their data practices are governed by
            the{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">Razorpay Privacy Policy</span>
            , which is available on their website.
          </p>
        </div>
      </section>

      {/* 11 Changes */}
      <section id="changes" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="11" title="Changes to This Policy" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            We may update this Privacy Policy periodically to reflect changes in our practices,
            technology, or legal requirements. The effective date at the top of this page shows
            when the current version came into effect.
          </p>
          <p>
            Material changes — those that significantly affect how we handle your data — will be
            communicated to your registered mobile number or displayed prominently when you next
            log in. Minor clarifications may be made without explicit notice.
          </p>
          <p>
            Continued use of Virunnu after any update constitutes your acceptance of the revised
            policy.
          </p>
        </div>
      </section>

      {/* Contact */}
      <div className="pt-8">
        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 mb-3">
            Privacy enquiries & data requests
          </div>
          <div className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              Privacy requests:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                privacy@virunnu.in
              </span>
            </p>
            <p>
              Grievance Officer:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                grievance@virunnu.in
              </span>
            </p>
            <p>
              Security disclosures:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                security@virunnu.in
              </span>
            </p>
            <p>
              Postal address:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                Virunnu Technologies, Kerala, India
              </span>
            </p>
            <p className="text-zinc-400 text-xs mt-2">
              We respond to privacy requests within 30 days as required under the DPDP Act 2023
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
