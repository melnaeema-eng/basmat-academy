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
export async function getLabPdf(labId){
 const {data,error}=await supabase.from('academy_lab_content').select('student_pdf_base64').eq('lab_id',labId).maybeSingle();
 if(error)throw error;return data?.student_pdf_base64||null;
}
export function prepareLabDocument(source,language){
 if(!source)return '';
 const lang=language==='en'?'en':'ar';
 let html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<html\b[^>]*>/i,`<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}">`)
  .replace(/<a class="back"[^>]*>[\s\S]*?<\/a>/g,'')
  .replace(/<button[^>]*onclick="window\.print\(\)"[^>]*>[\s\S]*?<\/button>/g,'');
 // Initial content must be visible even when a script cannot run in srcdoc.
 html=html.replace(new RegExp('(<div\\b[^>]*id="lab-'+lang+'"[^>]*)(\\s+hidden)([^>]*>)','i'),'$1$3');
 const style='<style>html[lang="ar"] #lab-ar,html[lang="en"] #lab-en{display:block!important}html[lang="ar"] #lab-en,html[lang="en"] #lab-ar{display:none!important}</style>';
 const script=`<script>(()=>{const root=document.documentElement;function apply(lang){lang=lang==='en'?'en':'ar';root.lang=lang;root.dir=lang==='ar'?'rtl':'ltr';['ar','en'].forEach(code=>{const block=document.getElementById('lab-'+code);if(block)block.hidden=code!==lang});document.querySelectorAll('[data-lab-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.labLanguage===lang)))}document.querySelectorAll('[data-lab-language]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.labLanguage)));apply(root.lang)})();</script>`;
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
