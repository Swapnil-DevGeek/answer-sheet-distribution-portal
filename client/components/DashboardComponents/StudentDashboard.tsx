"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  _id: string;
  title: string;
  code: string;
  students: (string | { _id: string; name?: string })[];
};

export default function StudentDashboard({user}:any) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("token") ;
  const currentUser = user;

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data: Course[] = await res.json();
        console.log(currentUser);
        const studentCourses = data.filter((course) =>
          course.students.some((studentId) => {
            console.log(studentId)
            return studentId === currentUser._id
          })
        );
        setCourses(studentCourses);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Error loading courses.");
        setLoading(false);
      }
    };

    if (currentUser && currentUser.role === "student") {
      fetchCourses();
    } else {
      router.push("/");
    }
  }, [currentUser, token, router]);

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
          {courses.map(course => (
            <div
              key={course._id}
              className="bg-white shadow-md rounded p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/student/course/${course._id}`)}
            >
              <h2 className="text-xl font-bold mb-1">{course.title}</h2>
              <p className="text-gray-600">
                <span className="font-semibold">Code:</span> {course.code}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
