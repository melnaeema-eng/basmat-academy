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
