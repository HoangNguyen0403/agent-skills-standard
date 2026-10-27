const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const crypto=require('node:crypto');
const [id,root,...owned]=process.argv.slice(2);
if(!id||!root||!owned.length||!/^[A-Za-z0-9_-]+$/.test(id))throw Error('ID ROOT OWNED... required');
const run=args=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:30000000});
const base=run(['rev-parse','HEAD']).trim();
const diff=run(['diff','--no-ext-diff','--no-color','--',...owned]);
const added=run(['ls-files','--others','--exclude-standard','-z','--',...owned]).split('\0').filter(Boolean);
let text=`# Immutable review snapshot ${id}\n\nRepository: ${root}\nBase: ${base}\nCaptured: ${new Date().toISOString()}\n\n## Tracked diff\n\n${diff}\n`;
const hashes=[];
for(const p of added){const bytes=fs.readFileSync(path.join(root,p));const sha=crypto.createHash('sha256').update(bytes).digest('hex');hashes.push({path:p,sha256:sha});text+=`\n## Added ${p}\nsha256=${sha}\n\n${bytes.toString('utf8')}\n`;}
const out=path.join(__dirname,`${id}-review.md`);
if(fs.existsSync(out))throw Error('Refusing to overwrite immutable snapshot');
fs.writeFileSync(out,text);
console.log(JSON.stringify({path:out,base,new_files:hashes,sha256:crypto.createHash('sha256').update(text).digest('hex')},null,2));
