import type { ManagedPolicySummary } from "@t3tools/contracts";
import {
  nodeProcessRuntimeAttributes,
  processServiceInstanceId,
} from "@t3tools/shared/observability";
import * as RelayTracing from "@t3tools/shared/relayTracing";

import { resolveRelayClientTracingConfig } from "./publicConfig.ts";

const relayClientTracingConfig = resolveRelayClientTracingConfig();

/**
 * `false` once the environment or a managed policy opted out. Until the desktop has read the
 * login shell, a shell-profile opt-out is still unknown, so tracing stays off.
 */
export const allowedFor = (
  _env: Readonly<Record<string, string | undefined>>,
  _policy: ManagedPolicySummary | undefined,
) => false;

/** Relay tracing is permanently disabled in this private fork. */
export const relayLayer = (
  resource: Omit<RelayTracing.RelayClientTracingResource, "serviceInstanceId">,
  _tracingConfig = relayClientTracingConfig,
) =>
  RelayTracing.layer(
    null,
    { ...resource, serviceInstanceId: processServiceInstanceId() },
    { isEnabled: () => false },
  );

export const layerHeadlessRelayClient = relayLayer({
  serviceName: "t3code-server",
  runtime: "node",
  attributes: nodeProcessRuntimeAttributes(),
  client: "headless-cli",
});

export const layerServerRelayBroker = relayLayer({
  serviceName: "t3code-server",
  runtime: "node",
  attributes: nodeProcessRuntimeAttributes(),
  client: "environment-server",
  component: "relay-broker",
});
