// Test-only source instrumentation for K1.1-correction-03 design 03. Nothing is imported
// into production. All intrinsic snapshots and mutable state are created inside functions (D1).
import ts from 'typescript';

export function instrumentCapture(source, expected) {
  const ast = ts.createSourceFile('values.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (ast.parseDiagnostics.length) throw Error('capture trace: source parse failure');
  const names = ['spend','charge','record','refuse','capture','captureArray','captureObject','checkMember',
    'listOwnNames','listOwnSymbols','observeElement','observeDescriptor','readMember','scanText',
    'isProxyValue','isOpenContainer','openContainer','closeContainer','isArrayValue','prototypeOf',
    'isBuiltInWithSlots','observeArrayLength','allocateElements','arrayIndexValue','isArrayIndex',
    'scanBoundaryString','finishArray','finishObject','pushIssue','issueText','describe','child','element',
    'containerStructureBytes','acceptMetered','finishAcceptance','encode'];
  const functions = new Map();
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) functions.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) functions.set(d.name.text,d.initializer);
    }
  }
  const inserts = new Map(), inventory = {}, sites = [];
  function at(pos,text,order=0) { const a=inserts.get(pos)??[]; a.push({text,order});inserts.set(pos,a); }
  function site(owner,operation,node) {
    const key=`${owner}:${operation}`; inventory[key]=(inventory[key]??0)+1;
    const id=`${key}#${inventory[key]}`;
    sites.push({id,owner,operation,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1});
    return id;
  }
  const call=(id,phase='event',extra='undefined')=>`globalThis.__ARROKOTHI_CAPTURE_TRACE__(${JSON.stringify(id)},${JSON.stringify(phase)},${extra})`;
  const observable = new Set(['defineAt','defineData','appendOwn','sizedList','PrimordialObjectCreate','PrimordialObjectFreeze',
    'PrimordialGetOwnPropertyNames','PrimordialGetOwnPropertySymbols','PrimordialGetOwnPropertyDescriptor','finishArray','finishObject','encode']);
  for (const name of names) {
    const fn=functions.get(name); if(!fn?.body)throw Error(`capture trace: missing ${name}`);
    const entry=site(name,'entry',fn), exit=site(name,'exit',fn);
    const state=fn.parameters.some(p=>p.name.getText(ast)==='state')?'state':'undefined';
    const extra=name==='spend'?'[state,kind,units]':name==='charge'?'[state,"bytes",bytes]': ['openContainer','closeContainer'].includes(name)?'[state,container]':state;
    if(ts.isBlock(fn.body)) {
      at(fn.body.getStart(ast)+1,`${call(entry,'enter',extra)};try {`, -Infinity);
      at(fn.body.end-1,`} finally {${call(exit,'leave')};}`,Infinity);
    } else {
      at(fn.body.getStart(ast),`{${call(entry,'enter',extra)};try { return (`, -Infinity);
      at(fn.body.end,`); } finally {${call(exit,'leave')};}}`,Infinity);
    }
    // encode's entry is the serializer boundary. Its implementation is deliberately outside capture.
    if(name==='encode')continue;
    function walk(node) {
      if(node!==fn.body && ts.isFunctionLike(node)) {ts.forEachChild(node,walk);return;}
      if(name==='acceptMetered' && ts.isVariableDeclaration(node) && node.name.getText(ast)==='state') {
        at(node.parent.parent.end,`${call(site(name,'root-state',node),'state','state')};`);
      }
      let operation;
      if(ts.isCallExpression(node) && observable.has(node.expression.getText(ast))) operation=`call.${node.expression.getText(ast)}`;
      if(ts.isArrayLiteralExpression(node) && !(ts.isCallExpression(node.parent) && node.parent.expression.getText(ast)==='PrimordialReflectApply')) operation='array';
      if(ts.isObjectLiteralExpression(node)) operation='object';
      if(ts.isNewExpression(node)) operation=`new.${node.expression.getText(ast)}`;
      if(ts.isBinaryExpression(node) && node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment && node.operatorToken.kind<=ts.SyntaxKind.LastAssignment &&
         (ts.isPropertyAccessExpression(node.left)||ts.isElementAccessExpression(node.left))) operation=`write.${node.left.getText(ast)}`;
      if(operation) {
        const id=site(name,operation,node);
        at(node.getStart(ast),`(${call(id)}, (`, -node.end);
        at(node.end,'))',-node.getStart(ast));
        if(operation==='write.state.stopped' && node.right.kind===ts.SyntaxKind.TrueKeyword) {
          at(node.end,`,${call(site(name,'transition',node),'transition','state')}`, -node.getStart(ast)-1);
        }
      }
      ts.forEachChild(node,walk);
    }
    walk(fn.body);
  }
  if(expected) {
    const keys=new Set([...Object.keys(expected),...Object.keys(inventory)]);
    const differences=[...keys].filter(k=>expected[k]!==inventory[k]);
    if(differences.length)throw Error(`capture trace inventory mismatch: ${differences.map(k=>`${k} ${expected[k]??0}->${inventory[k]??0}`).join(', ')}`);
  }
  let output=source;
  for(const[pos,rows]of [...inserts].sort((a,b)=>b[0]-a[0]))output=output.slice(0,pos)+rows.sort((a,b)=>a.order-b.order).map(x=>x.text).join('')+output.slice(pos);
  return {source:output,inventory,sites};
}

export function captureObserver() {
  let current, stack=[], active=false, violations=0, first=[], events=[], opened=new Set(), roots=0, transitions=0, collector=0, unwinds=0, natives=0, after=new Map();
  const MAX=32;
  function violation(id) {violations++;if(first.length<MAX)first.push({id,stop:current?.stop,units:current?.units,bytes:current?.bytes});}
  function trace(id,phase,extra) {
    if(!active)return;
    const owner=id.split(':')[0];
    if(phase==='enter' && owner==='acceptMetered') {current=undefined;roots++;}
    if(phase==='state')current=extra;
    if(phase==='enter' && (owner==='spend'||owner==='charge')) {
      current=extra[0];if(current?.stopped!==true)events.push({name:owner,kind:extra[1],amount:extra[2]});
    }
    if(phase==='transition') {current=extra;transitions++;if(transitions!==1)violation('repeated-transition');}
    const stopped=current?.stopped===true;
    const writer=stack.findLast(x=>x==='spend'||x==='charge');
    const crossing=stopped && writer!==undefined && transitions===1;
    // A precise phase/site allowance: only the crossing writer's own bounded collector,
    // matched cycle deletion and the root's fixed refusal packaging. No finish helper exemption.
    let allowed=!stopped || phase==='leave' || phase==='transition';
    if(stopped&&!allowed) {
      const writerSite=owner===writer && ['write.state.stop','write.state.crossing','object'].some(op=>id===`${owner}:${op}#1`);
      const collectorSite=(owner==='pushIssue' && [':entry#1',':object#1',':object#2',':call.appendOwn#1',':call.appendOwn#2'].some(suffix=>id==='pushIssue'+suffix)) ||
        (owner==='issueText'&&phase==='enter');
      allowed=(crossing && (writerSite || collectorSite)) ||
        (owner==='closeContainer'&&phase==='enter') ||
        (owner==='acceptMetered' && ['call.PrimordialObjectFreeze#1','call.PrimordialObjectFreeze#2','object#2','object#3','object#4'].some(op=>id===`${owner}:${op}`)) ||
        (owner==='finishAcceptance' && (id==='finishAcceptance:entry#1' || id==='finishAcceptance:object#1'));
      if(owner!=='closeContainer') {
        const count=(after.get(id)??0)+1;after.set(id,count);
        if(count>(owner==='issueText'?2:1))allowed=false;
      }
      // Collector entry is permitted once, only from the crossing writer (not another traversal).
      if(owner==='pushIssue'&&phase==='enter') {collector++;allowed=allowed&&collector===1&&stack.at(-1)===writer;}
    }
    if(!allowed)violation(id);
    if(phase==='enter')stack.push(owner);
    if(phase==='leave') {
      if(stack.pop()!==owner)violation('unbalanced-call:'+id);
      if(owner==='acceptMetered'&&opened.size!==0)violation('unbalanced-cycle');
    }
    if(owner==='openContainer'&&phase==='enter'&&!stopped) {if(opened.has(extra[1]))violation('duplicate-cycle-open');opened.add(extra[1]);}
    if(owner==='closeContainer'&&phase==='enter') {if(!opened.delete(extra[1]))violation('unmatched-cycle-close');if(stopped)unwinds++;}
  }
  function native(name) {
    if(!active)return;
    natives++;
    if(current?.stopped!==true)return;
    const owner=stack.at(-1), writer=stack.findLast(x=>x==='spend'||x==='charge');
    const allowed=(name==='freeze'&&owner==='acceptMetered') ||
      (['defineProperty','create'].includes(name)&&owner==='pushIssue'&&writer!==undefined&&transitions===1&&collector===1);
    const id='native:'+name+'@'+owner,count=(after.get(id)??0)+1;after.set(id,count);
    if(!allowed || count>(name==='freeze'&&owner==='acceptMetered'?2:1))violation(id);
  }
  return {trace,native,
    begin(){current=undefined;stack=[];active=true;violations=0;first=[];events=[];opened=new Set();roots=0;transitions=0;collector=0;unwinds=0;natives=0;after=new Map();},
    end(){active=false;return {violations,first,events,roots,transitions,collector,unwinds,natives,balanced:stack.length===0&&opened.size===0};},
  };
}
