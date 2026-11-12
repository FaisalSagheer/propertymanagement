import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  CircleCheck,
  CreditCard,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { MANAGER_PLANS } from "@/lib/billing/plans";

/**
 * Public landing page.
 *
 * Flow: hero -> product story -> feature cards -> dashboard preview ->
 * pricing -> footer. Signed-in users skip it and go straight to the dashboard.
 *
 * The session check only looks for the Auth.js cookie (no database call), so
 * this page still renders when the database is unreachable. /dashboard does
 * the real validation.
 *
 * Pricing is read from MANAGER_PLANS so it can never drift from /pricing.
 * Testimonials are left empty on purpose: add real customer quotes to
 * TESTIMONIALS and the section appears.
 */

const BRAND = "PropertyPro";

export const metadata: Metadata = {
  title: `${BRAND} - Property management software`,
  description:
    "Manage every lease, payment and maintenance request in one place. Start free.",
};

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Building2,
    title: "Your Entire Portfolio in One Place",
    body: "No more switching between files and folders. Every property, unit and document lives in one organised system, accessible anytime, from anywhere.",
  },
  {
    icon: CreditCard,
    title: "Rent That Collects Itself",
    body: "Set it up once and let the platform handle the rest. Automated billing, payment tracking and reconciliation keep your cash flow consistent without the follow-ups.",
  },
  {
    icon: Wrench,
    title: "Maintenance, Without the Mess",
    body: "Tenants log issues with ease. You assign, oversee and resolve with full visibility into every open and closed request at every stage.",
  },
  {
    icon: BarChart3,
    title: "Data That Actually Helps You Grow",
    body: "Know exactly how your portfolio is performing. Occupancy trends, revenue snapshots and key metrics presented clearly, so you can act on them quickly.",
  },
];

/** Add real customer quotes here to show the "What Our Clients Say" section. */
const TESTIMONIALS: { quote: string; name: string; rating?: number }[] = [];

export default async function LandingPage() {
  const jar = await cookies();
  if (SESSION_COOKIES.some((name) => jar.has(name))) {
    redirect("/dashboard");
  }

  const ctaClass =
    "inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90";

  return (
    <main className="bg-white text-neutral-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
        <Image
          src="/images/herolanding.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/80" />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" aria-label={BRAND}>
            <Image
              src="/images/logo-light.png"
              alt={BRAND}
              width={228}
              height={42}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <Link href="/auth/signin" className={ctaClass}>
            Log in
          </Link>
        </header>
        <div className="mx-auto max-w-6xl px-6 pb-28 pt-24 sm:pt-32">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Your Properties. Perfectly Managed
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-200 sm:text-lg">
            Stop juggling spreadsheets and missed deadlines. {BRAND} brings
            every lease, payment and maintenance task together in one place, so
            you can manage smarter and grow with confidence.
          </p>
          <Link href="/auth/signup" className={`${ctaClass} mt-8 h-11 px-6`}>
            Start for Free
          </Link>
        </div>
      </section>

      {/* Product story */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-300">
          <Image
            src="/images/herolanding.webp"
            alt="Residential apartment towers"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover object-[28%_center]"
          />
        </div>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Built for the Way Property Management{" "}
            <span className="text-primary">Actually Works.</span>
          </h2>
          <p className="mt-5 leading-relaxed text-neutral-600">
            Managing properties isn&apos;t just about collecting rent. It&apos;s
            about staying on top of dozens of moving parts, all at once. We
            built a centralised platform that gives you complete visibility,
            from tracking individual rooms within a property to managing
            tenants, automating billing and keeping every record exactly where
            you need it. Whether you manage one rental or twenty, it adapts to
            your scale, so nothing slips through the cracks.
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="bg-neutral-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Powerful Tools. Simple <span className="text-primary">Experience.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-neutral-400">
            Every feature is designed to remove friction and put you in full
            control of your properties.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-6"
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview: the image's own background is white above and
          #188182 below, so the wrapper continues both colours edge to edge. */}
      <section>
        <div
          style={{
            background: "linear-gradient(to bottom, #fff 40.1%, #188182 40.1%)",
          }}
        >
          <Image
            src="/images/dashboard-preview.webp"
            alt={`${BRAND} dashboard showing portfolio metrics, revenue and payment status`}
            width={1517}
            height={835}
            sizes="(min-width: 1600px) 1600px, 100vw"
            className="mx-auto h-auto w-full max-w-[1600px]"
          />
        </div>
        <div className="bg-[#188182] text-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 pt-4 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Get free trial
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Your Entire Portfolio.
                <br />
                One Screen.
              </h2>
            </div>
            <p className="text-sm leading-relaxed opacity-90">
              Everything you need to run your properties: live metrics, payment
              status, maintenance alerts and lease renewals, all visible the
              moment you log in. No guesswork. Just clarity.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials (hidden until real quotes are added to TESTIMONIALS) */}
      {TESTIMONIALS.length > 0 && (
        <section className="bg-[#1f1f1f] py-20 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-4xl font-semibold tracking-tight">
              What Our Clients <span className="text-[#188182]">Say</span>
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <figure
                  key={t.name}
                  className={`flex flex-col border bg-white/[0.03] p-7 ${
                    i === 0 ? "border-[#188182]/60" : "border-white/5"
                  }`}
                >
                  <div
                    className="flex gap-1 text-amber-400"
                    role="img"
                    aria-label={`${t.rating ?? 5} out of 5 stars`}
                  >
                    {Array.from({ length: t.rating ?? 5 }).map((_, n) => (
                      <Star key={n} className="size-4 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-neutral-300">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-3 border-t border-white/5 pt-5 text-sm font-medium">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs">
                      {t.name[0]}
                    </span>
                    {t.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="bg-[#fafafa] px-6 py-20">
        <h2 className="text-center text-4xl font-semibold tracking-tight">
          Our <span className="text-[#188182]">Pricing</span>
        </h2>
        <div className="mx-auto mt-14 grid max-w-4xl items-start gap-6 md:grid-cols-2">
          {MANAGER_PLANS.map((plan) => (
            <div key={plan.id} className="bg-white">
              {plan.popular && (
                <div className="bg-[#188182] px-7 py-4 text-lg text-white">
                  Popular
                </div>
              )}
              <div className="p-7">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-xl font-semibold">£</span>
                  <span className="text-5xl font-semibold">
                    {plan.monthlyPrice ?? "POA"}
                  </span>
                  {plan.monthlyPrice ? (
                    <span className="ml-1 text-sm text-neutral-400">/month</span>
                  ) : null}
                </p>
                <ul className="mt-6 space-y-3 font-serif text-[15px] text-neutral-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <CircleCheck
                        className="size-4 shrink-0 text-[#188182]"
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/auth/signup?plan=${plan.id}`}
                  className={
                    plan.popular
                      ? "mt-7 flex h-14 w-full items-center justify-center bg-[#188182] text-sm font-medium text-white hover:opacity-90"
                      : "mt-7 flex h-14 w-full items-center justify-center border border-[#188182] text-sm font-medium text-[#188182] hover:bg-[#188182]/5"
                  }
                >
                  {plan.popular ? "Get started" : "Start for free"}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-neutral-500">
          <Link href="/pricing" className="underline underline-offset-4">
            Compare all plans
          </Link>
        </p>
      </section>
    </main>
  );
}
