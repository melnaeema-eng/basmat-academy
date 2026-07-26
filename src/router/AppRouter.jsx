import Dashboard from "../pages/admin/Dashboard";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AddCourse from "../pages/admin/AddCourse";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Courses from "../pages/Courses";
import About from "../pages/About";
import Contact from "../pages/Contact";
import NotFound from "../pages/NotFound";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
  path="/admin/add-course"
  element={<AddCourse />}
/>
        <Route
  path="/admin/dashboard"
  element={<Dashboard />}
/>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}