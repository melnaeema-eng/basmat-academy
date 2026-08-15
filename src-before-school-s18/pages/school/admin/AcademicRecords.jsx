import {useEffect,useMemo,useState} from "react";
import {FaAward,FaCheck,FaFileAlt,FaGraduationCap,FaPrint,FaSyncAlt} from "react-icons/fa";
import {
  buildSchoolSectionAnnualResults,
  buildSchoolSectionReportCards,
  bulkPromoteSchoolSection,
  getSchoolAnnualResults,
  getSchoolCertificates,
  getSchoolReportCards,
  getSchoolCore,
  getSchoolStudentTranscript,
  issueSchoolCertificate,
  publishSchoolAnnualResult,
  publishSchoolReportCard,
  processSchoolPromotion,
  revokeSchoolCertificate
} from "../../../services/schoolService";

export default function SchoolAcademicRecords(){
 const[core,setCore]=useState(null),[annual,setAnnual]=useState([]),[reportCards,setReportCards]=useState([]),[certs,setCerts]=useState([]),[tab,setTab]=useState("annual"),[term,setTerm]=useState("1");
 const[sourceSection,setSourceSection]=useState(""),[nextYear,setNextYear]=useState(""),[nextSection,setNextSection]=useState("");
 const[transcript,setTranscript]=useState(null),[busy,setBusy]=useState(false);

 async function load(){
  const[c,a,rc,ce]=await Promise.all([getSchoolCore(),getSchoolAnnualResults(),getSchoolReportCards(),getSchoolCertificates()]);
  setCore(c);setAnnual(a);setReportCards(rc);setCerts(ce);
  setSourceSection(v=>v||c.sections[0]?.id||"");
  const current=c.years.find(x=>x.is_current);
  const next=c.years.filter(x=>!current||x.starts_on>current.starts_on).sort((a,b)=>a.starts_on.localeCompare(b.starts_on))[0]||c.years[0];
  setNextYear(v=>v||next?.id||"");
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 const source=core?.sections?.find(x=>x.id===sourceSection);
 const sourceGrade=source?.school_grade_levels;
 const nextGrade=useMemo(()=>{
  if(!sourceGrade||!core)return null;
  return [...core.grades].filter(g=>g.sort_order>sourceGrade.sort_order).sort((a,b)=>a.sort_order-b.sort_order)[0]||null;
 },[sourceGrade,core]);

 const targetSections=(core?.sections||[]).filter(x=>
  x.academic_year_id===nextYear &&
  x.curriculum_id===source?.curriculum_id &&
  x.grade_level_id===nextGrade?.id
 );

 useEffect(()=>{setNextSection(targetSections[0]?.id||"")},[nextYear,sourceSection,nextGrade?.id]);

 async function build(){
  if(!sourceSection)return;
  try{setBusy(true);const n=await buildSchoolSectionAnnualResults(sourceSection);await load();alert(`تم بناء النتائج السنوية لعدد ${n} طالب`)}
  catch(e){alert(e.message)}finally{setBusy(false)}
 }

 async function bulkPromote(){
  if(!sourceSection||!nextYear)return;
  if(!nextGrade){alert("هذا آخر صف. استخدم التخرج بدل الترفيع.");return}
  if(!confirm("تأكيد ترفيع جميع الطلاب الناجحين فقط؟"))return;
  try{
   setBusy(true);
   const r=await bulkPromoteSchoolSection(sourceSection,nextYear,nextSection||null);
   await load();
   alert(`تم الترفيع: ${r?.promoted||0} — غير مرفعين: ${r?.failed_or_draft||0}`);
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 async function singleAction(row,action){
  let reason="";
  if(action!=="promote") reason=prompt("السبب / الملاحظة (اختياري)")||"";
  if(!confirm(`تأكيد ${action} للطالب؟`))return;
  try{
   setBusy(true);
   await processSchoolPromotion({
    enrollment_id:row.enrollment_id,
    action,
    next_academic_year_id:["promote","repeat"].includes(action)?nextYear:null,
    next_class_section_id:action==="promote"?(nextSection||null):null,
    reason
   });
   await load();
  }catch(e){alert(e.message)}finally{setBusy(false)}
 }

 async function certificate(row,type){
  const titleAr=type==="graduation"?"شهادة تخرج":type==="promotion"?"شهادة نجاح وترفيع":"شهادة إتمام";
  const titleEn=type==="graduation"?"Graduation Certificate":type==="promotion"?"Promotion Certificate":"Completion Certificate";
  try{
   const r=await issueSchoolCertificate(row.enrollment_id,type,titleAr,titleEn);
   await load();
   alert(`تم إصدار الشهادة: ${r.certificate_no}\nرمز التحقق: ${r.verification_code}`);
  }catch(e){alert(e.message)}
 }

 async function showTranscript(row){
  const sid=row.school_enrollments?.school_students?.id;
  if(!sid)return;
  try{setTranscript(await getSchoolStudentTranscript(sid));setTab("transcript")}
  catch(e){alert(e.message)}
 }

 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-3xl font-extrabold text-[#12345b]">السجل الأكاديمي والترفيع والشهادات</h1><p className="mt-2 text-slate-500">النتيجة السنوية، الترتيب، الترفيع، الإعادة، التخرج، الشهادات وكشف الدرجات.</p></div>
   <div className="flex flex-wrap gap-2">
    {[["annual","النتائج السنوية"],["term","بطاقات الفصول"],["certificates","الشهادات"],["transcript","كشف الدرجات"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-4 py-2 font-bold ${tab===k?"bg-orange-500 text-white":"bg-white"}`}>{l}</button>)}
   </div>
  </div>

  {tab==="annual"&&<>
   <div className="academy-card mt-6 p-5">
    <div className="grid gap-3 xl:grid-cols-4">
     <F l="الفصل الحالي"><select className="academy-input" value={sourceSection} onChange={e=>setSourceSection(e.target.value)}>{(core?.sections||[]).map(x=><option key={x.id} value={x.id}>{x.school_grade_levels?.name_ar} / {x.section_name} / {x.school_curricula?.name_ar}</option>)}</select></F>
     <F l="العام التالي"><select className="academy-input" value={nextYear} onChange={e=>setNextYear(e.target.value)}>{(core?.years||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
     <F l="الفصل التالي"><select className="academy-input" value={nextSection} onChange={e=>setNextSection(e.target.value)}><option value="">بدون تحديد فصل</option>{targetSections.map(x=><option key={x.id} value={x.id}>{x.school_grade_levels?.name_ar} / {x.section_name}</option>)}</select></F>
     <div className="flex items-end gap-2"><button disabled={busy} onClick={build} className="academy-btn-dark"><FaSyncAlt/>بناء النتائج</button><button disabled={busy||!nextGrade} onClick={bulkPromote} className="academy-btn-primary"><FaGraduationCap/>ترفيع الناجحين</button></div>
    </div>
    {source&&<div className="mt-3 text-sm text-slate-500">التالي المتوقع: <b>{nextGrade?.name_ar||"آخر صف / تخرج"}</b></div>}
   </div>

   <div className="mt-5 overflow-x-auto academy-card">
    <table className="w-full min-w-[1100px] text-sm">
     <thead><tr className="bg-slate-50 text-right"><th className="p-3">الطالب</th><th>الصف</th><th>المعدل</th><th>مواد راسب</th><th>النتيجة</th><th>الترتيب</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
     <tbody>{annual.filter(x=>!sourceSection||x.school_enrollments?.class_section_id===sourceSection).map(r=><tr key={r.id} className="border-t">
      <td className="p-3"><b>{r.school_enrollments?.school_students?.full_name_ar}</b><div className="text-xs text-slate-400">{r.school_enrollments?.school_students?.student_no}</div></td>
      <td>{r.school_enrollments?.school_grade_levels?.name_ar}</td>
      <td><b>{r.average_score??"—"}%</b></td>
      <td>{r.failed_subjects}</td>
      <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${r.result_status==="pass"?"bg-emerald-50 text-emerald-700":r.result_status==="fail"?"bg-red-50 text-red-700":"bg-slate-100"}`}>{r.result_status}</span></td>
      <td>{r.rank_in_class||"—"}</td>
      <td>{r.promotion_status}</td>
      <td><div className="flex flex-wrap gap-2">
       {!r.is_published&&<button onClick={async()=>{await publishSchoolAnnualResult(r.id);await load()}} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">نشر</button>}
       {r.result_status==="pass"&&r.promotion_status==="pending"&&<button onClick={()=>singleAction(r,"promote")} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">ترفيع</button>}
       {r.promotion_status==="pending"&&<button onClick={()=>singleAction(r,"repeat")} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">إعادة السنة</button>}
       {r.result_status==="pass"&&r.promotion_status==="pending"&&<button onClick={()=>singleAction(r,"graduate")} className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700">تخرج</button>}
       <button onClick={()=>certificate(r,r.promotion_status==="graduated"?"graduation":"completion")} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"><FaAward className="inline"/> شهادة</button>
       <button onClick={()=>showTranscript(r)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"><FaFileAlt className="inline"/> كشف</button>
      </div></td>
     </tr>)}</tbody>
    </table>
   </div>
  </>}

  {tab==="term"&&<>
   <div className="academy-card mt-6 flex flex-wrap items-end gap-3 p-5">
    <F l="الفصل"><select className="academy-input" value={sourceSection} onChange={e=>setSourceSection(e.target.value)}>{(core?.sections||[]).map(x=><option key={x.id} value={x.id}>{x.school_grade_levels?.name_ar} / {x.section_name} / {x.school_curricula?.name_ar}</option>)}</select></F>
    <F l="الفصل الدراسي"><select className="academy-input" value={term} onChange={e=>setTerm(e.target.value)}><option value="1">الأول</option><option value="2">الثاني</option><option value="3">الثالث</option></select></F>
    <button disabled={busy} onClick={async()=>{try{setBusy(true);const n=await buildSchoolSectionReportCards(sourceSection,term);await load();alert(`تم بناء ${n} بطاقة نتيجة`)}catch(e){alert(e.message)}finally{setBusy(false)}}} className="academy-btn-dark"><FaSyncAlt/>بناء البطاقات</button>
   </div>
   <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportCards.filter(r=>Number(r.term_no)===Number(term)&&r.school_enrollments?.class_section_id===sourceSection).map(r=><div key={r.id} className="academy-card p-5">
    <h3 className="font-extrabold text-[#12345b]">{r.school_enrollments?.school_students?.full_name_ar}</h3>
    <div className="mt-1 text-sm text-slate-500">الفصل الدراسي {r.term_no}</div>
    <div className="mt-4 text-3xl font-extrabold">{r.average_score??"—"}%</div>
    <div className="mt-2 text-sm">{r.result_status} • حاضر {r.attendance_present} • غائب {r.attendance_absent}</div>
    <div className="mt-4 flex gap-2">{!r.is_published&&<button onClick={async()=>{try{await publishSchoolReportCard(r.id);await load()}catch(e){alert(e.message)}}} className="academy-btn-primary"><FaCheck/>نشر</button>}<button onClick={()=>window.print()} className="academy-btn-dark"><FaPrint/>طباعة</button></div>
   </div>)}</div>
  </>}

  {tab==="certificates"&&<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{certs.map(c=><div key={c.id} className={`academy-card p-5 ${!c.is_valid?"opacity-60":""}`}>
   <div className="text-xs font-bold text-orange-600">{c.certificate_no}</div>
   <h3 className="mt-1 font-extrabold text-[#12345b]">{c.school_students?.full_name_ar}</h3>
   <div className="mt-2 text-sm text-slate-500">{c.title_ar} • {c.school_academic_years?.name}</div>
   <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs"><b>رمز التحقق:</b> <span dir="ltr">{c.verification_code||"—"}</span></div>
   <div className="mt-4 flex gap-2"><button onClick={()=>window.print()} className="academy-btn-dark"><FaPrint/>طباعة</button>{c.is_valid&&<button onClick={async()=>{const reason=prompt("سبب إلغاء الشهادة؟");if(reason){await revokeSchoolCertificate(c.id,reason);await load()}}} className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600">إلغاء</button>}</div>
  </div>)}</div>}

  {tab==="transcript"&&<Transcript data={transcript}/>}
 </div>
}

function Transcript({data}){
 if(!data)return <div className="academy-card mt-6 p-8 text-center text-slate-500">اختر طالبًا من النتائج السنوية واضغط "كشف".</div>;
 return <div className="academy-card mt-6 p-6">
  <div className="flex justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-[#12345b]">كشف الدرجات / Transcript</h2><div className="mt-1">{data.student?.full_name_ar} — {data.student?.student_no}</div></div><button onClick={()=>window.print()} className="academy-btn-dark"><FaPrint/>طباعة</button></div>
  <div className="mt-6 space-y-5">{(data.years||[]).map((y,i)=><section key={i} className="rounded-2xl border p-5">
   <div className="flex flex-wrap justify-between gap-3"><div><b>{y.academic_year}</b><div className="text-sm text-slate-500">{y.grade_ar} • {y.curriculum_ar}</div></div><div className="text-end"><b>{y.annual_average??"—"}%</b><div className="text-xs">{y.annual_result||"—"}</div></div></div>
   <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-right"><th className="p-2">المادة</th><th>الدرجة</th><th>من</th><th>%</th></tr></thead><tbody>{(y.subjects||[]).map((s,j)=><tr key={j} className="border-t"><td className="p-2">{s.subject_ar}</td><td>{s.score}</td><td>{s.max_score}</td><td>{s.percentage}%</td></tr>)}</tbody></table></div>
  </section>)}</div>
 </div>
}

function F({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
