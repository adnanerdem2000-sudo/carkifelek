// Parçaları birleştirir, tekilleştirir, puzzles.json ve puzzles.js üretir
const fs=require('fs');const {validate,lettersOnly,up,words}=require('./validate');
const files=fs.readdirSync(__dirname+'/parts').filter(f=>f.endsWith('.json')).sort();
let all=[];files.forEach(f=>all=all.concat(JSON.parse(fs.readFileSync(__dirname+'/parts/'+f,'utf8'))));
const seen=new Map(),out=[],dups=[];
for(const p of all){const a=up(p.a.trim()).replace(/\s+/g,' ');const k=lettersOnly(a);
 if(seen.has(k)){dups.push(a+' ('+p.cat+' / '+seen.get(k)+')');continue;}seen.set(k,p.cat);
 out.push({id:'p'+String(out.length+1).padStart(4,'0'),cat:p.cat,a,d:p.d,len:k.length,multi:words(a).length>1,sub:p.sub.trim(),mean:p.mean.trim(),theme:p.theme.trim(),src:'el ile derlendi'});}
const errs=validate(out.map(o=>({...o})),'birleşik');
const cats={};out.forEach(o=>cats[o.cat]=(cats[o.cat]||0)+1);
console.log('Toplam kayıt:',all.length,'| Benzersiz cevap:',out.length,'| Çıkarılan tekrar:',dups.length);dups.forEach(d=>console.log('  tekrar:',d));
console.log('Kategori sayısı:',Object.keys(cats).length);errs.forEach(e=>console.log('  ✗',e));
fs.writeFileSync(__dirname+'/puzzles.json',JSON.stringify(out));
fs.writeFileSync(__dirname+'/../puzzles.js','// Otomatik üretildi: data/build.js — '+out.length+' bulmaca\nwindow.PUZZLE_DATA='+JSON.stringify(out)+';\n');
