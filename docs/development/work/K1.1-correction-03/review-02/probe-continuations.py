#!/usr/bin/env python3
"""Instrument a disposable C source copy at helper entry; do not modify candidate files.
Run from C: python3 -B /path/to/probe-continuations.py
The paired JS driver checks stop propagation, compares instrumented and pristine results,
and reports the exact finite matrix. Instrumentation is evidence, not an implementation change.
"""
from pathlib import Path
import json,subprocess,shutil,tempfile
ROOT=Path.cwd(); HERE=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='kc3-review02-continuations-') as tmp:
 root=Path(tmp)
 shutil.copytree(ROOT/'packages/kernel/src',root/'packages/kernel/src')
 shutil.copy2(ROOT/'package.json',root/'package.json')
 (root/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
 source=root/'packages/kernel/src/values.ts';text=source.read_text(); changes=[]
 def add(anchor,name,expr='undefined',extra=''):
  global text
  assert text.count(anchor)==1,(name,text.count(anchor))
  call=f'globalThis.__KC3_REVIEW_TRACE__({json.dumps(name)}, {expr}{extra});'
  text=text.replace(anchor,anchor+'\n  '+call)
  changes.append({'helper':name,'anchor':anchor,'injection':call})
 anchors=[
 ('const spend = (state: CaptureState, kind: UnitKind, units: number): boolean => {','spend','state',', kind, units'),
 ('const record = (state: CaptureState, issue: ValueIssue): boolean => {','record','state',''),
 ('const charge = (state: CaptureState, bytes: number): boolean => {','charge','state',', "bytes", bytes'),
 ('const listOwnNames = (state: CaptureState, container: object): readonly string[] | typeof STOPPED => {','listOwnNames','state',''),
 ('const listOwnSymbols = (state: CaptureState, container: object): number | typeof STOPPED => {','listOwnSymbols','state',''),
 ('const observeElement = (state: CaptureState, container: object, key: string): ObservedPosition | typeof STOPPED => {','observeElement','state',''),
 ('const observeDescriptor = (state: CaptureState, container: object, name: string): PropertyDescriptor | undefined | typeof STOPPED => {','observeDescriptor','state',''),
 ('const readMember = (state: CaptureState, container: object, key: string): { readonly read: unknown } | typeof STOPPED => {','readMember','state',''),
 ('const scanText = (state: CaptureState, text: string): StringScan | typeof STOPPED => {','scanText','state',''),
 ('function capture(value: unknown, path: string, level: number, state: CaptureState): Visited {','capture','state',''),
 ('function captureArray(container: object, path: string, entered: number, state: CaptureState): Visited {','captureArray','state',''),
 ('function captureObject(container: object, path: string, entered: number, state: CaptureState): Visited {','captureObject','state',''),
 ('): { readonly ok: true; readonly value: unknown } | { readonly ok: false } | typeof STOPPED {','checkMember','state',''),
 ('const openContainer = (state: CaptureState, container: object): void => {','openContainer','state',''),
 ('const closeContainer = (state: CaptureState, container: object): void => {','closeContainer','state',''),
 ('const observeArrayLength = (container: object): number | null => {','observeArrayLength','undefined',''),
 ('const scanBoundaryString = (input: string): StringScan => {','scanBoundaryString','undefined',''),
 ('const isArrayIndex = (name: string): boolean => {','isArrayIndex','undefined',''),
 ('const arrayIndexValue = (name: string): number => {','arrayIndexValue','undefined',''),
 ('const finishObject = (prototype: object | null, captured: readonly (readonly [string, BoundaryValue])[]): BoundaryValue => {','finishObject','undefined',''),
 ]
 for args in anchors:add(*args)
 # Expression-bodied helpers: comma expression observes entry without changing the original result.
 expressions={
  'refuse':'(record(state, issue) ? REFUSED : STOPPED)',
  'isProxyValue':'PrimordialIsProxy(value)',
  'isOpenContainer':'PrimordialReflectApply(PrimordialSetHas, state.open, [container]) as boolean',
  'isArrayValue':'PrimordialArrayIsArray(container)',
  'prototypeOf':'PrimordialGetPrototypeOf(container) as object | null',
  'allocateElements':'sizedList<BoundaryValue>(length)',
  'finishArray':'PrimordialObjectFreeze(out) as unknown as BoundaryValue',
 }
 for name,expression in expressions.items():
  anchor='=>\n  '+expression+';' if name=='isOpenContainer' else '=> '+expression+';'
  assert text.count(anchor)==1,(name,text.count(anchor))
  call=f'globalThis.__KC3_REVIEW_TRACE__({json.dumps(name)}, '+('state' if name in ('refuse','isOpenContainer') else 'undefined')+')'
  text=text.replace(anchor, '=> ('+call+', ('+expression+'));')
  changes.append({'helper':name,'anchor':anchor,'injection':call})
 source.write_text(text)
 run=subprocess.run(['node','--experimental-strip-types','--no-warnings',str(HERE/'probe-continuations.mjs'),str(root),str(ROOT)],text=True,capture_output=True)
 print(json.dumps({'instrumentation':changes,'exit':run.returncode,'stdout':run.stdout,'stderr':run.stderr},indent=2))
 raise SystemExit(run.returncode)
