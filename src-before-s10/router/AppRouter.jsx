import { BrowserRouter, Routes, Route } from "react-router-dom";

// Website
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Courses from "../pages/Courses";
import CourseDetails from "../pages/CourseDetails";
import MyCourses from "../pages/MyCourses";
import LearnCourse from "../pages/LearnCourse";
import Checkout from "../pages/Checkout";
import MyPayments from "../pages/MyPayments";
import Notifications from "../pages/Notifications";
import Profile from "../pages/Profile";
import Exams from "../pages/Exams";
import ExamAttempt from "../pages/ExamAttempt";
import Certificates from "../pages/Certificates";
import CertificateView from "../pages/CertificateView";
import VerifyCertificate from "../pages/VerifyCertificate";
import CourseCompletion from "../pages/CourseCompletion";
import Wishlist from "../pages/Wishlist";
import StudentDashboard from "../pages/StudentDashboard";
import Instructors from "../pages/Instructors";
import InstructorDetails from "../pages/InstructorDetails";
import LearningPaths from "../pages/LearningPaths";
import LearningPathDetails from "../pages/LearningPathDetails";
import LiveSessions from "../pages/LiveSessions";
import About from "../pages/About";
import Contact from "../pages/Contact";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "../components/ProtectedRoute";
import IdleLogout from "../components/IdleLogout";
import ProtectedInstructorRoute from "../components/ProtectedInstructorRoute";
import InstructorDashboard from "../pages/InstructorDashboard";
import CourseQA from "../pages/CourseQA";

// Admin
import Dashboard from "../pages/admin/Dashboard";
import AddCourse from "../pages/admin/AddCourse";
import AdminCourses from "../pages/admin/Courses";
import AdminLayout from "../layouts/AdminLayout";
import AdminLogin from "../pages/admin/Login";
import ViewCourse from "../pages/admin/ViewCourse";
import EditCourse from "../pages/admin/EditCourse";
import Lessons from "../pages/admin/Lessons";
import Payments from "../pages/admin/Payments";
import Students from "../pages/admin/Students";
import StudentDetails from "../pages/admin/StudentDetails";
import AdminExams from "../pages/admin/Exams";
import AdminCertificates from "../pages/admin/Certificates";
import AdminInstructors from "../pages/admin/Instructors";
import AdminLiveSessions from "../pages/admin/LiveSessions";
import AdminLearningPaths from "../pages/admin/LearningPaths";
import AdminReports from "../pages/admin/Reports";
import AdminCoupons from "../pages/admin/Coupons";
import AdminAdvancedAnalytics from "../pages/admin/AdvancedAnalytics";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <IdleLogout />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<Courses />} />

        <Route
          path="/courses/:id"
          element={<CourseDetails />}
        />

        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route path="/instructors/:id" element={<InstructorDetails />} />
        <Route path="/paths" element={<LearningPaths />} />
        <Route path="/paths/:id" element={<LearningPathDetails />} />
        <Route path="/live-sessions" element={<LiveSessions />} />
        <Route path="/qa/:courseId" element={<CourseQA />} />
        <Route path="/instructor/dashboard" element={<ProtectedInstructorRoute><InstructorDashboard /></ProtectedInstructorRoute>} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/my-courses" element={<MyCourses />} />
        <Route path="/learn/:courseId" element={<LearnCourse />} />
        <Route path="/checkout/:courseId" element={<Checkout />} />
        <Route path="/my-payments" element={<MyPayments />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/exams/:courseId" element={<Exams />} />
        <Route path="/exam/:examId" element={<ExamAttempt />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/certificates/:id" element={<CertificateView />} />
        <Route path="/verify/:token" element={<VerifyCertificate />} />
        <Route path="/completion/:courseId" element={<CourseCompletion />} />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          <Route
            path="courses"
            element={<AdminCourses />}
          />

          <Route
            path="add-course"
            element={<AddCourse />}
          />

          <Route
            path="view-course/:id"
            element={<ViewCourse />}
          />

          <Route
            path="edit-course/:id"
            element={<EditCourse />}
          />

          <Route
            path="courses/:courseId/lessons"
            element={<Lessons />}
          />

          <Route
            path="payments"
            element={<Payments />}
          />
          <Route
            path="students"
            element={<Students />}
          />
          <Route
            path="students/:id"
            element={<StudentDetails />}
          />
          <Route
            path="courses/:courseId/exams"
            element={<AdminExams />}
          />
          <Route
            path="certificates"
            element={<AdminCertificates />}
          />
          <Route path="instructors" element={<AdminInstructors />} />
          <Route path="live-sessions" element={<AdminLiveSessions />} />
          <Route path="learning-paths" element={<AdminLearningPaths />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="advanced-analytics" element={<AdminAdvancedAnalytics />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}