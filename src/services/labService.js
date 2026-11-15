import {supabase} from './supabase';
const fields='id,track,lab_number,slug,title_ar,title_en,summary_ar,summary_en,duration_minutes,price,currency,course_id,lesson_id';
export async function getLabCatalog(track){
 const {data,error}=await supabase.from('academy_lab_catalog').select(fields).eq('track',track).eq('is_published',true).order('lab_number');
 if(error)throw error;return data||[];
}
export async function getLabByCourse(courseId){
 const {data,error}=await supabase.from('academy_lab_catalog').select(fields).eq('course_id',courseId).maybeSingle();
 if(error)throw error;return data;
}
export async function hasLabAccess(labId){
 const {data,error}=await supabase.from('academy_lab_content').select('lab_id').eq('lab_id',labId).maybeSingle();
 if(error)throw error;return !!data;
}
export async function getLabPage(track,slug){
 const {data:lab,error}=await supabase.from('academy_lab_catalog').select(fields).eq('track',track).eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error)throw error;if(!lab)return {lab:null,html:null};
 const {data,error:ce}=await supabase.from('academy_lab_content').select('student_html').eq('lab_id',lab.id).maybeSingle();
 if(ce)throw ce;return {lab,html:data?.student_html||null};
}
export function prepareLabDocument(source,language){
 if(!source)return '';
 const lang=language==='en'?'en':'ar';
 let html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<html\b[^>]*>/i,`<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}">`)
  .replace(/<a class="back"[^>]*>[\s\S]*?<\/a>/g,'')
  .replace(/<a\b([^>]*href="https?:\/\/[^>]+)>/gi,(_,attrs)=>'<a '+attrs.replace(/\s+(target|rel)="[^"]*"/gi,'')+' target="_blank" rel="noopener noreferrer">')
  .replace(/<button[^>]*onclick="window\.print\(\)"[^>]*>[\s\S]*?<\/button>/g,'');
 // Initial content must be visible even when a script cannot run in srcdoc.
 html=html.replace(new RegExp('(<div\\b[^>]*id="lab-'+lang+'"[^>]*)(\\s+hidden)([^>]*>)','i'),'$1$3');
 const style='<style>html[lang="ar"] #lab-ar,html[lang="en"] #lab-en{display:block!important}html[lang="ar"] #lab-en,html[lang="en"] #lab-ar{display:none!important}</style>';
 const script=`<script>(()=>{const root=document.documentElement;function apply(lang){lang=lang==='en'?'en':'ar';root.lang=lang;root.dir=lang==='ar'?'rtl':'ltr';['ar','en'].forEach(code=>{const block=document.getElementById('lab-'+code);if(block)block.hidden=code!==lang});document.querySelectorAll('[data-lab-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.labLanguage===lang)))}document.querySelectorAll('[data-lab-language]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.labLanguage)));apply(root.lang);let viewport={active:false,top:0,bottom:0};function report(){let stage=null;if(viewport.active&&document.visibilityState==='visible'){const block=document.getElementById('lab-'+root.lang);let best=0;block?.querySelectorAll('section').forEach((section,index)=>{const r=section.getBoundingClientRect();const height=Math.max(0,Math.min(r.bottom,viewport.bottom)-Math.max(r.top,viewport.top));if(height>=Math.min(120,r.height/2)&&height>best){best=height;stage=index+1}})}window.parent.postMessage({type:'academy-lab-view',stage},'*')}window.addEventListener('message',event=>{if(event.source===window.parent&&event.data?.type==='academy-viewport'){viewport=event.data;report()}});window.addEventListener('scroll',report,{passive:true});setInterval(report,1000)})();</script>`;
 html=html.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
 // Isolate technical phrases in Arabic prose without changing CLI blocks.
 let skipped=[];
 html=html.split(/(<[^>]+>)/g).map(token=>{
  if(token.startsWith('<')){
   const tag=token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
   if(tag&&/^(pre|code|style|script|svg|textarea)$/i.test(tag[2])){
    if(tag[1])skipped.pop();else if(!/\/>$/.test(token))skipped.push(tag[2]);
   }
   return token;
  }
  if(skipped.length||!/[\u0621-\u064A]/.test(token))return token;
  return token.replace(/([\u0621-\u064A])([A-Za-z0-9])/g,'$1 $2').replace(/([A-Za-z0-9])([\u0621-\u064A])/g,'$1 $2')
   .replace(/(&[a-zA-Z0-9#]+;|[A-Za-z0-9][A-Za-z0-9_+./-]*(?:[ \t]+[A-Za-z0-9][A-Za-z0-9_+./-]*)*)/g,part=>part.startsWith('&')?part:'<bdi dir="ltr">'+part+'</bdi>');
 }).join('');
 return html;
}
export async function getLabPdfPreview(labId){
 const {data,error}=await supabase.from('academy_lab_content').select('student_pdf_pages,student_pdf_page_stages,student_pdf_page_languages').eq('lab_id',labId).maybeSingle();
 if(error)throw error;return {pages:data?.student_pdf_pages||[],stages:data?.student_pdf_page_stages||[],languages:data?.student_pdf_page_languages||[]};
}
export async function getLabProgress(lab){
 const {data:{session},error:authError}=await supabase.auth.getSession();if(authError)throw authError;
 if(!session?.user)return {canRecord:false,loginRequired:true,completed_stages:[],stage_progress:[],progress:0};
 const {data,error}=await supabase.rpc('open_academy_lab_tracking',{p_lab_id:lab.id});
 if(error){if(error.message?.includes('enrollment_required'))return {canRecord:false,loginRequired:false,completed_stages:[],stage_progress:[],progress:0};throw error;}return data;
}
export async function trackLabView(labId,sessionId,stage){
 const {data,error}=await supabase.rpc('track_academy_lab_view',{p_lab_id:labId,p_session_id:sessionId,p_stage:stage});if(error)throw error;return data;
}
