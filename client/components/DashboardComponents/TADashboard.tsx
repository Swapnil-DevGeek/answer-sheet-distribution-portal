"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Course = {
  _id: string;
  title: string;
  code: string;
  TAs: (string | { _id: string; name?: string })[];
};
export default function TADashboard({user}:any) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const token = localStorage.getItem("token") ;
  const currentUser = user
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Active-Role': user.activeRole
          },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data: Course[] = await res.json();
        const userCourses = data.filter((course) => {
          if (user.activeRole === 'ta') {
            return course.TAs.includes(currentUser._id);
          } else if (user.activeRole === 'student') {
            return course.students.includes(currentUser._id);
          }
          return false;
        });
        setCourses(userCourses);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Error loading courses.");
        setLoading(false);
      }
    };

    if (currentUser && currentUser.activeRole && 
        (currentUser.activeRole === "ta" || currentUser.activeRole === "student")) {
      fetchCourses();
    } else {
      router.push("/");
    }
  }, [currentUser, token, router, user.activeRole]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        {user.activeRole === 'ta' ? 'TA Dashboard' : 'Student Dashboard'}
      </h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p>No courses assigned to you.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white shadow-md rounded p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/${user.activeRole}/course/${course._id}`)}
            >
              <h2 className="text-xl font-bold mb-1">{course.title}</h2>
              <p className="text-gray-600">
                <span className="font-semibold">Code:</span> {course.code}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Role:</span>{" "}
                {user.activeRole === 'ta' ? 'Teaching Assistant' : 'Student'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
