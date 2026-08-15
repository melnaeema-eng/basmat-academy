import {useEffect,useMemo,useState} from "react";
import {
 FaChartPie,FaFileInvoiceDollar,FaMoneyBillWave,FaPercent,FaPrint,
 FaReceipt,FaSyncAlt,FaWallet,FaArrowDown,FaArrowUp,FaMoneyCheckAlt
} from "react-icons/fa";
import {
 applySchoolSiblingDiscount,
 createSchoolFeeReceipt,
 generateSchoolInstallments,
 generateSchoolPayroll,
 getSchoolCore,
 getSchoolEnrollmentFinanceSummary,
 getSchoolFeeAdjustments,
 getSchoolFeePlans,
 getSchoolFeeReceipts,
 getSchoolFinanceAccounts,
 getSchoolFinanceDashboard,
 getSchoolFinanceTransactions,
 getSchoolInstallments,
 getSchoolPayrollRuns,
 getSchoolPayments,
 getSchoolStudents,
 paySchoolPayroll,
 refreshSchoolOverdue,
 saveSchoolExpense,
 saveSchoolFeePlan,
 saveSchoolIncome
} from "../../../services/schoolService";

const today=()=>new Date().toISOString().slice(0,10);
const feeEmpty={academic_year_id:"",grade_level_id:"",curriculum_id:"",annual_tuition:"",registration_fee:"0",other_fees:"0",installments_count:"10",currency:"SAR",is_active:true};
const receiptEmpty={enrollment_id:"",installment_id:"",amount:"",currency:"SAR",payment_method:"cash",reference_no:"",notes:""};

export default function SchoolFinance(){
 const[tab,setTab]=useState("dashboard"),[core,setCore]=useState(null),[students,setStudents]=useState([]),[plans,setPlans]=useState([]),[installments,setInstallments]=useState([]),[payments,setPayments]=useState([]),[receipts,setReceipts]=useState([]),[adjustments,setAdjustments]=useState([]),[dashboard,setDashboard]=useState({});
 const[accounts,setAccounts]=useState([]),[transactions,setTransactions]=useState([]),[runs,setRuns]=useState([]),[busy,setBusy]=useState(false);
 const[fee,setFee]=useState(feeEmpty),[receipt,setReceipt]=useState(receiptEmpty),[firstDue,setFirstDue]=useState(today()),[financeSummary,setFinanceSummary]=useState(null);
 const[income,setIncome]=useState({income_date:today(),category:"",amount:"",account_id:"",reference_no:"",source:"",description:""});
 const[expense,setExpense]=useState({expense_date:today(),category:"",vendor:"",amount:"",account_id:"",reference_no:"",description:"",status:"paid"});
 const[month,setMonth]=useState(new Date().toISOString().slice(0,7)+"-01"),[payrollAccount,setPayrollAccount]=useState("");

 async function load(){
  const[c,s,p,i,pm,r,a,d,ac,tx,pr]=await Promise.all([
   getSchoolCore(),getSchoolStudents(),getSchoolFeePlans(),getSchoolInstallments(),getSchoolPayments(),
   getSchoolFeeReceipts(),getSchoolFeeAdjustments(),getSchoolFinanceDashboard(),
   getSchoolFinanceAccounts(),getSchoolFinanceTransactions(),getSchoolPayrollRuns()
  ]);
  setCore(c);setStudents(s);setPlans(p);setInstallments(i);setPayments(pm);setReceipts(r);setAdjustments(a);setDashboard(d);setAccounts(ac);setTransactions(tx);setRuns(pr);
  setFee(v=>({...v,academic_year_id:v.academic_year_id||c.years.find(x=>x.is_current)?.id||"",grade_level_id:v.grade_level_id||c.grades[0]?.id||"",curriculum_id:v.curriculum_id||c.curricula[0]?.id||""}));
  setIncome(v=>({...v,account_id:v.account_id||ac[0]?.id||""}));
  setExpense(v=>({...v,account_id:v.account_id||ac[0]?.id||""}));
  setPayrollAccount(v=>v||ac[0]?.id||"");
 }
 useEffect(()=>{load().catch(e=>alert(e.message))},[]);

 const enrollments=useMemo(()=>students.flatMap(s=>(s.school_enrollments||[]).filter(e=>e.status==="active").map(e=>({...e,student:s}))),[students]);
 const selectedEnrollment=enrollments.find(e=>e.id===receipt.enrollment_id);
 const selectedInstallments=installments.filter(x=>x.enrollment_id===receipt.enrollment_id);

 async function withBusy(fn){try{setBusy(true);await fn()}catch(e){alert(e.message)}finally{setBusy(false)}}

 async function selectEnrollment(id){
  setReceipt(v=>({...v,enrollment_id:id,installment_id:"",amount:""}));
  setFinanceSummary(id?await getSchoolEnrollmentFinanceSummary(id):null);
 }
 async function savePlan(e){e.preventDefault();await withBusy(async()=>{await saveSchoolFeePlan(fee);await load();alert("تم حفظ خطة الرسوم")})}
 async function generateInstallments(){if(!receipt.enrollment_id)return alert("اختر الطالب");await withBusy(async()=>{const n=await generateSchoolInstallments(receipt.enrollment_id,firstDue);await load();alert(`تم إنشاء ${n} قسط`)})}
 async function overdue(){await withBusy(async()=>{const n=await refreshSchoolOverdue();await load();alert(`تم تحديث ${n} قسط متأخر`)})}
 async function siblingDiscount(){if(!receipt.enrollment_id)return alert("اختر الطالب");await withBusy(async()=>{const r=await applySchoolSiblingDiscount(receipt.enrollment_id);setFinanceSummary(await getSchoolEnrollmentFinanceSummary(receipt.enrollment_id));await load();alert(r.applied?`تم تطبيق خصم الأشقاء 10% بقيمة ${Number(r.amount||0).toFixed(2)} SAR`:`لم يطبق الخصم: ${r.reason||"غير مستحق"}`)})}
 async function makeReceipt(e){e.preventDefault();await withBusy(async()=>{const r=await createSchoolFeeReceipt(receipt);alert(`تم إصدار الإيصال ${r.receipt_no}`);setReceipt(v=>({...receiptEmpty,enrollment_id:v.enrollment_id}));setFinanceSummary(await getSchoolEnrollmentFinanceSummary(receipt.enrollment_id));await load()})}
 async function addIncome(e){e.preventDefault();await withBusy(async()=>{await saveSchoolIncome(income);setIncome(v=>({...v,category:"",amount:"",reference_no:"",source:"",description:""}));await load();alert("تم تسجيل الإيراد")})}
 async function addExpense(e){e.preventDefault();await withBusy(async()=>{await saveSchoolExpense(expense);setExpense(v=>({...v,category:"",vendor:"",amount:"",reference_no:"",description:""}));await load();alert("تم تسجيل المصروف")})}
 async function genPayroll(){await withBusy(async()=>{const n=await generateSchoolPayroll(month);await load();alert(`تم إنشاء ${n} بند راتب`)})}
 async function payPayroll(id){if(!confirm("تأكيد صرف رواتب هذا المسير؟"))return;await withBusy(async()=>{const n=await paySchoolPayroll(id,payrollAccount);await load();alert(`تم صرف ${n} راتب`)})}

 return <div>
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><h1 className="text-3xl font-extrabold text-[#12345b]">المالية الشاملة</h1><p className="mt-2 text-slate-500">رسوم الطلاب، الأقساط، التحصيل والإيصالات، الخصومات، الحسابات، المصروفات والرواتب.</p></div>
   <button onClick={overdue} disabled={busy} className="academy-btn-dark"><FaSyncAlt/>تحديث المتأخرات</button>
  </div>

  <div className="mt-5 flex flex-wrap gap-2">
   {[
    ["dashboard","الملخص",FaChartPie],["students","رسوم الطلاب",FaFileInvoiceDollar],["plans","خطط الرسوم",FaWallet],
    ["receipts","الإيصالات",FaReceipt],["accounting","الحسابات والمصروفات",FaMoneyBillWave],["payroll","الرواتب",FaMoneyCheckAlt]
   ].map(([k,l,I])=><button key={k} onClick={()=>setTab(k)} className={`rounded-xl px-4 py-2 font-bold ${tab===k?"bg-[#12345b] text-white":"bg-white border"}`}><I className="inline"/> {l}</button>)}
  </div>

  {tab==="dashboard"&&<div className="mt-5">
   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Stat t="تحصيل الطلاب" v={dashboard.student_payments_total||0}/>
    <Stat t="الإيرادات" v={dashboard.income_total||0}/>
    <Stat t="المصروفات" v={dashboard.expense_total||0}/>
    <Stat t="إيصالات" v={dashboard.receipts||0} money={false}/>
    <Stat t="حسابات مالية" v={dashboard.accounts||0} money={false}/>
    <Stat t="رواتب معلقة" v={dashboard.payroll_pending||0}/>
    <Stat t="رواتب مدفوعة" v={dashboard.payroll_paid||0}/>
    <Stat t="قيود مالية" v={dashboard.finance_transactions||0} money={false}/>
   </div>
   <div className="academy-card mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="bg-slate-50 text-right"><th className="p-3">الطالب</th><th>المبلغ</th><th>الطريقة</th><th>القسط</th><th>التاريخ</th></tr></thead><tbody>{payments.slice(0,20).map(x=><tr key={x.id} className="border-t"><td className="p-3">{x.school_enrollments?.school_students?.full_name_ar||"—"}</td><td>{Number(x.amount).toFixed(2)} {x.currency}</td><td>{x.method}</td><td>{x.school_installments?.title||"دفعة عامة"}</td><td>{new Date(x.paid_at).toLocaleString()}</td></tr>)}</tbody></table></div>
  </div>}

  {tab==="students"&&<div className="mt-5 grid gap-6 xl:grid-cols-[420px_1fr]">
   <div className="space-y-5">
    <div className="academy-card space-y-4 p-5">
     <h2 className="font-extrabold text-[#12345b]">اختر الطالب</h2>
     <F l="الطالب/التسجيل"><select className="academy-input" value={receipt.enrollment_id} onChange={e=>selectEnrollment(e.target.value)}><option value="">اختر</option>{enrollments.map(e=><option key={e.id} value={e.id}>{e.student.student_no} — {e.student.full_name_ar}</option>)}</select></F>
     {financeSummary&&<div className="grid grid-cols-2 gap-3 text-sm">
      <Mini t="إجمالي الرسوم" v={financeSummary.gross_due}/><Mini t="الخصومات" v={financeSummary.discounts}/><Mini t="المدفوع" v={financeSummary.paid}/><Mini t="المتبقي" v={financeSummary.balance} danger={Number(financeSummary.balance)>0}/>
     </div>}
     <button disabled={!receipt.enrollment_id||busy} onClick={siblingDiscount} className="academy-btn-primary w-full"><FaPercent/>تطبيق خصم الأشقاء 10%</button>
    </div>
    <div className="academy-card space-y-4 p-5"><h2 className="font-extrabold text-[#12345b]">إنشاء الأقساط</h2><F l="أول تاريخ استحقاق"><input type="date" className="academy-input" value={firstDue} onChange={e=>setFirstDue(e.target.value)}/></F><button disabled={!receipt.enrollment_id||busy} onClick={generateInstallments} className="academy-btn-dark w-full">إنشاء الأقساط</button></div>
    <form onSubmit={makeReceipt} className="academy-card space-y-4 p-5"><h2 className="font-extrabold text-[#12345b]">تسجيل دفعة وإصدار إيصال</h2><F l="القسط"><select className="academy-input" value={receipt.installment_id} onChange={e=>{const it=selectedInstallments.find(x=>x.id===e.target.value);setReceipt({...receipt,installment_id:e.target.value,amount:it?String(Math.max(Number(it.amount)-Number(it.paid_amount||0),0)):""})}}><option value="">دفعة عامة</option>{selectedInstallments.map(x=><option key={x.id} value={x.id}>{x.title} — متبقي {Math.max(Number(x.amount)-Number(x.paid_amount||0),0).toFixed(2)}</option>)}</select></F><F l="المبلغ"><input required type="number" min="0.01" step="0.01" className="academy-input" value={receipt.amount} onChange={e=>setReceipt({...receipt,amount:e.target.value})}/></F><F l="طريقة الدفع"><select className="academy-input" value={receipt.payment_method} onChange={e=>setReceipt({...receipt,payment_method:e.target.value})}><option value="cash">نقدي</option><option value="bank">تحويل بنكي</option><option value="card">بطاقة</option><option value="online">إلكتروني</option></select></F><F l="رقم المرجع"><input className="academy-input" value={receipt.reference_no} onChange={e=>setReceipt({...receipt,reference_no:e.target.value})}/></F><button disabled={!receipt.enrollment_id||busy} className="academy-btn-primary w-full"><FaReceipt/>تسجيل وإصدار إيصال</button></form>
   </div>
   <div className="space-y-3">
    {selectedInstallments.map(x=><div key={x.id} className="academy-card flex flex-wrap justify-between gap-4 p-5"><div><b className="text-[#12345b]">{x.title}</b><div className="text-sm text-slate-500">{x.due_date}</div></div><div className="text-end"><b>{Number(x.paid_amount).toFixed(2)} / {Number(x.amount).toFixed(2)} SAR</b><div className="text-xs">{x.status}</div></div></div>)}
    {!receipt.enrollment_id&&<div className="academy-card p-10 text-center text-slate-400">اختر طالبًا لعرض الأقساط.</div>}
   </div>
  </div>}

  {tab==="plans"&&<div className="mt-5 grid gap-6 xl:grid-cols-[430px_1fr]"><form onSubmit={savePlan} className="academy-card space-y-4 p-5"><h2 className="font-extrabold text-[#12345b]">خطة رسوم</h2><F l="العام"><select className="academy-input" value={fee.academic_year_id} onChange={e=>setFee({...fee,academic_year_id:e.target.value})}>{(core?.years||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F><F l="الصف"><select className="academy-input" value={fee.grade_level_id} onChange={e=>setFee({...fee,grade_level_id:e.target.value})}>{(core?.grades||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></F><F l="المنهج"><select className="academy-input" value={fee.curriculum_id} onChange={e=>setFee({...fee,curriculum_id:e.target.value})}>{(core?.curricula||[]).map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></F><F l="الرسوم السنوية"><input required type="number" min="0" className="academy-input" value={fee.annual_tuition} onChange={e=>setFee({...fee,annual_tuition:e.target.value})}/></F><F l="رسوم التسجيل"><input type="number" min="0" className="academy-input" value={fee.registration_fee} onChange={e=>setFee({...fee,registration_fee:e.target.value})}/></F><F l="رسوم أخرى"><input type="number" min="0" className="academy-input" value={fee.other_fees} onChange={e=>setFee({...fee,other_fees:e.target.value})}/></F><F l="عدد الأقساط"><input type="number" min="1" max="12" className="academy-input" value={fee.installments_count} onChange={e=>setFee({...fee,installments_count:e.target.value})}/></F><button disabled={busy} className="academy-btn-primary w-full">حفظ الخطة</button></form><div className="grid gap-4 md:grid-cols-2">{plans.map(p=><div key={p.id} className="academy-card p-5"><div className="text-xs text-orange-600">{p.school_academic_years?.name}</div><b>{p.school_grade_levels?.name_ar} — {p.school_curricula?.name_ar}</b><div className="mt-3 text-2xl font-extrabold">{Number(p.annual_tuition).toFixed(2)} {p.currency}</div><div className="text-sm text-slate-500">{p.installments_count} أقساط</div></div>)}</div></div>}

  {tab==="receipts"&&<div className="mt-5 space-y-3">{receipts.map(r=><div key={r.id} className="academy-card flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="text-xs font-bold text-orange-600">{r.receipt_no}</div><b>{r.school_enrollments?.school_students?.full_name_ar||"—"}</b><div className="text-sm text-slate-500">{r.payment_method} • {r.reference_no||"بدون مرجع"}</div></div><div className="text-end"><div className="text-xl font-extrabold">{Number(r.amount).toFixed(2)} {r.currency}</div><button onClick={()=>window.print()} className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold"><FaPrint className="inline"/> طباعة</button></div></div>)}{!receipts.length&&<div className="academy-card p-10 text-center text-slate-500">لا توجد إيصالات حتى الآن.</div>}</div>}

  {tab==="accounting"&&<div className="mt-5 grid gap-6 xl:grid-cols-2">
   <form onSubmit={addIncome} className="academy-card space-y-4 p-5"><h2 className="font-extrabold text-emerald-700"><FaArrowDown className="inline"/> إيراد جديد</h2><F l="التاريخ"><input type="date" className="academy-input" value={income.income_date} onChange={e=>setIncome({...income,income_date:e.target.value})}/></F><F l="التصنيف"><input required className="academy-input" value={income.category} onChange={e=>setIncome({...income,category:e.target.value})}/></F><F l="المبلغ"><input required type="number" min="0.01" className="academy-input" value={income.amount} onChange={e=>setIncome({...income,amount:e.target.value})}/></F><Account accounts={accounts} value={income.account_id} set={v=>setIncome({...income,account_id:v})}/><button className="academy-btn-primary w-full">تسجيل الإيراد</button></form>
   <form onSubmit={addExpense} className="academy-card space-y-4 p-5"><h2 className="font-extrabold text-red-700"><FaArrowUp className="inline"/> مصروف جديد</h2><F l="التاريخ"><input type="date" className="academy-input" value={expense.expense_date} onChange={e=>setExpense({...expense,expense_date:e.target.value})}/></F><F l="التصنيف"><input required className="academy-input" value={expense.category} onChange={e=>setExpense({...expense,category:e.target.value})}/></F><F l="المورد"><input className="academy-input" value={expense.vendor} onChange={e=>setExpense({...expense,vendor:e.target.value})}/></F><F l="المبلغ"><input required type="number" min="0.01" className="academy-input" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})}/></F><Account accounts={accounts} value={expense.account_id} set={v=>setExpense({...expense,account_id:v})}/><button className="academy-btn-dark w-full">تسجيل المصروف</button></form>
   <div className="academy-card xl:col-span-2 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-slate-50 text-right"><th className="p-3">التاريخ</th><th>الوصف</th><th>النوع</th><th>الاتجاه</th><th>المبلغ</th></tr></thead><tbody>{transactions.slice(0,100).map(x=><tr key={x.id} className="border-t"><td className="p-3">{x.transaction_date}</td><td>{x.description}</td><td>{x.transaction_type}</td><td>{x.direction}</td><td className={x.direction==="in"?"text-emerald-700":"text-red-700"}>{Number(x.amount).toFixed(2)}</td></tr>)}</tbody></table></div>
  </div>}

  {tab==="payroll"&&<div className="mt-5"><div className="academy-card flex flex-wrap items-end gap-3 p-5"><F l="شهر الرواتب"><input type="month" className="academy-input" value={month.slice(0,7)} onChange={e=>setMonth(e.target.value+"-01")}/></F><button onClick={genPayroll} disabled={busy} className="academy-btn-primary">إنشاء المسير</button><Account accounts={accounts} value={payrollAccount} set={setPayrollAccount}/></div><div className="mt-5 space-y-4">{runs.map(r=>{const total=(r.school_payroll_items||[]).reduce((a,x)=>a+Number(x.net_salary||0),0);return <div key={r.id} className="academy-card p-5"><div className="flex flex-wrap justify-between gap-3"><div><b>{String(r.payroll_month).slice(0,7)}</b><div className="text-sm text-slate-500">{(r.school_payroll_items||[]).length} موظف • {r.status}</div></div><div className="text-end"><div className="text-2xl font-extrabold">{total.toFixed(2)} SAR</div>{r.status!=="paid"&&<button onClick={()=>payPayroll(r.id)} className="academy-btn-dark mt-2">صرف الرواتب</button>}</div></div></div>})}</div></div>}
 </div>
}

function Stat({t,v,money=true}){return <div className="academy-card p-5"><div className="text-sm text-slate-500">{t}</div><div className="mt-2 text-2xl font-extrabold text-[#12345b]">{money?`${Number(v||0).toFixed(2)} SAR`:v}</div></div>}
function Mini({t,v,danger}){return <div className={`rounded-xl p-3 ${danger?"bg-red-50 text-red-700":"bg-slate-50"}`}><div className="text-xs">{t}</div><b>{Number(v||0).toFixed(2)} SAR</b></div>}
function F({l,children}){return <label className="block"><span className="mb-1.5 block text-sm font-bold">{l}</span>{children}</label>}
function Account({accounts,value,set}){return <F l="الحساب"><select className="academy-input" value={value} onChange={e=>set(e.target.value)}>{accounts.map(x=><option key={x.id} value={x.id}>{x.name_ar}</option>)}</select></F>}
