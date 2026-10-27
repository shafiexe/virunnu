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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-0">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-xs font-semibold tracking-widest uppercase text-amber-500 mb-2">Legal</div>
        <h1 className="text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 mb-3">
          Terms of Service
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
          <span>Effective: 26 October 2026</span>
          <span>Applicable in India</span>
        </div>
        <div className="mt-4">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline"
          >
            View Privacy Policy <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 01 About */}
      <section id="about" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="01" title="About Virunnu" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu is an online marketplace that connects customers planning weddings, receptions,
            family gatherings, and corporate events with convention halls, wedding venues, and
            catering services across Kerala. The platform is operated by Virunnu Technologies, a
            company registered in Kerala, India.
          </p>
          <p>
            By accessing or using Virunnu — whether as a customer, venue owner, or caterer — you
            agree to be bound by these Terms of Service in their entirety. If you do not agree,
            please discontinue use of the platform immediately.
          </p>
          <Callout>
            <strong>Marketplace role:</strong> Virunnu is a technology platform that facilitates
            discovery and booking. We are not a venue owner, hall operator, or catering service
            provider. Virunnu is not a party to the service agreement between a customer and a venue
            owner or caterer, and we do not assume liability for the performance of those services.
          </Callout>
        </div>
      </section>

      {/* 02 Accounts */}
      <section id="accounts" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="02" title="Accounts & Eligibility" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            To use Virunnu you must be at least 18 years old and legally capable of entering into a
            binding contract under Indian law. By registering you represent and warrant that you
            meet these requirements.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">One number, one role</h3>
          <p>
            Each mobile number may be associated with exactly one account and one permanent role —
            Customer, Venue Owner, or Caterer. A single phone number cannot be used for more than
            one role. Once selected, your role cannot be changed. If you wish to operate under a
            different role, you must register with a separate phone number.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">OTP authentication</h3>
          <p>
            Virunnu uses one-time passwords delivered to your registered mobile number as its
            authentication method. You are responsible for keeping your mobile number accessible
            and for all activity that takes place under your account. Never share an OTP with anyone.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Accuracy of information</h3>
          <p>
            You agree to provide truthful, complete, and up-to-date information at registration and
            during onboarding. Virunnu may suspend or permanently terminate accounts that contain
            false, misleading, or fraudulent information.
          </p>
        </div>
      </section>

      {/* 03 Roles */}
      <section id="roles" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="03" title="Platform Roles & Responsibilities" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Customers</h3>
          <p>
            Customers may browse venues and catering services, check slot availability, make
            bookings, and track reservation status. A booking request only becomes a confirmed
            reservation when payment is successfully processed and a confirmation is issued by the
            platform. Customers are responsible for verifying that a venue or catering service meets
            their specific event requirements before completing a booking.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Venue Owners</h3>
          <p>
            Venue owners may register convention centres, wedding halls, and event spaces; configure
            halls with capacity, amenities, slot schedules, and pricing; upload photos; and manage
            their booking calendar. Listings are reviewed and go live only after admin approval.
          </p>
          <p>
            Venue owners are solely responsible for the accuracy of all information in their
            listings — including hall dimensions, capacity, pricing, available amenities, and slot
            availability. Owners must honour every confirmed booking and keep their calendar
            up to date to prevent double-bookings.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Catering Services</h3>
          <p>
            Caterers may list their business, service areas, cuisine specialties, and menu items
            with pricing. Listings are reviewed and published only after admin approval. Caterers
            are solely responsible for the accuracy of their menus, per-head or per-item pricing,
            minimum order requirements, and service availability on any given date.
          </p>
          <p>
            Catering engagement on Virunnu is a <strong>discovery service</strong>. Customers
            contact caterers directly to confirm menus, quantities, dietary requirements, and
            service terms. Virunnu is not party to the agreement between a customer and a caterer,
            does not process payments for catering services, and does not mediate catering disputes.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Listing approval</h3>
          <p>
            Virunnu reserves the right to approve, reject, suspend, or permanently remove any
            venue or catering listing at its sole discretion and without obligation to give reasons.
            Listing on Virunnu does not create an exclusive arrangement — providers may also list
            their services on other platforms.
          </p>
        </div>
      </section>

      {/* 04 Bookings */}
      <section id="bookings" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="04" title="Bookings & Slot Holds" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            When you select a slot and initiate the booking process, that slot is placed on a
            temporary <strong>hold</strong> for a fixed window (currently 15 minutes). During this
            window the slot is unavailable to other users. If payment is not completed within the
            hold window, it is automatically released and the slot becomes available again.
          </p>
          <p>
            A booking is <strong>confirmed</strong> only when payment is successfully captured and
            Virunnu&apos;s system records a confirmation. An incomplete payment, a payment that is
            authorised but not captured, or a network failure during payment does not constitute a
            confirmed booking.
          </p>
          <Callout>
            <strong>Payment received but no confirmation?</strong> If your payment was debited but
            you did not receive a booking confirmation, contact{" "}
            <strong>support@virunnu.in</strong> immediately with your transaction reference. Do not
            attempt to rebook the same slot until the issue is resolved.
          </Callout>
          <p>
            Virunnu is not liable for inconvenience, costs, or losses arising from hold expiry,
            unconfirmed bookings, or simultaneous booking attempts by multiple users.
          </p>
        </div>
      </section>

      {/* 05 Payments */}
      <section id="payments" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="05" title="Payments" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Online payments are processed by <strong>Razorpay</strong>, a payment aggregator
            regulated by the Reserve Bank of India. Virunnu does not store your card number, UPI
            ID, net-banking credentials, or any other sensitive payment details.
          </p>
          <p>
            All prices on the platform are in Indian Rupees (₹) and are inclusive of applicable
            taxes unless otherwise stated.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Advance &amp; remaining payment
          </h3>
          <p>
            Certain bookings require an <strong>advance payment</strong> to confirm the reservation,
            with the remaining balance due at a later stage (typically before or on the event date).
            The advance amount and the due date for the remaining payment are displayed clearly
            before you confirm. Failure to pay the remaining amount by the due date may result in
            cancellation of the booking at the venue owner&apos;s discretion.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">Cash payments</h3>
          <p>
            Some venue owners offer the option to pay all or part of the booking amount in cash
            directly at the venue. Where this option is available, it is clearly marked on the
            booking page. Virunnu is not responsible for collecting, acknowledging, or reconciling
            cash payments made outside the platform. Always obtain a written receipt from the venue
            owner for any cash transaction.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Catering payments
          </h3>
          <p>
            Virunnu does not process or facilitate payments for catering services. All financial
            arrangements with caterers — deposits, advance payments, final invoices — are made
            directly between the customer and the caterer.
          </p>
        </div>
      </section>

      {/* 06 Refunds */}
      <section id="refunds" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="06" title="Cancellations & Refunds" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Customers may cancel an <strong>unpaid (pending)</strong> booking at any time without
            penalty. Once a booking is confirmed (advance or full payment processed), cancellations
            are subject to the refund schedule below.
          </p>
          <Table
            headers={["When you cancel", "Refund applicable"]}
            rows={[
              ["Before payment is captured", "Full refund — payment not collected"],
              ["More than 72 hours before the slot", "Subject to the venue's cancellation policy"],
              ["24 – 72 hours before the slot", "Up to 50% refund at venue's discretion"],
              ["Less than 24 hours before the slot", "No refund unless venue agrees"],
              ["No-show (event date passed)", "No refund"],
            ]}
          />
          <p>
            Where a refund is approved, it is credited to the original payment instrument within
            5–7 business days. Virunnu is not responsible for delays caused by banks, card networks,
            or Razorpay.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Cancellation by venue owner
          </h3>
          <p>
            Venue owners may not cancel a confirmed booking except in genuine force-majeure
            situations — fire, natural disaster, government prohibition, or similar. In such cases,
            Virunnu will facilitate a full refund of all amounts paid through the platform.
            Repeated cancellations by a venue owner may result in removal of their listing and
            account suspension.
          </p>
          <Callout>
            Refund and cancellation terms for catering services are governed solely by the
            individual agreement between the customer and the caterer. Virunnu has no role in
            catering refunds.
          </Callout>
        </div>
      </section>

      {/* 07 Content */}
      <section id="content" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="07" title="Content & Listings" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Venue owners and caterers who upload photos, descriptions, menus, and other content to
            Virunnu grant us a non-exclusive, royalty-free licence to display, reproduce, and
            promote that content on the platform and in related marketing materials for as long as
            the listing is active.
          </p>
          <p>
            You represent that you own or have the right to use all content you upload, and that it
            does not infringe any third-party intellectual property rights. You must not upload
            photos that depict other venues, stock imagery presented as your own space, or content
            that is misleading to customers.
          </p>
          <p>
            Virunnu may remove any content that violates these terms or that we determine, in our
            sole discretion, to be inappropriate, misleading, or harmful to the platform community.
          </p>
        </div>
      </section>

      {/* 08 Catering */}
      <section id="catering" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="08" title="Catering Services — Specific Terms" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Catering listings on Virunnu are informational. The following additional terms apply to
            caterers and customers engaging with catering services through the platform.
          </p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Caterer obligations
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Menus, per-head pricing, and minimum order quantities must be accurate and kept
              current. Outdated listings that mislead customers are grounds for suspension.
            </li>
            <li>
              Caterers are solely responsible for food safety, hygiene standards, and compliance
              with all applicable FSSAI regulations and local health authority requirements.
            </li>
            <li>
              Any allergen information provided must be accurate. Caterers must disclose known
              allergens — nuts, dairy, gluten, shellfish — clearly in their menu descriptions.
            </li>
            <li>
              Caterers must honour commitments made to customers through direct engagement
              initiated via Virunnu listings.
            </li>
          </ul>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 pt-2">
            Customer expectations
          </h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Virunnu displays caterer information for discovery. Customers should verify menu
              availability, pricing, and dates directly with the caterer before committing.
            </li>
            <li>
              Any dispute regarding food quality, service delivery, or catering payments is between
              the customer and the caterer. Virunnu will not arbitrate such disputes.
            </li>
          </ul>
          <Callout>
            <strong>Food safety:</strong> Virunnu does not inspect, certify, or audit any catering
            service listed on the platform. Customers should satisfy themselves of a caterer&apos;s
            credentials, FSSAI registration, and past track record before engagement.
          </Callout>
        </div>
      </section>

      {/* 09 Conduct */}
      <section id="conduct" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="09" title="Prohibited Conduct" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Create multiple accounts or impersonate another person, venue, or business</li>
            <li>
              List a venue, hall, or catering service that you do not own or are not authorised to
              represent
            </li>
            <li>
              Publish false, exaggerated, or misleading listing information — including fabricated
              photos, inflated capacity figures, or incorrect pricing
            </li>
            <li>
              Solicit customers to transact outside the platform in order to avoid platform fees or
              policies
            </li>
            <li>
              Interfere with another user&apos;s ability to book by placing speculative holds or
              creating fake bookings
            </li>
            <li>Scrape, crawl, or systematically extract data or content from Virunnu</li>
            <li>
              Attempt to reverse-engineer, probe, or compromise the platform&apos;s technical
              infrastructure or security measures
            </li>
            <li>Use the platform for any purpose unlawful under Indian law</li>
          </ul>
          <p>
            Violations may result in immediate suspension, permanent account termination, and where
            warranted, referral to law enforcement.
          </p>
        </div>
      </section>

      {/* 10 IP */}
      <section id="ip" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="10" title="Intellectual Property" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            The Virunnu name, logo, platform design, and all original content produced by Virunnu
            are the exclusive property of Virunnu Technologies. You may not reproduce, distribute,
            or create derivative works from any part of the platform without express written
            permission.
          </p>
          <p>
            Content uploaded by venue owners and caterers remains their own intellectual property.
            By uploading it, you grant Virunnu the limited licence described in Section 07 above.
            This licence ends when you remove the content or close your account, except where
            Virunnu has already published or distributed that content in promotional material.
          </p>
        </div>
      </section>

      {/* 11 Liability */}
      <section id="liability" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="11" title="Limitation of Liability" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu provides the platform on an &quot;as is&quot; and &quot;as available&quot; basis
            and makes no warranty — express or implied — regarding the accuracy, completeness, or
            fitness for purpose of any listing, service, or content on the platform.
          </p>
          <p>
            To the fullest extent permitted by Indian law, Virunnu&apos;s total liability for any
            single claim arising from your use of the platform shall not exceed the amount you paid
            for the specific booking that gave rise to the claim.
          </p>
          <p>Virunnu is not liable for:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Disputes between customers and venue owners or caterers regarding service quality,
              delivery, or value
            </li>
            <li>
              The actual condition, suitability, safety, or legality of any venue or hall
            </li>
            <li>
              Food quality, allergen handling, food poisoning, or any health issue arising from
              catering services
            </li>
            <li>Loss of or damage to property at a venue</li>
            <li>Personal injury sustained at a listed venue or catering event</li>
            <li>
              Indirect, consequential, incidental, or punitive damages of any nature
            </li>
            <li>
              Platform unavailability, technical errors, or data loss beyond our reasonable control
            </li>
          </ul>
        </div>
      </section>

      {/* 12 Law */}
      <section id="law" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="12" title="Governing Law & Disputes" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            These Terms are governed by the laws of India. Any dispute arising from or in
            connection with these Terms or the use of the platform shall be subject to the exclusive
            jurisdiction of the courts of Ernakulam, Kerala.
          </p>
          <p>
            Before initiating formal legal proceedings, you agree to first contact Virunnu support
            and allow a reasonable period — not less than 15 working days — for us to attempt an
            amicable resolution.
          </p>
        </div>
      </section>

      {/* 13 Changes */}
      <section id="changes" className="py-8 border-b border-zinc-100 dark:border-zinc-800/60">
        <SectionHeader num="13" title="Changes to These Terms" />
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Virunnu may revise these Terms at any time. When we make material changes, we will
            update the effective date above and, where practicable, notify you via the platform or
            to your registered mobile number. Your continued use of Virunnu after any revision
            constitutes your acceptance of the updated Terms.
          </p>
          <p>
            It is your responsibility to review these Terms periodically. The effective date at the
            top of this page shows when the current version came into effect.
          </p>
        </div>
      </section>

      {/* Contact */}
      <div className="pt-8">
        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 mb-3">
            Questions about these terms?
          </div>
          <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              Legal:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">legal@virunnu.in</span>
            </p>
            <p>
              Support:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">support@virunnu.in</span>
            </p>
            <p>
              Address:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                Virunnu Technologies, Kerala, India
              </span>
            </p>
            <p className="text-zinc-400 text-xs mt-2">Response within 2 business days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
