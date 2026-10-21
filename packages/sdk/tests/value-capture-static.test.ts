/** SDK capture retains its exact access inventory after relocation; bounded structural evidence. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
import ts from 'typescript';
import { analyseAccesses, analyseEffects, buildZone, mutatedArguments, ownerName, ownNodes, strip, typeErrors } from '../../kernel/tests/zone-analysis.ts';
import { ACCESS_INVENTORY, EFFECT_OVERRIDES, EXTRA_ENVELOPE_PARAMETERS, FOREIGN_CALLS, getterReads } from './value-capture-inventory.ts';
const zone = buildZone(['value-capture.ts','own-array.ts'].map(name => fileURLToPath(new URL('../src/internal/'+name, import.meta.url))));
const sites = analyseAccesses(zone, { extraEnvelopeParameters: EXTRA_ENVELOPE_PARAMETERS });
const key = (site: {file:string;kind:string;mode:string;text:string}) => `${site.file} ${site.kind}/${site.mode} ${site.text}`;
const enclosingFunction = (node:ts.Node):ts.Node => { let current=node; while(!ts.isSourceFile(current)&&!ts.isFunctionLike(current))current=current.parent; return current; };
const analysis = analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides:EFFECT_OVERRIDES, getterReads:getterReads() });
describe("correction DEC-8: every access that could reach a member its object does not own is permitted and reasoned", () => {
  test("the zone typechecks under the repository configuration the analysis uses", () => {
    assert.deepEqual(typeErrors(zone), []);
  });

  test("the zone uses only permitted syntax", () => {
    assert.deepEqual(
      sites.filter((site) => site.kind === "syntax").map((site) => `${site.file}:${site.line} ${site.text}`),
      [],
    );
  });

  test("every reported site is inventoried, at its exact count, with a reason", () => {
    const found = new Map<string, number>();
    for (const site of sites) found.set(key(site), (found.get(key(site)) ?? 0) + 1);
    const expected = new Map(ACCESS_INVENTORY.map((entry) => [key(entry), entry.count]));
    const unexpected = sites.filter((site) => !expected.has(key(site))).map((site) => `${site.file}:${site.line} ${site.kind}/${site.mode} ${site.text}`);
    assert.deepEqual(unexpected, [], "a site that may reach an unowned member, outside the inventory (classify it or remove it)");
    assert.deepEqual(Object.fromEntries([...found].sort()), Object.fromEntries([...expected].sort()), "inventoried counts changed");
    for (const entry of ACCESS_INVENTORY) assert.ok(entry.reason.length >= 16, `${key(entry)} carries a reason`);
  });

  test("every guarded descriptor read follows its own-value check in the same function", () => {
    for (const entry of ACCESS_INVENTORY.filter((item) => item.guard !== undefined)) {
      const matching = sites.filter((site) => key(site) === key(entry));
      assert.equal(matching.length, entry.count);
      for (const site of matching) {
        const fn = enclosingFunction(site.node);
        const before = site.node.getSourceFile().text.slice(fn.getStart(), site.node.getStart());
        assert.ok(before.includes(`hasOwnValue(${entry.guard})`), `${site.file}:${site.line} ${entry.text} is not preceded by hasOwnValue(${entry.guard})`);
      }
    }
  });

  test("every bounded index read sits in a loop that keeps its index below the list's own length", () => {
    const analysis = analyseEffects(zone, { foreignCalls: new Set(FOREIGN_CALLS.keys()), overrides: EFFECT_OVERRIDES, getterReads: getterReads() });
    for (const entry of ACCESS_INVENTORY.filter((item) => item.bounded === true)) {
      for (const site of sites.filter((candidate) => key(candidate) === key(entry))) {
        const access = site.node as ts.ElementAccessExpression;
        const index = strip(access.argumentExpression);
        const list = access.expression.getText();
        assert.ok(ts.isIdentifier(index), `${site.file}:${site.line}: the index is a loop variable`);
        let loop: ts.Node | undefined = access.parent;
        while (loop !== undefined && !ts.isForStatement(loop)) loop = loop.parent;
        assert.ok(loop !== undefined && ts.isForStatement(loop), `${site.file}:${site.line}: inside a for loop`);
        const [declaration] = loop.initializer !== undefined && ts.isVariableDeclarationList(loop.initializer) ? loop.initializer.declarations : [];
        assert.ok(declaration !== undefined && declaration.name.getText() === index.text && declaration.initializer !== undefined && ts.isNumericLiteral(declaration.initializer), `${site.file}:${site.line}: ${index.text} starts at a non-negative literal`);
        // Some conjunct of the condition is `i < X.length`, or `i < B` for `const B = X.length > N ? N : X.length`.
        const conjuncts: ts.Expression[] = [];
        const split = (expression: ts.Expression): void => {
          if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
            split(expression.left);
            split(expression.right);
          } else conjuncts.push(expression);
        };
        if (loop.condition !== undefined) split(loop.condition);
        const length = `${list}.length`;
        const isBound = (bound: ts.Expression): boolean => {
          if (bound.getText() === length) return true;
          if (!ts.isIdentifier(bound)) return false;
          const declaration = zone.checker.getSymbolAtLocation(bound)?.valueDeclaration;
          if (declaration === undefined || !ts.isVariableDeclaration(declaration) || (declaration.parent.flags & ts.NodeFlags.Const) === 0) return false;
          const minimum = declaration.initializer;
          return (
            minimum !== undefined && ts.isConditionalExpression(minimum) && ts.isBinaryExpression(minimum.condition) &&
            minimum.condition.operatorToken.kind === ts.SyntaxKind.GreaterThanToken && minimum.condition.left.getText() === length &&
            // `X.length > N ? N : X.length` is at most X.length; so is `… ? N + 1 : …` for integer lengths.
            [minimum.condition.right.getText(), `${minimum.condition.right.getText()} + 1`].includes(minimum.whenTrue.getText()) && minimum.whenFalse.getText() === length
          );
        };
        assert.ok(
          conjuncts.some((conjunct) => ts.isBinaryExpression(conjunct) && conjunct.operatorToken.kind === ts.SyntaxKind.LessThanToken && conjunct.left.getText() === index.text && isBound(conjunct.right)),
          `${site.file}:${site.line}: the loop is bounded by ${index.text} < ${length}`,
        );
        assert.equal(loop.incrementor?.getText(), `${index.text} += 1`, `${site.file}:${site.line}: the loop steps by one`);
        const listRoot = list.split(".")[0]!;
        const changes: string[] = [];
        const visit = (node: ts.Node): void => {
          if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
            const target = node.left.getText();
            if (target === index.text || target === list || target === listRoot || target === `${list}.length`) changes.push(node.getText());
          }
          if (ts.isCallExpression(node)) {
            for (const argument of mutatedArguments(analysis, node)) if (argument.getText() === list) changes.push(node.getText());
          }
          ts.forEachChild(node, visit);
        };
        visit(loop.statement);
        assert.deepEqual(changes, [], `${site.file}:${site.line}: the loop body leaves ${index.text} and ${list} unchanged`);
      }
    }
  });

});
  test("value-capture.ts: only pushIssue itself mutates an issue list, so every suffix entry owns `occurrences`", () => {
    // The precondition of the inventoried `entry as { occurrences: number }` assertion.
    const leaf = new Set(["appendOwn", "appendAllOwn", "defineAt", "defineData", "truncateOwn"]);
    const mutators = new Set<string>();
    for (const fn of analysis.effects.keys()) {
      if (basename(fn.getSourceFile().fileName) !== "value-capture.ts") continue;
      ownNodes(fn, (node) => {
        const listTyped = (expression: ts.Expression): boolean => /(?:^|\b)ValueIssue\[\]$/.test(zone.checker.typeToString(zone.checker.getTypeAtLocation(expression)));
        if (ts.isCallExpression(node) && (leaf.has(node.expression.getText()) || analysis.resolve(node).kind === "primordial")) {
          for (const argument of mutatedArguments(analysis, node)) if (listTyped(argument)) mutators.add(ownerName(node));
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && (ts.isElementAccessExpression(node.left) || ts.isPropertyAccessExpression(node.left)) && listTyped(node.left.expression)) {
          mutators.add(ownerName(node));
        }
      });
    }
    assert.deepEqual([...mutators].sort(), ["pushIssue"]);
  });
