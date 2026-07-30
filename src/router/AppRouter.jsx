import { BrowserRouter, Routes, Route } from "react-router-dom";

// Website
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Courses from "../pages/Courses";
import CourseDetails from "../pages/CourseDetails";
import About from "../pages/About";
import Contact from "../pages/Contact";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "../components/ProtectedRoute";

// Admin
import Dashboard from "../pages/admin/Dashboard";
import AddCourse from "../pages/admin/AddCourse";
import AdminCourses from "../pages/admin/Courses";
import AdminLayout from "../layouts/AdminLayout";
import AdminLogin from "../pages/admin/Login";
import ViewCourse from "../pages/admin/ViewCourse";
import EditCourse from "../pages/admin/EditCourse";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* صفحات الموقع */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<Courses />} />

        <Route
          path="/courses/:id"
          element={<CourseDetails />}
        />

        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* تسجيل دخول الإدارة */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* صفحات الإدارة المحمية */}
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
        </Route>

        {/* أي رابط غير موجود */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}