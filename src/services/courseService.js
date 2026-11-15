import {supabase} from './supabase';
export async function getCourses(){
 const [{data,error},{data:labs,error:le}]=await Promise.all([
  supabase.from('courses').select('*').order('created_at',{ascending:false}),
  supabase.from('academy_lab_catalog').select('course_id,track,lab_number,title_ar,title_en,summary_ar,summary_en,price').eq('is_published',true)
 ]);
 if(error)throw error;if(le)throw le;
 const map=new Map((labs||[]).map(l=>[l.course_id,l]));
 return (data||[]).filter(c=>c.status==='Published'||!c.category?.endsWith(' Labs')).map(c=>{
  const l=map.get(c.id);return l?{...c,title_ar:`${l.track.toUpperCase()} — المختبر ${l.lab_number}: ${l.title_ar}`,title_en:`${l.track.toUpperCase()} — Lab ${l.lab_number}: ${l.title_en}`,description_ar:l.summary_ar,description_en:l.summary_en,lab_track:l.track,lab_number:l.lab_number,category_ar:`مختبرات ${l.track.toUpperCase()}`,category_en:`${l.track.toUpperCase()} Labs`,price:l.price}:c;
 });
}
