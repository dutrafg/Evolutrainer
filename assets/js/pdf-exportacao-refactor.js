/* EvoluTrainer v3.3 — geração offline de PDF vetorial, sem URL/cabeçalhos do navegador. */
(function(){
'use strict';
const WIDTH=595.28,HEIGHT=841.89;
const C={dark:[.07,.10,.18],green:[.36,.44,.91],muted:[.38,.44,.55],soft:[.94,.96,.99],border:[.83,.87,.94],white:[1,1,1]};
function chLatin(ch){let n=ch.codePointAt(0);if(n<=255)return String.fromCharCode(n);const m={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159,'°':176};return m[ch]?String.fromCharCode(m[ch]):'-';}
function enc(s){return Array.from(String(s??'')).map(chLatin).join('');}
function esc(s){return enc(s).replace(/[\\()]/g,'\\$&').replace(/[\r\n]+/g,' ');}
function rgb(c){return c.map(x=>x.toFixed(3)).join(' ');}
function textWidth(s,size,bold){const ctx=measureCtx();if(ctx){ctx.font=`${bold?'700':'400'} ${size}px Arial`;return ctx.measureText(String(s)).width;}return String(s).length*size*.51;}
let _ctx;function measureCtx(){if(_ctx)return _ctx;try{_ctx=document.createElement('canvas').getContext('2d');}catch{}return _ctx;}
function wrap(text,max,size=10,bold=false){const result=[];for(const block of String(text||'').split(/\n/)){const words=block.split(/\s+/).filter(Boolean);if(!words.length){result.push('');continue;}let line='';for(const word of words){if(textWidth(word,size,bold)>max){if(line){result.push(line);line='';}let part='';for(const char of word){if(textWidth(part+char,size,bold)>max&&part){result.push(part);part='';}part+=char;}line=part;continue;}const candidate=line?line+' '+word:word;if(textWidth(candidate,size,bold)>max&&line){result.push(line);line=word;}else line=candidate;}if(line)result.push(line);}return result;}
class PDF {
 constructor(title){this.title=title;this.pages=[];this.current=null;this.y=0;this.nextPage();}
 nextPage(){this.current=[];this.pages.push(this.current);this.y=94;this.rect(0,0,WIDTH,7,C.green);this.text(38,35,'EvoluTrainer',18,true,C.green);this.text(38,53,this.title,11,true,C.dark);this.line(38,66,WIDTH-38,66,C.border);}
 rect(x,y,w,h,color){this.current.push(`${rgb(color)} rg ${x.toFixed(2)} ${(HEIGHT-y-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);}
 line(x1,y1,x2,y2,color=C.border,thick=1){this.current.push(`${rgb(color)} RG ${thick} w ${x1} ${(HEIGHT-y1).toFixed(2)} m ${x2} ${(HEIGHT-y2).toFixed(2)} l S`);}
 text(x,y,val,size=10,bold=false,color=C.dark){this.current.push(`${rgb(color)} rg BT /F${bold?'2':'1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${(HEIGHT-y).toFixed(2)} Tm (${esc(val)}) Tj ET`);}
 space(h){this.ensure(h);this.y+=h;}
 ensure(h){if(this.y+h>HEIGHT-58)this.nextPage();}
 paragraph(t,size=10,max=WIDTH-80,leading=14,color=C.dark,bold=false){const lines=wrap(t,max,size,bold);for(const line of lines){this.ensure(leading);this.text(40,this.y+size,line,size,bold,color);this.y+=leading;}return lines.length;}
 heading(t){this.ensure(44);this.rect(38,this.y-1,WIDTH-76,28,C.soft);this.text(48,this.y+17,t,12,true,C.dark);this.y+=39;}
 keyValues(fields){this.ensure(58);const w=(WIDTH-80)/fields.length;fields.forEach(([key,value],i)=>{const x=40+i*w;this.text(x,this.y+5,key.toUpperCase(),8,true,C.muted);wrap(value,w-10,10,true).slice(0,2).forEach((line,j)=>this.text(x,this.y+23+j*12,line,10,true,C.dark));});this.y+=54;this.line(40,this.y-10,WIDTH-40,this.y-10,C.border);}
 toBlob(){this.pages.forEach((commands,i)=>{commands.push(`${rgb(C.muted)} rg BT /F1 8 Tf 1 0 0 1 40 30 Tm (EvoluTrainer 1.0.beta | Documento local) Tj ET`);commands.push(`${rgb(C.muted)} rg BT /F1 8 Tf 1 0 0 1 495 30 Tm (Pagina ${i+1} de ${this.pages.length}) Tj ET`);});
  let objects=[null];const add=obj=>{objects.push(obj);return objects.length-1;};
  const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pagesRef=add('');const catalogRef=add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);const refs=[];
  for(const content of this.pages){const stream=content.join('\n')+'\n';const contentRef=add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);const pageRef=add(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentRef} 0 R >>`);refs.push(pageRef);}
  objects[pagesRef]=`<< /Type /Pages /Kids [${refs.map(n=>n+' 0 R').join(' ')}] /Count ${refs.length} >>`;
  let output='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=output.length;output+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const start=output.length;output+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)output+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;output+=`trailer\n<< /Root ${catalogRef} 0 R /Size ${objects.length} >>\nstartxref\n${start}\n%%EOF`;
  const bytes=new Uint8Array(output.length);for(let i=0;i<output.length;i++)bytes[i]=output.charCodeAt(i)&255;return new Blob([bytes],{type:'application/pdf'});
 }
}
function download(blob,filename){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);return blob;}
function fileSlug(value){return String(value||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,65);}
function fmtNum(n){const v=Number(n);return Number.isFinite(v)?v.toLocaleString('pt-BR',{maximumFractionDigits:2}):'-';}
function workout(client,routines,opt={}){
 const p=new PDF('PLANO DE TREINAMENTO');
 p.keyValues([['Cliente',opt.printName||client?.name||'Cliente'],['Exportado em',new Date().toLocaleDateString('pt-BR')],['Treino',opt.scope==='all'?'Treino completo':routines[0]?.name||'']]);
 p.paragraph('Plano prescrito pelo profissional. As cargas e séries indicadas podem ser ajustadas de acordo com a execução e as orientações presenciais.',9,WIDTH-82,13,C.muted);p.space(14);
 routines.forEach((routine,rIdx)=>{
  const list=Array.isArray(routine.exercises)?routine.exercises:[];
  p.heading(`${rIdx+1}. DIA ${routine.schedule||'A'}  ·  ${routine.name||'Treino'}   (${list.length} ${list.length===1?'exercício':'exercícios'})`);
  list.forEach((ex,i)=>{
   p.ensure(opt.hideSetsReps?38:76);
   const title=`${i+1}. ${ex.name||'Exercício'}`;const titleLines=wrap(title,WIDTH-100,11,true);titleLines.forEach(line=>{p.ensure(17);p.text(43,p.y+10,line,11,true,C.dark);p.y+=16;});
   if(!opt.hideSetsReps){const details=Array.isArray(ex.setDetails)?ex.setDetails:Array.isArray(ex.series)?ex.series:Array.isArray(ex.sets)?ex.sets:null;const count=Math.max(1,Math.min(25,details?.length||(parseInt(ex.sets,10)||3)));const hasWeight=!opt.hideWeights;const isDuration=/duration/.test(ex.type||'');
    p.ensure(21);p.rect(43,p.y,WIDTH-88,20,C.soft);p.text(55,p.y+14,'SÉRIE',9,true,C.muted);if(hasWeight)p.text(222,p.y+14,'CARGA',9,true,C.muted);p.text(390,p.y+14,isDuration?'DURAÇÃO':'REPETIÇÕES',9,true,C.muted);p.y+=20;
    for(let n=0;n<count;n++){p.ensure(21);if(n%2===1)p.rect(43,p.y,WIDTH-88,20,[.985,.988,.99]);p.text(56,p.y+14,String(n+1),10,false,C.dark);const item=details?.[n]||{};const weight=item.weightKg??item.weight??item.kg??ex.weightKg??0;const reps=item.reps??item.repeticoes??ex.reps??0;if(hasWeight)p.text(222,p.y+14,`${fmtNum(weight)} kg`,10,false,C.dark);p.text(390,p.y+14,isDuration?`${fmtNum(item.seconds??ex.seconds??reps)} s`:fmtNum(reps),10,false,C.dark);p.y+=20;}
    p.ensure(18);p.text(45,p.y+11,`Descanso: ${fmtNum(ex.restSeconds||90)} segundos`,9,false,C.muted);p.y+=18;
    if(ex.notes){p.ensure(20);p.paragraph('Observações: '+ex.notes,9,WIDTH-100,12,C.muted);}
   }
   p.ensure(16);p.space(12);p.line(43,p.y-2,WIDTH-44,p.y-2,C.border);
  });
  p.space(12);
 });
 p.space(8);p.paragraph('Documento de planejamento individual. Valores prescritos não representam automaticamente séries executadas.',8,WIDTH-80,12,C.muted);
 const blob=p.toBlob();if(opt.download!==false)download(blob,`EvoluTrainer_Treino_${fileSlug(client?.name)}_${new Date().toISOString().slice(0,10)}.pdf`);return blob;
}
function evolution(data){const p=new PDF('RELATÓRIO DE EVOLUÇÃO DE CARGA');const rows=Array.isArray(data.rows)?data.rows:[];
 p.keyValues([['Cliente',data.clientName||'Cliente'],['Período',data.start+' a '+data.end],['Profissional',data.trainer||'Personal']]);if(data.cref)p.paragraph(data.cref,9,WIDTH-80,13,C.muted);
 p.paragraph('Objetivo: '+(data.focus||'Progressão de carga'),10,WIDTH-80,14,C.dark,true);p.space(8);
 p.heading('RESUMO DO PERÍODO');p.keyValues([['Sessões',String(data.sessionsCount||0)],['Volume registrado',fmtNum(data.volumeKg||0)+' kg'],['Exercícios com carga',String(rows.length)]]);
 p.heading('COMPARATIVO DE CARGAS');
 if(!rows.length)p.paragraph('Não há séries concluídas com carga registrada no período.',10);
 for(const row of rows){p.ensure(104);p.paragraph(row.name,11,WIDTH-90,16,C.dark,true);const start=row.first?.date||'-',end=row.last?.date||'-',diff=Number(row.diff)||0;
  p.paragraph(`Inicial: ${start} · ${fmtNum(row.first?.weight)} kg     Final: ${end} · ${fmtNum(row.last?.weight)} kg`,10,WIDTH-90,15,C.dark);
  p.paragraph(row.comparable?`Evolução: ${diff>=0?'+':''}${fmtNum(diff)} kg (${Number(row.pct)>=0?'+':''}${fmtNum(row.pct)}%)`:'Evolução: registro único — sem comparação',10,WIDTH-90,15,row.comparable&&diff>0?C.green:C.muted,true);
  if(row.notes?.length)p.paragraph('Nota: '+row.notes[row.notes.length-1],9,WIDTH-90,13,C.muted);
  p.ensure(16);p.space(8);p.line(43,p.y-2,WIDTH-43,p.y-2,C.border);p.space(8);
 }
 const sorted=rows.filter(x=>x.comparable&&x.diff>0).sort((a,b)=>b.diff-a.diff).slice(0,6);if(sorted.length){p.heading('MAIORES GANHOS DE CARGA');sorted.forEach(r=>p.paragraph(`${r.name}: +${fmtNum(r.diff)} kg`,10,WIDTH-80,15,C.dark));}
 if(data.directions){p.heading('DIRETRIZES DO PROFISSIONAL');p.paragraph(data.directions,10,WIDTH-80,15,C.dark);}
 p.space(14);p.paragraph('Critério: maior carga das séries concluídas no primeiro e no último registro de cada exercício no período. Variações de técnica e repetições não são ajustadas; este documento não é uma avaliação clínica.',8,WIDTH-80,12,C.muted);
 const blob=p.toBlob();if(data.download!==false)download(blob,`EvoluTrainer_Evolucao_${fileSlug(data.clientName)}_${data.end}.pdf`);return blob;
}
window.EvoluPDF={workout,evolution,PDF};
})();
