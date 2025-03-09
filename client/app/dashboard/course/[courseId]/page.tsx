"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
type Professor = { _id: string; name: string; email: string };
type Student = { _id: string; name: string; email: string };
type Course = {
  _id: string;
  title: string;
  code: string;
  TAs: Professor[];
  students: Student[];
};

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("TAs");
  const [error, setError] = useState<string | null>(null);
  const [selectedTA, setSelectedTA] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [examType, setExamType] = useState("quiz");
  const [fileUrl, setFileUrl] = useState("");
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [courseTAs, setCourseTAs] = useState<Student[]>([]);
  const [answerSheets, setAnswerSheets] = useState<any[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("all");
  const [uploadedFilter, setUploadedFilter] = useState("all");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedStudentForUpload, setSelectedStudentForUpload] = useState<Student | null>(null);
  const token = localStorage.getItem("token");
  const [bulkUploadType, setBulkUploadType] = useState<"students" | "TAs">("students");
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkAnswerSheetType, setBulkAnswerSheetType] = useState("quiz");
  const [bulkAnswerSheetFile, setBulkAnswerSheetFile] = useState<File | null>(null);
  const [bulkAnswerSheetLoading, setBulkAnswerSheetLoading] = useState(false);
  const [bulkAnswerSheetResult, setBulkAnswerSheetResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isBulkAnswerSheetModalOpen, setIsBulkAnswerSheetModalOpen] = useState(false);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch course");
      const courseData = await res.json();
      setCourse(courseData);
      
      // Fetch all students
      const studentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!studentsRes.ok) throw new Error("Failed to fetch students");
      const allStudentsData = await studentsRes.json();
      setAllStudents(allStudentsData);
      
      // Filter to get course students and TAs with full details
      const courseStudentsData = allStudentsData.filter(student => 
        courseData.students.includes(student._id)
      );
      setCourseStudents(courseStudentsData);
      
      const courseTAsData = allStudentsData.filter(student => 
        courseData.TAs.includes(student._id)
      );
      setCourseTAs(courseTAsData);
      
      // Fetch answer sheets for the course
      const sheetsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/course/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (sheetsRes.ok) {
        const sheetsData = await sheetsRes.json();
        setAnswerSheets(sheetsData);
      }
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Error loading course.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId, token]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}/students`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ students: selectedStudent }),
        }
      );
      if (res.ok) {
        // Find the added student from allStudents
        const addedStudent = allStudents.find(student => student._id === selectedStudent);
        if (addedStudent) {
          // Update the courseStudents state locally
          setCourseStudents(prev => [...prev, addedStudent]);
          // Update the course state
          setCourse(prevCourse => {
            if (!prevCourse) return null;
            return {
              ...prevCourse,
              students: [...prevCourse.students, selectedStudent]
            };
          });
        }
        setSelectedStudent("");
        setError("Student added successfully!");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add student.");
    }
  };

  const handleAddTA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}/tas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tas: selectedTA }),
        }
      );
      if (res.ok) {
        // Find the added TA from allStudents
        const addedTA = allStudents.find(student => student._id === selectedTA);
        if (addedTA) {
          // Update the courseTAs state locally
          setCourseTAs(prev => [...prev, addedTA]);
          // Update the course state
          setCourse(prevCourse => {
            if (!prevCourse) return null;
            return {
              ...prevCourse,
              TAs: [...prevCourse.TAs, selectedTA]
            };
          });
        }
        setSelectedTA("");
        setError("TA added successfully!");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add TA.");
    }
  };

  // Filter out students that are already in the course
  const availableStudents = allStudents.filter(
    student => !course?.students.includes(student._id)
  );

  // Filter out students that are already TAs
  const availableTAs = allStudents.filter(
    student => !course?.TAs.includes(student._id)
  );

  // Add the missing handleAddAnswerSheet function
  const handleAddAnswerSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student: selectedStudent,
            course: courseId,
            examType,
            fileUrl,
          }),
        }
      );
      if (res.ok) {
        setSelectedStudent("");
        setFileUrl("");
        setError("Answer sheet added successfully!");
      } else {
        setError("Failed to add answer sheet.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add answer sheet.");
    }
  };

  // Helper function to get answer sheet for a student
  const getAnswerSheet = (studentId: string) => {
    return answerSheets.find(sheet => 
      sheet.student === studentId || // Handle case where student is just an ID
      (sheet.student && sheet.student._id === studentId) // Handle case where student is an object
    );
  };

  // Helper function to handle file download
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
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setError("Failed to download file");
    }
  };

  // Function to handle uploading for a specific student
  const handleUploadClick = (student: Student) => {
    setSelectedStudentForUpload(student);
    setSelectedStudent(student._id);
    setShowUploadForm(true);
  };

  // Function to filter students based on filters
  const getFilteredStudents = () => {
    return courseStudents.filter(student => {
      // Filter by name
      if (nameFilter && !student.name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      
      // Filter by email
      if (emailFilter && !student.email.toLowerCase().includes(emailFilter.toLowerCase())) {
        return false;
      }
      
      // Get the answer sheet for this student
      const answerSheet = getAnswerSheet(student._id);
      
      // Filter by uploaded status
      if (uploadedFilter === "uploaded" && !answerSheet) {
        return false;
      }
      if (uploadedFilter === "not-uploaded" && answerSheet) {
        return false;
      }
      
      // Filter by exam type - only apply if an exam type is selected and not "all"
      if (examTypeFilter !== "all") {
        // If no answer sheet or answer sheet doesn't match the selected exam type, filter out
        if (!answerSheet || answerSheet.examType !== examTypeFilter) {
          return false;
        }
      }
      
      return true;
    });
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBulkUploadFile(e.target.files[0]);
      setBulkUploadResult(null); // Reset results when new file is selected
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      setError("Please select a file to upload");
      return;
    }

    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    
    if (!allowedTypes.includes(bulkUploadFile.type)) {
      setError("Please upload a CSV or Excel file");
      return;
    }

    setBulkUploadLoading(true);
    const formData = new FormData();
    formData.append("file", bulkUploadFile);
    formData.append("courseId", courseId);

    try {
      const endpoint = bulkUploadType === "TAs" 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}/bulk-tas` 
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}/bulk-students`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || `Failed to add ${bulkUploadType}`);
      }

      setBulkUploadResult({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });
      
      if (data.success > 0) {
        setError(`Successfully added ${data.success} ${bulkUploadType}`);
        // Refresh the course data to show the newly added users
        fetchCourse();
      }
      
      if (data.failed > 0) {
        setError(`Failed to add ${data.failed} ${bulkUploadType}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Error adding ${bulkUploadType}`);
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleBulkAnswerSheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBulkAnswerSheetFile(e.target.files[0]);
      setBulkAnswerSheetResult(null); // Reset results when new file is selected
    }
  };

  const handleBulkAnswerSheetUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAnswerSheetFile) {
      setError("Please select a zip file to upload");
      return;
    }

    if (bulkAnswerSheetFile.type !== "application/zip" && 
        bulkAnswerSheetFile.type !== "application/x-zip-compressed") {
      setError("Please upload a ZIP file");
      return;
    }

    setBulkAnswerSheetLoading(true);
    const formData = new FormData();
    formData.append("file", bulkAnswerSheetFile);
    formData.append("courseId", courseId);
    formData.append("examType", bulkAnswerSheetType);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/bulk-upload`,
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
        throw new Error(data.message || "Failed to upload answer sheets");
      }

      setBulkAnswerSheetResult({
        success: data.success || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });
      
      if (data.success > 0) {
        setError(`Successfully uploaded ${data.success} answer sheets`);
        // Refresh the answer sheets data
        fetchCourse();
      }
      
      if (data.failed > 0) {
        setError(`Failed to upload ${data.failed} answer sheets`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error uploading answer sheets");
    } finally {
      setBulkAnswerSheetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Course not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="text-gray-500 text-lg">Course Code: {course.code}</p>
      </div>

      {error && (
        <Alert className="mb-4" variant={error.includes("successfully") ? "default" : "destructive"}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="TAs">Teaching Assistants</TabsTrigger>
          <TabsTrigger value="Students">Students</TabsTrigger>
          <TabsTrigger value="AnswerSheets">Answer Sheets</TabsTrigger>
        </TabsList>

        <TabsContent value="TAs">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Teaching Assistants</h3>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setBulkUploadType("TAs");
                    setIsBulkUploadModalOpen(true);
                  }}
                >
                  Bulk Add TAs
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseTAs.length > 0 ? (
                    courseTAs.map((ta) => (
                      <TableRow key={ta._id}>
                        <TableCell>{ta.name}</TableCell>
                        <TableCell>{ta.email}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        No TAs added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <form onSubmit={handleAddTA} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Add Teaching Assistant</Label>
                  <Select value={selectedTA} onValueChange={setSelectedTA}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a TA" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTAs.map((ta) => (
                        <SelectItem key={ta._id} value={ta._id}>
                          {ta.name} ({ta.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={!selectedTA}>Add TA</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Students">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Students</h3>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setBulkUploadType("students");
                    setIsBulkUploadModalOpen(true);
                  }}
                >
                  Bulk Add Students
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseStudents.length > 0 ? (
                    courseStudents.map((student) => (
                      <TableRow key={student._id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        No students added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <form onSubmit={handleAddStudent} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Add Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={!selectedStudent}>Add Student</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="AnswerSheets">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Answer Sheets</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setIsBulkAnswerSheetModalOpen(true)}
                >
                  Bulk Upload Answer Sheets
                </Button>
              </div>
              
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label htmlFor="nameFilter" className="mb-2 block">Name</Label>
                  <Input
                    id="nameFilter"
                    placeholder="Filter by name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emailFilter" className="mb-2 block">Email</Label>
                  <Input
                    id="emailFilter"
                    placeholder="Filter by email"
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="examTypeFilter" className="mb-2 block">Exam Type</Label>
                  <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All exam types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All exam types</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="midsem">Midsem</SelectItem>
                      <SelectItem value="compre">Compre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="uploadedFilter" className="mb-2 block">Upload Status</Label>
                  <Select value={uploadedFilter} onValueChange={setUploadedFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      <SelectItem value="uploaded">Uploaded</SelectItem>
                      <SelectItem value="not-uploaded">Not uploaded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Answer Sheet</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredStudents().length > 0 ? (
                    getFilteredStudents().map((student) => {
                      const answerSheet = getAnswerSheet(student._id);
                      return (
                        <TableRow key={student._id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            {answerSheet ? (
                              <span className="text-green-600">
                                {answerSheet.examType.charAt(0).toUpperCase() + answerSheet.examType.slice(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {answerSheet ? (
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(answerSheet.fileUrl, '_blank')}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDownload(
                                    answerSheet.fileUrl, 
                                    `${student.name}_${answerSheet.examType}.pdf`
                                  )}
                                >
                                  Download
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUploadClick(student)}
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
                      <TableCell colSpan={4} className="text-center">
                        No students match the current filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Upload Dialog */}
              {showUploadForm && selectedStudentForUpload && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                    <h3 className="text-lg font-medium mb-4">
                      Upload Answer Sheet for {selectedStudentForUpload.name}
                    </h3>
                    <form onSubmit={handleAddAnswerSheet} className="space-y-4">
                      <input type="hidden" name="studentId" value={selectedStudentForUpload._id} />
                      
                      <div className="space-y-2">
                        <Label>Exam Type</Label>
                        <Select value={examType} onValueChange={setExamType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quiz">Quiz</SelectItem>
                            <SelectItem value="midsem">Midsem</SelectItem>
                            <SelectItem value="compre">Compre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>File URL</Label>
                        <Input
                          type="url"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder="Enter file URL"
                          required
                        />
                      </div>

                      <div className="flex justify-end space-x-2 mt-6">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setShowUploadForm(false);
                            setSelectedStudentForUpload(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          Upload
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              Bulk Add {bulkUploadType === "TAs" ? "Teaching Assistants" : "Students"}
            </h3>
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-file-upload">Upload CSV or Excel file</Label>
                <Input
                  id="bulk-file-upload"
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleBulkFileChange}
                  required
                />
                <p className="text-sm text-gray-500">
                  File should contain a column for Email of existing users
                </p>
              </div>
              
              {bulkUploadResult && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">Upload Results:</p>
                  <p className="text-green-600">Successfully added: {bulkUploadResult.success}</p>
                  <p className="text-red-600">Failed to add: {bulkUploadResult.failed}</p>
                  
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

      {/* Bulk Answer Sheet Upload Modal */}
      {isBulkAnswerSheetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              Bulk Upload Answer Sheets
            </h3>
            <form onSubmit={handleBulkAnswerSheetUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-type">Exam Type</Label>
                <Select 
                  value={bulkAnswerSheetType} 
                  onValueChange={setBulkAnswerSheetType}
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
                <Label htmlFor="bulk-answersheet-upload">Upload ZIP file</Label>
                <Input
                  id="bulk-answersheet-upload"
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={handleBulkAnswerSheetFileChange}
                  required
                />
                <p className="text-sm text-gray-500">
                  ZIP file should contain PDF files named as student-email.pdf (e.g., john@example.com.pdf)
                </p>
              </div>
              
              {bulkAnswerSheetResult && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">Upload Results:</p>
                  <p className="text-green-600">Successfully uploaded: {bulkAnswerSheetResult.success}</p>
                  <p className="text-red-600">Failed to upload: {bulkAnswerSheetResult.failed}</p>
                  
                  {bulkAnswerSheetResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="text-sm text-red-600 list-disc pl-5 max-h-32 overflow-y-auto">
                        {bulkAnswerSheetResult.errors.map((error, index) => (
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
                  onClick={() => setIsBulkAnswerSheetModalOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={bulkAnswerSheetLoading || !bulkAnswerSheetFile}
                >
                  {bulkAnswerSheetLoading ? (
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