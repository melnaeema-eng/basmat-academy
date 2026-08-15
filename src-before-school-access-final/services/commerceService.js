import {supabase} from "./supabase";
export async function getCart(){const{data,error}=await supabase.from("shopping_cart").select("course_id,courses(id,title,price,image,instructor)").order("created_at");if(error)throw error;return data||[]}
export async function addToCart(courseId){const{data:{session}}=await supabase.auth.getSession();if(!session?.user)throw new Error("Login required");const{error}=await supabase.from("shopping_cart").upsert({user_id:session.user.id,course_id:courseId});if(error)throw error}
export async function removeFromCart(courseId){const{error}=await supabase.from("shopping_cart").delete().eq("course_id",courseId);if(error)throw error}
export async function clearCart(){const{error}=await supabase.from("shopping_cart").delete().neq("course_id","00000000-0000-0000-0000-000000000000");if(error)throw error}
export async function getOrders(){const{data,error}=await supabase.from("orders").select("*,order_items(*)").order("created_at",{ascending:false});if(error)throw error;return data||[]}
export async function getRefunds(admin=false){let q=supabase.from("refund_requests").select("*,courses(id,title),payments(id,amount,currency,method,created_at)").order("requested_at",{ascending:false});const{data,error}=await q;if(error)throw error;return data||[]}
export async function requestRefund(paymentId,reason){const{data,error}=await supabase.rpc("request_refund",{p_payment_id:paymentId,p_reason:reason});if(error)throw error;return data}
export async function decideRefund(id,decision,note=""){const{error}=await supabase.rpc("decide_refund",{p_refund_id:id,p_decision:decision,p_note:note||null});if(error)throw error}
