import fs from 'node:fs';
import vm from 'node:vm';
const ctx = vm.createContext({});
vm.runInContext('var window = globalThis;', ctx);
for (const f of fs.readdirSync('assets/js').sort().filter(f => /^(0\d|10)-/.test(f))) {
  vm.runInContext(fs.readFileSync('assets/js/' + f, 'utf8'), ctx, { filename: f });
}
export default ctx;
