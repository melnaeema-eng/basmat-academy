import {supabase} from './supabase';
const bucket='academy-lesson-files';
export const lessonFileAccept='.pdf,.txt,.csv,.pkt,.pka,.zip,.docx,.xlsx,.png,.jpg,.jpeg,.webp';
const types={pdf:'application/pdf',txt:'text/plain',csv:'text/csv',pkt:'application/octet-stream',pka:'application/octet-stream',zip:'application/zip',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
export function validateLessonFile(file){const extension=file?.name.split('.').pop()?.toLowerCase();if(!types[extension])throw new Error('نوع الملف غير مدعوم / Unsupported file type');if(!file.size||file.size>50*1024*1024)throw new Error('الحد الأقصى 50MB / Maximum 50MB');return {extension,mime:types[extension]}}
export async function uploadLessonFile({courseId,lessonId,file,onProgress}){
 const {extension,mime}=validateLessonFile(file),id=crypto.randomUUID(),base=`${courseId}/${id}`,original=`${base}/original.${extension}`;let pdf,loadingTask;
 // Only the administrator's upload browser receives the original PDF.
 if(mime==='application/pdf'){
  const pdfjs=await import('pdfjs-dist');
  const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
  loadingTask=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});try{pdf=await loadingTask.promise}catch(error){await loadingTask.destroy();throw error}
  if(pdf.numPages<1||pdf.numPages>100){await loadingTask.destroy();throw new Error('PDF: الحد الأقصى 100 صفحة / Maximum 100 pages')}
 }
 let paths=[];
 const {error:metadataError}=await supabase.from('academy_lesson_files').insert({id,lesson_id:lessonId,file_name:file.name,mime_type:mime,size_bytes:file.size,original_path:original});if(metadataError){await loadingTask?.destroy();throw metadataError}
 try{
  let {error}=await supabase.storage.from(bucket).upload(original,file,{contentType:mime,upsert:false});if(error)throw error;
  if(pdf){for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),baseViewport=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(2,1800/baseViewport.width,2400/baseViewport.height)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.9));if(!blob)throw new Error('PDF page rendering failed');
   const path=`${base}/pages/${String(i).padStart(4,'0')}.webp`;const result=await supabase.storage.from(bucket).upload(path,blob,{contentType:'image/webp',upsert:false});if(result.error)throw result.error;
   paths.push(path);page.cleanup();canvas.width=canvas.height=0;onProgress?.(i,pdf.numPages);
  }}
  const {error:readyError}=await supabase.from('academy_lesson_files').update({ready:true,page_paths:paths}).eq('id',id);if(readyError)throw readyError;
  return `academy-file:${id}`;
 }catch(error){await supabase.storage.from(bucket).remove([original,...paths]);await supabase.from('academy_lesson_files').delete().eq('id',id);throw error}finally{await loadingTask?.destroy()}
}
export async function getLessonFile(pointer){
 const id=pointer?.startsWith('academy-file:')?pointer.slice(13):null;if(!/^[0-9a-f-]{36}$/i.test(id||''))throw new Error('Invalid attachment');
 const {data,error}=await supabase.from('academy_lesson_files').select('id,file_name,mime_type,size_bytes,original_path,page_paths,ready').eq('id',id).eq('ready',true).single();if(error)throw error;return data;
}
export async function signLessonFilePath(path){const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,60);if(error)throw error;return data.signedUrl}
