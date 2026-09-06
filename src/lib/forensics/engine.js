/**
 * PDF Ticket Forensics - drop-in browser function
 * Version 1.0.0 (derived from the v7 checker engine)
 *
 * Usage in a normal website:
 *   <script src="/js/pdf-ticket-forensics-function.js"></script>
 *
 *   const result = await PdfTicketForensics.analyzePdf(file, {
 *     claimAmount: 485.47,
 *     onProgress: ({ stage, percent }) => console.log(stage, percent)
 *   });
 *
 *   console.log(result.score);              // 0..100
 *   console.log(result.decision);           // "lower_concern" | "inconclusive" | "manual_review" | "high_concern"
 *   console.log(result.needsManualReview);  // boolean
 *   console.log(result.findings);           // detailed evidence
 *
 * Important: this is a forensic screening score, not cryptographic proof of authenticity.
 * A low score means that strong edit evidence was not recovered; it does not prove a PDF is genuine.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PdfTicketForensics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';

const VERSION = '1.0.0';

function bytesToLatin1(bytes){let out='',chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.subarray(i,i+chunk));return out}
function latin1Bytes(s){const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i)&255;return a}
function count(s,re){return(s.match(re)||[]).length}function allOffsets(s,re){const out=[];let m;re.lastIndex=0;while((m=re.exec(s))!==null){out.push(m.index);if(m.index===re.lastIndex)re.lastIndex++}return out}function uniq(a){return[...new Set(a)]}
function cleanPdfString(s){return(s||'').replace(/\\([\\()])/g,'$1').replace(/\\n/g,' ').replace(/\\r/g,' ').replace(/\\t/g,' ').replace(/\\([0-7]{1,3})/g,(_,o)=>String.fromCharCode(parseInt(o,8))).replace(/[\u0000-\u001f]+/g,' ').trim()}
function lastPdfField(text,name){const re=new RegExp('\\/'+name+'\\s*\\(((?:\\\\.|[^\\)])*)\\)','ig');let m,last='';while((m=re.exec(text))!==null)last=cleanPdfString(m[1]);return last}
function allPdfFields(text,name){const re=new RegExp('\\/'+name+'\\s*\\(((?:\\\\.|[^\\)])*)\\)','ig');const out=[];let m;while((m=re.exec(text))!==null){const v=cleanPdfString(m[1]);if(v)out.push(v)}return uniq(out)}
function xmlField(text,names){for(const name of names){const re1=new RegExp('<(?:[A-Za-z0-9_-]+:)?'+name+'[^>]*>([\\s\\S]{0,1200}?)<\\/(?:[A-Za-z0-9_-]+:)?'+name+'>','i');const m=text.match(re1);if(m)return cleanPdfString(m[1].replace(/<[^>]+>/g,' '))}return''}
function allXmlFields(text,names){const out=[];for(const name of names){const re=new RegExp(String.raw`<(?:[A-Za-z0-9_-]+:)?${name}[^>]*>([\s\S]{0,1600}?)<\/(?:[A-Za-z0-9_-]+:)?${name}>`,'ig');let m;while((m=re.exec(text))!==null){const v=cleanPdfString(m[1].replace(/<[^>]+>/g,' '));if(v)out.push(v)}}return uniq(out)}
function xmlAttr(text,names){for(const name of names){const re=new RegExp(String.raw`(?:^|[\s<])(?:[A-Za-z0-9_-]+:)?${name}\s*=\s*["']([^"']{0,1200})["']`,'i');const m=text.match(re);if(m)return cleanPdfString(m[1])}return''}
function allXmlAttrs(text,names){const out=[];for(const name of names){const re=new RegExp(String.raw`(?:^|[\s<])(?:[A-Za-z0-9_-]+:)?${name}\s*=\s*["']([^"']{0,1200})["']`,'ig');let m;while((m=re.exec(text))!==null){const v=cleanPdfString(m[1]);if(v)out.push(v)}}return uniq(out)}
function dateNorm(s){if(!s)return'';s=String(s).trim();const m=s.match(/^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(?:([Zz])|([+-])(\d{2})'?((?:\d{2}))?'?)?/);if(m){let out=`${m[1]}-${m[2]||'01'}-${m[3]||'01'} ${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}`;if(m[7])out+=' +00:00';else if(m[8])out+=` ${m[8]}${m[9]||'00'}:${m[10]||'00'}`;return out}const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:\s*)?(Z|[+-]\d{2}:?\d{2})?/i);if(iso){let out=`${iso[1]}-${iso[2]}-${iso[3]} ${iso[4]}:${iso[5]}:${iso[6]}`;if(iso[7]){if(/^z$/i.test(iso[7]))out+=' +00:00';else{const z=iso[7];out+=' '+z.slice(0,3)+':'+z.replace(':','').slice(-2)}}return out}return s}
function parseDateValue(s){
 if(!s)return NaN;const m=String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\s*([+-])(\d{2}):(\d{2}))?$/);
 if(!m){const t=Date.parse(String(s).replace(' ','T'));return Number.isFinite(t)?t:NaN}
 let t=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);if(m[7]){const mins=(+m[8])*60+(+m[9]);t+=(m[7]==='+'?-1:1)*mins*60000}return t
}
function dateGap(a,b){const x=parseDateValue(a),y=parseDateValue(b);return Number.isFinite(x)&&Number.isFinite(y)?Math.round((y-x)/1000):null}
function fmtGap(sec){if(sec===null)return'unknown';const neg=sec<0;sec=Math.abs(sec);let x;if(sec<60)x=`${sec}s`;else if(sec<3600)x=`${Math.round(sec/60)} min`;else if(sec<86400)x=`${(sec/3600).toFixed(sec<7200?1:0)} h`;else x=`${(sec/86400).toFixed(sec<172800?1:0)} days`;return(neg?'-':'')+x}
function findAmounts(text){const out=[];const pats=[/(?:EUR|EURO|€)\s*([0-9]{1,7}(?:[.,][0-9]{1,2})?)/gi,/([0-9]{1,7}(?:[.,][0-9]{1,2})?)\s*(?:EUR|EURO|€)/gi];for(const re of pats){let m;while((m=re.exec(text))!==null){const v=parseFloat(m[1].replace(',','.'));if(Number.isFinite(v)&&v>=0&&v<1000000)out.push({value:v,raw:m[0].replace(/\s+/g,' ').trim(),offset:m.index})}}return out.filter((x,i,a)=>a.findIndex(y=>y.value===x.value&&y.raw===x.raw)===i)}
function literalStrings(text){const out=[];const re=/\(((?:\\.|[^\\)]){1,700})\)/g;let m;while((m=re.exec(text))!==null){const v=cleanPdfString(m[1]);if(/[A-Za-z0-9€]/.test(v))out.push(v)}return out}
function nearestObjectNumber(raw,idx){const c=nearestObjectContext(raw,idx);return c?c.objectNum:null}
function nearestObjectContext(raw,idx){const start=Math.max(0,idx-120000),w=raw.slice(start,idx);const re=/(?:^|[\r\n])\s*(\d+)\s+(\d+)\s+obj\b/g;let m,last=null;while((m=re.exec(w))!==null)last=m;if(!last)return null;const objStart=start+last.index+(last[0].match(/\d/)?.index||0);const dictStart=raw.indexOf('<<',objStart);return{objectNum:+last[1],generation:+last[2],objectStart:objStart,dictStart:dictStart>=0&&dictStart<idx?dictStart:null,dict:dictStart>=0&&dictStart<idx?raw.slice(dictStart,idx):''}}
function objectBody(raw,num,gen=0){const re=new RegExp(String.raw`(?:^|[\r\n])\s*${num}\s+${gen}\s+obj\b`,'g');let m,last=null;while((m=re.exec(raw))!==null)last=m;if(!last)return'';const st=last.index,ed=raw.indexOf('endobj',st);return ed>=0?raw.slice(st,ed+6):raw.slice(st,Math.min(raw.length,st+12000))}
function infoObjectText(raw){const refs=[...raw.matchAll(/\/Info\s+(\d+)\s+(\d+)\s+R/g)];if(!refs.length)return'';const r=refs[refs.length-1];return objectBody(raw,+r[1],+r[2])}
function glyphCountLiteral(s){if(!s)return 0;let bytes=0,nul=0;for(let i=0;i<s.length;i++){if(s[i]==='\\'){const oct=s.slice(i+1).match(/^[0-7]{1,3}/);if(oct){const v=parseInt(oct[0],8);bytes++;if(v===0)nul++;i+=oct[0].length;continue}if(i+1<s.length){bytes++;if(s[i+1]==='0')nul++;i++;continue}}bytes++;if(s.charCodeAt(i)===0)nul++}if(bytes>=2&&nul>=Math.max(1,Math.floor(bytes*.25)))return Math.max(1,Math.ceil(bytes/2));return bytes}
function glyphCountHex(s){const h=(s||'').replace(/[^0-9A-Fa-f]/g,'');const b=Math.floor(h.length/2);return b>=2&&b%2===0?b/2:b}
function extractTextOpGlyphs(text){const vals=[];let m;const tj=/((?:\((?:\\.|[^\)])*\))|(?:<[0-9A-Fa-f\s]+>))\s*Tj\b/g;while((m=tj.exec(text))!==null){const x=m[1];vals.push(x[0]==='<'?glyphCountHex(x.slice(1,-1)):glyphCountLiteral(x.slice(1,-1)))}const tjarr=/\[([\s\S]{0,8000}?)\]\s*TJ\b/g;while((m=tjarr.exec(text))!==null){let sum=0,sm;const sr=/(?:\((?:\\.|[^\)])*\))|(?:<([0-9A-Fa-f\s]+)>)/g;while((sm=sr.exec(m[1]))!==null){const tok=sm[0];sum+=tok[0]==='<'?glyphCountHex(tok.slice(1,-1)):glyphCountLiteral(tok.slice(1,-1))}vals.push(sum)}return vals}
function textOperatorStats(text){let depth=0,outside=0,marked=0;for(const line of text.split(/\r?\n/)){const st=line.trim();const opens=(st.match(/\b(?:BDC|BMC)\b/g)||[]).length;const closes=(st.match(/\bEMC\b/g)||[]).length;if(opens){depth+=opens;marked+=opens}const ops=(st.match(/(?:\)|>|\])\s*(?:Tj|TJ)\b/g)||[]).length;if(ops&&depth===0)outside+=ops;depth=Math.max(0,depth-closes)}const glyphs=extractTextOpGlyphs(text);const total=glyphs.length;const tm=(text.match(/(?:^|\s)Tm(?:\s|$)/g)||[]).length;const td=(text.match(/(?:^|\s)T[dD](?:\s|$)/g)||[]).length;const bt=(text.match(/(?:^|\s)BT(?:\s|$)/g)||[]).length;const single=glyphs.filter(x=>x===1).length;const tiny=glyphs.filter(x=>x<=2).length;const mean=total?glyphs.reduce((a,b)=>a+b,0)/total:0;const sorted=[...glyphs].sort((a,b)=>a-b);const median=total?sorted[Math.floor(total/2)]:0;return{total,outside,tm,td,bt,marked,glyphs,singleGlyphOps:single,singleGlyphRatio:total?single/total:0,tinyGlyphRatio:total?tiny/total:0,meanGlyphs:mean,medianGlyphs:median,maxGlyphs:total?Math.max(...glyphs):0,reconstructed:total>=80&&single/total>=.9&&td>=Math.floor(total*.65)}}
async function inflateStreamDetails(bytes,raw){const out=[];if(typeof DecompressionStream==='undefined')return out;const contentRefs=new Set();for(const m of raw.matchAll(/\/Contents\s+(\d+)\s+\d+\s+R/g))contentRefs.add(+m[1]);for(const m of raw.matchAll(/\/Contents\s*\[([^\]]{1,2000})\]/g))for(const r of m[1].matchAll(/(\d+)\s+\d+\s+R/g))contentRefs.add(+r[1]);const objRe=/(?:^|[\r\n])\s*(\d+)\s+(\d+)\s+obj\b/g;const objs=[];let om;while((om=objRe.exec(raw))!==null)objs.push({num:+om[1],gen:+om[2],start:om.index});for(let oi=0;oi<objs.length;oi++){const o=objs[oi],objEnd=raw.indexOf('endobj',o.start);if(objEnd<0)continue;const idx=raw.indexOf('stream',o.start);if(idx<0||idx>objEnd)continue;const dictStart=raw.indexOf('<<',o.start);if(dictStart<0||dictStart>idx)continue;const dict=raw.slice(dictStart,idx);if(!/\/FlateDecode\b/.test(dict))continue;const isForm=/\/Subtype\s*\/Form\b/.test(dict),isMeta=/\/Type\s*\/Metadata\b/.test(dict),isObjStm=/\/Type\s*\/ObjStm\b/.test(dict),isContent=contentRefs.has(o.num),isImage=/\/Subtype\s*\/Image\b/.test(dict);if(isImage||(!isForm&&!isMeta&&!isObjStm&&!isContent))continue;let start=idx+6;if(raw[start]==='\r'&&raw[start+1]==='\n')start+=2;else if(raw[start]==='\n'||raw[start]==='\r')start++;const end=raw.indexOf('endstream',start);if(end<0||end>objEnd)continue;let e=end;while(e>start&&[10,13,32].includes(bytes[e-1]))e--;try{const decomp=new DecompressionStream('deflate');const ab=await new Response(new Blob([bytes.slice(start,e)]).stream().pipeThrough(decomp)).arrayBuffer();const text=bytesToLatin1(new Uint8Array(ab));const trim=text.trim();const stats=(isMeta||isObjStm)?{total:0,outside:0,tm:0,td:0,bt:0,marked:0,glyphs:[],singleGlyphOps:0,singleGlyphRatio:0,tinyGlyphRatio:0,meanGlyphs:0,medianGlyphs:0,maxGlyphs:0,reconstructed:false}:textOperatorStats(text);const kind=isForm?'Form':isMeta?'Metadata':isObjStm?'ObjectStream':'Content';out.push({text,dict,kind,objectNum:o.num,generation:o.gen,compressedLength:e-start,decompressedLength:text.length,trim,stats,tinyGraphicsSave:!isMeta&&!isObjStm&&/^q\s*$/.test(trim),appendText:!isMeta&&!isObjStm&&/^Q\s+(?:q\s+)?BT\b/.test(trim)&&stats.total>=2,glyphByGlyph:stats.reconstructed||stats.singleGlyphRatio>=.9&&stats.total>=12})}catch(_){}}return out}
function parseContentArrays(text){const out=[];for(const m of text.matchAll(/\/Contents\s*\[([^\]]{1,1200})\]/g)){const refs=[...m[1].matchAll(/(\d+)\s+\d+\s+R/g)].map(x=>+x[1]);if(refs.length){const key=refs.join(',');if(!out.some(x=>x.key===key))out.push({key,refs})}}return out}
function overlaySignals(streams,arrays,tagged){const q=streams.filter(x=>x.tinyGraphicsSave&&x.objectNum!==null);const ap=streams.filter(x=>x.appendText&&x.objectNum!==null);const pairs=[];for(const a of arrays){for(const qs of q){for(const ps of ap){const qi=a.refs.indexOf(qs.objectNum),pi=a.refs.indexOf(ps.objectNum);if(qi>=0&&pi>qi)pairs.push({array:a.refs,qObj:qs.objectNum,textObj:ps.objectNum,textOps:ps.stats.total,untaggedOps:ps.stats.outside,glyphByGlyph:ps.glyphByGlyph})}}}const untagged=tagged?streams.filter(x=>x.stats.outside>=2&&x.stats.total>=2):[];return{qCount:q.length,appendCount:ap.length,pairs,untaggedTextOps:untagged.reduce((n,x)=>n+x.stats.outside,0),untaggedStreams:untagged.map(x=>({objectNum:x.objectNum,total:x.stats.total,outside:x.stats.outside,glyphByGlyph:x.glyphByGlyph,decompressedLength:x.decompressedLength}))}}
function detectEditors(joined,meta,xmp={}){const hay=(joined+' '+Object.values(meta||{}).join(' ')+' '+Object.values(xmp||{}).join(' ')).toLowerCase();const groups=[
{name:'Sejda / SAMBox',category:'pdf-editor',level:'high',points:58,patterns:['sejda.com','sejda ','www.sejda.org','sambox']},
{name:'iLovePDF',category:'pdf-editor',level:'high',points:55,patterns:['ilovepdf']},{name:'Smallpdf',category:'pdf-editor',level:'high',points:55,patterns:['smallpdf']},{name:'PDF24',category:'pdf-editor',level:'high',points:52,patterns:['pdf24']},{name:'PDFescape',category:'pdf-editor',level:'high',points:52,patterns:['pdfescape']},{name:'DocHub',category:'pdf-editor',level:'high',points:48,patterns:['dochub']},
{name:'Adobe Acrobat',category:'pdf-editor',level:'medium',points:32,patterns:['adobe acrobat','acrobat distiller']},{name:'Foxit',category:'pdf-editor',level:'medium',points:30,patterns:['foxit']},{name:'Nitro PDF',category:'pdf-editor',level:'medium',points:30,patterns:['nitro pdf']},{name:'PDF-XChange',category:'pdf-editor',level:'medium',points:30,patterns:['pdf-xchange']},
{name:'Canva',category:'authoring',level:'high',points:34,patterns:['canva']},{name:'Figma',category:'authoring',level:'medium',points:26,patterns:['figma']},{name:'Adobe Illustrator',category:'authoring',level:'medium',points:26,patterns:['adobe illustrator']},{name:'Adobe InDesign',category:'authoring',level:'medium',points:24,patterns:['adobe indesign']},{name:'Adobe Photoshop',category:'authoring',level:'medium',points:26,patterns:['adobe photoshop']},{name:'Microsoft Word / PowerPoint',category:'authoring',level:'medium',points:20,patterns:['microsoft word','microsoft powerpoint']},{name:'LibreOffice',category:'authoring',level:'medium',points:18,patterns:['libreoffice']},{name:'Google Docs / Slides',category:'authoring',level:'medium',points:18,patterns:['google docs','google slides']},{name:'Apple Pages / Keynote',category:'authoring',level:'medium',points:18,patterns:['apple pages','keynote']},
{name:'Apple Preview / Quartz',category:'pdf-editor',level:'medium',points:18,patterns:['mac os x quartz','apple preview','quartz pdfcontext']},{name:'Ghostscript',category:'converter',level:'low',points:12,patterns:['ghostscript']},{name:'qpdf',category:'converter',level:'low',points:10,patterns:['qpdf']}
];const out=groups.filter(g=>g.patterns.some(p=>hay.includes(p)));const prod=String(meta.Producer||'').trim();if(/^3\.0\.38\s*\(\s*5\.1\.24\s*\)\s*$/.test(prod))out.push({name:'Sejda / SAMBox version fingerprint (SAMBox 3.0.38 · Sejda 5.1.24)',category:'pdf-editor',level:'high',points:68,patterns:[]});else if(/^\d+\.\d+\.\d+\s*\(\s*\d+\.\d+\.\d+\s*\)\s*$/.test(prod))out.push({name:'Bare dual-version PDF writer fingerprint',category:'pdf-writer',level:'medium',points:20,patterns:[]});return out.filter((x,i,a)=>a.findIndex(y=>y.name===x.name)===i)}
function fontInfo(text){const names=uniq([...text.matchAll(/\/BaseFont\s*\/([^\s/>]+)/g)].map(m=>m[1]));const subset=names.map(n=>{const m=n.match(/^([A-Z]{6})\+(.+)$/);return m?{prefix:m[1],base:m[2],full:n}:null}).filter(Boolean);const bases={};subset.forEach(x=>(bases[x.base]??=[]).push(x.prefix));const duplicated=Object.entries(bases).filter(([,p])=>uniq(p).length>1).map(([base,p])=>({base,prefixes:uniq(p)}));function family(n){let x=n.replace(/^[A-Z]{6}\+/,'').replace(/#[0-9A-Fa-f]{2}/g,'');x=x.replace(/[-_,](?:Bold|Regular|Medium|SemiBold|Semibold|Light|Italic|Oblique|Black|Book|Roman)(?:Italic|Oblique)?$/i,'');x=x.replace(/(?:Display|Text)$/i,'');return x||n}const families=uniq(names.map(family));return{names,duplicated,families}}
function recompositionSignals(streams,raw){const textStreams=streams.filter(x=>x.stats.total>0);const totalTextOps=textStreams.reduce((n,x)=>n+x.stats.total,0);const rebuilt=textStreams.filter(x=>x.stats.reconstructed);const forms=textStreams.filter(x=>x.kind==='Form').sort((a,b)=>b.stats.total-a.stats.total);const dom=forms[0]||null;const dominantFormRatio=dom&&totalTextOps?dom.stats.total/totalTextOps:0;const wholePageForm=!!(dom&&dom.stats.total>=80&&dominantFormRatio>=.75);const images=count(raw,/\/Subtype\s*\/Image\b/g);const softMasks=count(raw,/\/SMask\b/g);const transparencyGroups=count(raw,/\/S\s*\/Transparency\b/g);const groups=count(raw,/\/Group\b/g);return{totalTextOps,rebuiltStreams:rebuilt.map(x=>({objectNum:x.objectNum,kind:x.kind,textOps:x.stats.total,singleGlyphRatio:x.stats.singleGlyphRatio,td:x.stats.td,tm:x.stats.tm,medianGlyphs:x.stats.medianGlyphs,meanGlyphs:x.stats.meanGlyphs})),reconstructedTextOps:rebuilt.reduce((n,x)=>n+x.stats.total,0),wholePageForm,dominantFormObject:dom?.objectNum??null,dominantFormTextOps:dom?.stats.total??0,dominantFormRatio,images,softMasks,transparencyGroups,groups,graphicsRebuild:wholePageForm&&images>=3&&softMasks>=2&&transparencyGroups>=2}}
function parseIds(raw){const ms=[...raw.matchAll(/\/ID\s*\[\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\]/g)];if(!ms.length)return null;const m=ms[ms.length-1];return{first:m[1],second:m[2],different:m[1]!==m[2],equal:m[1]===m[2],count:ms.length}}
function xmpSignals(text){const packets=count(text,/<x:xmpmeta\b|<xmpmeta\b/gi);const history=count(text,/(?:xmpMM:History|stEvt:action|stEvt:when|<rdf:li[^>]*rdf:parseType=["']Resource)/gi);const derived=/(?:xmpMM:DerivedFrom|stRef:documentID|stRef:instanceID)/i.test(text);const docIds=uniq([...text.matchAll(/(?:xmpMM:DocumentID|xmpMM:OriginalDocumentID)[^>]*>([^<]{1,160})</gi)].map(m=>cleanPdfString(m[1])));const instIds=uniq([...text.matchAll(/xmpMM:InstanceID[^>]*>([^<]{1,160})</gi)].map(m=>cleanPdfString(m[1])));return{packets,history,derived,docIds,instIds}}
function revisionMarkers(raw){const out=[];const re=/startxref\s+(\d+)\s+%%EOF/g;let m;while((m=re.exec(raw))!==null){const off=+m[1];const target=raw.slice(off,off+420);const valid=/^xref(?:\s|$)/.test(target)||/^\s*\d+\s+\d+\s+obj\b[\s\S]{0,360}?\/Type\s*\/XRef\b/.test(target);if(valid){const eofRel=m[0].lastIndexOf('%%EOF');out.push({start:m.index,xrefOffset:off,eofStart:m.index+eofRel,eofEnd:m.index+eofRel+5,targetType:/^xref(?:\s|$)/.test(target)?'table':'stream'})}}return out}
function structuralSignals(raw){const objDefs=[...raw.matchAll(/(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b/g)].map(m=>({num:+m[1],gen:+m[2],offset:m.index}));const counts={};for(const o of objDefs)counts[o.num]=(counts[o.num]||0)+1;const duplicateObjects=Object.entries(counts).filter(([,n])=>n>1).map(([num,n])=>({num:+num,count:n}));const trailerSizes=[...raw.matchAll(/\/Size\s+(\d+)/g)].map(m=>+m[1]);const lastSize=trailerSizes.length?trailerSizes[trailerSizes.length-1]:null;const maxObject=objDefs.length?Math.max(...objDefs.map(o=>o.num)):0;const sizeMismatch=lastSize!==null&&maxObject>=lastSize;const revisions=revisionMarkers(raw);const lastRevision=revisions.length?revisions[revisions.length-1]:null;const lastStartXref=lastRevision?.xrefOffset??null;let startxrefValid=null,startxrefTarget='';if(lastStartXref!==null){const t=raw.slice(lastStartXref,lastStartXref+300);startxrefValid=/^xref(?:\s|$)/.test(t)||/^\s*\d+\s+\d+\s+obj\b[\s\S]{0,220}?\/Type\s*\/XRef\b/.test(t);startxrefTarget=t.slice(0,80).replace(/[\r\n]+/g,' ')}let trailingBytes=0;if(lastRevision){trailingBytes=raw.slice(lastRevision.eofEnd).replace(/[\x00\t\r\n ]/g,'').length}else{const e=[...raw.matchAll(/%%EOF/g)];if(e.length){const end=e[e.length-1].index+5;trailingBytes=raw.slice(end).replace(/[\x00\t\r\n ]/g,'').length}}const byteRanges=[];for(const m of raw.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)){const v=m.slice(1,5).map(Number);byteRanges.push({values:v,signedEnd:v[2]+v[3],fileLength:raw.length,bytesAfter:Math.max(0,raw.length-(v[2]+v[3]))})}const postSignatureBytes=byteRanges.length?Math.max(...byteRanges.map(x=>x.bytesAfter)):0;return{objDefs,duplicateObjects,trailerSizes,lastSize,maxObject,sizeMismatch,revisions,lastStartXref,startxrefValid,startxrefTarget,trailingBytes,byteRanges,postSignatureBytes}}
async function inspect(bytes){const raw=bytesToLatin1(bytes);const streamDetails=await inflateStreamDetails(bytes,raw);const inflated=streamDetails.map(x=>x.text);const joined=raw+'\n'+inflated.join('\n');const strings=literalStrings(joined);const searchable=joined+'\n'+strings.join('\n');const infoText=infoObjectText(raw)||searchable;const info={Creator:lastPdfField(infoText,'Creator'),Producer:lastPdfField(infoText,'Producer'),CreationDate:dateNorm(lastPdfField(infoText,'CreationDate')),ModDate:dateNorm(lastPdfField(infoText,'ModDate')),Title:lastPdfField(infoText,'Title'),Author:lastPdfField(infoText,'Author')};const xf=(names)=>xmlField(searchable,names)||xmlAttr(searchable,names);const xmpMeta={CreatorTool:xf(['CreatorTool']),Producer:xf(['Producer']),CreateDate:dateNorm(xf(['CreateDate','CreationDate'])),ModifyDate:dateNorm(xf(['ModifyDate'])),MetadataDate:dateNorm(xf(['MetadataDate'])),Keywords:xf(['Keywords'])};const creation=info.CreationDate||xmpMeta.CreateDate;const mod=info.ModDate||xmpMeta.ModifyDate||xmpMeta.MetadataDate;const creator=info.Creator||xmpMeta.CreatorTool;const producer=info.Producer||xmpMeta.Producer;const font=fontInfo(searchable);const tagged=/\/Marked\s+true\b/i.test(searchable);const contentArraysDetailed=parseContentArrays(searchable);const overlay=overlaySignals(streamDetails,contentArraysDetailed,tagged);const structural=structuralSignals(raw);const eof=structural.revisions.map(x=>x.eofStart),startxref=structural.revisions.map(x=>x.start);const generationObjects=[...raw.matchAll(/(?:^|\s)(\d+)\s+([1-9]\d*)\s+obj\b/g)].map(m=>({obj:+m[1],gen:+m[2]}));const meta={Creator:creator,Producer:producer,CreationDate:creation,ModDate:mod,Title:info.Title,Author:info.Author};const editors=detectEditors(searchable,meta,xmpMeta);const ids=parseIds(raw);const allCreationDates=uniq([...allPdfFields(searchable,'CreationDate').map(dateNorm),...allXmlFields(searchable,['CreateDate','CreationDate']).map(dateNorm),...allXmlAttrs(searchable,['CreateDate','CreationDate']).map(dateNorm)].filter(Boolean));const allModDates=uniq([...allPdfFields(searchable,'ModDate').map(dateNorm),...allXmlFields(searchable,['ModifyDate','MetadataDate']).map(dateNorm),...allXmlAttrs(searchable,['ModifyDate','MetadataDate']).map(dateNorm)].filter(Boolean));const allCreators=uniq([...allPdfFields(searchable,'Creator'),...allXmlFields(searchable,['CreatorTool']),...allXmlAttrs(searchable,['CreatorTool'])].filter(Boolean));const allProducers=uniq([...allPdfFields(searchable,'Producer'),...allXmlFields(searchable,['Producer']),...allXmlAttrs(searchable,['Producer'])].filter(Boolean));const xmpHistory=xmpSignals(searchable);const infoRefs=count(raw,/\/Info\s+\d+\s+\d+\s+R/g);const metadataObjects=count(raw,/\/Type\s*\/Metadata\b/g);const contentsArrays=contentArraysDetailed.length;const formXObjects=count(raw,/\/Subtype\s*\/Form\b/g);const optionalLayers=count(raw,/\/Type\s*\/OCG\b|\/OCProperties\b/g);const sigFlags=count(raw,/\/SigFlags\s+\d+/g);const objStreams=count(raw,/\/Type\s*\/ObjStm\b/g);const widgets=count(searchable,/\/Subtype\s*\/Widget\b/g);const emptyAcroform=/\/AcroForm\b/.test(searchable)&&/\/Fields\s*\[\s*\]/.test(searchable)&&widgets===0;const recomposition=recompositionSignals(streamDetails,raw);return{raw,joined,searchable,meta,info,xmp:xmpMeta,xmpHistory,structural,editors,ids,font,eof,startxref,revisionMarkers:structural.revisions,prev:count(raw,/\/Prev\s+\d+/g),pages:Math.max(count(searchable,/\/Type\s*\/Page\b/g),1),objects:structural.objDefs.length,generationObjects,streams:count(raw,/\bstream\r?\n/g),flate:count(raw,/\/FlateDecode\b/g),images:recomposition.images,softMasks:recomposition.softMasks,transparencyGroups:recomposition.transparencyGroups,sigs:count(searchable,/\/Type\s*\/Sig\b|\/FT\s*\/Sig\b/g),byteRanges:count(searchable,/\/ByteRange\s*\[/g),sigFlags,annotations:count(searchable,/\/Subtype\s*\/(?:FreeText|Stamp|Ink|Text|Highlight|Square|Circle)\b/g),acroform:/\/AcroForm\b/.test(searchable),emptyAcroform,widgets,pieceInfo:/\/PieceInfo\b/.test(searchable),encrypted:/\/Encrypt\b/.test(raw),xrefStreams:count(raw,/\/Type\s*\/XRef\b/g),xrefTables:count(raw,/(?:^|[\r\n])xref[\r\n]/g),objStreams,header:(raw.match(/%PDF-(\d\.\d)/)||[])[1]||'',catalogVersion:(searchable.match(/\/Version\s*\/(\d\.\d)/)||[])[1]||'',amounts:findAmounts(searchable),clueText:uniq(strings.filter(x=>x.length<240)).slice(0,180).join('\n'),allCreationDates,allModDates,allCreators,allProducers,infoRefs,metadataObjects,contentsArrays,contentArraysDetailed,formXObjects,optionalLayers,tagged,overlay,recomposition,streamDetails:streamDetails.map(x=>({objectNum:x.objectNum,kind:x.kind,decompressedLength:x.decompressedLength,textOps:x.stats.total,untaggedTextOps:x.stats.outside,tinyGraphicsSave:x.tinyGraphicsSave,appendText:x.appendText,glyphByGlyph:x.glyphByGlyph,singleGlyphRatio:+x.stats.singleGlyphRatio.toFixed(3),td:x.stats.td,tm:x.stats.tm,medianGlyphs:x.stats.medianGlyphs,meanGlyphs:+x.stats.meanGlyphs.toFixed(2),reconstructed:x.stats.reconstructed}))}}
async function recoverHistory(bytes,cur){const out=[];const marks=cur.revisionMarkers||[];for(let i=0;i<Math.min(Math.max(0,marks.length-1),6);i++){try{const end=marks[i].eofEnd;const x=await inspect(bytes.slice(0,end));out.push({revision:i+1,size:end,amounts:uniq(x.amounts.map(a=>a.value)),meta:x.meta})}catch(_){}}return out}
function add(arr,severity,title,detail,points=0){arr.push({severity,title,detail,points})}
function normalizeFindingPoints(findings,targetScore){
  const scored=findings.filter(x=>Number(x.points)>0);
  const rawTotal=scored.reduce((sum,x)=>sum+Number(x.points||0),0);
  findings.forEach(x=>{x.rawPoints=Number(x.points||0)});
  if(!scored.length||rawTotal<=targetScore)return findings;
  const apportioned=scored.map((x,i)=>{
    const exact=(x.rawPoints*targetScore)/rawTotal;
    return{x,i,exact,base:Math.floor(exact),fraction:exact-Math.floor(exact)};
  });
  let used=apportioned.reduce((sum,a)=>sum+a.base,0);
  let left=targetScore-used;
  apportioned.sort((a,b)=>b.fraction-a.fraction||b.x.rawPoints-a.x.rawPoints||a.i-b.i);
  for(let i=0;i<left;i++)apportioned[i%apportioned.length].base+=1;
  apportioned.forEach(a=>{a.x.points=a.base});
  return findings;
}
function timestampPoints(sec){if(sec===null)return 0;if(sec<0)return 38;if(sec<60)return 3;if(sec<300)return 8;if(sec<900)return 15;if(sec<3600)return 22;if(sec<86400)return 30;if(sec<604800)return 35;return 40}
function valueMismatch(a,b){return a&&b&&a.trim().toLowerCase()!==b.trim().toLowerCase()}
function score(cur,history,claim){let s=0,visibility=100;const f=[];const revisions=Math.max(1,cur.revisionMarkers?.length||0);const gap=dateGap(cur.meta.CreationDate,cur.meta.ModDate);const editorStrongest=cur.editors.length?[...cur.editors].sort((a,b)=>b.points-a.points)[0]:null;const hasAuthoring=cur.editors.some(x=>x.category==='authoring');
if(editorStrongest){s+=editorStrongest.points;add(f,editorStrongest.level==='high'?'bad':'warn','PDF editor / post-processing provenance detected',`${editorStrongest.name} is identified by the PDF Info/XMP/internal metadata. For an allegedly original carrier ticket, this proves the submitted file passed through another authoring or PDF-processing tool, although it does not by itself prove which field changed.`,editorStrongest.points);if(revisions===1&&(editorStrongest.category==='pdf-editor'||editorStrongest.category==='authoring')){s+=8;visibility-=10;add(f,'warn','Post-processing provenance with only a newly written revision',`The file identifies ${editorStrongest.name}, but only one validated xref/EOF revision survives. This is consistent with a full export/rewrite rather than an incremental save that preserves the previous document state.`,8)}}
const browserCreator=/Chrome|Chromium|AppleWebKit/i.test(cur.meta.Creator||'');const skiaProducer=/Skia\/PDF/i.test(cur.meta.Producer||'');if(browserCreator&&cur.meta.Producer&&!skiaProducer){const p=26;s+=p;add(f,'bad','Browser creator retained, but another PDF writer produced the file',`Creator identifies a browser (${cur.meta.Creator}), while Producer is “${cur.meta.Producer}”. This is strong evidence of a later re-save/post-process of a browser-generated ticket.`,p)}
if(cur.overlay.pairs.length){const best=cur.overlay.pairs[0];const p=34;s+=p;add(f,'bad','Append-mode overlay stream pattern detected',`A page /Contents array contains a graphics-state save stream (object ${best.qObj}) followed by a separate appended text stream (object ${best.textObj}, ${best.textOps} text-show operation(s)). This is strong structural evidence that visible content was added after the original page stream was created.`,p)}
if(cur.tagged&&cur.overlay.untaggedTextOps>=2){const p=28;s+=p;add(f,'bad','Visible text breaks the document tagging structure',`The PDF declares itself tagged, but ${cur.overlay.untaggedTextOps} recovered text-show operation(s) sit outside marked-content/tagging blocks. In an otherwise tagged ticket, this is a strong clue of inserted/reconstructed visible text.`,p)}
const rebuilt=cur.recomposition?.rebuiltStreams||[];if(rebuilt.length){const best=[...rebuilt].sort((a,b)=>b.textOps-a.textOps)[0];const ratio=Math.round(best.singleGlyphRatio*1000)/10;const p=30;s+=p;add(f,'bad','Extreme per-glyph text reconstruction detected',`A recovered ${best.kind} content stream (object ${best.objectNum??'?'}) contains ${best.textOps} text-show operations, with ${ratio}% carrying only one glyph and ${best.td} relative text-position shifts. This pattern is typical of a page being re-authored/exported by a graphics/PDF tool rather than preserving the source document’s original text runs.`,p)}
if(cur.recomposition?.wholePageForm){const pct=Math.round(cur.recomposition.dominantFormRatio*100);const p=24;s+=p;add(f,'bad','Most page text was rewrapped inside a Form XObject',`Form object ${cur.recomposition.dominantFormObject} contains ${cur.recomposition.dominantFormTextOps} text-show operations (${pct}% of recovered text operations). Rewrapping an existing page as a Form is a common import/recompose/export pattern and is materially different from ordinary direct page content.`,p)}
if(cur.recomposition?.graphicsRebuild){const p=12;s+=p;add(f,'warn','Graphics/transparency rebuild accompanies the page rewrap',`The rewritten structure contains ${cur.images} image object(s), ${cur.softMasks} soft-mask reference(s) and ${cur.transparencyGroups} transparency group marker(s). Combined with a dominant Form XObject, this supports full-page re-composition rather than a native ticket-generator export.`,p)}
if(cur.recomposition?.wholePageForm&&cur.font.families.length>=3){const p=9;s+=p;add(f,'warn','Several font families appear inside a reconstructed page',`${cur.font.families.length} normalized font families were recovered (${cur.font.families.slice(0,6).join(', ')}). Multiple families alone are normal, but together with whole-page Form rewrapping/per-glyph serialization they support a graphics-editor export.`,p)}
if(cur.emptyAcroform){const p=6;s+=p;add(f,'warn','Empty AcroForm container present','An /AcroForm structure exists but contains no usable Widget fields. This can be a benign library artifact; together with other rewrite signals it can help fingerprint a general-purpose PDF processing path.',p)}
if(browserCreator&&!skiaProducer&&(cur.xrefStreams||cur.objStreams)){const p=10;s+=p;add(f,'warn','PDF serialization fingerprint changed',`The file uses ${cur.xrefStreams} xref stream(s) and ${cur.objStreams} object stream(s) while retaining a browser Creator but not a Skia/PDF Producer, consistent with full reserialization by another PDF library.`,p)}
if(revisions>1){const p=Math.min(34,24+(revisions-2)*5);s+=p;add(f,'bad','Multiple validated PDF revisions detected',`${revisions} xref/EOF revision blocks were validated. Incremental saves can preserve earlier document states.`,p)}
if(history.length){const old=uniq(history.flatMap(h=>h.amounts));const now=uniq(cur.amounts.map(a=>a.value));const changed=old.length&&now.length&&(old.some(v=>!now.includes(v))||now.some(v=>!old.includes(v)));if(changed){s+=42;add(f,'bad','Price-like amounts changed across retained revisions',`Earlier revision(s): ${old.map(euro).join(', ')} · current recoverable amount(s): ${now.map(euro).join(', ')}.`,42)}}
if(cur.meta.CreationDate&&cur.meta.ModDate){if(gap!==0&&gap!==null){const p=timestampPoints(gap);s+=p;add(f,gap<0?'bad':p>=25?'bad':'warn',gap<0?'Modification timestamp predates creation':'Creation and modification timestamps differ',`Created: ${cur.meta.CreationDate} · modified: ${cur.meta.ModDate} · gap: ${fmtGap(gap)}. PDF timestamps are editable, but a meaningful gap is a strong review signal for an allegedly untouched ticket.`,p);if(revisions===1&&gap>=300){const q=gap>=3600?22:18;s+=q;visibility-=10;add(f,gap>=3600?'bad':'warn','Modification recorded without a retained revision chain',`The PDF records modification ${fmtGap(gap)} after creation, but only one validated revision survives. This is consistent with a full rewrite/export that replaced the earlier PDF rather than appending an incremental update.`,q)}}else if((editorStrongest||cur.recomposition?.wholePageForm)&&revisions===1){const p=18;s+=p;add(f,'warn','Creation and modification dates collapse to one export event',`CreationDate and ModDate are identical (${cur.meta.CreationDate}), while independent post-processing/re-authoring signals are present. A full export can reset both timestamps to the new output time, so matching timestamps should not be treated as “clean” in this context.`,p)}else add(f,'good','Creation and modification timestamps match',`Both metadata timestamps resolve to ${cur.meta.CreationDate}. Matching dates are context only and do not authenticate the ticket.`,0)}
const layerIssues=[];if(valueMismatch(cur.info.Creator,cur.xmp.CreatorTool))layerIssues.push(`Creator: Info “${cur.info.Creator}” vs XMP “${cur.xmp.CreatorTool}”`);if(valueMismatch(cur.info.Producer,cur.xmp.Producer))layerIssues.push(`Producer: Info “${cur.info.Producer}” vs XMP “${cur.xmp.Producer}”`);if(cur.info.CreationDate&&cur.xmp.CreateDate&&cur.info.CreationDate!==cur.xmp.CreateDate)layerIssues.push(`CreationDate: Info ${cur.info.CreationDate} vs XMP ${cur.xmp.CreateDate}`);const xm=cur.xmp.ModifyDate||cur.xmp.MetadataDate;if(cur.info.ModDate&&xm&&cur.info.ModDate!==xm)layerIssues.push(`ModDate: Info ${cur.info.ModDate} vs XMP ${xm}`);if(layerIssues.length){const p=Math.min(36,18+6*(layerIssues.length-1));s+=p;add(f,'bad','PDF Info and XMP metadata disagree',layerIssues.join(' · ')+'. Two metadata layers describing different provenance/times is a useful tampering or rewrite indicator.',p)}else if((cur.info.Creator&&cur.xmp.CreatorTool&&cur.info.Creator.toLowerCase()===cur.xmp.CreatorTool.toLowerCase())||(cur.info.Producer&&cur.xmp.Producer&&cur.info.Producer.toLowerCase()===cur.xmp.Producer.toLowerCase()))add(f,'info','Info and XMP independently corroborate the export provenance',`Both metadata layers point to the same producing/authoring tool${cur.xmp.CreatorTool?' ('+cur.xmp.CreatorTool+')':''}. This strengthens the provenance finding because it is present in more than one metadata representation.`,0)
if(cur.allCreationDates.length>1||cur.allModDates.length>1||cur.allCreators.length>1||cur.allProducers.length>1){const p=18;s+=p;add(f,'warn','Multiple provenance values remain recoverable',`Recovered ${cur.allCreationDates.length} creation date value(s), ${cur.allModDates.length} modification date value(s), ${cur.allCreators.length} creator value(s), and ${cur.allProducers.length} producer value(s). Older/orphaned metadata can survive some save operations.`,p)}
if(cur.xmpHistory.history){const p=12;s+=p;add(f,'warn','XMP editing/history events detected',`${cur.xmpHistory.history} XMP history/event marker(s) were found. These may record save, conversion or editing operations independently of the main PDF dates.`,p)}if(cur.xmpHistory.derived){s+=8;add(f,'warn','XMP DerivedFrom/origin reference detected','XMP indicates that this PDF is derived from another document or prior instance. This is useful provenance evidence for a submitted “original” ticket.',8)}
if(cur.ids&&cur.ids.different){s+=8;add(f,'warn','Trailer document IDs differ','The permanent and changing values in the latest /ID array differ. This is compatible with a later save/update, but is not conclusive alone.',8)}else if(cur.ids&&cur.ids.equal&&revisions===1&&gap!==null&&Math.abs(gap)>=300){const p=18;s+=p;add(f,'bad','Fresh-write document IDs combined with a later modification timestamp',`The two values in the latest PDF /ID array are identical, a pattern associated with a newly written file instance, while the metadata claims a separate creation and modification time. Together these clues support a full rewrite/export rather than preservation of the original PDF revision.`,p)}else if(cur.ids&&cur.ids.equal&&revisions===1&&(editorStrongest||cur.recomposition?.wholePageForm)){const p=10;s+=p;add(f,'warn','Fresh-write PDF ID pair supports a regenerated export',`The two values in the latest /ID array are identical and only one validated revision exists. Combined with independent re-authoring/post-processing evidence, this is consistent with a newly generated PDF output rather than the untouched source file.`,p)}
if(/\.pdf\s*$/i.test(cur.meta.Title||'')&&editorStrongest){const p=8;s+=p;add(f,'warn','Document title looks like an imported PDF filename',`The Title is “${cur.meta.Title}” while a separate authoring/editor tool is identified. Importing a PDF into another application and exporting it again often turns the source filename into document metadata.`,p)}
if(cur.generationObjects.length){const p=Math.min(18,8+cur.generationObjects.length*2);s+=p;add(f,'warn','Non-zero object generations found',`${cur.generationObjects.length} object(s) use a generation number above zero, which can occur when objects are replaced or updated.`,p)}
if(cur.structural.startxrefValid===false){const p=18;s+=p;visibility-=8;add(f,'bad','Final startxref pointer does not resolve cleanly',`The final startxref points to byte ${cur.structural.lastStartXref}, but a valid xref table/stream was not found there. A viewer may be repairing malformed/rebuilt cross-reference data.`,p)}if(cur.structural.sizeMismatch){const p=14;s+=p;add(f,'warn','Trailer /Size is inconsistent with object numbers',`The latest trailer reports /Size ${cur.structural.lastSize}, while object ${cur.structural.maxObject} is present.`,p)}if(revisions===1&&cur.structural.duplicateObjects.length){const p=Math.min(24,14+cur.structural.duplicateObjects.length*3);s+=p;add(f,'bad','Duplicate object definitions in one visible revision',cur.structural.duplicateObjects.slice(0,8).map(x=>`object ${x.num} appears ${x.count} times`).join(' · ')+'. This deserves manual review.',p)}if(cur.structural.trailingBytes>0){const p=10;s+=p;add(f,'warn','Non-whitespace data exists after the final validated %%EOF',`${cur.structural.trailingBytes} non-whitespace byte(s) were found after the final EOF marker.`,p)}if(cur.structural.postSignatureBytes>8){const p=44;s+=p;add(f,'bad','Bytes appear after a signed ByteRange',`At least ${cur.structural.postSignatureBytes} byte(s) occur beyond the end covered by a recovered signature ByteRange.`,p)}
if(cur.font.duplicated.length){s+=14;add(f,'warn','Multiple font subsets of the same font family',cur.font.duplicated.map(x=>`${x.base}: ${x.prefixes.join(', ')}`).join(' · ')+'. This can occur when new text is inserted after the original PDF was produced, although some legitimate generators also create multiple subsets.',14)}if(cur.annotations){s+=10;add(f,'warn','Editable/annotation objects detected',`${cur.annotations} FreeText/Stamp/Ink/Text-like annotation object(s) were found.`,10)}if(cur.pieceInfo){s+=6;add(f,'warn','Application private data (/PieceInfo) detected','The file contains application-specific editing information.',6)}if(cur.optionalLayers){s+=6;add(f,'warn','Optional-content/layer structures detected',`${cur.optionalLayers} optional-content marker(s) were found. Layers can hide or replace visible content, although legitimate PDFs may also use them.`,6)}
if((cur.byteRanges&&!cur.sigs)||(cur.sigFlags&&!cur.sigs)){const p=28;s+=p;add(f,'bad','Signature-related structures appear incomplete',`${cur.byteRanges} ByteRange marker(s), ${cur.sigFlags} SigFlags marker(s), but ${cur.sigs} signature object(s) were recovered.`,p)}else if(cur.sigs||cur.byteRanges)add(f,'good','Digital-signature structure present',`${cur.sigs} signature object(s) and ${cur.byteRanges} ByteRange marker(s) found. This browser version does not cryptographically validate the certificate.`,0)
const textLen=cur.clueText.length;if(cur.images>=cur.pages&&textLen<100){s+=20;visibility-=45;add(f,'warn','Image-heavy or flattened document',`${cur.images} image object(s) were found with little readable PDF text. Flattening can destroy the structural evidence needed to reconstruct earlier text.`,20)}if(cur.meta.Creator===''&&cur.meta.Producer===''){s+=10;visibility-=20;add(f,'warn','Creator/producer metadata is absent','The PDF gives no recoverable Creator or Producer value. This weakens provenance and can occur after sanitizing/rebuilding a file.',10)}if(!cur.meta.CreationDate&&!cur.meta.ModDate){s+=8;visibility-=12;add(f,'warn','Creation/modification timestamps are absent','No recoverable PDF creation or modification date was found.',8)}
if(claim!==null){if(cur.amounts.length){const vals=uniq(cur.amounts.map(a=>a.value));if(!vals.some(v=>Math.abs(v-claim)<.01)){s+=20;add(f,'bad','Claimed amount not found in recoverable PDF content',`Claimed ${euro(claim)}; recoverable values: ${vals.map(euro).join(', ')}. Custom encodings or image text can hide values, so verify manually.`,20)}else add(f,'good','Claimed amount appears in recoverable content',`${euro(claim)} was found in recoverable PDF text/streams. This confirms presence, not authenticity.`,0)}else{visibility-=10;add(f,'warn','Claimed amount could not be extracted','The checker could not recover readable EUR/€ price text. The amount may use custom font encoding or be an image.',0)}}
const rawScore=Math.max(0,s);s=Math.max(0,Math.min(100,rawScore));normalizeFindingPoints(f,s);visibility=Math.max(0,Math.min(100,visibility));let auth;if(s>=75)auth='Manual verification required';else if(s>=45)auth='Not verified — review';else if(s>=20)auth='Inconclusive';else auth='Lower concern — not authenticated';let vis=visibility>=75?'Good':visibility>=45?'Limited':'Low';return{score:s,rawScore,visibility,auth,visibilityLabel:vis,revisions,findings:f,timestampGapSeconds:gap}}
async function sha256(bytes){const h=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}

function euro(v){
  try { return new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(v); }
  catch (_) { return 'EUR ' + Number(v).toFixed(2); }
}

function verdictForScore(s){
  return s>=75?'High concern':s>=45?'Review required':s>=20?'Inconclusive':'Lower concern';
}

function summaryForScore(s){
  return s>=75
    ? 'Strong signals of editing/post-processing or a changed revision were found. Independent verification is recommended before reimbursement.'
    : s>=45
      ? 'The PDF contains signals that deserve manual verification before reimbursement.'
      : s>=20
        ? 'The file cannot be confidently authenticated from its internal structure.'
        : 'No strong manipulation signal was recovered, but this does not prove the ticket is genuine.';
}

function decisionForScore(s, reviewThreshold=45, highRiskThreshold=75){
  if (s >= highRiskThreshold) return 'high_concern';
  if (s >= reviewThreshold) return 'manual_review';
  if (s >= 20) return 'inconclusive';
  return 'lower_concern';
}

function parseClaimAmount(value){
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function inputToBytes(input){
  if (!input) throw new TypeError('analyzePdf(input): a PDF File, Blob, ArrayBuffer, or Uint8Array is required.');
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (typeof input.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer());
  throw new TypeError('Unsupported input. Pass a browser File/Blob, ArrayBuffer, Uint8Array, or another object with arrayBuffer().');
}

function getInputName(input, options){
  return options.fileName || (input && typeof input.name === 'string' ? input.name : 'document.pdf');
}

function ensurePdf(bytes){
  const header = bytesToLatin1(bytes.subarray(0, Math.min(bytes.length, 1024)));
  if (!header.includes('%PDF-')) throw new Error('The selected file does not appear to be a PDF (%PDF- header not found).');
}

function notify(options, stage, percent){
  if (typeof options.onProgress === 'function') {
    try { options.onProgress({stage, percent}); } catch (_) {}
  }
}

/**
 * Analyze one PDF and return a forensic risk report.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array|ArrayBufferView} input
 * @param {Object} [options]
 * @param {number|string|null} [options.claimAmount=null] Optional claimed reimbursement amount.
 * @param {number} [options.reviewThreshold=45] Score at which needsManualReview becomes true.
 * @param {number} [options.highRiskThreshold=75] Score at which highRisk becomes true.
 * @param {number} [options.maxBytes=52428800] Refuse PDFs larger than this many bytes. Set null/0 to disable.
 * @param {string} [options.fileName] Name used in the returned report when input has no .name.
 * @param {(progress:{stage:string,percent:number})=>void} [options.onProgress]
 * @returns {Promise<Object>}
 */
async function analyzePdf(input, options = {}){
  const reviewThreshold = Number.isFinite(options.reviewThreshold) ? options.reviewThreshold : 45;
  const highRiskThreshold = Number.isFinite(options.highRiskThreshold) ? options.highRiskThreshold : 75;
  const maxBytes = options.maxBytes === null || options.maxBytes === 0 ? 0 : (Number.isFinite(options.maxBytes) ? options.maxBytes : 50 * 1024 * 1024);
  const claimAmount = parseClaimAmount(options.claimAmount);

  notify(options, 'read', 5);
  const bytes = await inputToBytes(input);
  if (maxBytes && bytes.byteLength > maxBytes) throw new Error(`PDF is too large (${bytes.byteLength} bytes). Maximum configured size is ${maxBytes} bytes.`);
  ensurePdf(bytes);

  notify(options, 'inspect', 30);
  const cur = await inspect(bytes);

  notify(options, 'revision_history', 58);
  const history = await recoverHistory(bytes, cur);

  notify(options, 'score', 78);
  const scoring = score(cur, history, claimAmount);

  notify(options, 'hash', 92);
  const hash = await sha256(bytes);

  const decision = decisionForScore(scoring.score, reviewThreshold, highRiskThreshold);
  const report = {
    engine: { name: 'PDF Ticket Forensics', version: VERSION },
    generatedAt: new Date().toISOString(),
    file: {
      name: getInputName(input, options),
      size: bytes.byteLength,
      sha256: hash
    },
    claimAmount,
    reviewScore: scoring.score,
    rawEvidenceWeight: scoring.rawScore,
    decision,
    highRisk: scoring.score >= highRiskThreshold,
    needsManualReview: scoring.score >= reviewThreshold,
    verdict: verdictForScore(scoring.score),
    summary: summaryForScore(scoring.score),
    authenticityStatus: scoring.auth,
    forensicVisibility: { score: scoring.visibility, label: scoring.visibilityLabel },
    timestampGapSeconds: scoring.timestampGapSeconds,
    revisions: scoring.revisions,
    findings: scoring.findings,
    document: {
      pages: cur.pages,
      objects: cur.objects,
      streams: cur.streams,
      flateStreams: cur.flate,
      images: cur.images,
      softMasks: cur.softMasks,
      transparencyGroups: cur.transparencyGroups,
      signatures: cur.sigs,
      byteRanges: cur.byteRanges,
      sigFlags: cur.sigFlags,
      annotations: cur.annotations,
      acroform: cur.acroform,
      emptyAcroform: cur.emptyAcroform,
      widgets: cur.widgets,
      tagged: cur.tagged,
      overlay: cur.overlay,
      recomposition: cur.recomposition,
      streamDetails: cur.streamDetails,
      objStreams: cur.objStreams,
      xrefStreams: cur.xrefStreams,
      xrefTables: cur.xrefTables,
      pieceInfo: cur.pieceInfo,
      encrypted: cur.encrypted,
      generationObjects: cur.generationObjects,
      fonts: cur.font.names,
      fontFamilies: cur.font.families,
      fontSubsetAnomalies: cur.font.duplicated,
      ids: cur.ids,
      metadata: cur.meta,
      infoMetadata: cur.info,
      xmpMetadata: cur.xmp,
      allCreationDates: cur.allCreationDates,
      allModificationDates: cur.allModDates,
      allCreators: cur.allCreators,
      allProducers: cur.allProducers,
      infoReferences: cur.infoRefs,
      metadataObjects: cur.metadataObjects,
      contentArrays: cur.contentsArrays,
      formXObjects: cur.formXObjects,
      optionalLayers: cur.optionalLayers,
      validatedRevisionBlocks: cur.revisionMarkers,
      structural: {
        duplicateObjects: cur.structural.duplicateObjects,
        trailerSizes: cur.structural.trailerSizes,
        lastSize: cur.structural.lastSize,
        maxObject: cur.structural.maxObject,
        sizeMismatch: cur.structural.sizeMismatch,
        lastStartXref: cur.structural.lastStartXref,
        startxrefValid: cur.structural.startxrefValid,
        trailingBytes: cur.structural.trailingBytes,
        postSignatureBytes: cur.structural.postSignatureBytes,
        byteRanges: cur.structural.byteRanges
      },
      pdfHeaderVersion: cur.header,
      catalogVersion: cur.catalogVersion,
      detectedEditors: cur.editors.map(x => x.name)
    },
    amounts: cur.amounts.map(a => ({value:a.value, raw:a.raw})),
    history,
    extractedTextClues: cur.clueText
  };

  notify(options, 'done', 100);

  // Convenience fields are repeated at the top so a website can make a decision
  // without knowing the full report schema.
  return {
    score: report.reviewScore,
    decision: report.decision,
    verdict: report.verdict,
    highRisk: report.highRisk,
    needsManualReview: report.needsManualReview,
    forensicVisibility: report.forensicVisibility,
    findings: report.findings,
    report
  };
}

/** Convenience helper when a website only needs a small result. */
async function checkPdf(input, options = {}){
  const result = await analyzePdf(input, options);
  return {
    score: result.score,
    decision: result.decision,
    highRisk: result.highRisk,
    needsManualReview: result.needsManualReview,
    verdict: result.verdict,
    topFindings: result.findings.filter(x => x.points > 0).slice(0, 5).map(x => ({
      title: x.title,
      points: x.points,
      severity: x.severity
    }))
  };
}

return Object.freeze({
  version: VERSION,
  analyzePdf,
  checkPdf
});
});
