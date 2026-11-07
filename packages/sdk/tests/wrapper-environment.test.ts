/**
 * B-WRAPPER (K14-5; K1.4 design 01 §9, design 02 D01-CHK-06): the public wrapper export and the L-01
 * startup check. Each case runs in a fresh process, because a script-level `let` binding cannot be
 * removed once declared.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { toCanonicalBytes, WrapperEnvironmentError } from "@arrokothi/sdk";
import { inWrappedChild } from "./capture-instruments.ts";

type Probe = { readonly create: string; readonly bytes: string };

/** Runs `install` before or after the SDK loads, then reports how `createApplication` and `toCanonicalBytes` end. */
function probe(install: string, timing: "before" | "after"): Probe {
  const sdk = JSON.stringify(new URL("../src/index.ts", import.meta.url).href);
  const body = `
    const vm = await import("node:vm");
    const realStringify = globalThis.JSON.stringify;
    const report = (work) => { try { const result = work(); return result && result.ok === true ? "ok:" + new TextDecoder().decode(result.value) : "ok"; } catch (error) { return error.name + ":" + error.identifier; } };
    ${timing === "before" ? install : ""}
    const sdk = await import(${sdk});
    ${timing === "after" ? install : ""}
    const create = report(() => { sdk.createApplication(); });
    const bytes = report(() => sdk.toCanonicalBytes({ b: 2, a: [1, "x"] }));
    process.stdout.write(realStringify({ create, bytes }) + "\\n");
  `;
  const output = execFileSync(process.execPath, ["--no-warnings", "--input-type=module", "-e", body], { encoding: "utf8", timeout: 120_000 });
  return JSON.parse(output.trim().split("\n").pop() as string) as Probe;
}

const steeringJSON = `vm.runInThisContext("let JSON = { stringify: (value) => typeof value === 'number' ? '999' : globalThis.JSON.stringify(value), parse: globalThis.JSON.parse };");`;
const refused = (identifier: string): Probe => ({ create: `WrapperEnvironmentError:${identifier}`, bytes: `WrapperEnvironmentError:${identifier}` });

test("B-WRAPPER: the SDK exports the wrapper, which returns canonical bytes or the value's issues", () => {
  const accepted = toCanonicalBytes({ b: 2, a: [1, "x"] });
  assert.ok(accepted.ok);
  assert.equal(new TextDecoder().decode(accepted.value), '{"a":[1,"x"],"b":2}');
  const refusal = toCanonicalBytes({ a: Number.NaN });
  assert.equal(refusal.ok, false);
  assert.ok(!refusal.ok && refusal.issues.length > 0 && refusal.issues[0]!.path.length > 0);
  assert.equal(new WrapperEnvironmentError("JSON").identifier, "JSON");
});

test("B-WRAPPER: a lexical JSON shadow installed before the SDK loads is refused by name at startup and at the wrapper", () => {
  assert.deepEqual(probe(steeringJSON, "before"), refused("JSON"));
});

test("B-WRAPPER: a lexical JSON shadow installed after the SDK loads is refused by name at startup and at the wrapper", () => {
  assert.deepEqual(probe(steeringJSON, "after"), refused("JSON"));
});

test("B-WRAPPER: a lexical shadow of each other free identifier is refused by name", () => {
  for (const name of ["isNaN", "isFinite", "Object", "Array", "Set", "Error", "Symbol"]) {
    // A same-behaving wrapper object or function, never the intrinsic itself.
    const install = `vm.runInThisContext("let ${name} = new Proxy(globalThis.${name}, {});");`;
    assert.deepEqual(probe(install, "after"), refused(name), name);
  }
});

test("B-WRAPPER: replacing the global property after the SDK loads is refused by name", () => {
  assert.deepEqual(probe(`globalThis.JSON = { stringify: realStringify, parse: globalThis.JSON.parse };`, "after"), refused("JSON"));
});

test("B-WRAPPER: a harmless shadow bound to the genuine intrinsic passes", () => {
  assert.deepEqual(probe(`vm.runInThisContext("let JSON = globalThis.JSON;");`, "after"), { create: "ok", bytes: 'ok:{"a":[1,"x"],"b":2}' });
});

test("B-WRAPPER: a shadow installed by a capture-time side effect refuses that call and every later one", () => {
  const observed = inWrappedChild<{ installs: number; first: { ok: boolean; codes: string[] }; second: string }>(`
    const vm = await import("node:vm");
    const realStringify = globalThis.JSON.stringify;
    const value = track({ a: 1 });
    let installs = 0;
    hooks.descriptor = (target, key, real) => {
      if (key === "a" && installs === 0) {
        vm.runInThisContext("let JSON = { stringify: (value) => typeof value === 'number' ? '999' : globalThis.JSON.stringify(value), parse: globalThis.JSON.parse };");
        installs += 1;
      }
      return real;
    };
    const result = values.toCanonicalBytes(value);
    const first = { ok: result.ok, codes: result.ok ? [] : result.issues.map(issue => issue.code) };
    let second;
    try { values.toCanonicalBytes({ a: 1 }); second = "accepted"; } catch (error) { second = error.name + ":" + error.identifier; }
    process.stdout.write(realStringify({ installs, first, second }) + "\\n");
  `);
  assert.equal(observed.installs, 1, "the side effect really installed the shadow during capture");
  assert.deepEqual(observed.first, { ok: false, codes: ["unstable_representation"] }, "no bytes under the shadow");
  assert.equal(observed.second, "WrapperEnvironmentError:JSON");
});
