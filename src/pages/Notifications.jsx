import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { supabase } from "../services/supabase";
export default function Notifications(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){try{const {data:{session}}=await supabase.auth.getSession();if(!session?.user)return;const {data,error}=await supabase.from("notifications").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false});if(error)throw error;setItems(data||[])}catch(e){setError(e.message||"تعذر تحميل الإشعارات")}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function read(id){const {error}=await supabase.from("notifications").update({is_read:true}).eq("id",id);if(!error)setItems(v=>v.map(n=>n.id===id?{...n,is_read:true}:n))}
 return <MainLayout><main className="mx-auto max-w-4xl p-6" dir="rtl"><h1 className="mb-6 text-3xl font-bold">الإشعارات</h1>{error&&<div className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</div>}{loading?<div>جاري التحميل...</div>:<div className="space-y-3">{items.map(n=><button key={n.id} onClick={()=>read(n.id)} className={`w-full rounded-xl border p-4 text-right ${n.is_read?"bg-white":"bg-orange-50"}`}><div className="font-bold">{n.title}</div><div className="mt-1 text-sm">{n.message}</div><div className="mt-2 text-xs text-gray-500">{new Date(n.created_at).toLocaleString("ar-SA")}</div></button>)}{!items.length&&<div className="py-10 text-center text-gray-500">لا توجد إشعارات.</div>}</div>}</main></MainLayout>
}
