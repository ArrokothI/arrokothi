// Bind witnessed original source coordinates to exact assertion-call bytes, outside test execution.
// Input is a JSON array of {path,text,line,column}; no supplied source is executed.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const requests=JSON.parse(fs.readFileSync(0,'utf8')),cache=new Map();
const results=requests.map(row=>{
 const digest=createHash('sha256').update(row.text).digest('hex');
 let parsed=cache.get(digest);
 if(!parsed){
  const ast=ts.createSourceFile(row.path,row.text,ts.ScriptTarget.Latest,true);
  if(ast.parseDiagnostics.length)throw Error('assertion source does not parse: '+row.path);
  const calls=new Map();
  function walk(node){
   if(ts.isCallExpression(node)){
    const point=ast.getLineAndCharacterOfPosition(node.expression.getStart(ast));
    const key=(point.line+1)+':'+(point.character+1);
    const sites=calls.get(key)??[];
    sites.push({expression:node.expression.getText(ast),text:node.getText(ast)});calls.set(key,sites);
   }
   ts.forEachChild(node,walk);
  }
  walk(ast);parsed={calls};cache.set(digest,parsed);
 }
 const sites=(parsed.calls.get(row.line+':'+row.column)??[]).filter(site=>site.expression===row.expression);
 if(sites.length!==1)throw Error('assertion call absent: '+row.path+':'+row.line+':'+row.column);
 const text=sites[0].text;
 return {path:row.path,line:row.line,column:row.column,source_sha256:digest,text,
         sha256:createHash('sha256').update(text).digest('hex')};
});
console.log(JSON.stringify(results));
