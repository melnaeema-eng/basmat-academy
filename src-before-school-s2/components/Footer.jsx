import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {FaEnvelope,FaGlobe,FaLinkedin,FaPhoneAlt} from "react-icons/fa";
import logo from "../assets/images/logo.png";

export default function Footer(){
 const{i18n}=useTranslation();const ar=i18n.language?.startsWith("ar");
 const cols=[
  [ar?"الأكاديمية":"Academy",[
   ["/courses",ar?"الدورات":"Courses"],["/paths",ar?"المسارات التعليمية":"Learning Paths"],["/instructors",ar?"المدربون":"Instructors"],["/verify-certificate",ar?"التحقق من الشهادات":"Certificate Verification"]
  ]],
  [ar?"الدعم والسياسات":"Support & Policies",[
   ["/about",ar?"عن الأكاديمية":"About"],["/contact",ar?"تواصل معنا":"Contact"],["/privacy",ar?"سياسة الخصوصية":"Privacy Policy"],["/terms",ar?"الشروط والأحكام":"Terms & Conditions"],["/refund-policy",ar?"سياسة الاسترداد":"Refund Policy"]
  ]]
 ];
 return <footer className="bg-[#061d38] text-white">
  <div className="academy-container grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr_1fr]">
   <div>
    <div className="flex items-center gap-3"><img src={logo} className="h-14 w-14 rounded-xl bg-white p-1 object-contain"/><div><h2 className="text-xl font-extrabold">Basmat Alnawabigh Academy</h2><p className="mt-1 text-xs text-slate-300">Engineering • ICT • ELV • Quality • Planning</p></div></div>
    <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">{ar?"منصة تدريب مهني متخصصة تجمع بين المعرفة الهندسية والتقنية والخبرة العملية، مع اختبارات وشهادات قابلة للتحقق.":"A professional training platform combining engineering, technology and practical expertise with assessments and verifiable certificates."}</p>
    <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300"><a href="mailto:info@basmat-alnawabig.com.sa" className="flex items-center gap-2 hover:text-orange-300"><FaEnvelope/>info@basmat-alnawabig.com.sa</a><a href="https://basmat-alnawabig.com.sa" className="flex items-center gap-2 hover:text-orange-300"><FaGlobe/>basmat-alnawabig.com.sa</a></div>
   </div>
   {cols.map(([title,links])=><div key={title}><h3 className="font-extrabold text-orange-300">{title}</h3><div className="mt-4 space-y-3">{links.map(([to,label])=><Link key={to} to={to} className="block text-sm text-slate-300 hover:text-white">{label}</Link>)}</div></div>)}
  </div>
  <div className="border-t border-white/10"><div className="academy-container flex flex-col gap-2 py-4 text-xs text-slate-400 md:flex-row md:items-center md:justify-between"><span>© {new Date().getFullYear()} Basmat Alnawabigh Academy</span><span>{ar?"جميع الحقوق محفوظة":"All rights reserved"}</span></div></div>
 </footer>
}
