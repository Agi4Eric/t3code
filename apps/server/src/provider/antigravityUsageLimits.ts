import * as NodeModule from "node:module";

import type { AntigravitySettings, ServerProviderUsageWindow } from "@t3tools/contracts";
import * as Digest from "effect/crypto/Digest";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { makeUnavailableUsageLimits } from "@t3tools/provider-core/server/usageLimits";

export function antigravityUserAgent(platform: NodeJS.Platform, architecture: NodeJS.Architecture) {
  return `antigravity/hub/2.24.0 (aidev_client; os_type=${platform}; arch=${architecture}; cl=963137146)`;
}

const SUMMARY_WINDOW_MINS = new Map([
  ["5h", 5 * 60],
  ["weekly", 7 * 24 * 60],
]);
const UserInfo = Schema.Struct({ id: Schema.NonEmptyString });
const Quota = Schema.Struct({
  remainingFraction: Schema.optional(Schema.Number),
  resetTime: Schema.optional(Schema.String),
});
const Bucket = Schema.Struct({
  ...Quota.fields,
  bucketId: Schema.NonEmptyString,
  window: Schema.optional(Schema.String),
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  disabled: Schema.optional(Schema.Boolean),
});
const Summary = Schema.Struct({
  groups: Schema.optional(
    Schema.Array(
      Schema.Struct({
        displayName: Schema.optional(Schema.String),
        buckets: Schema.optional(Schema.Array(Bucket)),
      }),
    ),
  ),
  buckets: Schema.optional(Schema.Array(Bucket)),
});

const decodeUserInfo = Schema.decodeUnknownEffect(UserInfo);
const decodeSummary = Schema.decodeUnknownEffect(Summary);

function iso(value: string | undefined): string | undefined {
  const parsed = value ? DateTime.make(value) : Option.none();
  return Option.isSome(parsed) ? DateTime.formatIso(parsed.value) : undefined;
}

function quotaWindow(
  id: string,
  label: string,
  quota: typeof Quota.Type,
  kind: ServerProviderUsageWindow["kind"] = "other",
  windowDurationMins?: number,
): ServerProviderUsageWindow | undefined {
  if (quota.remainingFraction === undefined || !Number.isFinite(quota.remainingFraction)) {
    return undefined;
  }
  const resetsAt = iso(quota.resetTime);
  return {
    id,
    label,
    kind,
    usedPercent: (1 - Math.max(0, Math.min(1, quota.remainingFraction))) * 100,
    ...(resetsAt ? { resetsAt } : {}),
    ...(windowDurationMins === undefined ? {} : { windowDurationMins }),
  };
}

function summaryResetTime(
  bucket: typeof Bucket.Type,
  windowDurationMins: number | undefined,
  requestedAt: number,
): string | undefined {
  // Untouched summary buckets report a rolling full-window reset.
  const untouched =
    bucket.remainingFraction === 1 &&
    bucket.description === undefined &&
    windowDurationMins !== undefined &&
    Math.abs(Date.parse(bucket.resetTime ?? "") - requestedAt - windowDurationMins * 60_000) <=
      60_000;
  return untouched ? undefined : bucket.resetTime;
}

const sha256 = Effect.fnUntraced(function* (text: string) {
  const digest = yield* (yield* Digest.Digest).digest(
    Digest.sha256,
    new TextEncoder().encode(text),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
});

/** go-keyring stores UTF-8, which it prefixes and encodes on macOS. */
export function decodeGoKeyringSecret(secret: ArrayLike<number>): string {
  // The binding resolves a plain number array at runtime despite its Uint8Array type.
  const text = new TextDecoder().decode(Uint8Array.from(secret));
  if (text.startsWith("go-keyring-base64:")) {
    return Buffer.from(text.slice("go-keyring-base64:".length), "base64").toString("utf8");
  }
  if (text.startsWith("go-keyring-encoded:")) {
    return Buffer.from(text.slice("go-keyring-encoded:".length), "hex").toString("utf8");
  }
  return text;
}

class AntigravityKeyringError extends Schema.TaggedError<AntigravityKeyringError>()(
  "AntigravityKeyringError",
  { cause: Schema.Defect() },
) {
  override get message(): string {
    return "Could not read the Antigravity sign-in from the system keyring.";
  }
}

// A single-executable server resolves packages on disk only through `require`.
const requireExternal = NodeModule.createRequire(import.meta.url);

/**
 * go-keyring's Windows target is `gemini:antigravity`; @napi-rs/keyring reads `antigravity.gemini`,
 * and its `withTarget` overwrites the target with an empty secret before reading.
 */
export function readWindowsCliCredential(
  architecture: NodeJS.Architecture,
): Uint8Array | undefined {
  // CREDENTIALW offsets and the pointers below are 64-bit.
  if (architecture !== "x64" && architecture !== "arm64") {
    throw new Error(`no credential access on ${architecture}`);
  }
  const { DataType, load, open } = requireExternal("ffi-rs") as typeof import("ffi-rs");
  open({ library: "t3-advapi32", path: "advapi32.dll" });
  open({ library: "t3-kernel32", path: "kernel32.dll" });
  const copy = (into: Buffer, from: bigint) =>
    load({
      library: "t3-kernel32",
      funcName: "RtlMoveMemory",
      retType: DataType.Void,
      paramsType: [DataType.U8Array, DataType.BigInt, DataType.BigInt],
      paramsValue: [into, from, BigInt(into.length)],
    });
  const out = Buffer.alloc(8);
  const read = load({
    library: "t3-advapi32",
    funcName: "CredReadW",
    retType: DataType.I32,
    // CRED_TYPE_GENERIC
    paramsType: [DataType.WString, DataType.U32, DataType.U32, DataType.U8Array],
    paramsValue: ["gemini:antigravity", 1, 0, out],
    errno: true as const,
  });
  if (read.value === 0) {
    // ERROR_NOT_FOUND
    if (read.errnoCode === 1168) return undefined;
    throw new Error(`CredReadW failed with Windows error ${read.errnoCode}`);
  }
  const credential = out.readBigUInt64LE();
  try {
    // CredentialBlobSize is a DWORD at 32 and CredentialBlob a pointer at 40.
    const header = Buffer.alloc(48);
    copy(header, credential);
    const size = header.readUInt32LE(32);
    if (size === 0) return undefined;
    const blob = Buffer.alloc(size);
    copy(blob, header.readBigUInt64LE(40));
    return blob;
  } finally {
    load({
      library: "t3-advapi32",
      funcName: "CredFree",
      retType: DataType.Void,
      paramsType: [DataType.BigInt],
      paramsValue: [credential],
    });
  }
}

/** Keys an account by its Google ID, which matches across machines and hubs; refresh tokens do not. */
export const antigravityAccountFingerprint = (userInfo: unknown) =>
  decodeUserInfo(userInfo).pipe(Effect.flatMap((info) => sha256(`google-account\0${info.id}`)));

/** Windows from a `retrieveUserQuotaSummary` answer requested at `requestedAt`. */
export const antigravitySummaryWindows = (response: unknown, requestedAt: number) =>
  decodeSummary(response).pipe(Effect.map((summary) => summaryWindows(summary, requestedAt)));

function summaryWindows(summary: typeof Summary.Type, requestedAt: number) {
  const windows = new Map<string, ServerProviderUsageWindow>();
  const groups = summary.groups?.some((group) => group.buckets?.length)
    ? summary.groups
    : [{ buckets: summary.buckets }];
  for (const group of groups ?? []) {
    for (const bucket of group.buckets ?? []) {
      if (bucket.disabled) continue;
      // Argon and Carbon are metered separately from the default Gemini buckets.
      const family = bucket.bucketId.startsWith("gemini-argon-")
        ? group.displayName?.trim() || "Gemini Argon"
        : bucket.bucketId.startsWith("gemini-carbon-")
          ? group.displayName?.trim() || "Gemini Carbon"
          : bucket.bucketId.startsWith("gemini-")
            ? "Gemini"
            : bucket.bucketId.startsWith("3p-")
              ? "Claude & GPT (shared)"
              : group.displayName?.trim() || bucket.bucketId;
      const weekly = bucket.window === "weekly";
      const session = bucket.window === "5h";
      const windowDurationMins = SUMMARY_WINDOW_MINS.get(bucket.window ?? "");
      const window = quotaWindow(
        bucket.bucketId,
        `${family} · ${weekly ? "Weekly" : session ? "5-hour" : bucket.displayName?.trim() || "Quota"}`,
        { ...bucket, resetTime: summaryResetTime(bucket, windowDurationMins, requestedAt) },
        weekly ? "weekly" : session ? "session" : "other",
        windowDurationMins,
      );
      if (window) windows.set(window.id, window);
    }
  }
  return [...windows.values()];
}

export const makeAntigravityUsageProbe = Effect.fn("makeAntigravityUsageProbe")((_input: {
  readonly profileDirectory: string;
  readonly authMethod: AntigravitySettings["authMethod"];
  readonly readKeyringSecret?: Effect.Effect<string | undefined, AntigravityKeyringError>;
}) => {
  // Background Antigravity credential/keyring probing is disabled in this private fork.
  const probe = Effect.gen(function* () {
    return makeUnavailableUsageLimits({
      checkedAt: DateTime.formatIso(yield* DateTime.now),
      reason: "unsupported",
      message: "Antigravity credential probing is disabled in this build.",
    });
  });
  return Effect.succeed({
    probe,
    clear: Effect.void,
  });
});
