import { supabase } from "./supabase";

export async function getPublicInstructors() {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data || [];
}

export async function getInstructor(id) {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getInstructorCourses(id) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminGetInstructors() {
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminSaveInstructor(payload) {
  if (payload.id) {
    const { data, error } = await supabase
      .from("instructors")
      .update({
        full_name: payload.full_name,
        title: payload.title || null,
        bio: payload.bio || null,
        photo_url: payload.photo_url || null,
        linkedin_url: payload.linkedin_url || null,
        website_url: payload.website_url || null,
        specialties: payload.specialties || [],
        user_id: payload.user_id || null,
        is_active: payload.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("instructors")
    .insert({
      full_name: payload.full_name,
      title: payload.title || null,
      bio: payload.bio || null,
      photo_url: payload.photo_url || null,
      linkedin_url: payload.linkedin_url || null,
      website_url: payload.website_url || null,
      specialties: payload.specialties || [],
      user_id: payload.user_id || null,
      is_active: payload.is_active !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminDeleteInstructor(id) {
  const { error } = await supabase.from("instructors").delete().eq("id", id);
  if (error) throw error;
}

export async function getLearningPaths() {
  const { data, error } = await supabase
    .from("learning_paths")
    .select("*, learning_path_courses(id,order_number,course_id,courses(*))")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    learning_path_courses: [...(p.learning_path_courses || [])].sort(
      (a,b) => Number(a.order_number||0)-Number(b.order_number||0)
    ),
  }));
}

export async function getLearningPath(id) {
  const { data, error } = await supabase
    .from("learning_paths")
    .select("*, learning_path_courses(id,order_number,course_id,courses(*))")
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    ...data,
    learning_path_courses: [...(data.learning_path_courses || [])].sort(
      (a,b) => Number(a.order_number||0)-Number(b.order_number||0)
    ),
  };
}

export async function adminGetLearningPaths() {
  const { data, error } = await supabase
    .from("learning_paths")
    .select("*, learning_path_courses(id,order_number,course_id,courses(id,title,image,price))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminSaveLearningPath(payload, courseIds = []) {
  let path;
  if (payload.id) {
    const { data, error } = await supabase
      .from("learning_paths")
      .update({
        title: payload.title,
        description: payload.description || null,
        image_url: payload.image_url || null,
        level: payload.level || null,
        is_published: payload.is_published !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    path = data;
    const { error: deleteError } = await supabase
      .from("learning_path_courses")
      .delete()
      .eq("path_id", payload.id);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from("learning_paths")
      .insert({
        title: payload.title,
        description: payload.description || null,
        image_url: payload.image_url || null,
        level: payload.level || null,
        is_published: payload.is_published !== false,
      })
      .select()
      .single();
    if (error) throw error;
    path = data;
  }

  if (courseIds.length) {
    const rows = courseIds.map((courseId, index) => ({
      path_id: path.id,
      course_id: courseId,
      order_number: index + 1,
    }));
    const { error } = await supabase.from("learning_path_courses").insert(rows);
    if (error) throw error;
  }
  return path;
}

export async function adminDeleteLearningPath(id) {
  const { error } = await supabase.from("learning_paths").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyLiveSessions() {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*, courses(id,title,image,course_type)")
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function adminGetLiveSessions() {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*, courses(id,title)")
    .order("start_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function adminSaveLiveSession(payload) {
  const row = {
    course_id: payload.course_id,
    title: payload.title,
    provider: payload.provider || "zoom",
    meeting_url: payload.meeting_url,
    start_at: payload.start_at,
    end_at: payload.end_at || null,
    notes: payload.notes || null,
    status: payload.status || "scheduled",
    updated_at: new Date().toISOString(),
  };
  if (payload.id) {
    const { data, error } = await supabase
      .from("live_sessions").update(row).eq("id", payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("live_sessions").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteLiveSession(id) {
  const { error } = await supabase.from("live_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function getAdminReportData() {
  const [profiles, courses, enrollments, payments, certificates, exams] = await Promise.all([
    supabase.from("profiles").select("id",{count:"exact",head:true}).neq("role","admin"),
    supabase.from("courses").select("id",{count:"exact",head:true}),
    supabase.from("enrollments").select("id,course_id,user_id,status,progress,courses(id,title)").limit(100),
    supabase.from("payments").select("id,amount,status,method,created_at,course_id,courses(id,title)").order("created_at",{ascending:false}).limit(100),
    supabase.from("certificates").select("id,issued_at,status,course_id,courses(id,title)",{count:"exact"}).order("issued_at",{ascending:false}).limit(100),
    supabase.from("exams").select("id",{count:"exact",head:true}),
  ]);
  for (const r of [profiles,courses,enrollments,payments,certificates,exams]) {
    if (r.error) throw r.error;
  }
  return {
    counts: {
      students: profiles.count || 0,
      courses: courses.count || 0,
      exams: exams.count || 0,
      certificates: certificates.count || 0,
    },
    enrollments: enrollments.data || [],
    payments: payments.data || [],
    certificates: certificates.data || [],
  };
}
