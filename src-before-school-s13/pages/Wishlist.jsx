import { useEffect,useState } from "react";
import { Link,Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MainLayout from "../layouts/MainLayout";
import CourseCard from "../components/CourseCard";
import { getCurrentUser } from "../services/enrollmentService";
import { getMyWishlist } from "../services/marketplaceService";

export default function Wishlist(){
 const {i18n}=useTranslation();const[items,setItems]=useState([]),[loading,setLoading]=useState(true),[login,setLogin]=useState(false),[error,setError]=useState("");const ar=i18n.language?.startsWith("ar");
 useEffect(()=>{(async()=>{try{const u=await getCurrentUser();if(!u){setLogin(true);return}setItems(await getMyWishlist())}catch(e){setError(e.message)}finally{setLoading(false)}})()},[]);
 if(login)return <Navigate to="/login" replace/>;
 return <MainLayout><main className="min-h-screen bg-[#f7f9fc] py-10"><div className="academy-container"><h1 className="academy-title text-3xl">{ar?"قائمة الرغبات":"My Wishlist"}</h1><p className="mt-2 text-slate-500">{ar?"احفظ الدورات التي تريد العودة إليها لاحقًا.":"Save courses you want to revisit later."}</p>{error&&<div className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}{loading?<div className="academy-card mt-6 p-10 text-center">{ar?"جاري التحميل...":"Loading..."}</div>:items.length?<div className="mt-7 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map(x=>x.courses&&<CourseCard key={x.id} course={x.courses}/>)}</div>:<div className="academy-card mt-6 p-10 text-center"><p className="text-slate-500">{ar?"قائمة الرغبات فارغة.":"Your wishlist is empty."}</p><Link to="/courses" className="academy-btn-primary mt-4">{ar?"استكشف الدورات":"Browse Courses"}</Link></div>}</div></main></MainLayout>
}
