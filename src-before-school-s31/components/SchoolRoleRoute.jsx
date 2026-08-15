import {useEffect,useState} from "react";
import {Navigate} from "react-router-dom";
import {supabase} from "../services/supabase";

export default function SchoolRoleRoute({role,children}){
 const[loading,setLoading]=useState(true),[ok,setOk]=useState(false);
 useEffect(()=>{(async()=>{
  try{
   const{data:{session}}=await supabase.auth.getSession();
   if(!session?.user)return;
   const{data:profile}=await supabase.from("profiles").select("role,school_role").eq("id",session.user.id).maybeSingle();
   if(profile?.role?.toLowerCase()==="admin"||profile?.school_role?.toLowerCase()==="school_admin"){setOk(true);return}
   const table=role==="teacher"?"school_teachers":role==="parent"?"school_parents":"school_students";
   const col=role==="parent"?"is_active":"status";
   const expected=role==="parent"?true:"active";
   const{data,error}=await supabase.from(table).select("id").eq("auth_user_id",session.user.id).eq(col,expected).maybeSingle();
   if(error)throw error;setOk(!!data);
  }finally{setLoading(false)}
 })()},[role]);
 if(loading)return <div className="p-10 text-center">جاري التحقق...</div>;
 return ok?children:<Navigate to="/login" replace/>;
}
