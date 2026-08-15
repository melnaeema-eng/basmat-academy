import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import Search from "../pages/Search";
import CourseAnnouncements from "../pages/CourseAnnouncements";
import LegalPage from "../pages/LegalPage";
import VerifyLanding from "../pages/VerifyLanding";
import Cart from "../pages/Cart";
import PurchaseHistory from "../pages/PurchaseHistory";
import Refunds from "../pages/Refunds";

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
import AdminAnnouncements from "../pages/admin/Announcements";
import AdminSystemHealth from "../pages/admin/SystemHealth";
import AdminRefunds from "../pages/admin/Refunds";
import AdminEmailOutbox from "../pages/admin/EmailOutbox";
// School Mode — Nawabigh Aljazeera School
import SchoolAdminLayout from "../layouts/SchoolAdminLayout";
import SchoolDashboard from "../pages/school/admin/Dashboard";
import SchoolAcademicYears from "../pages/school/admin/AcademicYears";
import SchoolStructure from "../pages/school/admin/Structure";
import SchoolSubjects from "../pages/school/admin/Subjects";
import SchoolClasses from "../pages/school/admin/Classes";
import SchoolStudents from "../pages/school/admin/Students";
import SchoolParents from "../pages/school/admin/Parents";
import SchoolFinance from "../pages/school/admin/Finance";
import SchoolTeachers from "../pages/school/admin/Teachers";
import SchoolTimetable from "../pages/school/admin/Timetable";
import SchoolAttendance from "../pages/school/admin/Attendance";
import SchoolAssignments from "../pages/school/admin/Assignments";
import SchoolExams from "../pages/school/admin/Exams";
import SchoolResults from "../pages/school/admin/Results";
import SchoolClassTeachers from "../pages/school/admin/ClassTeachers";
import SchoolEmployees from "../pages/school/admin/Employees";
import SchoolPayroll from "../pages/school/admin/Payroll";
import SchoolAccounting from "../pages/school/admin/Accounting";
import SchoolContracts from "../pages/school/admin/Contracts";
import SchoolStaffAttendance from "../pages/school/admin/StaffAttendance";
import SchoolLeave from "../pages/school/admin/Leave";
import SchoolLibraryAdmin from "../pages/school/admin/Library";
import SchoolAdmissions from "../pages/school/admin/Admissions";
import SchoolQuestionBank from "../pages/school/admin/QuestionBank";
import SchoolOnlineExams from "../pages/school/admin/OnlineExams";
import SchoolAcademicRecords from "../pages/school/admin/AcademicRecords";
import SchoolCommunications from "../pages/school/admin/Communications";
import SchoolSecurity from "../pages/school/admin/Security";
import SchoolOperationalSetup from "../pages/school/admin/OperationalSetup";
import SmartTimetable from "../pages/school/admin/SmartTimetable";
import SchoolStudentAffairs from "../pages/school/admin/StudentAffairs";
import SchoolNotifications from "../pages/school/portal/Notifications";
import StudentAcademicRecords from "../pages/school/portal/AcademicRecords";
import SchoolCertificateVerify from "../pages/school/CertificateVerify";
import StudentOnlineExams from "../pages/school/portal/OnlineExams";
import StudentExamAttempt from "../pages/school/portal/ExamAttempt";
import SchoolLibraryPortal from "../pages/school/portal/Library";
import SchoolStudentResults from "../pages/school/portal/StudentResults";
import SchoolPortalLayout from "../layouts/SchoolPortalLayout";
import SchoolRoleRoute from "../components/SchoolRoleRoute";
import ProtectedSchoolAdminRoute from "../components/ProtectedSchoolAdminRoute";
import SchoolTeacherDashboard from "../pages/school/portal/TeacherDashboard";
import TeacherProfile from "../pages/school/portal/TeacherProfile";
import SchoolStudentDashboard from "../pages/school/portal/StudentDashboard";
import StudentProfile from "../pages/school/portal/StudentProfile";
import SchoolParentDashboard from "../pages/school/portal/ParentDashboard";
import ParentProfile from "../pages/school/portal/ParentProfile";
import SchoolChooseRole from "../pages/school/portal/ChooseRole";


export default function AppRouter() {
  return (
    <BrowserRouter>
      <IdleLogout />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/school/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/search" element={<Search />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/purchases" element={<PurchaseHistory />} />
        <Route path="/refunds" element={<Refunds />} />

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
        <Route path="/announcements/:courseId" element={<CourseAnnouncements />} />
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
        <Route path="/verify-certificate" element={<VerifyLanding />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/refund-policy" element={<LegalPage type="refund" />} />
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
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
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
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="system-health" element={<AdminSystemHealth />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="email-outbox" element={<AdminEmailOutbox />} />
        </Route>



        {/* Nawabigh Aljazeera School Mode */}
        <Route
          path="/school/admin"
          element={
            <ProtectedSchoolAdminRoute>
              <SchoolAdminLayout />
            </ProtectedSchoolAdminRoute>
          }
        >
          <Route index element={<SchoolDashboard />} />
          <Route path="years" element={<SchoolAcademicYears />} />
          <Route path="structure" element={<SchoolStructure />} />
          <Route path="subjects" element={<SchoolSubjects />} />
          <Route path="classes" element={<SchoolClasses />} />
          <Route path="students" element={<SchoolStudents />} />
          <Route path="parents" element={<SchoolParents />} />
          <Route path="finance" element={<SchoolFinance />} />
          <Route path="teachers" element={<SchoolTeachers />} />
          <Route path="timetable" element={<SchoolTimetable />} />
          <Route path="attendance" element={<SchoolAttendance />} />
          <Route path="assignments" element={<SchoolAssignments />} />
          <Route path="class-teachers" element={<SchoolClassTeachers />} />
          <Route path="exams" element={<SchoolExams />} />
          <Route path="results" element={<SchoolResults />} />
          <Route path="employees" element={<SchoolEmployees />} />
          <Route path="payroll" element={<SchoolPayroll />} />
          <Route path="accounting" element={<SchoolAccounting />} />
          <Route path="contracts" element={<SchoolContracts />} />
          <Route path="staff-attendance" element={<SchoolStaffAttendance />} />
          <Route path="leave" element={<SchoolLeave />} />
          <Route path="library" element={<SchoolLibraryAdmin />} />
          <Route path="admissions" element={<SchoolAdmissions />} />
          <Route path="question-bank" element={<SchoolQuestionBank />} />
          <Route path="online-exams" element={<SchoolOnlineExams />} />
          <Route path="academic-records" element={<SchoolAcademicRecords />} />
          <Route path="security" element={<SchoolSecurity />} />
          <Route path="operations-setup" element={<SchoolOperationalSetup />} />
          <Route path="smart-timetable" element={<SmartTimetable />} />
          <Route path="student-affairs" element={<SchoolStudentAffairs />} />
          <Route path="communications" element={<SchoolCommunications />} />
        </Route>



        <Route path="/school" element={<SchoolPortalLayout />}>
          <Route path="choose-role" element={<SchoolChooseRole />} />
          <Route path="teacher" element={<SchoolRoleRoute role="teacher"><SchoolTeacherDashboard /></SchoolRoleRoute>} />
          <Route path="teacher/classes" element={<SchoolRoleRoute role="teacher"><SchoolTeacherDashboard initialTab="classes" /></SchoolRoleRoute>} />
          <Route path="teacher/attendance" element={<SchoolRoleRoute role="teacher"><SchoolTeacherDashboard initialTab="attendance" /></SchoolRoleRoute>} />
          <Route path="teacher/homework" element={<SchoolRoleRoute role="teacher"><SchoolTeacherDashboard initialTab="homework" /></SchoolRoleRoute>} />
          <Route path="teacher/timetable" element={<SchoolRoleRoute role="teacher"><SchoolTeacherDashboard initialTab="timetable" /></SchoolRoleRoute>} />
          <Route path="teacher/exams" element={<SchoolRoleRoute role="teacher"><SchoolTeacherDashboard initialTab="exams" /></SchoolRoleRoute>} />
          <Route path="teacher/profile" element={<SchoolRoleRoute role="teacher"><TeacherProfile /></SchoolRoleRoute>} />
          <Route path="teacher/library" element={<SchoolRoleRoute role="teacher" allowSchoolAdmin><SchoolLibraryPortal /></SchoolRoleRoute>} />
          <Route path="teacher/notifications" element={<SchoolRoleRoute role="teacher"><SchoolNotifications /></SchoolRoleRoute>} />
          <Route path="student" element={<SchoolRoleRoute role="student"><SchoolStudentDashboard /></SchoolRoleRoute>} />
          <Route path="student/assignments" element={<SchoolRoleRoute role="student"><SchoolStudentDashboard initialTab="assignments" /></SchoolRoleRoute>} />
          <Route path="student/attendance" element={<SchoolRoleRoute role="student"><SchoolStudentDashboard initialTab="attendance" /></SchoolRoleRoute>} />
          <Route path="student/timetable" element={<SchoolRoleRoute role="student"><SchoolStudentDashboard initialTab="timetable" /></SchoolRoleRoute>} />
          <Route path="student/exams" element={<SchoolRoleRoute role="student"><SchoolStudentDashboard initialTab="exams" /></SchoolRoleRoute>} />
          <Route path="student/profile" element={<SchoolRoleRoute role="student"><StudentProfile /></SchoolRoleRoute>} />
          <Route path="student/results" element={<SchoolRoleRoute role="student"><SchoolStudentResults /></SchoolRoleRoute>} />
          <Route path="student/library" element={<SchoolRoleRoute role="student"><SchoolLibraryPortal /></SchoolRoleRoute>} />
          <Route path="student/online-exams" element={<SchoolRoleRoute role="student"><StudentOnlineExams /></SchoolRoleRoute>} />
          <Route path="student/exam/:attemptId" element={<SchoolRoleRoute role="student"><StudentExamAttempt /></SchoolRoleRoute>} />
          <Route path="student/academic-records" element={<SchoolRoleRoute role="student"><StudentAcademicRecords /></SchoolRoleRoute>} />
          <Route path="student/notifications" element={<SchoolRoleRoute role="student"><SchoolNotifications /></SchoolRoleRoute>} />
          <Route path="parent" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard /></SchoolRoleRoute>} />
          <Route path="parent/fees" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="fees" /></SchoolRoleRoute>} />
          <Route path="parent/attendance" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="attendance" /></SchoolRoleRoute>} />
          <Route path="parent/assignments" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="assignments" /></SchoolRoleRoute>} />
          <Route path="parent/timetable" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="timetable" /></SchoolRoleRoute>} />
          <Route path="parent/exams" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="exams" /></SchoolRoleRoute>} />
          <Route path="parent/results" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="results" /></SchoolRoleRoute>} />
          <Route path="parent/books" element={<SchoolRoleRoute role="parent"><SchoolParentDashboard initialTab="books" /></SchoolRoleRoute>} />
          <Route path="parent/profile" element={<SchoolRoleRoute role="parent"><ParentProfile /></SchoolRoleRoute>} />
          <Route path="parent/notifications" element={<SchoolRoleRoute role="parent"><SchoolNotifications /></SchoolRoleRoute>} />
        </Route>

        <Route path="/school/verify-certificate/:code" element={<SchoolCertificateVerify />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}