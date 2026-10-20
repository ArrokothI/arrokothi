/** Internal transport adapter. The receiving transport must cap accumulation/decompression too. */
import { copyByteInput, parseOwnedBytes } from "./canonical-bytes.ts";
import { acceptCanonicalBytes } from "./values.ts";
import type { ValueAcceptance } from "./value-types.ts";
const PrimordialSafeInteger = Number.isSafeInteger;

export function canonicalizeJsonText(wireUtf8: Uint8Array, maxWireBytes = 8_388_608): ValueAcceptance<Uint8Array> {
  if (!PrimordialSafeInteger(maxWireBytes) || maxWireBytes < 0 || maxWireBytes > 8_388_608) {
    return { ok: false, issues: [{ path: "", code: "transport_too_large", message: "transport cap must be an integer from zero through 8388608" }] };
  }
  const copied = copyByteInput(wireUtf8, maxWireBytes, true);
  if (!copied.ok) return copied;
  const parsed = parseOwnedBytes(copied.value, false);
  if (!parsed.ok) return parsed;
  const checked = acceptCanonicalBytes(parsed.value.bytes);
  return checked.ok ? { ok: true, value: checked.value.bytes } : checked;
}
