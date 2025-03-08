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
import { Loader2, Download, Eye } from "lucide-react";

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
    console.log(data.secure_url);
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

  const getAnswerSheet = (studentId: string) => {
    return answerSheets.find((sheet) => sheet.student._id === studentId);
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
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading course details...
      </div>
    );
  }

  if (!course) return <div className="p-6">Course not found</div>;

  const selectedStudent = course.students.find(
    (s) => s._id === selectedStudentId
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="text-muted-foreground">{course.code}</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Answer Sheet</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {course.students.length > 0 ? (
              course.students.map((student) => {
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
                <TableCell colSpan={4} className="h-24 text-center">
                  No students enrolled
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
                  <SelectItem value="midsem">Mid-semester</SelectItem>
                  <SelectItem value="compre">Comprehensive</SelectItem>
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
    </div>
  );
}