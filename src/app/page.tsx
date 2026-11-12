import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  Check,
  CreditCard,
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
const TESTIMONIALS: { quote: string; name: string }[] = [];

function DashboardPreview() {
  const tiles = ["Properties", "Occupancy", "Revenue", "Overdue", "Maintenance", "Leases"];
  return (
    <div className="mx-auto w-full max-w-3xl rounded-t-xl border-[10px] border-b-0 border-neutral-900 bg-white shadow-2xl">
      <div className="flex">
        <div className="hidden w-32 shrink-0 space-y-2 border-r bg-neutral-50 p-3 sm:block">
          <div className="h-3 w-16 rounded bg-primary/70" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-2 rounded bg-neutral-200" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="mb-3 h-3 w-40 rounded bg-neutral-300" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiles.map((t) => (
              <div key={t} className="rounded-md border p-2">
                <div className="text-[10px] text-neutral-500">{t}</div>
                <div className="mt-1 h-3 w-10 rounded bg-neutral-800/80" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-24 items-end gap-1.5 rounded-md border p-2">
            {[40, 65, 50, 80, 60, 90, 72, 95, 68, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function priceLabel(monthlyPrice: number | null) {
  if (monthlyPrice === null) return "POA";
  return `£${monthlyPrice}`;
}

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

      {/* Dashboard preview */}
      <section className="bg-white pt-20">
        <div className="px-6">
          <DashboardPreview />
        </div>
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-14 md:grid-cols-2 md:items-center">
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

      {/* Testimonials (hidden until real quotes are added) */}
      {TESTIMONIALS.length > 0 && (
        <section className="bg-neutral-900 py-20 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              What Our Clients <span className="text-primary">Say</span>
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-6"
                >
                  <blockquote className="text-sm leading-relaxed text-neutral-300">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-medium">
                    {t.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Our <span className="text-primary">Pricing</span>
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {MANAGER_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-lg border bg-white ${
                plan.popular ? "border-primary shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <div className="rounded-t-md bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground">
                  Popular
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="mt-3 text-3xl font-semibold">
                  {priceLabel(plan.monthlyPrice)}
                  {plan.monthlyPrice ? (
                    <span className="text-sm font-normal text-neutral-500">
                      {" "}
                      /month
                    </span>
                  ) : null}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-neutral-700">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-primary"
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
                      ? `${ctaClass} mt-6 w-full`
                      : "mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-primary text-sm font-medium text-primary hover:bg-primary/5"
                  }
                >
                  {plan.popular ? "Get started" : "Start for free"}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/pricing" className="underline underline-offset-4">
            Compare all plans
          </Link>
        </p>
      </section>
    </main>
  );
}
