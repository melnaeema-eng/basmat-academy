import {useEffect,useState} from "react";
import {Navigate} from "react-router-dom";
import {supabase} from "../../services/supabase";
import {canAccessSchoolArea,getMySchoolRoles} from "../../services/schoolAccessService";
export function SchoolSessionGuard({children}){
 const[state,setState]=useState("loading");
 useEffect(()=>{(async()=>{const{data}=await supabase.auth.getSession();if(!data.session){setState("login");return}const roles=await getMySchoolRoles();setState(roles.length?"ok":"denied")})().catch(()=>setState("login"))},[]);
 if(state==="loading")return <div className="p-8 text-center">جاري التحقق...</div>;
 if(state==="login")return <Navigate to="/school/login" replace/>;
 if(state==="denied")return <Navigate to="/school/access-denied" replace/>;
 return children;
}
export default function SchoolAreaGuard({area,children}){
 const[state,setState]=useState("loading");
 useEffect(()=>{canAccessSchoolArea(area).then(ok=>setState(ok?"ok":"denied")).catch(()=>setState("denied"))},[area]);
 if(state==="loading")return <div className="p-8 text-center">جاري التحقق من الصلاحية...</div>;
 if(state==="denied")return <Navigate to="/school/access-denied" replace/>;
 return children;
}
