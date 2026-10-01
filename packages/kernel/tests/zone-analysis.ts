/**
 * Static regression guard for correction DEC-8 and DEC-9 (contract revision 9, amendment 03).
 *
 * The acceptance evidence for both rules is at run time: the poisoned-prototype sweep
 * (`sweep/run-poison-sweep.ts`, `poison-catalog.test.ts`) and the fault-injection sweep
 * (`sweep/fault-child.ts`, `fault-sweep.test.ts`). This module is kept as a cheap guard that flags
 * plausible accidental forms in a reviewed change before any test runs:
 *
 * - **Syntax.** Executable node kinds, operators and assignment targets outside an allowlist taken
 *   from the zone's own syntax: destructuring, the iteration protocol, `in`, `instanceof`, coercing
 *   equality, `++`/`--`, `await`/`yield`, labels, `super.x`, `arguments`.
 * - **Accesses.** Nodes that read, write or delete a member, classified by the checker (declared
 *   optional, undeclared, a `lib` member after load, computed, spread, coerced, a caller envelope),
 *   each matched against the reasoned inventory in `zone-inventory.ts` (DEC-8).
 * - **Effects.** Every call resolved to zone code or a classified primordial, and a fixpoint saying
 *   which pre-existing objects each function's own code may mutate, so a recovery control can be
 *   checked for mutation before its apply suffix (DEC-9).
 *
 * It trusts declared types except where the source makes an unchecked claim it recognises, and it
 * does not prove either rule for all code. Known gaps, stated in the contract: an assertion or
 * predicate that introduces a member absent from a partially declared type, or strengthens one inside
 * a nested type (review 11's `Pick` cast); a parameter default that supplies a Kernel object when no
 * argument is passed, and an identifier spelled `undefined` bound to a Kernel object (review 11's two
 * mutation forms); casts of `unknown`/`any` to primitives or lists; frozenness of what foreign code is
 * handed. Deliberately evasive programs are outside its acceptance (amendment 03 item 3).
 */

import { existsSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const REPOSITORY_ROOT = resolve(SOURCE_ROOT, "../../..");

export const zoneFiles = (): string[] =>
  readdirSync(SOURCE_ROOT)
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => resolve(SOURCE_ROOT, name));

/**
 * The repository's compiler options, so the checker sees exactly what `npm run typecheck` sees.
 *
 * Ablation runners copy `packages/kernel` into a temporary directory and link `node_modules` back to
 * the repository, without `tsconfig.json`; there the configuration is the one next to the linked
 * `node_modules`. A missing configuration is an error, never a silent default.
 */
export const repositoryConfigPath = (): string => {
  const local = resolve(REPOSITORY_ROOT, "tsconfig.json");
  if (existsSync(local)) return local;
  const linked = resolve(dirname(realpathSync(resolve(REPOSITORY_ROOT, "node_modules"))), "tsconfig.json");
  if (existsSync(linked)) return linked;
  throw new Error(`no tsconfig.json at ${local} or beside the installed node_modules`);
};

const repositoryOptions = (): ts.CompilerOptions => {
  const path = repositoryConfigPath();
  const read = ts.readConfigFile(path, ts.sys.readFile);
  if (read.error !== undefined) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(path));
  return { ...parsed.options, noEmit: true };
};

export interface Zone {
  readonly program: ts.Program;
  readonly checker: ts.TypeChecker;
  /** The analysed sources, as absolute paths. */
  readonly files: readonly string[];
}

let baseHost: ts.CompilerHost | undefined;
let baseOptions: ts.CompilerOptions | undefined;

/**
 * A checker program over `files`. `overrides` replaces or adds file text in memory, so tests analyse
 * mutated copies of a real source, or synthetic probes, without writing anything to disk.
 */
export function buildZone(files: readonly string[] = zoneFiles(), overrides: ReadonlyMap<string, string> = new Map(), old?: Zone): Zone {
  baseOptions ??= repositoryOptions();
  baseHost ??= ts.createCompilerHost(baseOptions, true);
  const host: ts.CompilerHost = baseHost;
  const withOverrides: ts.CompilerHost = {
    ...host,
    fileExists: (name) => overrides.has(name) || host.fileExists(name),
    readFile: (name) => overrides.get(name) ?? host.readFile(name),
    getSourceFile: (name, language, onError, create) => {
      const text = overrides.get(name);
      return text === undefined ? host.getSourceFile(name, language, onError, create) : ts.createSourceFile(name, text, language, true);
    },
  };
  const program = ts.createProgram([...files], baseOptions, withOverrides, old?.program);
  return { program, checker: program.getTypeChecker(), files };
}

/** The program's diagnostics for the analysed files: the analysis is only meaningful on code that typechecks. */
export function typeErrors(zone: Zone): string[] {
  const out: string[] = [];
  for (const source of zone.program.getSourceFiles()) {
    if (!zone.files.includes(source.fileName)) continue;
    for (const diagnostic of [...zone.program.getSyntacticDiagnostics(source), ...zone.program.getSemanticDiagnostics(source)]) {
      out.push(`${basename(source.fileName)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  }
  return out;
}

const sourcesOf = (zone: Zone): ts.SourceFile[] => zone.program.getSourceFiles().filter((source) => zone.files.includes(source.fileName));

const lineOf = (node: ts.Node): number => node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;
const spelling = (node: ts.Node): string => node.getText().replace(/\s+/g, " ");

// -- Shared syntax helpers ----------------------------------------------------

/** Wrappers that change only the static type, never the value. */
const isTypeOnlyWrapper = (node: ts.Node): node is ts.ParenthesizedExpression | ts.AsExpression | ts.NonNullExpression | ts.TypeAssertion | ts.SatisfiesExpression =>
  ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node);

export const strip = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  while (isTypeOnlyWrapper(current)) current = current.expression;
  return current;
};

/** The outermost type-only wrapper around `node`, which is where its value is used. */
const outermost = (node: ts.Node): ts.Node => {
  let current = node;
  while (current.parent !== undefined && isTypeOnlyWrapper(current.parent)) current = current.parent;
  return current;
};

export type Fn = ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration | ts.ArrowFunction | ts.FunctionExpression;

export const isFn = (node: ts.Node): node is Fn =>
  ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node);

const enclosingFn = (node: ts.Node): Fn | undefined => {
  for (let current = node.parent; current !== undefined; current = current.parent) if (isFn(current)) return current;
  return undefined;
};

/** Whether `node` runs after module load: inside a function, or in a class field initializer. */
const runsAfterLoad = (node: ts.Node): boolean => {
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (isFn(current) || ts.isPropertyDeclaration(current)) return true;
  }
  return false;
};

const isAssignmentOperator = (kind: ts.SyntaxKind): boolean => kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;

/** Type-level nodes: they never evaluate, so no rule applies inside them. */
const isTypeLevel = (node: ts.Node): boolean =>
  ts.isTypeNode(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isTypeParameterDeclaration(node);

/** The name of the function or method that owns `node`, for owner checks and messages. */
export const ownerName = (node: ts.Node): string => {
  for (let current: ts.Node | undefined = node; current !== undefined; current = current.parent) {
    if ((ts.isMethodDeclaration(current) || ts.isFunctionDeclaration(current)) && current.name !== undefined) return current.name.getText();
    if (ts.isConstructorDeclaration(current)) return "constructor";
    if (ts.isVariableDeclaration(current) && current.initializer !== undefined && isFn(current.initializer) && ts.isIdentifier(current.name)) return current.name.text;
  }
  return "<module>";
};

// -- DEC-8: permitted syntax ---------------------------------------------------

const K = ts.SyntaxKind;

/**
 * Every executable node kind the zone may contain. Anything else is a report. The list is the zone's
 * current syntax; adding a kind is a reviewed decision, because each one it leaves out is a way of
 * reaching a member that the access rules below do not model (destructuring, iteration, `in`, …).
 */
const PERMITTED_KINDS: ReadonlySet<ts.SyntaxKind> = new Set([
  K.SourceFile, K.EndOfFileToken,
  K.ImportDeclaration, K.ImportClause, K.NamedImports, K.ImportSpecifier, K.ExportDeclaration, K.NamedExports, K.ExportSpecifier,
  K.VariableStatement, K.VariableDeclarationList, K.VariableDeclaration, K.FunctionDeclaration, K.ClassDeclaration, K.HeritageClause,
  K.Constructor, K.MethodDeclaration, K.PropertyDeclaration, K.Parameter,
  K.Block, K.ExpressionStatement, K.IfStatement, K.ForStatement, K.WhileStatement, K.ReturnStatement, K.ThrowStatement,
  K.TryStatement, K.CatchClause, K.BreakStatement, K.ContinueStatement,
  K.Identifier, K.PrivateIdentifier, K.StringLiteral, K.NumericLiteral, K.NoSubstitutionTemplateLiteral,
  K.TemplateExpression, K.TemplateHead, K.TemplateMiddle, K.TemplateTail, K.TemplateSpan,
  K.TrueKeyword, K.FalseKeyword, K.NullKeyword, K.ThisKeyword, K.SuperKeyword,
  K.PropertyAccessExpression, K.ElementAccessExpression, K.CallExpression, K.NewExpression, K.BinaryExpression,
  K.PrefixUnaryExpression, K.ConditionalExpression, K.ParenthesizedExpression, K.AsExpression, K.NonNullExpression,
  K.TypeOfExpression, K.DeleteExpression,
  K.ObjectLiteralExpression, K.PropertyAssignment, K.ShorthandPropertyAssignment, K.SpreadAssignment, K.ArrayLiteralExpression,
  K.ArrowFunction, K.FunctionExpression,
  // Modifiers and punctuation that evaluate nothing themselves.
  K.ExportKeyword, K.ReadonlyKeyword, K.OverrideKeyword, K.QuestionToken, K.ColonToken, K.EqualsGreaterThanToken, K.QuestionDotToken,
]);

/** Binary operators the zone may use. `in`, `instanceof`, `==`, `!=` and the rest are reports. */
const PERMITTED_BINARY: ReadonlySet<ts.SyntaxKind> = new Set([
  K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken,
  K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken,
  K.PlusToken, K.MinusToken, K.AsteriskToken, K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken,
]);

const PERMITTED_PREFIX: ReadonlySet<ts.SyntaxKind> = new Set([K.ExclamationToken, K.MinusToken]);

/** Operators that convert an operand to a primitive, which reads `Symbol.toPrimitive`/`valueOf`/`toString`. */
const COERCING_BINARY: ReadonlySet<ts.SyntaxKind> = new Set([
  K.PlusToken, K.MinusToken, K.AsteriskToken, K.PlusEqualsToken, K.MinusEqualsToken,
  K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken,
]);

// -- DEC-8: access classification ----------------------------------------------

export type AccessKind =
  | "syntax" // a node kind, operator or target shape outside the permitted syntax
  | "optional" // a named member declared optional: its object may not own it
  | "unresolved" // a named member with no declaration: index signature or `any`
  | "builtin" // a member TypeScript's lib declares, reached after load: a built-in prototype supplies it
  | "global" // a lib-declared global binding read after load: ambient, replaceable state
  | "dynamic" // a computed key on something that is not a list
  | "index" // an index into an array or string: owned only when in bounds of a dense list
  | "spread" // object spread: reads the source's own enumerable members
  | "assertion" // a type assertion that introduces members or makes an optional member required
  | "predicate" // a type predicate that introduces members
  | "coercion" // an operand converted to a primitive although it may be an object
  | "envelope"; // a caller-owned envelope used other than through observation

export type AccessMode = "read" | "write" | "delete" | "call" | "strengthen" | "introduce" | "escape" | "form";

export interface Site {
  readonly file: string;
  readonly kind: AccessKind;
  readonly mode: AccessMode;
  readonly text: string;
  readonly line: number;
  readonly node: ts.Node;
}

export interface AccessOptions {
  /** The class whose public methods receive caller-owned envelopes. */
  readonly publicClass?: string;
  /** A parameter type that is trusted host authentication context rather than an envelope. */
  readonly hostCallerType?: string;
  /** Further parameters that receive caller-owned envelopes, as `functionName#index`. */
  readonly extraEnvelopeParameters?: readonly string[];
}

const PRIMITIVE_FLAGS =
  ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.EnumLike |
  ts.TypeFlags.ESSymbolLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Never;

const constituents = (type: ts.Type): readonly ts.Type[] => (type.isUnion() ? type.types : [type]);
const nonNullish = (type: ts.Type): readonly ts.Type[] =>
  constituents(type).filter((part) => (part.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) === 0);

export function analyseAccesses(zone: Zone, options: AccessOptions = {}): Site[] {
  const { checker, program } = zone;
  const publicClass = options.publicClass ?? "ExecutionCoordinator";
  const hostCallerType = options.hostCallerType ?? "AuthenticatedCaller";
  const sites: Site[] = [];
  const report = (kind: AccessKind, mode: AccessMode, node: ts.Node, text = spelling(node)): void => {
    sites.push({ file: basename(node.getSourceFile().fileName), kind, mode, text, line: lineOf(node), node });
  };

  const isLibDeclaration = (declaration: ts.Declaration): boolean => {
    const source = declaration.getSourceFile();
    return program.isSourceFileDefaultLibrary(source) || program.isSourceFileFromExternalLibrary(source) || /[\\/]node_modules[\\/]/.test(source.fileName);
  };
  const isPrimitive = (type: ts.Type): boolean =>
    constituents(type).every((part) => {
      if ((part.flags & PRIMITIVE_FLAGS) !== 0) return true;
      if ((part.flags & ts.TypeFlags.TypeParameter) !== 0) {
        const constraint = checker.getBaseConstraintOfType(part);
        return constraint !== undefined && constraint !== part && isPrimitive(constraint);
      }
      return false;
    });
  const isListOrString = (type: ts.Type): boolean => {
    const parts = nonNullish(type);
    return parts.length > 0 && parts.every((part) => checker.isArrayLikeType(part) || (part.flags & ts.TypeFlags.StringLike) !== 0);
  };
  /** No member information: members read from it exist only because an assertion says so. */
  const hasNoMembers = (type: ts.Type): boolean =>
    nonNullish(type).every(
      (part) =>
        (part.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive | ts.TypeFlags.TypeParameter)) !== 0 ||
        ((part.flags & ts.TypeFlags.Object) !== 0 && !checker.isArrayLikeType(part) && checker.getPropertiesOfType(part).length === 0),
    );
  const hasNamedMembers = (type: ts.Type): boolean =>
    nonNullish(type).some((part) => (part.flags & ts.TypeFlags.Object) !== 0 && !checker.isArrayLikeType(part) && checker.getPropertiesOfType(part).length > 0);
  /** Members required in `target` that `source` declares optional. */
  const strengthened = (source: ts.Type, target: ts.Type): string[] => {
    const out: string[] = [];
    for (const targetPart of nonNullish(target)) {
      for (const property of checker.getPropertiesOfType(targetPart)) {
        if ((property.flags & ts.SymbolFlags.Optional) !== 0) continue;
        for (const sourcePart of nonNullish(source)) {
          const sourceProperty = checker.getPropertyOfType(sourcePart, property.getName());
          if (sourceProperty !== undefined && (sourceProperty.flags & ts.SymbolFlags.Optional) !== 0) out.push(property.getName());
        }
      }
    }
    return out;
  };

  const modeOf = (access: ts.Node): AccessMode => {
    const used = outermost(access);
    const parent = used.parent;
    if (ts.isBinaryExpression(parent) && parent.left === used && isAssignmentOperator(parent.operatorToken.kind)) return "write";
    if (ts.isDeleteExpression(parent)) return "delete";
    if ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) && (parent.operator === K.PlusPlusToken || parent.operator === K.MinusMinusToken)) return "write";
    if (ts.isCallExpression(parent) && parent.expression === used) return "call";
    return "read";
  };

  /** Classifies a resolved named member; `null` means its object owns it by the zone's rules. */
  const classifyMember = (symbol: ts.Symbol | undefined, access: ts.Node, receiver: ts.Type): AccessKind | null => {
    if (symbol === undefined) return "unresolved";
    if ((symbol.flags & ts.SymbolFlags.Optional) !== 0) return "optional";
    const declarations = symbol.declarations ?? [];
    if (declarations.length > 0 && declarations.every(isLibDeclaration) && runsAfterLoad(access)) {
      // `length` is an own property of every array and string.
      if (symbol.getName() === "length" && isListOrString(receiver)) return null;
      return "builtin";
    }
    return null;
  };

  // Caller envelopes: the declared types of the public class's parameters, and their member types.
  const envelopeTypes = new Set<ts.Symbol>();
  const publicSeeds: { fn: Fn; index: number }[] = [];
  const addEnvelopeType = (type: ts.Type, depth: number): void => {
    if (depth > 8) return;
    for (const part of nonNullish(type)) {
      if (checker.isArrayLikeType(part)) {
        for (const argument of checker.getTypeArguments(part as ts.TypeReference)) addEnvelopeType(argument, depth + 1);
        continue;
      }
      if ((part.flags & ts.TypeFlags.Object) === 0) continue;
      const symbol = part.aliasSymbol ?? part.getSymbol();
      if (symbol === undefined || (symbol.declarations ?? []).every(isLibDeclaration) || envelopeTypes.has(symbol)) continue;
      envelopeTypes.add(symbol);
      for (const property of checker.getPropertiesOfType(part)) addEnvelopeType(checker.getTypeOfSymbol(property), depth + 1);
    }
  };
  for (const source of sourcesOf(zone)) {
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name?.text === publicClass) {
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member) || member.body === undefined || ts.isPrivateIdentifier(member.name)) continue;
          if ((ts.getCombinedModifierFlags(member) & (ts.ModifierFlags.Private | ts.ModifierFlags.Static)) !== 0) continue;
          member.parameters.forEach((parameter, index) => {
            const type = checker.getTypeAtLocation(parameter);
            if ((type.aliasSymbol ?? type.getSymbol())?.getName() === hostCallerType) return;
            publicSeeds.push({ fn: member, index });
            addEnvelopeType(type, 0);
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  const extraSeeds = new Set(options.extraEnvelopeParameters ?? []);
  if (extraSeeds.size > 0) {
    for (const source of sourcesOf(zone)) {
      const visit = (node: ts.Node): void => {
        if (isFn(node)) {
          const name = fnName(node);
          node.parameters.forEach((_parameter, index) => {
            if (name !== undefined && extraSeeds.has(`${name}#${index}`)) publicSeeds.push({ fn: node, index });
          });
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  const isEnvelopeTyped = (type: ts.Type): boolean =>
    nonNullish(type).some((part) => {
      const symbol = part.aliasSymbol ?? part.getSymbol();
      return symbol !== undefined && envelopeTypes.has(symbol);
    });

  for (const source of sourcesOf(zone)) {
    const visit = (node: ts.Node): void => {
      if (isTypeLevel(node)) return;
      // Operator tokens are checked on their expression; other tokens are ordinary nodes here.
      if (node.parent !== undefined && ts.isBinaryExpression(node.parent) && node.parent.operatorToken === node) return;

      if (!PERMITTED_KINDS.has(node.kind)) report("syntax", "form", node, `${K[node.kind]}: ${spelling(node).slice(0, 80)}`);
      if (ts.isBinaryExpression(node)) {
        if (!PERMITTED_BINARY.has(node.operatorToken.kind)) report("syntax", "form", node, `operator ${K[node.operatorToken.kind]}: ${spelling(node).slice(0, 80)}`);
        if (isAssignmentOperator(node.operatorToken.kind)) {
          const target = strip(node.left);
          if (!ts.isIdentifier(target) && !ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target)) {
            report("syntax", "form", node, `assignment target ${K[target.kind]}: ${spelling(node).slice(0, 80)}`);
          }
        }
        if (COERCING_BINARY.has(node.operatorToken.kind)) {
          for (const operand of [node.left, node.right]) {
            if (!isPrimitive(checker.getTypeAtLocation(operand))) report("coercion", "read", operand);
          }
        }
      }
      if (ts.isPrefixUnaryExpression(node)) {
        if (!PERMITTED_PREFIX.has(node.operator)) report("syntax", "form", node, `operator ${K[node.operator]}: ${spelling(node)}`);
        if (node.operator === K.MinusToken && !isPrimitive(checker.getTypeAtLocation(node.operand))) report("coercion", "read", node.operand);
      }
      if (ts.isTemplateSpan(node) && !isPrimitive(checker.getTypeAtLocation(node.expression))) report("coercion", "read", node.expression);
      if (node.kind === K.SuperKeyword && !(ts.isCallExpression(node.parent) && node.parent.expression === node)) {
        report("syntax", "form", node.parent, `super member access: ${spelling(node.parent)}`);
      }
      if (ts.isDeleteExpression(node)) {
        const target = strip(node.expression);
        if (!ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target)) report("syntax", "form", node, `delete of ${K[target.kind]}`);
      }
      if (isFn(node) && node.asteriskToken !== undefined) report("syntax", "form", node, `generator: ${spelling(node).slice(0, 60)}`);
      if (ts.isIdentifier(node) && node.text === "arguments") report("syntax", "form", node, "arguments object");

      if (ts.isPropertyAccessExpression(node) && !ts.isPrivateIdentifier(node.name)) {
        const receiver = checker.getTypeAtLocation(node.expression);
        const kind = classifyMember(checker.getSymbolAtLocation(node.name), node, receiver);
        if (kind !== null) report(kind, modeOf(node), node);
        if (isEnvelopeTyped(receiver)) report("envelope", modeOf(node), node);
      }
      if (ts.isElementAccessExpression(node)) {
        const key = node.argumentExpression;
        const receiver = checker.getTypeAtLocation(node.expression);
        if (ts.isStringLiteralLike(key) || ts.isNumericLiteral(key)) {
          const tuple = nonNullish(receiver).every((part) => checker.isTupleType(part));
          if (tuple && ts.isNumericLiteral(key)) {
            const kind = classifyMember(checker.getPropertyOfType(receiver, key.text), node, receiver);
            if (kind !== null) report(kind, modeOf(node), node);
          } else if (isListOrString(receiver)) {
            report("index", modeOf(node), node);
          } else {
            const kind = classifyMember(checker.getSymbolAtLocation(key) ?? checker.getPropertyOfType(receiver, key.text), node, receiver);
            if (kind !== null) report(kind, modeOf(node), node);
          }
        } else {
          report(isListOrString(receiver) ? "index" : "dynamic", modeOf(node), node);
          if (!isPrimitive(checker.getTypeAtLocation(key))) report("coercion", "read", key);
        }
        if (isEnvelopeTyped(receiver)) report("envelope", modeOf(node), node);
      }
      if (ts.isSpreadAssignment(node)) {
        report("spread", "read", node);
        if (isEnvelopeTyped(checker.getTypeAtLocation(node.expression))) report("envelope", "read", node);
      }
      if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && !(ts.isTypeReferenceNode(node.type) && node.type.typeName.getText() === "const")) {
        const sourceType = checker.getTypeAtLocation(node.expression);
        const targetType = checker.getTypeFromTypeNode(node.type);
        if (strengthened(sourceType, targetType).length > 0) report("assertion", "strengthen", node);
        else if (hasNoMembers(sourceType) && hasNamedMembers(targetType)) report("assertion", "introduce", node);
      }
      if (isFn(node) && node.type !== undefined && ts.isTypePredicateNode(node.type) && node.type.type !== undefined) {
        const target = checker.getTypeFromTypeNode(node.type.type);
        const predicate = node.type;
        const parameter = node.parameters.find((candidate) => candidate.name.getText() === predicate.parameterName.getText());
        const sourceType = parameter === undefined ? undefined : checker.getTypeAtLocation(parameter);
        if (sourceType === undefined || (hasNoMembers(sourceType) && hasNamedMembers(target)) || strengthened(sourceType, target).length > 0) {
          report("predicate", "introduce", predicate);
        }
      }
      if (ts.isIdentifier(node) && runsAfterLoad(node) && isValueReference(node)) {
        // An import is an immutable module binding, not ambient state; what calling it does is the
        // effect analysis's question (the serializer dependency is an inventoried foreign call).
        const symbol = ts.isShorthandPropertyAssignment(node.parent) ? checker.getShorthandAssignmentValueSymbol(node.parent) : checker.getSymbolAtLocation(node);
        const declarations = symbol === undefined || (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? [] : (symbol.declarations ?? []);
        // `NaN` and `Infinity` are non-writable, non-configurable properties of the global object.
        if (declarations.length > 0 && declarations.every(isLibDeclaration) && node.text !== "NaN" && node.text !== "Infinity") report("global", "read", node);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  // Caller envelopes: a public parameter may be compared, tested, or handed to a call; nothing else.
  const seen = new Set<string>();
  const queue = [...publicSeeds];
  const functionOf = (fn: Fn, index: number): string => `${fn.getSourceFile().fileName}:${fn.getStart()}:${index}`;
  while (queue.length > 0) {
    const { fn, index } = queue.shift()!;
    const key = functionOf(fn, index);
    if (seen.has(key)) continue;
    seen.add(key);
    const parameter = fn.parameters[index];
    if (parameter === undefined || !ts.isIdentifier(parameter.name)) continue;
    const symbol = checker.getSymbolAtLocation(parameter.name);
    if (symbol === undefined || fn.body === undefined) continue;
    const references: ts.Identifier[] = [];
    const collect = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node) === symbol) references.push(node);
      ts.forEachChild(node, collect);
    };
    collect(fn.body);
    for (const reference of references) {
      const used = outermost(reference);
      const parent = used.parent;
      if (ts.isBinaryExpression(parent) && (parent.operatorToken.kind === K.EqualsEqualsEqualsToken || parent.operatorToken.kind === K.ExclamationEqualsEqualsToken)) continue;
      if (ts.isTypeOfExpression(parent)) continue;
      if (ts.isPrefixUnaryExpression(parent) && parent.operator === K.ExclamationToken) continue;
      const passed = passedTo(checker, used);
      if (passed !== undefined) {
        if (passed.kind === "zone") queue.push({ fn: passed.fn, index: passed.index });
        else if (passed.kind === "primordial" && ENVELOPE_SAFE_PRIMORDIALS.has(`${passed.name}#${passed.position}`)) continue;
        else report("envelope", "escape", used, `${spelling(used.parent).slice(0, 80)}`);
        continue;
      }
      if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === used) {
        report("envelope", modeOf(parent), parent);
        continue;
      }
      report("envelope", "escape", used, spelling(parent).slice(0, 80));
    }
  }
  return sites;
}

/** Whether an identifier is read as a value here, rather than naming a member, a declaration or an import. */
const isValueReference = (node: ts.Identifier): boolean => {
  const parent = node.parent;
  if ((ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)) && parent.name === node) return false;
  if ((ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isFunctionDeclaration(parent) || ts.isClassDeclaration(parent) || ts.isFunctionExpression(parent)) && parent.name === node) return false;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent)) return false;
  if (ts.isBreakOrContinueStatement(parent) || ts.isLabeledStatement(parent)) return false;
  return true;
};

/**
 * Primordials that may receive a caller-owned value at the given position without reading a member of
 * it or converting it: own-state reports, identity comparison and keyed lookups by SameValueZero.
 * `#this` is a `Reflect.apply` receiver.
 */
const ENVELOPE_SAFE_PRIMORDIALS: ReadonlySet<string> = new Set([
  "Object.getOwnPropertyDescriptor#0",
  "Object.getPrototypeOf#0",
  "Array.isArray#0",
  "Object.is#0",
  "Object.is#1",
  "Map.prototype.get#0",
  "Set.prototype.has#0",
  "Number.isInteger#0",
  "Number.isSafeInteger#0",
  "Number.isFinite#0",
  "Object.keys#0",
  "Object.getOwnPropertyNames#0",
  "Object.getOwnPropertySymbols#0",
  "Reflect.ownKeys#0",
  "Object.prototype.hasOwnProperty#this",
]);

// -- Callee resolution (shared by the envelope rule and the effect analysis) ------

export type Callee =
  | { readonly kind: "zone"; readonly fn: Fn; readonly receiver: ts.Expression | undefined; readonly args: readonly ts.Expression[] }
  | { readonly kind: "primordial"; readonly name: string; readonly receiver: ts.Expression | undefined; readonly args: readonly ts.Expression[] }
  | { readonly kind: "parameter"; readonly index: number; readonly args: readonly ts.Expression[] }
  | { readonly kind: "unknown"; readonly args: readonly ts.Expression[] };

/** The declaration a value expression names, following import aliases and `const` bindings to functions. */
const valueDeclaration = (checker: ts.TypeChecker, expression: ts.Expression): ts.Declaration | undefined => {
  const target = strip(expression);
  let symbol = ts.isPropertyAccessExpression(target) ? checker.getSymbolAtLocation(target.name) : checker.getSymbolAtLocation(target);
  if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = checker.getAliasedSymbol(symbol);
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
};

/** The load-time global expression a module-level `const Primordial… = <expr>` captured, normalized. */
const primordialName = (declaration: ts.Declaration | undefined): string | undefined => {
  if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined) return undefined;
  if (!ts.isSourceFile(declaration.parent.parent.parent)) return undefined;
  if ((declaration.parent.flags & ts.NodeFlags.Const) === 0) return undefined;
  const text = strip(declaration.initializer).getText().replace(/\s+/g, "");
  return /^[A-Za-z]+(\.[A-Za-z]+)*(\[Symbol\.[A-Za-z]+\])?$/.test(text) ? text : undefined;
};

export function resolveCallee(checker: ts.TypeChecker, call: ts.CallExpression | ts.NewExpression): Callee {
  const args = [...(call.arguments ?? [])];
  const callee = strip(call.expression);
  // An immediately invoked function expression is zone code in place.
  if (isFn(callee)) return { kind: "zone", fn: callee, receiver: undefined, args };
  const declaration = valueDeclaration(checker, callee);
  const primordial = primordialName(declaration);
  if (primordial === "Reflect.apply" && ts.isCallExpression(call)) {
    const [fn, receiver, list] = args;
    const applied = list !== undefined && ts.isArrayLiteralExpression(strip(list)) ? [...(strip(list) as ts.ArrayLiteralExpression).elements] : undefined;
    if (fn === undefined || applied === undefined) return { kind: "unknown", args };
    const target = valueDeclaration(checker, fn);
    const name = primordialName(target);
    if (name !== undefined) return { kind: "primordial", name, receiver, args: applied };
    if (target !== undefined && isFn(target)) return { kind: "zone", fn: target, receiver, args: applied };
    if (target !== undefined && ts.isVariableDeclaration(target) && target.initializer !== undefined && isFn(target.initializer)) {
      return { kind: "zone", fn: target.initializer, receiver, args: applied };
    }
    return { kind: "unknown", args: applied };
  }
  if (primordial !== undefined) return { kind: "primordial", name: primordial, receiver: undefined, args };
  if (declaration !== undefined && isFn(declaration) && declaration.body !== undefined) {
    const receiver = ts.isPropertyAccessExpression(callee) ? callee.expression : undefined;
    return { kind: "zone", fn: declaration, receiver, args };
  }
  if (declaration !== undefined && ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined && isFn(strip(declaration.initializer))) {
    return { kind: "zone", fn: strip(declaration.initializer) as Fn, receiver: undefined, args };
  }
  if (declaration !== undefined && ts.isClassDeclaration(declaration) && ts.isNewExpression(call)) {
    const constructor = declaration.members.find(ts.isConstructorDeclaration);
    if (constructor !== undefined) return { kind: "zone", fn: constructor, receiver: undefined, args };
  }
  if (declaration !== undefined && ts.isParameter(declaration) && isFn(declaration.parent) && ts.isIdentifier(callee)) {
    return { kind: "parameter", index: declaration.parent.parameters.indexOf(declaration), args };
  }
  return { kind: "unknown", args };
}

/** Where `used` is passed as an argument, if anywhere: the callee and its parameter position. */
const passedTo = (
  checker: ts.TypeChecker,
  used: ts.Node,
): { kind: "zone"; fn: Fn; index: number } | { kind: "primordial"; name: string; position: string } | { kind: "other" } | undefined => {
  let holder = used.parent;
  let viaList = false;
  if (ts.isArrayLiteralExpression(holder)) {
    viaList = true;
    holder = outermost(holder).parent;
  }
  if (!ts.isCallExpression(holder) && !ts.isNewExpression(holder)) return undefined;
  const argument = viaList ? outermost(used.parent) : used;
  const position = (holder.arguments ?? ts.factory.createNodeArray()).indexOf(argument as ts.Expression);
  if (position < 0) return undefined;
  const callee = resolveCallee(checker, holder);
  if (callee.kind === "primordial" || callee.kind === "zone") {
    const direct = callee.args.indexOf(used as ts.Expression);
    const isReceiver = callee.receiver !== undefined && outermost(callee.receiver) === used;
    if (callee.kind === "zone") return direct >= 0 ? { kind: "zone", fn: callee.fn, index: direct } : { kind: "other" };
    return { kind: "primordial", name: callee.name, position: isReceiver ? "this" : `${direct}` };
  }
  return { kind: "other" };
};

// -- DEC-9: effects ---------------------------------------------------------------

/**
 * Where an object may come from, relative to the function evaluating an expression. `exact` names a
 * parameter's own object; `parameters` anything reachable from one. A function's receiver, captured
 * bindings and anything of unknown origin are always taken with everything reachable from them. An
 * empty provenance is a primitive or no object at all.
 */
export interface Provenance {
  readonly fresh: boolean; // created during this call
  readonly exact: ReadonlySet<number>;
  readonly parameters: ReadonlySet<number>;
  readonly self: boolean; // the receiver of a method: for the coordinator, its accepted state
  readonly captured: ReadonlySet<ts.Symbol>; // bindings of an enclosing function
  readonly other: boolean; // module or global state, or a value of unknown origin
}

const NONE: Provenance = { fresh: false, exact: new Set(), parameters: new Set(), self: false, captured: new Set(), other: false };
const FRESH: Provenance = { ...NONE, fresh: true };
const OTHER: Provenance = { ...NONE, other: true };
const SELF: Provenance = { ...NONE, self: true };

const join = (...parts: readonly Provenance[]): Provenance => ({
  fresh: parts.some((part) => part.fresh),
  exact: new Set(parts.flatMap((part) => [...part.exact])),
  parameters: new Set(parts.flatMap((part) => [...part.parameters])),
  self: parts.some((part) => part.self),
  captured: new Set(parts.flatMap((part) => [...part.captured])),
  other: parts.some((part) => part.other),
});
const withoutFresh = (value: Provenance): Provenance => ({ ...value, fresh: false });

/** Whether a provenance can reach an object that existed before the call. */
export const isPreExisting = (value: Provenance): boolean =>
  value.exact.size > 0 || value.parameters.size > 0 || value.self || value.captured.size > 0 || value.other;

/** Whether a provenance can reach the coordinator's accepted state, or an object of unknown origin. */
export const reachesAcceptedState = (value: Provenance): boolean => value.self || value.captured.size > 0 || value.other;

export interface Effects {
  /** Objects this function's own code (and its zone callees) may mutate. */
  mutated: Provenance;
  /** What its return value may reach. */
  returned: Provenance;
  /** Every value it returns is an object it created (or a primitive). */
  returnsFresh: boolean;
  /** May run code outside the zone: a host or Driver callback, a caller accessor or trap, the serializer dependency. */
  foreign: boolean;
  /** Invokes the function passed as these parameters. */
  readonly callsParameters: Set<number>;
}

/**
 * The classified primordials the zone calls. `mutates` names the argument (or `this`, a
 * `Reflect.apply` receiver) whose object the call changes; it changes that object only. `returns`
 * says what the result is: `none` a primitive, `fresh` a new object holding nothing older, `argument`
 * argument 0 itself, `descriptor` a new object holding argument 0's member values, `element` a value
 * stored in the receiver, `receiver` the receiver itself, `other` a shared object. A primordial
 * missing from this table is a report, not an assumption.
 */
type PrimordialReturn = "none" | "fresh" | "argument" | "descriptor" | "element" | "receiver" | "other";
export const PRIMORDIAL_EFFECTS: ReadonlyMap<string, { readonly mutates?: 0 | "this"; readonly returns: PrimordialReturn; readonly callsArgument?: number; readonly foreign?: boolean }> =
  new Map<string, { readonly mutates?: 0 | "this"; readonly returns: PrimordialReturn; readonly callsArgument?: number; readonly foreign?: boolean }>([
    ["Object.freeze", { mutates: 0, returns: "argument" }],
    ["Object.defineProperty", { mutates: 0, returns: "argument" }],
    ["Object.setPrototypeOf", { mutates: 0, returns: "argument" }],
    ["Object.create", { returns: "fresh" }],
    ["Object.getOwnPropertyDescriptor", { returns: "descriptor" }],
    ["Object.getPrototypeOf", { returns: "other" }],
    ["Object.keys", { returns: "fresh" }],
    ["Object.getOwnPropertyNames", { returns: "fresh" }],
    ["Object.getOwnPropertySymbols", { returns: "fresh" }],
    ["Reflect.ownKeys", { returns: "fresh" }],
    ["Object.prototype.hasOwnProperty", { returns: "none" }],
    ["Object.is", { returns: "none" }],
    ["Array.isArray", { returns: "none" }],
    ["Number.isInteger", { returns: "none" }],
    ["Number.isSafeInteger", { returns: "none" }],
    ["Number.isFinite", { returns: "none" }],
    ["isNaN", { returns: "none" }],
    ["isFinite", { returns: "none" }],
    ["Buffer.byteLength", { returns: "none" }],
    ["String.prototype.charCodeAt", { returns: "none" }],
    ["String.prototype.slice", { returns: "none" }],
    ["Map.prototype.get", { returns: "element" }],
    ["Map.prototype.set", { mutates: "this", returns: "receiver" }],
    ["Map.prototype.forEach", { returns: "none", callsArgument: 0 }],
    ["Set.prototype.has", { returns: "none" }],
    ["Set.prototype.add", { mutates: "this", returns: "receiver" }],
    ["Set.prototype.delete", { mutates: "this", returns: "none" }],
    ["Map", { returns: "fresh" }],
    ["Set", { returns: "fresh" }],
    ["Array", { returns: "fresh" }],
    ["Error", { returns: "fresh" }],
    ["TypeError", { returns: "fresh" }],
    ["RangeError", { returns: "fresh" }],
  ]);

export interface EffectOptions {
  /** Calls to non-zone code, each classified as foreign by `foreignCallKey`. */
  readonly foreignCalls: ReadonlySet<string>;
  /** Functions whose summary is declared rather than derived, by declared name. */
  readonly overrides?: ReadonlyMap<string, { readonly foreign: boolean; readonly mutates: boolean; readonly callsParameters: readonly number[] }>;
  /** Dynamic reads that may run caller code (accessors, Proxy traps), by `file spelling`. */
  readonly getterReads?: ReadonlySet<string>;
  /** Analyse functions in reverse source order: the result must not depend on it. */
  readonly reverse?: boolean;
}

export interface EffectAnalysis {
  readonly effects: ReadonlyMap<Fn, Effects>;
  /** Calls the analysis could not classify: each one is a report. */
  readonly unclassified: readonly string[];
  /** What one node itself mutates, and whether it runs foreign code, evaluated in `fn`. */
  nodeEffects(node: ts.Node, fn: Fn): { readonly mutated: Provenance; readonly foreign: boolean };
  resolve(call: ts.CallExpression | ts.NewExpression): Callee;
}

/** The name a function is declared under, if any: a declaration, a method, or a `const` holding it. */
export const fnName = (fn: Fn): string | undefined => {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) && fn.name !== undefined) return fn.name.getText();
  if (ts.isConstructorDeclaration(fn)) return "constructor";
  const parent = outermost(fn).parent;
  return ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) ? parent.name.text : undefined;
};

/**
 * How a call outside the zone is named in the foreign-call inventory: its owner and its whole
 * spelling, so what is handed to foreign code cannot change without changing the inventory.
 */
export const foreignCallKey = (call: ts.CallExpression | ts.NewExpression): string => `${ownerName(call)} ${spelling(call)}`;

/** Visits the executable nodes of `fn`'s own body, not those of nested functions. */
export const ownNodes = (fn: Fn, visit: (node: ts.Node) => void): void => {
  const walk = (node: ts.Node): void => {
    if (isTypeLevel(node)) return;
    visit(node);
    if (isFn(node)) return;
    ts.forEachChild(node, walk);
  };
  for (const parameter of fn.parameters) if (parameter.initializer !== undefined) walk(parameter.initializer);
  if (fn.body !== undefined) {
    if (ts.isBlock(fn.body)) ts.forEachChild(fn.body, walk);
    else walk(fn.body);
  }
};

/**
 * Operators whose value is one of their operands: `&&`, `||`, `??` and their assignment forms (which
 * assign the right operand only sometimes, so the binding keeps either). Every other binary operator
 * yields a primitive.
 */
const CHOOSING: ReadonlySet<ts.SyntaxKind> = new Set([
  K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken,
  K.AmpersandAmpersandEqualsToken, K.BarBarEqualsToken, K.QuestionQuestionEqualsToken,
]);

const allNodes = (root: ts.Node, visit: (node: ts.Node) => void): void => {
  const walk = (node: ts.Node): void => {
    if (isTypeLevel(node)) return;
    visit(node);
    ts.forEachChild(node, walk);
  };
  ts.forEachChild(root, walk);
};

export function analyseEffects(zone: Zone, options: EffectOptions): EffectAnalysis {
  const { checker } = zone;
  const functions: Fn[] = [];
  for (const source of sourcesOf(zone)) {
    const visit = (node: ts.Node): void => {
      if (isFn(node) && node.body !== undefined) functions.push(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  if (options.reverse === true) functions.reverse();
  const effects = new Map<Fn, Effects>(functions.map((fn) => [fn, { mutated: NONE, returned: NONE, returnsFresh: true, foreign: false, callsParameters: new Set<number>() }]));
  const unclassified = new Set<string>();
  const callees = new Map<ts.Node, Callee>();
  const resolve = (call: ts.CallExpression | ts.NewExpression): Callee => {
    let found = callees.get(call);
    if (found === undefined) {
      found = resolveCallee(checker, call);
      callees.set(call, found);
    }
    return found;
  };
  const declaringScope = (declaration: ts.Node): Fn | ts.SourceFile => {
    for (let current = declaration.parent; current !== undefined; current = current.parent) {
      if (isFn(current) || ts.isSourceFile(current)) return current;
    }
    return declaration.getSourceFile();
  };
  // Binding provenance is recomputed each fixpoint round. Bindings can depend on each other in a
  // cycle (a record, the exchange read from it, and a call that stores one into the other). A
  // re-entered binding contributes nothing to the inner computation, which is therefore incomplete:
  // only a result whose cycles all close at itself is cached, and the rest are recomputed when asked
  // for directly. (Caching the incomplete inner results made a mutation's target look fresh.)
  let cache = new Map<string, Provenance>();
  const stack: string[] = [];
  let lowestCut = Number.POSITIVE_INFINITY;
  const memo = (key: string, compute: () => Provenance): Provenance => {
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const open = stack.indexOf(key);
    if (open >= 0) {
      lowestCut = Math.min(lowestCut, open);
      return NONE;
    }
    const depth = stack.length;
    stack.push(key);
    const result = compute();
    stack.pop();
    if (lowestCut >= depth) {
      cache.set(key, result);
      if (lowestCut === depth) lowestCut = Number.POSITIVE_INFINITY;
    }
    return result;
  };

  const symbolCache = new Map<ts.Node, ts.Symbol | undefined>();
  const symbolAt = (node: ts.Node): ts.Symbol | undefined => {
    if (!symbolCache.has(node)) symbolCache.set(node, checker.getSymbolAtLocation(node));
    return symbolCache.get(node);
  };

  const rootIdentifierOf = (expression: ts.Expression): ts.Identifier | undefined => {
    let current = strip(expression);
    while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) current = strip(current.expression);
    return ts.isIdentifier(current) ? current : undefined;
  };

  /** The parameter, captured, module or local nature of a binding, with its declaration. */
  const bindingOf = (symbol: ts.Symbol, fn: Fn): { kind: "parameter"; index: number } | { kind: "captured" } | { kind: "other" } | { kind: "local"; declaration: ts.VariableDeclaration } => {
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (declaration === undefined) return { kind: "other" };
    if (ts.isParameter(declaration)) {
      if (declaration.parent === fn) return { kind: "parameter", index: fn.parameters.indexOf(declaration) };
      return isFn(declaration.parent) ? { kind: "captured" } : { kind: "other" };
    }
    if (!ts.isVariableDeclaration(declaration)) return { kind: "other" };
    const scope = declaringScope(declaration);
    if (ts.isSourceFile(scope)) return { kind: "other" };
    return scope === fn ? { kind: "local", declaration } : { kind: "captured" };
  };

  /**
   * One scan of a function's body (closures included) per fixpoint round: the values assigned to
   * each binding, and for each binding whose object is written or handed to a mutating call, what
   * that write or call could store into it.
   */
  interface BodyIndex {
    readonly assigned: Map<ts.Symbol, ts.Expression[]>;
    readonly stores: Map<ts.Symbol, { readonly values: readonly ts.Expression[]; readonly other: boolean }[]>;
  }
  let bodyIndexes = new Map<Fn, BodyIndex>();
  const bodyIndex = (fn: Fn): BodyIndex => {
    const cached = bodyIndexes.get(fn);
    if (cached !== undefined) return cached;
    const index: BodyIndex = { assigned: new Map(), stores: new Map() };
    const store = (symbol: ts.Symbol, values: readonly ts.Expression[], other: boolean): void => {
      const list = index.stores.get(symbol) ?? [];
      list.push({ values, other });
      index.stores.set(symbol, list);
    };
    if (fn.body !== undefined) {
      allNodes(fn.body, (node) => {
        if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
          const target = strip(node.left);
          if (ts.isIdentifier(target)) {
            const symbol = symbolAt(target);
            if (symbol !== undefined) {
              const list = index.assigned.get(symbol) ?? [];
              list.push(node.operatorToken.kind === K.EqualsToken ? node.right : node);
              index.assigned.set(symbol, list);
            }
          } else {
            const base = rootIdentifierOf(node.left);
            const symbol = base === undefined ? undefined : symbolAt(base);
            if (symbol !== undefined) store(symbol, [node.right], false);
          }
        }
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
          const callee = resolve(node);
          const other = callee.kind === "unknown" || (callee.kind === "zone" && effects.get(callee.fn)?.mutated.other === true);
          // Foreign or unclassified code may store anything into every object it is handed. That is
          // not a Kernel mutation (the ordering rule does not count it), but what those objects reach.
          const handed = callee.kind === "unknown" ? [...callee.args, ...(ts.isCallExpression(node) && ts.isPropertyAccessExpression(strip(node.expression)) ? [(strip(node.expression) as ts.PropertyAccessExpression).expression] : [])] : mutatedArgumentsOf(node);
          for (const argument of handed) {
            const base = rootIdentifierOf(argument);
            const symbol = base === undefined ? undefined : symbolAt(base);
            if (symbol !== undefined) store(symbol, callee.args, other);
          }
        }
      });
    }
    bodyIndexes.set(fn, index);
    return index;
  };

  /** Values assigned to the binding itself, in `fn` or a closure inside it. */
  const assignedValues = (symbol: ts.Symbol, fn: Fn): readonly ts.Expression[] => bodyIndex(fn).assigned.get(symbol) ?? [];

  const bindingIdentity = (symbol: ts.Symbol, fn: Fn): Provenance => {
    const binding = bindingOf(symbol, fn);
    if (binding.kind === "parameter") return { ...NONE, exact: new Set([binding.index]) };
    if (binding.kind === "captured") return { ...NONE, captured: new Set([symbol]) };
    if (binding.kind === "other") return OTHER;
    const { declaration } = binding;
    return memo(`identity:${declaration.getSourceFile().fileName}:${declaration.pos}`, () =>
      join(declaration.initializer === undefined ? NONE : identity(declaration.initializer, fn), ...assignedValues(symbol, fn).map((value) => identity(value, fn))),
    );
  };

  const bindingReach = (symbol: ts.Symbol, fn: Fn): Provenance => {
    const binding = bindingOf(symbol, fn);
    if (binding.kind === "parameter") return { ...NONE, parameters: new Set([binding.index]) };
    if (binding.kind === "captured") return { ...NONE, captured: new Set([symbol]) };
    if (binding.kind === "other") return OTHER;
    const { declaration } = binding;
    return memo(`reach:${declaration.getSourceFile().fileName}:${declaration.pos}`, () => {
      const parts: Provenance[] = [declaration.initializer === undefined ? NONE : reach(declaration.initializer, fn), ...assignedValues(symbol, fn).map((value) => reach(value, fn))];
      // Whatever this function (or a closure in it) stores into the object joins what it reaches.
      for (const stored of bodyIndex(fn).stores.get(symbol) ?? []) {
        for (const value of stored.values) parts.push(reach(value, fn));
        if (stored.other) parts.push(OTHER);
      }
      return join(...parts);
    });
  };

  const symbolOf = (identifier: ts.Identifier): ts.Symbol | undefined =>
    ts.isShorthandPropertyAssignment(identifier.parent) ? checker.getShorthandAssignmentValueSymbol(identifier.parent) : symbolAt(identifier);

  /** What the object an expression evaluates to may itself be. */
  const identity = (expression: ts.Expression, fn: Fn): Provenance => {
    // Provenance follows values, never static types: a Kernel object widened to `unknown` and cast to
    // `string` is still that object, so no type is trusted to say a value holds none.
    const target = strip(expression);
    if (ts.isIdentifier(target)) {
      if (target.text === "undefined") return NONE;
      const symbol = symbolOf(target);
      return symbol === undefined ? OTHER : bindingIdentity(symbol, fn);
    }
    if (target.kind === K.ThisKeyword) return SELF;
    if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) return reach(target.expression, fn);
    if (ts.isObjectLiteralExpression(target) || ts.isArrayLiteralExpression(target) || isFn(target)) return FRESH;
    if (ts.isConditionalExpression(target)) return join(identity(target.whenTrue, fn), identity(target.whenFalse, fn));
    if (ts.isBinaryExpression(target)) {
      const operator = target.operatorToken.kind;
      if (CHOOSING.has(operator)) return join(identity(target.left, fn), identity(target.right, fn));
      if (operator === K.EqualsToken) return identity(target.right, fn);
      return NONE;
    }
    if (ts.isCallExpression(target) || ts.isNewExpression(target)) return callResult(target, fn, "identity");
    return literalOrOther(target);
  };

  /** Every object reachable from the value an expression evaluates to. */
  const reach = (expression: ts.Expression, fn: Fn): Provenance => {
    const target = strip(expression);
    if (ts.isIdentifier(target)) {
      if (target.text === "undefined") return NONE;
      const symbol = symbolOf(target);
      return symbol === undefined ? OTHER : bindingReach(symbol, fn);
    }
    if (target.kind === K.ThisKeyword) return SELF;
    if (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) return reach(target.expression, fn);
    if (ts.isObjectLiteralExpression(target)) {
      const parts: Provenance[] = [FRESH];
      for (const property of target.properties) {
        if (ts.isPropertyAssignment(property)) parts.push(reach(property.initializer, fn));
        else if (ts.isShorthandPropertyAssignment(property)) parts.push(reach(property.name, fn));
        else if (ts.isSpreadAssignment(property)) parts.push(reach(property.expression, fn));
      }
      return join(...parts);
    }
    if (ts.isArrayLiteralExpression(target)) return join(FRESH, ...target.elements.map((element) => reach(element, fn)));
    if (isFn(target)) return FRESH;
    if (ts.isConditionalExpression(target)) return join(reach(target.whenTrue, fn), reach(target.whenFalse, fn));
    if (ts.isBinaryExpression(target)) {
      const operator = target.operatorToken.kind;
      if (CHOOSING.has(operator)) return join(reach(target.left, fn), reach(target.right, fn));
      if (operator === K.EqualsToken) return reach(target.right, fn);
      return NONE;
    }
    if (ts.isCallExpression(target) || ts.isNewExpression(target)) return callResult(target, fn, "reach");
    return literalOrOther(target);
  };

  const literalOrOther = (target: ts.Expression): Provenance =>
    ts.isStringLiteralLike(target) || ts.isNumericLiteral(target) || ts.isTemplateExpression(target) || ts.isTypeOfExpression(target) || ts.isPrefixUnaryExpression(target) ||
    target.kind === K.NullKeyword || target.kind === K.TrueKeyword || target.kind === K.FalseKeyword
      ? NONE
      : OTHER;

  const callResult = (call: ts.CallExpression | ts.NewExpression, fn: Fn, mode: "identity" | "reach"): Provenance => {
    if (call.expression.kind === K.SuperKeyword) return NONE;
    const callee = resolve(call);
    if (callee.kind === "primordial") {
      const returns = PRIMORDIAL_EFFECTS.get(callee.name)?.returns ?? "other";
      const argument = callee.args[0];
      switch (returns) {
        case "none": return NONE;
        // A built-in constructor may keep what it is given (a Map's entries, an Error's cause).
        case "fresh": return mode === "identity" || !ts.isNewExpression(call) ? FRESH : join(FRESH, ...callee.args.map((value) => reach(value, fn)));
        case "other": return OTHER;
        case "argument": return argument === undefined ? NONE : mode === "identity" ? identity(argument, fn) : reach(argument, fn);
        case "descriptor": return mode === "identity" ? FRESH : join(FRESH, argument === undefined ? NONE : reach(argument, fn));
        case "element": return callee.receiver === undefined ? OTHER : reach(callee.receiver, fn);
        case "receiver": return callee.receiver === undefined ? OTHER : mode === "identity" ? identity(callee.receiver, fn) : reach(callee.receiver, fn);
      }
    }
    if (callee.kind === "zone") {
      const summary = effects.get(callee.fn);
      if (summary === undefined) return OTHER;
      // A constructed object may hold whatever its constructor was given.
      if (ts.isNewExpression(call)) return mode === "identity" ? FRESH : join(FRESH, mapInto(summary.returned, callee, call, fn), ...callee.args.map((argument) => reach(argument, fn)));
      if (mode === "identity" && summary.returnsFresh) return FRESH;
      return mapInto(summary.returned, callee, call, fn);
    }
    return OTHER;
  };

  /** Re-expresses a callee's provenance (in terms of its parameters and receiver) at one call site. */
  const mapInto = (summary: Provenance, callee: Extract<Callee, { kind: "zone" }>, call: ts.CallExpression | ts.NewExpression, fn: Fn): Provenance => {
    const parts: Provenance[] = [];
    if (summary.fresh) parts.push(FRESH);
    for (const index of summary.exact) {
      const argument = callee.args[index];
      if (argument !== undefined) parts.push(identity(argument, fn));
    }
    for (const index of summary.parameters) {
      const argument = callee.args[index];
      if (argument !== undefined) parts.push(reach(argument, fn));
    }
    if (summary.self) parts.push(ts.isNewExpression(call) ? FRESH : callee.receiver === undefined ? OTHER : reach(callee.receiver, fn));
    for (const symbol of summary.captured) parts.push(bindingReach(symbol, fn));
    if (summary.other) parts.push(OTHER);
    return join(...parts);
  };

  /** The argument expressions a call's own effects mutate, as the call spells them. */
  const mutatedArgumentsOf = (call: ts.CallExpression | ts.NewExpression): ts.Expression[] => {
    const callee = resolve(call);
    if (callee.kind === "zone") {
      const summary = effects.get(callee.fn);
      if (summary === undefined) return [];
      const indices = new Set([...summary.mutated.exact, ...summary.mutated.parameters]);
      const out = [...indices].map((index) => callee.args[index]).filter((argument): argument is ts.Expression => argument !== undefined);
      if (summary.mutated.self && callee.receiver !== undefined && !ts.isNewExpression(call)) out.push(callee.receiver);
      return out;
    }
    if (callee.kind === "primordial") {
      const entry = PRIMORDIAL_EFFECTS.get(callee.name);
      if (entry?.mutates === "this") return callee.receiver === undefined ? [] : [callee.receiver];
      if (entry?.mutates === 0) return callee.args[0] === undefined ? [] : [callee.args[0]];
    }
    return [];
  };

  /** Folds a function value's summary into a call that invokes it with values the callee chose. */
  const callbackEffects = (value: ts.Expression | undefined, call: ts.CallExpression | ts.NewExpression, fn: Fn): { mutated: Provenance; foreign: boolean } => {
    const target = value === undefined ? undefined : strip(value);
    let called: Fn | undefined;
    if (target !== undefined && isFn(target)) called = target;
    else if (target !== undefined) {
      const declaration = valueDeclaration(checker, target);
      if (declaration !== undefined && isFn(declaration)) called = declaration;
      else if (declaration !== undefined && ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined && isFn(strip(declaration.initializer))) called = strip(declaration.initializer) as Fn;
    }
    if (called === undefined) {
      unclassified.add(`${ownerName(call)}: callback ${value === undefined ? "<missing>" : spelling(value)} passed to ${spelling(call.expression)}`);
      return { mutated: OTHER, foreign: true };
    }
    const summary = effects.get(called);
    if (summary === undefined) return { mutated: NONE, foreign: false };
    const parts: Provenance[] = [];
    // The callback's parameters receive values the callee chose: anything the call's arguments reach.
    if (summary.mutated.exact.size > 0 || summary.mutated.parameters.size > 0) parts.push(...resolve(call).args.map((argument) => reach(argument, fn)));
    if (summary.mutated.self) parts.push(SELF);
    for (const symbol of summary.mutated.captured) parts.push(bindingReach(symbol, fn));
    if (summary.mutated.other) parts.push(OTHER);
    return { mutated: join(...parts), foreign: summary.foreign };
  };

  const callEffects = (call: ts.CallExpression | ts.NewExpression, fn: Fn): { mutated: Provenance; foreign: boolean } => {
    const callee = resolve(call);
    if (callee.kind === "zone") {
      const summary = effects.get(callee.fn);
      if (summary === undefined) return { mutated: OTHER, foreign: true };
      const parts: Provenance[] = [mapInto(withoutFresh(summary.mutated), callee, call, fn)];
      let foreign = summary.foreign;
      for (const index of summary.callsParameters) {
        const nested = callbackEffects(callee.args[index], call, fn);
        parts.push(nested.mutated);
        foreign ||= nested.foreign;
      }
      return { mutated: join(...parts), foreign };
    }
    if (callee.kind === "primordial") {
      const entry = PRIMORDIAL_EFFECTS.get(callee.name);
      if (entry === undefined) {
        unclassified.add(`${ownerName(call)}: primordial ${callee.name}`);
        return { mutated: OTHER, foreign: true };
      }
      const parts: Provenance[] = [];
      if (entry.mutates === "this") parts.push(callee.receiver === undefined ? OTHER : identity(callee.receiver, fn));
      else if (entry.mutates === 0 && callee.args[0] !== undefined) parts.push(identity(callee.args[0], fn));
      let foreign = entry.foreign === true;
      if (entry.callsArgument !== undefined) {
        const nested = callbackEffects(callee.args[entry.callsArgument], call, fn);
        parts.push(nested.mutated);
        foreign ||= nested.foreign;
      }
      return { mutated: join(...parts), foreign };
    }
    if (callee.kind === "parameter") {
      effects.get(fn)?.callsParameters.add(callee.index);
      return { mutated: NONE, foreign: false };
    }
    if (options.foreignCalls.has(foreignCallKey(call))) return { mutated: NONE, foreign: true };
    unclassified.add(foreignCallKey(call));
    return { mutated: OTHER, foreign: true };
  };

  const nodeEffects = (node: ts.Node, fn: Fn): { mutated: Provenance; foreign: boolean } => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      if (node.expression.kind === K.SuperKeyword) return { mutated: NONE, foreign: false };
      const found = callEffects(node, fn);
      return { mutated: withoutFresh(found.mutated), foreign: found.foreign };
    }
    const write = (target: ts.Expression): Provenance => {
      const stripped = strip(target);
      if (ts.isIdentifier(stripped)) {
        // Writing a binding changes no object; writing a module-level binding changes module state.
        const declaration = checker.getSymbolAtLocation(stripped)?.valueDeclaration;
        return declaration !== undefined && ts.isVariableDeclaration(declaration) && ts.isSourceFile(declaringScope(declaration)) ? OTHER : NONE;
      }
      if (ts.isPropertyAccessExpression(stripped) || ts.isElementAccessExpression(stripped)) return withoutFresh(identity(stripped.expression, fn));
      return OTHER;
    };
    if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) return { mutated: write(node.left), foreign: false };
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === K.PlusPlusToken || node.operator === K.MinusMinusToken)) {
      return { mutated: write(node.operand), foreign: false };
    }
    if (ts.isDeleteExpression(node)) return { mutated: write(node.expression), foreign: false };
    if (ts.isElementAccessExpression(node) && options.getterReads?.has(`${basename(node.getSourceFile().fileName)} ${spelling(node)}`) === true) {
      return { mutated: NONE, foreign: true };
    }
    return { mutated: NONE, foreign: false };
  };

  const text = (value: Provenance): string =>
    `${value.fresh}/${[...value.exact].sort().join(",")}/${[...value.parameters].sort().join(",")}/${value.self}/${value.captured.size}/${value.other}`;
  const signature = (summary: Effects): string =>
    `${text(summary.mutated)}|${text(summary.returned)}|${summary.returnsFresh}|${summary.foreign}|${[...summary.callsParameters].sort().join(",")}`;

  for (let round = 0; round < 64; round += 1) {
    let changed = false;
    cache = new Map();
    bodyIndexes = new Map();
    for (const fn of functions) {
      const summary = effects.get(fn)!;
      const before = signature(summary);
      const name = fnName(fn);
      const override = name === undefined ? undefined : options.overrides?.get(name);
      if (override !== undefined) {
        summary.foreign = override.foreign;
        summary.mutated = override.mutates ? OTHER : NONE;
        summary.returned = OTHER;
        summary.returnsFresh = false;
        for (const index of override.callsParameters) summary.callsParameters.add(index);
      } else {
        const mutated: Provenance[] = [summary.mutated];
        const returned: Provenance[] = [summary.returned];
        const returns: ts.Expression[] = [];
        ownNodes(fn, (node) => {
          const found = nodeEffects(node, fn);
          mutated.push(found.mutated);
          if (found.foreign) summary.foreign = true;
          if (ts.isReturnStatement(node) && node.expression !== undefined) returns.push(node.expression);
        });
        if (fn.body !== undefined && !ts.isBlock(fn.body)) returns.push(fn.body);
        for (const value of returns) returned.push(reach(value, fn));
        summary.mutated = join(...mutated);
        summary.returned = join(...returned);
        if (returns.some((value) => { const found = identity(value, fn); return isPreExisting(found); })) summary.returnsFresh = false;
      }
      if (signature(summary) !== before) changed = true;
    }
    if (!changed) break;
  }
  // Calls are classified during the fixpoint; a final pass reports each unclassified one once.
  unclassified.clear();
  cache = new Map();
  bodyIndexes = new Map();
  for (const fn of functions) {
    const name = fnName(fn);
    if (name !== undefined && options.overrides?.has(name) === true) continue;
    ownNodes(fn, (node) => void nodeEffects(node, fn));
  }
  return { effects, unclassified: [...unclassified].sort(), nodeEffects, resolve };
}

// -- DEC-9: control commits ---------------------------------------------------------

/**
 * One statement of a control method's apply suffix: the only place a control may change anything.
 * `values` are the prebuilt locals the statement commits or returns; `targets` are the locals whose
 * objects it changes.
 */
interface SuffixStatement {
  readonly rank: 0 | 1 | 2 | 3; // 0 append/commit, 1 plain write, 2 post-commit delivery, 3 return
  readonly values: readonly ts.Identifier[];
  readonly targets: readonly ts.Identifier[];
}

const rootIdentifier = (expression: ts.Expression): ts.Identifier | undefined => {
  let current = expression;
  while (ts.isPropertyAccessExpression(current) && !ts.isPrivateIdentifier(current.name)) current = current.expression;
  return ts.isIdentifier(current) ? current : undefined;
};

const calleeText = (call: ts.CallExpression): string => call.expression.getText();

const appendStatement = (statement: ts.Statement): SuffixStatement | undefined => {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return undefined;
  const call = statement.expression;
  if (!["appendOwn", "appendAllOwn"].includes(calleeText(call)) || call.arguments.length !== 2) return undefined;
  const [target, value] = call.arguments as unknown as [ts.Expression, ts.Expression];
  const root = ts.isPropertyAccessExpression(target) ? rootIdentifier(target) : undefined;
  if (root === undefined || !ts.isIdentifier(value)) return undefined;
  return { rank: 0, values: [value], targets: [root] };
};

/** Classifies one statement against the apply-suffix grammar, or `undefined` when it is not one. */
const suffixStatement = (statement: ts.Statement): SuffixStatement | undefined => {
  const append = appendStatement(statement);
  if (append !== undefined) return append;
  if (ts.isIfStatement(statement) && statement.elseStatement === undefined) {
    // `if (<value> !== null) appendOwn(<target>, <value>);` — a conditional prebuilt record.
    const condition = statement.expression;
    const inner = ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1 ? statement.thenStatement.statements[0]! : statement.thenStatement;
    const guarded = appendStatement(inner);
    if (
      guarded !== undefined &&
      ts.isBinaryExpression(condition) &&
      condition.operatorToken.kind === K.ExclamationEqualsEqualsToken &&
      ts.isIdentifier(condition.left) &&
      condition.right.kind === K.NullKeyword &&
      condition.left.text === guarded.values[0]!.text
    ) {
      return guarded;
    }
    return undefined;
  }
  if (!ts.isExpressionStatement(statement) && !ts.isReturnStatement(statement)) return undefined;
  if (ts.isReturnStatement(statement)) {
    return statement.expression !== undefined && ts.isIdentifier(statement.expression) ? { rank: 3, values: [statement.expression], targets: [] } : undefined;
  }
  const expression = statement.expression;
  if (ts.isCallExpression(expression)) {
    if (calleeText(expression) === "applyControlCommit" && expression.arguments.length === 3 && expression.arguments.every(ts.isIdentifier)) {
      const [record, exchange, commit] = expression.arguments as unknown as [ts.Identifier, ts.Identifier, ts.Identifier];
      return { rank: 0, values: [commit], targets: [record, exchange] };
    }
    if (calleeText(expression) === "this.#deliver" && expression.arguments.length === 1 && ts.isIdentifier(expression.arguments[0]!)) {
      return { rank: 2, values: [], targets: [expression.arguments[0] as ts.Identifier] };
    }
    return undefined;
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === K.EqualsToken && ts.isPropertyAccessExpression(expression.left)) {
    const left = expression.left;
    if (ts.isPrivateIdentifier(left.name) || !ts.isIdentifier(left.expression)) return undefined;
    const right = expression.right;
    if (ts.isIdentifier(right)) return { rank: 1, values: [right], targets: [left.expression] };
    if (right.kind === K.NullKeyword) return { rank: 1, values: [], targets: [left.expression] };
    if (ts.isBinaryExpression(right) && right.operatorToken.kind === K.PlusToken && ts.isIdentifier(right.left) && ts.isNumericLiteral(right.right) && right.right.text === "1") {
      return { rank: 1, values: [right.left], targets: [left.expression] };
    }
  }
  return undefined;
};

export interface ControlCheck {
  readonly violations: readonly string[];
  /** The statements recognised as the apply suffix, for reporting. */
  readonly suffix: readonly string[];
}

/** The refusal helpers a control may call before its apply suffix, with the exit test each needs. */
const REFUSAL_HELPERS: ReadonlyMap<string, "null" | "result"> = new Map([
  ["this.#requireControl", "null"],
  ["this.#openExchange", "result"],
]);

export function findMethod(zone: Zone, className: string, name: string): ts.MethodDeclaration | undefined {
  let found: ts.MethodDeclaration | undefined;
  for (const source of sourcesOf(zone)) {
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name?.text === className) {
        for (const member of node.members) if (ts.isMethodDeclaration(member) && member.name.getText() === name) found = member;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

export function findConstFunction(zone: Zone, name: string): Fn | undefined {
  let found: Fn | undefined;
  for (const source of sourcesOf(zone)) {
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer !== undefined && isFn(declaration.initializer)) found = declaration.initializer;
      }
    }
  }
  return found;
}

/** Whether `call` is `this.#refusal(...)` in exactly `return this.#refusal(...)` or `return err(this.#refusal(...))`. */
const isRefusalExit = (call: ts.Node): boolean => {
  if (!ts.isCallExpression(call) || calleeText(call) !== "this.#refusal") return false;
  const parent = call.parent;
  if (ts.isReturnStatement(parent)) return true;
  return ts.isCallExpression(parent) && calleeText(parent) === "err" && parent.arguments.length === 1 && ts.isReturnStatement(parent.parent);
};

/**
 * A refusal helper mutates only inside its refusal exits, so a path that continues past its exit test
 * changed nothing. Returns the violations; its non-exit returns must be `null` or `ok(...)`.
 */
function refusalHelperViolations(analysis: EffectAnalysis, helper: Fn, shape: "null" | "result"): string[] {
  const out: string[] = [];
  const name = fnName(helper) ?? "<helper>";
  ownNodes(helper, (node) => {
    const found = analysis.nodeEffects(node, helper);
    if (isPreExisting(found.mutated) && !isRefusalExit(node)) out.push(`${name} mutates outside a refusal exit: ${spelling(node).slice(0, 80)}`);
    if (ts.isReturnStatement(node)) {
      const expression = node.expression;
      const exit = expression !== undefined && (isRefusalExit(expression) || (ts.isCallExpression(expression) && calleeText(expression) === "err" && expression.arguments.length === 1 && isRefusalExit(expression.arguments[0]!)));
      const plain = shape === "null" ? expression?.kind === K.NullKeyword : expression !== undefined && ts.isCallExpression(expression) && calleeText(expression) === "ok";
      if (!exit && !plain) out.push(`${name} returns neither a refusal exit nor ${shape === "null" ? "null" : "ok(...)"}: ${spelling(node).slice(0, 80)}`);
      if (exit && shape === "null" && !ts.isCallExpression(expression!) ) out.push(`${name}: unexpected exit shape`);
      if (exit && shape === "null" && calleeText(expression as ts.CallExpression) !== "this.#refusal") out.push(`${name}: a null-shaped helper must return the refusal record itself`);
      if (exit && shape === "result" && calleeText(expression as ts.CallExpression) !== "err") out.push(`${name}: a result-shaped helper must return err(this.#refusal(...))`);
    }
  });
  return out;
}

/** Whether the statement after `declaration` is the exit test its refusal helper requires. */
const exitsOnRefusal = (declaration: ts.VariableStatement, shape: "null" | "result"): boolean => {
  const block = declaration.parent;
  if (!ts.isBlock(block)) return false;
  const next = block.statements[block.statements.indexOf(declaration) + 1];
  const [variable] = declaration.declarationList.declarations;
  if (next === undefined || variable === undefined || !ts.isIdentifier(variable.name) || !ts.isIfStatement(next) || next.elseStatement !== undefined) return false;
  const name = variable.name.text;
  const then = next.thenStatement;
  if (!ts.isReturnStatement(then) || then.expression === undefined) return false;
  if (shape === "null") {
    const test = next.expression;
    return (
      ts.isBinaryExpression(test) && test.operatorToken.kind === K.ExclamationEqualsEqualsToken && ts.isIdentifier(test.left) && test.left.text === name && test.right.kind === K.NullKeyword &&
      ts.isCallExpression(then.expression) && calleeText(then.expression) === "err" && then.expression.arguments.length === 1 && then.expression.arguments[0]!.getText() === name
    );
  }
  const test = next.expression;
  return (
    ts.isPrefixUnaryExpression(test) && test.operator === K.ExclamationToken && ts.isPropertyAccessExpression(test.operand) && test.operand.expression.getText() === name && test.operand.name.getText() === "ok" &&
    ts.isIdentifier(then.expression) && then.expression.text === name
  );
};

/**
 * Correction DEC-9 for one control method. The body must end in an apply suffix: appends of prebuilt
 * locals (or `applyControlCommit`), then plain writes of prebuilt locals, then the post-commit
 * delivery, then `return` of a prebuilt local. Before the suffix, nothing may mutate an object that
 * existed before the call except a refusal exit, and every call that can run code outside the zone
 * must precede the first value the suffix commits or returns.
 */
export function checkControl(zone: Zone, analysis: EffectAnalysis, method: ts.MethodDeclaration): ControlCheck {
  const name = method.name.getText();
  const violations: string[] = [];
  const body = method.body;
  if (body === undefined) return { violations: [`${name} has no body`], suffix: [] };
  const statements = body.statements;
  const suffix: { statement: ts.Statement; shape: SuffixStatement }[] = [];
  for (let index = statements.length - 1; index >= 0; index -= 1) {
    const statement = statements[index]!;
    const shape = suffixStatement(statement);
    if (shape === undefined) break;
    const later = suffix[0]?.shape.rank ?? 4;
    if (shape.rank > later || (shape.rank === 3 && suffix.length > 0)) break;
    suffix.unshift({ statement, shape });
  }
  if (suffix.length === 0 || suffix[suffix.length - 1]!.shape.rank !== 3) violations.push(`${name}: does not end by returning a prebuilt local`);
  if (!suffix.some((entry) => entry.shape.rank <= 1)) violations.push(`${name}: no apply suffix of prebuilt appends and writes`);
  const suffixStart = suffix[0]?.statement.getStart() ?? body.getEnd();

  // Every identifier the suffix touches is a local declared before it: nothing is built inside it.
  const buildStarts: number[] = [];
  const declaredBefore = (identifier: ts.Identifier, role: string): void => {
    const symbol = zone.checker.getSymbolAtLocation(identifier);
    const declaration = symbol?.valueDeclaration;
    if (declaration === undefined || !ts.isVariableDeclaration(declaration) || enclosingFn(declaration) !== method || declaration.getStart() >= suffixStart) {
      violations.push(`${name}: suffix ${role} ${identifier.text} is not a local built before the apply step`);
      return;
    }
    if (role === "value") {
      buildStarts.push(declaration.getStart());
      ownNodes(method, (node) => {
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === K.EqualsToken && ts.isIdentifier(node.left) && zone.checker.getSymbolAtLocation(node.left) === symbol) buildStarts.push(node.getStart());
      });
    }
  };
  for (const { shape } of suffix) {
    for (const value of shape.values) declaredBefore(value, "value");
    for (const target of shape.targets) declaredBefore(target, "target");
  }
  const firstBuild = buildStarts.length === 0 ? suffixStart : Math.min(...buildStarts);

  const exits = new Set<ts.Node>();
  ownNodes(method, (node) => {
    if (!ts.isVariableStatement(node)) return;
    const [declaration] = node.declarationList.declarations;
    const initializer = declaration?.initializer;
    if (initializer === undefined || !ts.isCallExpression(initializer)) return;
    const shape = REFUSAL_HELPERS.get(calleeText(initializer));
    if (shape === undefined) return;
    const callee = analysis.resolve(initializer);
    if (callee.kind !== "zone") {
      violations.push(`${name}: refusal helper ${calleeText(initializer)} does not resolve`);
      return;
    }
    for (const problem of refusalHelperViolations(analysis, callee.fn, shape)) violations.push(`${name}: ${problem}`);
    if (!exitsOnRefusal(node, shape)) violations.push(`${name}: ${calleeText(initializer)} is not followed by its exit test`);
    else exits.add(initializer);
  });

  ownNodes(method, (node) => {
    if (node.getStart() >= suffixStart) return;
    const found = analysis.nodeEffects(node, method);
    if (reachesAcceptedState(found.mutated) && !isRefusalExit(node) && !exits.has(node)) {
      violations.push(`${name}: mutates before its apply step: ${spelling(node).slice(0, 100)}`);
    }
    if (found.foreign && node.getEnd() > firstBuild) violations.push(`${name}: runs code outside the zone after its decision is being built: ${spelling(node).slice(0, 100)}`);
  });
  // The suffix itself: its calls are the appends, the commit helper and the delivery, nothing else.
  for (const { statement } of suffix) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && !["appendOwn", "appendAllOwn", "applyControlCommit", "this.#deliver"].includes(calleeText(node))) {
        violations.push(`${name}: the apply step calls ${calleeText(node)}`);
      }
      if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node) || ts.isTemplateExpression(node) || ts.isNewExpression(node) || isFn(node)) {
        violations.push(`${name}: the apply step constructs ${spelling(node).slice(0, 60)}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
  }
  return { violations, suffix: suffix.map(({ statement }) => spelling(statement).slice(0, 100)) };
}

/**
 * `applyControlCommit`: bindings of commit fields, then appends, then plain writes of commit fields to
 * the record or exchange, and nothing else; its derived effects stay on those two parameters.
 */
export function checkApplyHelper(zone: Zone, analysis: EffectAnalysis, helper: Fn): string[] {
  const violations: string[] = [];
  const name = fnName(helper) ?? "<apply>";
  const body = helper.body;
  if (body === undefined || !ts.isBlock(body) || helper.parameters.length !== 3) return [`${name}: expected (record, exchange, commit) and a block body`];
  const [record, exchange, commit] = helper.parameters.map((parameter) => parameter.name.getText()) as [string, string, string];
  const bound = new Set<string>();
  const isCommitField = (expression: ts.Expression): boolean =>
    (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === commit) || (ts.isIdentifier(expression) && bound.has(expression.text));
  let phase = 0; // 0 bindings, 1 appends, 2 writes
  for (const statement of body.statements) {
    if (ts.isVariableStatement(statement) && phase === 0) {
      const [declaration] = statement.declarationList.declarations;
      if (declaration !== undefined && ts.isIdentifier(declaration.name) && declaration.initializer !== undefined && isCommitField(declaration.initializer) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0) {
        bound.add(declaration.name.text);
        continue;
      }
    }
    const append = appendStatement(statement);
    if (append !== undefined && phase <= 1) {
      const call = (statement as ts.ExpressionStatement).expression as ts.CallExpression;
      if ([record, exchange].includes(append.targets[0]!.text) && isCommitField(call.arguments[1]!)) {
        phase = 1;
        continue;
      }
    }
    if (ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression) && statement.expression.operatorToken.kind === K.EqualsToken && phase >= 1) {
      const { left, right } = statement.expression;
      if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.expression) && [record, exchange].includes(left.expression.text) && isCommitField(right)) {
        phase = 2;
        continue;
      }
    }
    violations.push(`${name}: statement outside bindings → appends → writes: ${spelling(statement).slice(0, 100)}`);
  }
  if (phase !== 2) violations.push(`${name}: expected at least one append followed by the hold writes`);
  const summary = analysis.effects.get(helper)?.mutated;
  if (summary === undefined || summary.self || summary.other || analysis.effects.get(helper)!.foreign || summary.captured.size > 0 || [...summary.parameters, ...summary.exact].some((index) => index > 1)) {
    violations.push(`${name}: derived effects reach beyond the record and exchange`);
  }
  return violations;
}

/** Which arguments a call's own effects mutate (a zone callee's summary, or a primordial's entry). */
export function mutatedArguments(analysis: EffectAnalysis, call: ts.CallExpression | ts.NewExpression): ts.Expression[] {
  const callee = analysis.resolve(call);
  if (callee.kind === "zone") {
    const summary = analysis.effects.get(callee.fn);
    if (summary === undefined) return [];
    const indices = new Set([...summary.mutated.exact, ...summary.mutated.parameters]);
    const out = [...indices].map((index) => callee.args[index]).filter((argument): argument is ts.Expression => argument !== undefined);
    if (summary.mutated.self && callee.receiver !== undefined && !ts.isNewExpression(call)) out.push(callee.receiver);
    return out;
  }
  if (callee.kind === "primordial") {
    const entry = PRIMORDIAL_EFFECTS.get(callee.name);
    if (entry?.mutates === "this") return callee.receiver === undefined ? [] : [callee.receiver];
    if (entry?.mutates === 0) return callee.args[0] === undefined ? [] : [callee.args[0]];
  }
  return [];
}

/** Follows `const` aliases back to the expression they were initialized with. */
const throughAliases = (checker: ts.TypeChecker, expression: ts.Expression): ts.Expression => {
  let current = strip(expression);
  for (let depth = 0; depth < 16 && ts.isIdentifier(current); depth += 1) {
    const declaration = checker.getSymbolAtLocation(current)?.valueDeclaration;
    if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined || (declaration.parent.flags & ts.NodeFlags.Const) === 0) break;
    current = strip(declaration.initializer);
  }
  return current;
};

/**
 * Every function that writes one of `fields` (by name, in any access form, or through a define call
 * naming it) or mutates a list held in one of them (by name after alias resolution, or by the list's
 * element type), keyed by field.
 */
export function writeOwners(zone: Zone, analysis: EffectAnalysis, fields: ReadonlyMap<string, string | undefined>): Map<string, Set<string>> {
  const { checker } = zone;
  const owners = new Map<string, Set<string>>([...fields.keys()].map((field) => [field, new Set<string>()]));
  const note = (field: string, node: ts.Node): void => void owners.get(field)?.add(ownerName(node));
  const fieldOf = (target: ts.Expression): string | undefined => {
    const stripped = strip(target);
    if (ts.isPropertyAccessExpression(stripped) && fields.has(stripped.name.getText())) return stripped.name.getText();
    if (ts.isElementAccessExpression(stripped) && ts.isStringLiteralLike(stripped.argumentExpression) && fields.has(stripped.argumentExpression.text)) return stripped.argumentExpression.text;
    return undefined;
  };
  for (const fn of analysis.effects.keys()) {
    ownNodes(fn, (node) => {
      if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
        const field = fieldOf(node.left);
        if (field !== undefined) note(field, node);
      }
      if (ts.isDeleteExpression(node) || ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === K.PlusPlusToken || node.operator === K.MinusMinusToken))) {
        const field = fieldOf(ts.isDeleteExpression(node) ? node.expression : node.operand);
        if (field !== undefined) note(field, node);
      }
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        for (const argument of node.arguments ?? []) if (ts.isStringLiteralLike(strip(argument)) && fields.has((strip(argument) as ts.StringLiteral).text)) note((strip(argument) as ts.StringLiteral).text, node);
        for (const argument of mutatedArguments(analysis, node)) {
          const field = fieldOf(throughAliases(checker, argument));
          if (field !== undefined) note(field, node);
          const type = checker.getTypeAtLocation(argument);
          if (checker.isArrayLikeType(type)) {
            const element = checker.getTypeArguments(type as ts.TypeReference)[0];
            const elementName = element === undefined ? undefined : (element.aliasSymbol ?? element.getSymbol())?.getName();
            for (const [candidate, listElement] of fields) if (listElement !== undefined && listElement === elementName) note(candidate, node);
          }
        }
      }
    });
  }
  return owners;
}

/** Every function's summary as text, keyed by file and position: for comparing two analyses. */
export function summaries(analysis: EffectAnalysis): Map<string, string> {
  const text = (value: Provenance): string =>
    `${value.fresh ? "F" : ""}${[...value.exact].sort().map((index) => `x${index}`).join("")}${[...value.parameters].sort().map((index) => `p${index}`).join("")}${value.self ? "S" : ""}${[...value.captured].map((symbol) => `c:${symbol.getName()}`).sort().join("")}${value.other ? "O" : ""}`;
  const out = new Map<string, string>();
  for (const [fn, summary] of analysis.effects) {
    out.set(`${basename(fn.getSourceFile().fileName)}:${fn.getStart()} ${fnName(fn) ?? "<anonymous>"}`, `mutated=${text(summary.mutated)} returned=${text(summary.returned)} fresh=${summary.returnsFresh} foreign=${summary.foreign} calls=${[...summary.callsParameters].sort().join(",")}`);
  }
  return out;
}
