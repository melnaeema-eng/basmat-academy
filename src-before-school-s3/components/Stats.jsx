import { useTranslation } from "react-i18next";
export default function Stats() {
  const { i18n } = useTranslation();
  const ar = i18n.language?.startsWith("ar");
  const stats = ar
    ? [["اتصالات وتقنية", "مسارات تقنية"], ["هندسة وELV", "مسارات هندسية"], ["جودة وتخطيط", "مسارات مهنية"], ["QR", "شهادات قابلة للتحقق"]]
    : [["Telecom & IT", "Technical Paths"], ["Engineering & ELV", "Engineering Paths"], ["Quality & Planning", "Professional Paths"], ["QR", "Verifiable Certificates"]];
  return <section className="border-y border-slate-200 bg-white py-7"><div className="academy-container grid grid-cols-2 gap-5 text-center md:grid-cols-4">{stats.map(([a,b])=><div key={b}><div className="text-xl font-extrabold text-[#08284d] md:text-2xl">{a}</div><div className="mt-1 text-sm text-slate-500">{b}</div></div>)}</div></section>;
}
