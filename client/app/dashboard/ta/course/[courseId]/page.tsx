"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Loader2, 
  Download, 
  Eye, 
  Upload, 
  Filter, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

type Student = {
  _id: string;
  name: string;
  email: string;
};
type Course = {
  _id: string;
  title: string;
  code: string;
  students: Student[];
};
type AnswerSheet = {
  _id: string;
  examType: string;
  fileUrl: string;
  student: Student;
  createdAt: string;
};

export default function TACourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  const [course, setCourse] = useState<Course | null>(null);
  const [answerSheets, setAnswerSheets] = useState<AnswerSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examType, setExamType] = useState("quiz");
  const [uploading, setUploading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  
  // Bulk upload state
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadExamType, setBulkUploadExamType] = useState("quiz");
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, sheetsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/course/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!courseRes.ok) throw new Error("Failed to fetch course details");
        if (!sheetsRes.ok) throw new Error("Failed to fetch answer sheets");

        const [courseData, sheetsData] = await Promise.all([
          courseRes.json(),
          sheetsRes.json(),
        ]);
        
        // Fetch all students
        const studentsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/students`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!studentsRes.ok) throw new Error("Failed to fetch students");
        const allStudents = await studentsRes.json();
        
        // Filter students that are in the course
        //@ts-ignore
        const courseStudents = allStudents.filter(student => 
          courseData.students.includes(student._id)
        );
        
        // Update course with full student objects
        const courseWithStudents = {
          ...courseData,
          students: courseStudents
        };
        
        setCourse(courseWithStudents);
        setAnswerSheets(sheetsData);
      } catch (err) {
        toast.error("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, token]);

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );
    
    formData.append("resource_type", "raw");
    formData.append("flags", "attachment");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) throw new Error("File upload failed");
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedFile) return;

    try {
      setUploading(true);
      const fileUrl = await uploadToCloudinary(selectedFile);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            course: courseId,
            student: selectedStudentId,
            examType,
            fileUrl,
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save answer sheet");
      }

      const sheetsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/course/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedSheets = await sheetsRes.json();
      setAnswerSheets(updatedSheets);

      toast.success("Answer sheet uploaded successfully");
      setIsDialogOpen(false);
      setSelectedFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBulkUploadFile(e.target.files[0]);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) return;

    try {
      setBulkUploadLoading(true);
      setBulkUploadResult(null);

      const formData = new FormData();
      formData.append("file", bulkUploadFile);
      formData.append("courseId", courseId);
      formData.append("examType", bulkUploadExamType);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/bulk-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Bulk upload failed");
      }

      setBulkUploadResult({
        success: result.success || 0,
        failed: result.failed || 0,
        errors: result.errors || [],
      });

      if (result.success > 0) {
        // Refresh answer sheets list
        const sheetsRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/course/${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const updatedSheets = await sheetsRes.json();
        setAnswerSheets(updatedSheets);
        
        toast.success(`Successfully uploaded ${result.success} answer sheets`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  const getAnswerSheet = (studentId: string) => {
    return answerSheets.find(
      (sheet) => sheet.student._id === studentId && 
      (examTypeFilter === "all" || sheet.examType === examTypeFilter)
    );
  };

  const getSelectedStudent = () => {
    if (!selectedStudentId || !course) return null;
    return course.students.find((s) => s._id === selectedStudentId);
  };

  const selectedStudent = getSelectedStudent();

  // Get unique exam types for filter dropdown
  const uniqueExamTypes = ["all", ...new Set(answerSheets.map(sheet => sheet.examType))];

  // Filter students based on search criteria
  const filteredStudents = course?.students.filter(student => {
    const nameMatch = student.name.toLowerCase().includes(nameFilter.toLowerCase());
    const emailMatch = student.email.toLowerCase().includes(emailFilter.toLowerCase());
    
    // For exam type filter, we need to check if the student has an answer sheet of that type
    const examTypeMatch = examTypeFilter === "all" || 
      answerSheets.some(sheet => 
        sheet.student._id === student._id && sheet.examType === examTypeFilter
      );
    
    return nameMatch && emailMatch && (examTypeFilter === "all" || examTypeMatch);
  }) || [];

  // Pagination logic
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, emailFilter, examTypeFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-gray-500">{course.code}</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            onClick={() => setIsBulkUploadModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {isFilterOpen && (
        <div className="bg-gray-50 p-4 rounded-md mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="name-filter">Filter by Name</Label>
            <Input
              id="name-filter"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email-filter">Filter by Email</Label>
            <Input
              id="email-filter"
              placeholder="Search by email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="exam-type-filter">Filter by Exam Type</Label>
            <Select
              value={examTypeFilter}
              onValueChange={setExamTypeFilter}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select exam type" />
              </SelectTrigger>
              <SelectContent>
                {uniqueExamTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Answer Sheet</TableHead>
              <TableHead>Exam Type</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentStudents.length > 0 ? (
              currentStudents.map((student) => {
                const answerSheet = getAnswerSheet(student._id);
                return (
                  <TableRow key={student._id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {answerSheet && (
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => window.open(answerSheet.fileUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handleDownload(answerSheet.fileUrl, `${student.name}_${answerSheet.examType}.pdf`)}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      )}
                      {!answerSheet && (
                        <span className="text-muted-foreground">Not uploaded</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {answerSheet ? (
                        <span className="capitalize">{answerSheet.examType}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {answerSheet ? (
                        <span>{new Date(answerSheet.createdAt).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!answerSheet && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedStudentId(student._id);
                            setIsDialogOpen(true);
                          }}
                        >
                          Upload
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {course.students.length === 0 
                    ? "No students enrolled" 
                    : "No students match the current filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredStudents.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={studentsPerPage.toString()}
              onValueChange={(value) => {
                setStudentsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevPage} 
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Page number buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => paginate(pageNum)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={nextPage} 
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload Answer Sheet for {selectedStudent?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">PDF File</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="examType">Exam Type</Label>
              <Select
                value={examType}
                onValueChange={setExamType}
                disabled={uploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              Bulk Upload Answer Sheets
            </h3>
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-exam-type">Exam Type</Label>
                <Select 
                  value={bulkUploadExamType} 
                  onValueChange={setBulkUploadExamType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bulk-file-upload">Upload ZIP file</Label>
                <Input
                  id="bulk-file-upload"
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={handleBulkFileChange}
                  required
                />
                <p className="text-sm text-gray-500">
                  ZIP file should contain PDF files named as student-email.pdf (e.g., john@example.com.pdf)
                </p>
              </div>
              
              {bulkUploadResult && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">Upload Results:</p>
                  <p className="text-green-600">Successfully uploaded: {bulkUploadResult.success}</p>
                  <p className="text-red-600">Failed to upload: {bulkUploadResult.failed}</p>
                  
                  {bulkUploadResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="text-sm text-red-600 list-disc pl-5 max-h-32 overflow-y-auto">
                        {bulkUploadResult.errors.map((error, index) => (
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
                  disabled={bulkUploadLoading || !bulkUploadFile}
                >
                  {bulkUploadLoading ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></span>
                      Uploading...
                    </span>
                  ) : "Upload"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}