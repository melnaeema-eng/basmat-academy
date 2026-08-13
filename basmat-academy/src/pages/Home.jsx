import MainLayout from "../layouts/MainLayout";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import CourseSection from "../components/CourseSection";

export default function Home() {
  return (
    <MainLayout>
      <Hero />
      <Stats />
      <CourseSection />
    </MainLayout>
  );
}