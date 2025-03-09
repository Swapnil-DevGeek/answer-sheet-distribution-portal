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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  isTa?: boolean;
  displayRole?: string;
};

const SuperAdminDashboard = () => {
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

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("courses");
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    const fetchData = async () => {
      const professorsData = await fetchProfessors();
      await fetchCourses(professorsData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, currentPage, searchTerm, roleFilter, itemsPerPage]);

  const fetchProfessors = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/professors`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch professors");
      const data = await res.json();
      setProfessors(data);
      console.log("Fetched Professors:", data);
      return data;
    } catch (err) {
      console.error(err);
      setError("Error loading professors.");
      return [];
    }
  };

  const fetchCourses = async (currentProfessors: Professor[]) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      
      console.log("Fetched Professors for Courses:", currentProfessors);
      console.log("Fetched Courses:", data);

      const coursesWithProfessors = data.map((course: Course) => {
        const professorDetails = currentProfessors.find(p => p._id === course.professor?._id);
        return {
          ...course,
          professor: professorDetails || null,
        };
      });

      setCourses(coursesWithProfessors);
    } catch (err) {
      console.error(err);
      setError("Error loading courses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        role: roleFilter !== "all" ? roleFilter : "",
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch users");
      
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
      setUserError("Error loading users.");
    } finally {
      setUserLoading(false);
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newCourse),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to create course.");
      }
      const createdCourse = await res.json();
      const professorDetails = professors.find(
        (p) => p._id === newCourse.professor
      );
      const courseWithProfessor = {
        ...createdCourse,
        professor: professorDetails || null,
      };
      setCourses((prevCourses) => [...prevCourses, courseWithProfessor]);
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        toast.success("Course Deleted successfully!");
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course._id !== courseId)
        );
      } else {
        throw new Error("Failed to delete course.");
      }
    } catch (err) {
      toast.error("Error deleting course");
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
      setUploadResult(null); // Reset results when new file is selected
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    
    if (!allowedTypes.includes(uploadFile.type)) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    
    formData.append("trimWhitespace", "true");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/bulk-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload students");
      }

      setUploadResult({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });
      
      if (data.success > 0) {
        toast.success(`Successfully registered ${data.success} students`);
      }
      
      if (data.failed > 0) {
        toast.error(`Failed to register ${data.failed} students`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error uploading students");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
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
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No courses available.
            </div>
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
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Users Management</h1>
              <Dialog open={isBulkUploadModalOpen} onOpenChange={setIsBulkUploadModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Bulk Upload Students</Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="max-w-md"
                />
              </div>
              
              <div className="flex flex-col md:flex-row gap-2">
                <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="professor">Professors</SelectItem>
                    <SelectItem value="ta">Teaching Assistants</SelectItem>
                    <SelectItem value="super_admin">Administrators</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {userError && (
              <div className="p-4 bg-red-100 text-red-700 rounded-md">
                {userError}
              </div>
            )}

            {userLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No users found.
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.displayRole === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                              user.displayRole === 'professor' ? 'bg-blue-100 text-blue-800' :
                              user.displayRole === 'ta' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.displayRole === 'super_admin' ? 'Admin' :
                               user.displayRole === 'professor' ? 'Professor' :
                               user.displayRole === 'ta' ? 'TA' : 'Student'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {users.length} of {totalPages * itemsPerPage} results
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

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

      <Dialog open={isBulkUploadModalOpen} onOpenChange={setIsBulkUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Students</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload CSV or Excel file</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                required
              />
              <p className="text-sm text-gray-500">
                File should contain columns for Name and Email
              </p>
            </div>
            
            {uploadResult && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium">Upload Results:</p>
                <p className="text-green-600">Successfully registered: {uploadResult.success}</p>
                <p className="text-red-600">Failed to register: {uploadResult.failed}</p>
                
                {uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-red-600">Errors:</p>
                    <ul className="text-sm text-red-600 list-disc pl-5 max-h-32 overflow-y-auto">
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsBulkUploadModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={uploadLoading || !uploadFile}
              >
                {uploadLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></span>
                    Uploading...
                  </span>
                ) : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
