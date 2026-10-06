// Structural/source-syntax check only. It does not substitute for a real SDK build.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require(path.resolve(process.argv[2]));
const root=path.resolve('twenty-app/src');
const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.tsx?$/.test(p))files.push(p)}}walk(root);
const records=[];
const standard={company:{universalIdentifier:'standard:company'},person:{universalIdentifier:'standard:person'}};
const enumProxy=new Proxy({}, {get:(_,key)=>key});
const sdk={FieldType:enumProxy,RelationType:enumProxy,OnDeleteAction:enumProxy,NavigationMenuItemType:enumProxy,STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS:standard};
for(const name of ['defineApplication','defineObject','defineField','defineApplicationRole','defineNavigationMenuItem','defineFrontComponent','defineCommandMenuItem'])sdk[name]=value=>{records.push({kind:name,...value});return value};
for(const file of files){
 const source=fs.readFileSync(file,'utf8');const compiled=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 if(compiled.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error))throw new Error('TypeScript syntax error: '+file);
 const context={exports:{},require:name=>name==='twenty-sdk/define'?sdk:name==='react'?{}:name==='react/jsx-runtime'?{}:name==='twenty-client-sdk/rest'?{RestApiClient:class{}}:null};
 vm.runInNewContext(compiled.outputText,context,{filename:file});
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ids=[];for(const r of records){ids.push(r.universalIdentifier);for(const f of r.fields||[])ids.push(f.universalIdentifier)}
if(ids.some(id=>!uuid.test(id))||new Set(ids).size!==ids.length)throw new Error('Invalid/duplicate identifier');
const fields=records.filter(r=>r.kind==='defineField');
for(const f of fields){const reverse=fields.find(r=>r.universalIdentifier===f.relationTargetFieldMetadataUniversalIdentifier);if(!reverse||reverse.relationTargetFieldMetadataUniversalIdentifier!==f.universalIdentifier||reverse.objectUniversalIdentifier!==f.relationTargetObjectMetadataUniversalIdentifier)throw new Error('Broken reverse relation: '+f.name)}
const objects=records.filter(r=>r.kind==='defineObject');if(objects.length!==5||fields.length!==14)throw new Error('Missing data objects/relations');
if(records.filter(r=>r.kind==='defineApplication').length!==1||records.filter(r=>r.kind==='defineApplicationRole').length!==1)throw new Error('App/default role count mismatch');
console.log(JSON.stringify({status:'passed',scope:'TypeScript syntax and local metadata structure with stub definitions; SDK typecheck/runtime not run',files:files.length,objects:objects.length,relations:fields.length,unique_identifiers:ids.length},null,2));
