import {useEffect,useState} from "react";
import {Navigate} from "react-router-dom";
import {canAccessSchoolArea} from "../../services/schoolAccessService";

export default function SchoolAreaGuard({area,children}){
 const[state,setState]=useState("loading");
 useEffect(()=>{let alive=true;(async()=>{try{const ok=await canAccessSchoolArea(area);if(alive)setState(ok?"ok":"denied")}catch{if(alive)setState("denied")}})();return()=>{alive=false}},[area]);
 if(state==="loading") return <div className="p-8 text-center">جاري التحقق من الصلاحية...</div>;
 if(state==="denied") return <Navigate to="/school/access-denied" replace/>;
 return children;
}
