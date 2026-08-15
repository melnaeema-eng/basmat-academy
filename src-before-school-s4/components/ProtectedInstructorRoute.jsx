import {useEffect,useState} from "react";
import {Navigate} from "react-router-dom";
import {supabase} from "../services/supabase";
export default function ProtectedInstructorRoute({children}){
 const[loading,setLoading]=useState(true),[ok,setOk]=useState(false);
 useEffect(()=>{(async()=>{try{const{data:{session}}=await supabase.auth.getSession();if(!session?.user)return;const{data,error}=await supabase.from("instructors").select("id").eq("user_id",session.user.id).eq("is_active",true).maybeSingle();if(error)throw error;setOk(!!data)}finally{setLoading(false)}})()},[]);
 if(loading)return <div className="p-10 text-center">Loading...</div>;
 return ok?children:<Navigate to="/login" replace/>;
}
