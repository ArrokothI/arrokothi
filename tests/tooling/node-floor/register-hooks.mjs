// Diagnostic for FLOOR-05-01; no hook replacement or sweep capability is supplied.
import { registerHooks } from 'node:module';

console.log(JSON.stringify({ node: process.version, registerHooks: typeof registerHooks }));
