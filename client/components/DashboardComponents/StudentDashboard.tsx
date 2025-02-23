"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Professor = {
  _id: string;
  name: string;
  email: string;
};

type Course = {
  _id: string;
  title: string;
  code: string;
  description: string;
  professor: Professor;
  TAs: string[];
  students: string[];
  createdAt: string;
};

export default function StudentDashboard({user}:any) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem("token");
  const currentUser = user;
  
  // Add this useEffect to monitor courses changes
  useEffect(() => {
    console.log("Updated courses:", courses);
  }, [courses]);
  
  useEffect(() => {
    const fetchCourses = async () => {
      if (!currentUser?._id) {
        setError("User information not found");
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Active-Role': user.activeRole
          },
        });
  
        if (!res.ok) throw new Error("Failed to fetch courses");
        
        const data = await res.json();
        console.log("API response:", data); // Log the raw API response
  
        const studentCourses = data.filter((course: Course) => 
          course.students && course.students.includes(currentUser._id)
        );
        console.log("Filtered courses:", studentCourses); // Log filtered courses
        
        setCourses(studentCourses);
        setLoading(false);
      } catch (err) {
        console.error("Error details:", err);
        setError("Error loading courses.");
        setLoading(false);
      }
    };
  
    if (currentUser && currentUser.activeRole === "student") {
      fetchCourses();
    } else {
      router.push("/");
    }
  }, [currentUser?._id, token, user.activeRole, router]);
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p>You are not enrolled in any courses.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => {
            console.log("Course ID:", course._id);
            return (
              <div
                key={course._id}
                className="bg-white shadow-md rounded p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  console.log("Navigating to course:", course._id);
                  if (currentUser.activeRole === "student") {
                    router.push(`/dashboard/student/course/${course._id}`);
                  }
                }}
              >
                <h2 className="text-xl font-bold mb-1">{course.title}</h2>
                <p className="text-gray-600">
                  <span className="font-semibold">Code:</span> {course.code}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
