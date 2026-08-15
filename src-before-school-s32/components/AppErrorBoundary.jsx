import React from "react";
export default class AppErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return{error}}
 componentDidCatch(error,info){console.error("APP ERROR",error,info)}
 render(){if(this.state.error)return <div dir="rtl" className="min-h-screen bg-slate-50 p-6"><div className="mx-auto mt-20 max-w-xl rounded-2xl bg-white p-8 text-center shadow"><div className="text-5xl">⚠️</div><h1 className="mt-4 text-2xl font-extrabold text-[#08284d]">حدث خطأ في الصفحة</h1><p className="mt-3 text-slate-600">تم منع ظهور الصفحة البيضاء. أعد تحميل الصفحة، وإذا استمر الخطأ راجع Console.</p><button onClick={()=>window.location.reload()} className="mt-6 rounded-xl bg-[#08284d] px-5 py-3 font-bold text-white">إعادة تحميل الصفحة</button></div></div>;return this.props.children}
}
