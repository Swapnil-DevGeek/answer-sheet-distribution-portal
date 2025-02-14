"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  professor: Professor | null;
};

const SuperAdminDashboard= ()=> {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const [newCourse, setNewCourse] = useState({
    title: "",
    code: "",
    description: "",
    professor: "",
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCourses();
    fetchProfessors();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error(err);
      setError("Error loading courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfessors = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/professors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch professors");
      const data = await res.json();
      setProfessors(data);
    } catch (err) {
      console.error(err);
      setError("Error loading professors.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setNewCourse({ ...newCourse, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setNewCourse({ ...newCourse, professor: value });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCourse),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create course.");
      }
      const createdCourse = await res.json();
      const professorDetails = professors.find(p => p._id === newCourse.professor);
      const courseWithProfessor = {
        ...createdCourse,
        professor: professorDetails || null
      };
      setCourses(prevCourses => [...prevCourses, courseWithProfessor]);
      setIsModalOpen(false);
      setNewCourse({ title: "", code: "", description: "", professor: "" });
      toast.success("Course created successfully!");
    } catch (err: any) {
      toast.error("Course creation failed!");
      setError(err.message || "Error creating course.");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Course Deleted successfully!");
        setCourses(prevCourses =>
          prevCourses.filter(course => course._id !== courseId)
        );
      } else {
        throw new Error("Failed to delete course.");
      }
    } catch (err) {
      toast.error("Error deleting course");
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Courses Management</h1>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>Add Course</Button>
            </DialogTrigger>
          </Dialog>
        </div>
 
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No courses available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course._id}>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Code:</span> {course.code}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Professor:</span>{" "}
                    {course.professor ? course.professor.name : "N/A"}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteCourse(course._id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <Input
              name="title"
              placeholder="Course Title"
              value={newCourse.title}
              onChange={handleInputChange}
              required
            />
            <Input
              name="code"
              placeholder="Course Code"
              value={newCourse.code}
              onChange={handleInputChange}
              required
            />
            <Textarea
              name="description"
              placeholder="Course Description"
              value={newCourse.description}
              onChange={handleInputChange}
              required
            />
            <Select
              value={newCourse.professor}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Professor" />
              </SelectTrigger>
              <SelectContent>
                {professors.map((prof) => (
                  <SelectItem key={prof._id} value={prof._id}>
                    {prof.name} ({prof.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Course</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;