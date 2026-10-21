/* The system sheet: copy to src/app/system/page.tsx
 *
 * Renders every token and primitive on one page, so the design system can be
 * looked at, screenshotted and judged before a single section is built. If
 * this page does not look like the brand in DESIGN.md, no page will.
 *
 * Shoot it in Step 2:  node <skill>/assets/measure-reference.mjs http://localhost:3000/system --out .design/system
 * It is noindexed. Keep it (a design system page is judge-visible craft) or
 * delete it before submitting, per CONFIG system_page.
 */
import type { Metadata } from "next";
import {
  ArrowLink,
  Button,
  Container,
  Eyebrow,
  Frame,
  Heading,
  Lead,
  Rows,
  RuledColumns,
  Section,
  StatRow,
  Status,
  Surface,
} from "@/components/primitives";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/states";

export const metadata: Metadata = { title: "System", robots: { index: false } };

const COLORS = [
  ["ground", "the page"],
  ["surface", "stages, panels"],
  ["surface-2", "a step inside"],
  ["panel", "cards, inputs"],
  ["tile", "flat blocks"],
  ["fill", "quiet buttons"],
  ["fg", "primary text"],
  ["fg-soft", "body on dark"],
  ["fg-mute", "secondary"],
  ["fg-faint", "labels, meta"],
  ["line", "hairlines"],
  ["line-strong", "rules, inputs"],
  ["action", "primary action"],
  ["accent", "meaning only"],
  ["accent-soft", "accent ground"],
  ["success", "state"],
  ["warning", "state"],
  ["danger", "state"],
] as const;

const TYPE = [
  ["t-display-xl", "Private money on public chains"],
  ["t-display-l", "Every team runs its own money"],
  ["t-display-m", "Rules that hold even if the app does not"],
  ["t-title", "Payday in one payment"],
  ["t-lead", "One sentence that says what the product does, for whom, and why it matters now."],
  ["t-body", "Body copy carries the explanation. It stays readable at 45 to 75 characters a line."],
  ["t-small", "Secondary detail, captions and metadata."],
  ["t-label", "Eyebrow label"],
] as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-8 border-t border-line-strong py-12 lg:grid-cols-[240px_1fr]">
      <Eyebrow>{title}</Eyebrow>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function SystemPage() {
  return (
    <main>
      <Section space="tight">
        <Container>
          <Eyebrow className="mb-4">Design system</Eyebrow>
          <Heading as="h1" size="xl">
            The system sheet
          </Heading>
          <Lead className="mt-5">
            Every token and primitive in one place. If this page does not feel like the product, fix the tokens
            before building another section.
          </Lead>

          <div className="mt-16">
            <Block title="Color">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {COLORS.map(([name, use]) => (
                  <li key={name} className="flex flex-col gap-2">
                    <span
                      className="h-16 rounded-tile border border-line"
                      style={{ background: `var(--${name})` }}
                      aria-hidden
                    />
                    <span className="t-small">{name}</span>
                    <span className="text-[12px] text-fg-faint">{use}</span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="Type">
              <ul className="flex flex-col gap-8">
                {TYPE.map(([cls, sample]) => (
                  <li key={cls} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                    <span className="font-mono text-[12px] text-fg-faint">{cls}</span>
                    <span className={cls}>{sample}</span>
                  </li>
                ))}
                <li className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <span className="font-mono text-[12px] text-fg-faint">t-num</span>
                  <span className="t-num text-[54px] leading-none">$12,504.61</span>
                </li>
              </ul>
            </Block>

            <Block title="Buttons">
              <div className="flex flex-col gap-6">
                {(["lg", "md", "sm"] as const).map((size) => (
                  <div key={size} className="flex flex-wrap items-center gap-2">
                    <Button size={size}>Open the app</Button>
                    <Button size={size} variant="quiet">
                      Take the tour
                    </Button>
                    <Button size={size} variant="ghost">
                      Read the docs
                    </Button>
                    <Button size={size} variant="text">
                      Contact sales
                    </Button>
                    <Button size={size} variant="accent">
                      Verify a proof
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <Button disabled>Disabled</Button>
                  <Button busy>Sending</Button>
                  <Button variant="danger" size="sm">
                    Delete run
                  </Button>
                  <ArrowLink href="/">See how it works</ArrowLink>
                </div>
              </div>
            </Block>

            <Block title="Surfaces">
              <div className="grid gap-3 md:grid-cols-2">
                <Surface kind="tile" className="p-8">
                  <p className="t-label mb-3">tile</p>
                  <p className="t-title">A flat block, one step off the ground</p>
                </Surface>
                <Surface kind="card" className="p-8">
                  <p className="t-label mb-3">card</p>
                  <p className="t-title">An object you can act on</p>
                </Surface>
                <Surface kind="panel" className="min-h-[220px] p-8">
                  <div className="field field-drift" aria-hidden />
                  <p className="t-label mb-3">panel + field</p>
                  <p className="t-title">A stage for the product</p>
                </Surface>
                <Surface kind="feature" className="p-10">
                  <p className="t-label mb-3">feature</p>
                  <p className="t-title">A closing card</p>
                </Surface>
              </div>
            </Block>

            <Block title="Open content">
              <RuledColumns
                items={[
                  { label: "The app", title: "Use it today", body: "Hold and pay privately from your own wallet.", href: "/", cta: "Open app" },
                  { label: "The protocol", title: "Open contracts", body: "Settlement stays public. The details do not.", href: "/", cta: "Verify" },
                  { label: "The SDK", title: "Build on it", body: "Private payments in your own app, one package.", href: "/", cta: "Explore" },
                ]}
              />
              <StatRow
                className="mt-14"
                stats={[
                  { value: "~1 second", label: "Payday for the whole company, one payment" },
                  { value: "3 levels", label: "Treasury, team and card, each with its own key" },
                  { value: "0", label: "Overspends that got through in testing" },
                ]}
              />
              <Rows
                className="mt-14"
                items={[
                  { title: "October payroll", detail: "12 people, sealed", meta: "48,200 USDC", href: "/" },
                  { title: "Supplier: order 88", detail: "Paid privately", meta: "18,900 USDC", href: "/" },
                  { title: "Research agent", detail: "API calls, metered", meta: "0.42 USDC", href: "/" },
                ]}
              />
            </Block>

            <Block title="Inputs and status">
              <div className="grid max-w-[520px] gap-4">
                <label className="flex flex-col gap-2">
                  <span className="t-small">Recipient</span>
                  <input className="field-input" placeholder="Name or address" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="t-small">Amount</span>
                  <input className="field-input" defaultValue="-40" aria-invalid="true" />
                  <span className="t-small text-danger">Enter an amount above zero.</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Status>Draft</Status>
                  <Status tone="success">Settled</Status>
                  <Status tone="warning">Waiting for approval</Status>
                  <Status tone="danger">Refused</Status>
                  <Status tone="accent">Sealed</Status>
                </div>
              </div>
            </Block>

            <Block title="States">
              <div className="grid gap-4 lg:grid-cols-3">
                <EmptyState title="No payments yet" body="Send one and it appears here within a few seconds." />
                <CardSkeleton />
                <ErrorState body="We could not reach the network. Try again in a moment." />
              </div>
            </Block>

            <Block title="Frames">
              <div className="flex flex-wrap items-end gap-8">
                <Frame kind="phone" label="Phone frame" className="h-[420px]">
                  <div className="p-6">
                    <p className="t-label">Balance</p>
                    <p className="t-num mt-2 text-[40px] leading-none">$2,981.40</p>
                  </div>
                </Frame>
                <Frame label="app.example.com" className="w-full max-w-[560px]">
                  <div className="p-6">
                    <p className="t-small text-fg-mute">Real UI goes here, rendered from the real components.</p>
                  </div>
                </Frame>
              </div>
            </Block>
          </div>
        </Container>
      </Section>

      <Section tone="dark">
        <Container>
          <Eyebrow className="mb-4">Inverted band</Eyebrow>
          <Heading size="l">The same tokens, scoped dark with one prop</Heading>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button>Open the app</Button>
            <Button variant="quiet">Read the docs</Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
