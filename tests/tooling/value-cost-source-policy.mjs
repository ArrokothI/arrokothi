// Repository-source certificate for design-03 kill qualification. No source-policy failure is a kill.
import fs from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';

export function sourcePolicy(root, requiredFiles, targetMode = false) {
  const files=[], violations=[];
  function walk(dir,inSource=false) {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      if(entry.isSymbolicLink()) {violations.push({file:relative(root,resolve(dir,entry.name)),reason:'source-tree symlink'});continue;}
      if(entry.isDirectory()) {
        if(['node_modules','.git'].includes(entry.name))continue;
        walk(resolve(dir,entry.name),inSource||entry.name==='src');
      } else if(/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && (targetMode
        ? !relative(root,resolve(dir,entry.name)).split(sep).includes('tests') && !/\.test\.(?:[cm]?[jt]sx?)$/.test(entry.name)
        : inSource))files.push(resolve(dir,entry.name));
    }
  }
  try{walk(targetMode ? root : resolve(root,'packages'));}catch(error){return {ok:false,files:[],violations:[{reason:'missing source tree',message:String(error)}]};}
  files.sort();
  const relativeFiles=files.map(file=>relative(root,file).split(sep).join('/'));
  if(files.length===0)violations.push({reason:'empty source tree'});
  if(!Array.isArray(requiredFiles)||requiredFiles.length===0)violations.push({reason:'missing complete-tree inventory'});
  else if(JSON.stringify([...requiredFiles].sort())!==JSON.stringify(relativeFiles))violations.push({reason:'partial or changed source inventory',expected:requiredFiles,actual:relativeFiles});
  const records=[];
  for(const file of files){
    const text=fs.readFileSync(file,'utf8'), path=relative(root,file).split(sep).join('/');
    records.push({path,sha256:createHash('sha256').update(text).digest('hex')});
    const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
    const fail=(node,reason)=>violations.push({file:path,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,reason});
    if(ast.parseDiagnostics.length) {fail(ast,'parse_error');continue;}
    const request=node=>{
      if(!ts.isStringLiteralLike(node)){fail(node,'computed module request');return;}
      if(/^(?:node:)?assert(?:\/strict)?$/.test(node.text))fail(node,'assert module request');
    };
    function walkNode(node){
      if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){if(node.moduleSpecifier)request(node.moduleSpecifier);}
      if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&node.moduleReference.expression)request(node.moduleReference.expression);
      if(ts.isCallExpression(node)){
        const callee=node.expression;
        if(callee.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(callee)&&callee.text==='require')){
          if(node.arguments.length!==1)fail(node,'computed module request');else request(node.arguments[0]);
        }
        if(ts.isIdentifier(callee)&&['eval','Function'].includes(callee.text))fail(node,'dynamic code generation');
      }
      if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='Function')fail(node,'dynamic code generation');
      if((ts.isIdentifier(node)||ts.isStringLiteralLike(node))&&node.text==='AssertionError')fail(node,'AssertionError reference');
      if(ts.isIdentifier(node)&&node.text==='require'&&!(ts.isCallExpression(node.parent)&&node.parent.expression===node))fail(node,'aliased module loader');
      if(ts.isIdentifier(node)&&node.text==='eval')fail(node,'dynamic code generation reference');
      if(ts.isIdentifier(node)&&node.text==='Function'&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node&&node.parent.name.text==='prototype'))fail(node,'dynamic code constructor reference');
      // Conservatively cover property/alias-based dynamic-code constructors and module loaders.
      if((ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node))){
        const key=ts.isPropertyAccessExpression(node)?node.name.text:ts.isStringLiteralLike(node.argumentExpression)?node.argumentExpression.text:undefined;
        if(['eval','Function','require'].includes(key))fail(node,'indirect loader or code generation');
      }
      ts.forEachChild(node,walkNode);
    }
    walkNode(ast);
  }
  return {ok:violations.length===0,files:records,violations};
}
