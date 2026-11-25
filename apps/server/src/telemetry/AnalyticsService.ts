// Product analytics and telemetry upload are disabled in this private fork.
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { TelemetryOwner } from "./Identify.ts";

export class AnalyticsService extends Context.Service<
  AnalyticsService,
  {
    /** Whether the event was queued to send; always false in this private fork. */
    readonly record: (
      event: string,
      properties?: Readonly<Record<string, unknown>>,
      options?: { readonly anonymous?: boolean },
    ) => Effect.Effect<boolean>;

    readonly flush: Effect.Effect<void>;

    readonly recordOwners: (
      owners: ReadonlyArray<TelemetryOwner>,
      observedBy: "server" | "client",
    ) => Effect.Effect<void>;
  }
>()("t3/telemetry/AnalyticsService") {}

const recordDisabled: AnalyticsService["Service"]["record"] = Effect.fn("AnalyticsService.record")(
  () => Effect.succeed(false),
);

const recordOwnersDisabled: AnalyticsService["Service"]["recordOwners"] = Effect.fn(
  "AnalyticsService.recordOwners",
)(() => Effect.void);

/** @public */
export const make = Effect.succeed(
  AnalyticsService.of({
    record: recordDisabled,
    flush: Effect.void,
    recordOwners: recordOwnersDisabled,
  }),
);

export const layer = Layer.effect(AnalyticsService, make);
