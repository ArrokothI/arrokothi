import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
for(const name of ['JSON','Object','Array'])for(const form of ['assign','define','declare','preexisting'])for(const pin of ['full','writableOnly']) {
  test(`V-ENV form × pin: ${name}/${form}/${pin}; core correct, wrapper precondition explicit`,()=>{
    const child=spawnSync(process.execPath,['--frozen-intrinsics','--no-warnings',fileURLToPath(new URL('./byte-pin-child.ts',import.meta.url)),name,form,pin],{encoding:'utf8',timeout:15000});
    assert.equal(child.status,0,child.stderr+child.stdout);
    const result=JSON.parse(child.stdout);
    assert.equal(result.core,'correct');
    assert.equal(result.wrapper,'unstable_representation');
    assert.equal(result.serializerSteered,form==='preexisting'||((form==='declare'||form==='define')&&pin==='writableOnly'));
    assert.equal(result.attempt, form==='preexisting'?'none':form==='declare'?(pin==='full'?'SyntaxError':'declared'):form==='define'&&pin==='writableOnly'?'defined':'TypeError');
  });
}
