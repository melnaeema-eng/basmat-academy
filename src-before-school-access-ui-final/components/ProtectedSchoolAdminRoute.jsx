import {useEffect,useState} from "react";
import {Navigate} from "react-router-dom";
import {supabase} from "../services/supabase";
export default function ProtectedSchoolAdminRoute({children}){
 const[loading,setLoading]=useState(true),[ok,setOk]=useState(false);
 useEffect(()=>{(async()=>{try{
  const{data:{session}}=await supabase.auth.getSession();if(!session?.user)return;
  const{data,error}=await supabase.from("profiles").select("role,school_role").eq("id",session.user.id).maybeSingle();
  if(error)throw error;
  setOk(data?.role?.trim().toLowerCase()==="admin"||data?.school_role?.trim().toLowerCase()==="school_admin");
 }finally{setLoading(false)}})()},[]);
 if(loading)return <div className="p-10 text-center">جاري التحقق من إدارة المدرسة...</div>;
 return ok?children:<Navigate to="/login" replace/>;
}
