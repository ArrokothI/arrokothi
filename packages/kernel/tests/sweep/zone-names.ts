/**
 * The member names the poisoned-prototype sweep installs (correction DEC-8, contract revision 9).
 *
 * The sweep asks one runtime question: while a Kernel boundary call runs, does the zone ever
 * resolve a member through `Object.prototype` or `Function.prototype`? It can only ask it for the
 * names it poisons, so this module states how that name set is derived and why it reaches every
 * member the zone can name:
 *
 * - **Spelled in the zone.** Every name the 13 zone sources spell in a member position: the name of
 *   a property access, the literal key of an element access, every member declared by an interface,
 *   type literal, class or object literal, and every identifier-like string literal (the zone passes
 *   member names to `observeOwn`, `observeField` and `hostMember` as literals, and computed reads
 *   such as `BOUNDARY_PREFIX[boundary]` take their key from a literal union). Declared members are
 *   included even when no code reads them, so an optional member no code spells yet is still
 *   covered. A name only the zone's comments mention is not.
 * - **Read by the engine on the zone's behalf.** Operations the zone performs can read members it
 *   never spells: conversion to a primitive (`Symbol.toPrimitive`, `toString`, `valueOf`), the
 *   iteration protocol, promise assimilation (`then`), `JSON.stringify` (`toJSON`), `instanceof`,
 *   species lookups, and the function protocol (`call`, `apply`, `bind`). `ENGINE_PROTOCOL_NAMES` lists
 *   them with their reason.
 * - **Small indices.** `"0"`–`"15"`: an ordinary read of a position a list does not own walks on to
 *   `Object.prototype`. Larger indices are left to the inherited-index tests (K11-R6-STATE-02).
 *
 * What the set cannot contain is a name the zone builds at run time from something other than a
 * literal. The zone builds exactly one kind: list positions (`${index}`), bounded above.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

/**
 * Names the engine reads without the zone spelling them, with the operation that reads each.
 * A zone read of any of them through a built-in prototype is a live prototype method or an implicit
 * conversion, which DEC-8 and C13 both forbid after the first caller observation.
 */
export const ENGINE_PROTOCOL_NAMES: readonly (readonly [string | symbol, string])[] = [
  [Symbol.toPrimitive, "conversion of an object to a primitive"],
  ["toString", "ordinary conversion of an object to a string"],
  ["valueOf", "ordinary conversion of an object to a number"],
  ["toLocaleString", "locale conversion"],
  [Symbol.iterator, "the iteration protocol (for...of, spread, destructuring)"],
  [Symbol.asyncIterator, "the async iteration protocol"],
  ["then", "promise assimilation"],
  ["toJSON", "JSON.stringify"],
  ["constructor", "species and constructor lookups"],
  [Symbol.species, "species lookups"],
  [Symbol.hasInstance, "instanceof"],
  [Symbol.toStringTag, "Object.prototype.toString"],
  [Symbol.isConcatSpreadable, "Array.prototype.concat"],
  ["call", "the function protocol"],
  ["apply", "the function protocol"],
  ["bind", "the function protocol"],
  ["length", "list and function length"],
  ["name", "function and error names"],
  ["message", "error messages"],
  ["stack", "error stacks"],
  ["cause", "error options"],
  ["prototype", "constructor prototypes"],
];

/** The small list positions the sweep poisons. */
export const INDEX_NAMES: readonly string[] = Array.from({ length: 16 }, (_unused, index) => `${index}`);

/**
 * Never poisoned: `__proto__` is the accessor every ordinary `[[GetPrototypeOf]]` spelling goes
 * through, and replacing it would change what `obj.__proto__` means for the test code the sweep
 * runs, not only for the zone. The zone never spells it.
 */
export const NEVER_POISONED: ReadonlySet<string | symbol> = new Set(["__proto__"]);

const IDENTIFIER_LIKE = /^[A-Za-z_$][\w$]*$/;

/** Every name one zone source spells in a member position (see the module comment). */
function spelledNames(fileName: string, text: string, into: Set<string>): void {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const nameOf = (name: ts.Node | undefined): string | undefined =>
    name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) ? name.text : undefined;
  const visit = (node: ts.Node): void => {
    let name: string | undefined;
    if (ts.isPropertyAccessExpression(node)) name = nameOf(node.name);
    else if (ts.isElementAccessExpression(node)) name = nameOf(node.argumentExpression);
    else if (
      ts.isPropertyAssignment(node) ||
      ts.isPropertySignature(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isShorthandPropertyAssignment(node) ||
      ts.isBindingElement(node)
    ) {
      name = nameOf(ts.isBindingElement(node) ? (node.propertyName ?? node.name) : node.name);
    } else if (ts.isStringLiteral(node) && IDENTIFIER_LIKE.test(node.text)) {
      const parent = node.parent;
      if (!ts.isImportDeclaration(parent) && !ts.isExportDeclaration(parent)) name = node.text;
    }
    if (name !== undefined) into.add(name);
    ts.forEachChild(node, visit);
  };
  visit(source);
}

/** The zone's 13 sources, sorted, as absolute paths. */
export const zoneSources = (sourceRoot: string): string[] =>
  readdirSync(sourceRoot)
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => resolve(sourceRoot, name));

/** The complete poisoned name set for the zone at `sourceRoot`, spelled names first. */
export function zoneMemberNames(sourceRoot: string): (string | symbol)[] {
  const spelled = new Set<string>();
  for (const file of zoneSources(sourceRoot)) spelledNames(file, readFileSync(file, "utf8"), spelled);
  const names: (string | symbol)[] = [...spelled].sort();
  for (const [name] of ENGINE_PROTOCOL_NAMES) if (!names.includes(name)) names.push(name);
  for (const name of INDEX_NAMES) if (!names.includes(name)) names.push(name);
  return names.filter((name) => !NEVER_POISONED.has(name));
}

/** The six property-descriptor fields, which the whole-suite sweep leaves to the catalog sweep. */
export const DESCRIPTOR_FIELDS: readonly string[] = ["value", "writable", "get", "set", "enumerable", "configurable"];

/** Names travel between processes as text; a well-known symbol as `@@<its name>`. */
export const encodeName = (name: string | symbol): string =>
  typeof name === "symbol" ? `@@${(name.description ?? "").replace(/^Symbol\./, "")}` : name;

export const decodeName = (name: string): string | symbol =>
  name.startsWith("@@") ? ((Symbol as unknown as Record<string, symbol>)[name.slice(2)] as symbol) : name;
