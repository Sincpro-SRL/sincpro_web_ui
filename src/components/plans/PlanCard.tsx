"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { Price, type PriceProps } from "@sincpro/web-ui/primitives/value/Price";
import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";

export type PlanFeature = {
  label: string;
  /** `false` draws it as NOT included — kept in the list so plans compare line by line. */
  included?: boolean;
};

export type PlanCardProps = {
  name: string;
  /** Who it is for, in one line: «Para una empresa con un local». */
  description?: string;
  /** The price as `Price` takes it — usually with `per` («mes») and, on a yearly offer, the
   *  monthly price before as `compareAt`. Absent for «a convenir». */
  price?: Omit<PriceProps, "size">;
  /** What is written where the price would be when there is none: «A convenir». */
  priceLabel?: string;
  features?: readonly PlanFeature[];
  /** The button that takes it — the recommended plan's is the screen's one primary; the rest
   *  are secondary. The application decides. */
  action?: ReactNode;
  /** A word over the card that sets it apart: «Recomendado», «Más elegido». */
  highlight?: string;
  /** The plan the person is on: a tag says so, and its action usually goes away. */
  current?: boolean;
};

/**
 * One plan of an offer: a subscription in a portal, a membership in a shop, the licences of an
 * ERP — the name, who it is for, the price, what it includes, and the button that takes it.
 *
 * Context: plans are COMPARED, so every card has the same anatomy in the same order and a
 * feature a plan lacks stays in its list, marked «no incluye» — a list that just gets shorter
 * makes the reader do the diff. Included and not are an icon AND a word for a screen reader,
 * never a colour alone. The highlighted plan is framed in the selection's navy, not the gold:
 * the gold is its button, the one primary of the screen. Placed in `Plans`, the cards share
 * their height, so the buttons line up at the bottom.
 */
export function PlanCard({
  name,
  description,
  price,
  priceLabel,
  features,
  action,
  highlight,
  current = false,
}: PlanCardProps) {
  const copy = useUiCopy();
  return (
    <article
      data-ui="plan"
      {...(highlight === undefined ? {} : { "data-highlight": "" })}
      {...(current ? { "data-current": "" } : {})}
      aria-label={name}
      className={`relative flex min-w-0 flex-col gap-4 rounded-ui-card border bg-ui-card p-5 ${
        highlight === undefined
          ? "border-ui-card-border"
          : "border-primary ring-1 ring-primary"
      }`}
    >
      {highlight === undefined ? null : (
        <span
          data-ui="plan.highlight"
          className="absolute -top-3 left-5 rounded-pill bg-primary px-2.5 py-0.5 text-micro font-semibold text-surface"
        >
          {highlight}
        </span>
      )}
      <header className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-title font-semibold text-ink">{name}</h3>
          {current ? <Tag tone="info">{copy.plans.current}</Tag> : null}
        </div>
        {description === undefined ? null : (
          <p className="text-meta text-muted">{description}</p>
        )}
      </header>
      {/* Two lines tall whatever it holds — the price and, under it, the one before and the
          discount — so the feature lists of the plans start on the same line and compare row
          by row (a «A convenir» of one line pushed its list up). */}
      <div data-ui="plan.price" className="min-h-16">
        {price === undefined ? (
          <p className="text-display font-semibold text-ink">
            {priceLabel ?? copy.plans.onRequest}
          </p>
        ) : (
          <Price {...price} size="lg" />
        )}
      </div>
      {features === undefined || features.length === 0 ? null : (
        <ul data-ui="plan.features" className="flex flex-col gap-2">
          {features.map((feature) => {
            const included = feature.included !== false;
            const Icon = included ? Check : Minus;
            return (
              <li
                key={feature.label}
                className={`flex min-w-0 items-start gap-2 text-meta ${included ? "text-ink" : "text-muted"}`}
              >
                <Icon
                  aria-hidden
                  strokeWidth={2.25}
                  className={`mt-0.5 size-(--size-icon-md) shrink-0 ${included ? "text-good" : "text-muted"}`}
                />
                <span className="min-w-0">
                  <span className="sr-only">
                    {included ? copy.plans.included : copy.plans.excluded}:{" "}
                  </span>
                  {feature.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {action === undefined ? null : (
        /* At the bottom whatever the list's length: in `Plans` every card is as tall as the
           tallest, so the buttons line up. */
        <div data-ui="plan.action" className="mt-auto flex flex-col pt-2 *:w-full">
          {action}
        </div>
      )}
    </article>
  );
}

/** The plans of an offer side by side, as many as the row takes, each as tall as the tallest
 *  — stacked on a phone. Its name says what is being chosen: «Planes de Quipu». */
export function Plans({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      data-ui="plans"
      className="grid min-w-0 grid-cols-(--grid-plans) items-stretch gap-x-4 gap-y-6 pt-3"
    >
      {children}
    </section>
  );
}
