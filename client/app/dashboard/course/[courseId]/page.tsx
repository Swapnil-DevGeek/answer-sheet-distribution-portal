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
import BulkMemberExcelUploadDialog from "@/components/BulkMemberExcelUploadDialog";
import { toast } from "sonner";

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
  const [allTAs, setAllTAs] = useState<Professor[]>([]);
  const [selectedTA, setSelectedTA] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [examType, setExamType] = useState("quiz");
  const [fileUrl, setFileUrl] = useState("");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isBulkTAUploadOpen, setIsBulkTAUploadOpen] = useState(false);
  const [isBulkStudentUploadOpen, setIsBulkStudentUploadOpen] = useState(false);
  const token = localStorage.getItem("token") ;
  const fetchCourse = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch course details.");
      const data = await res.json();
      setCourse(data);
    } catch (err) {
      console.error(err);
      setError("Error loading course details.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCourse();
  }, [courseId, token]);
  const fetchTAs = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/tas`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAllTAs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchStudents = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAllStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (activeTab === "TAs") {
      fetchTAs();
    }
    if (activeTab === "Students" || activeTab === "AnswerSheets") {
      fetchStudents();
    }
  }, [activeTab, token]);
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
      
      const data = await res.json();
      if (!res.ok) {
        if (data.message.includes("already a student")) {
          toast.error("Cannot add as TA: User is already a student in this course");
          setError("Cannot add as TA: User is already a student in this course");
          return;
        }
        throw new Error(data.message || "Failed to add TA");
      }
      const addedTA = allTAs.find(ta => ta._id === selectedTA);
      setCourse(prevCourse => {
        if (!prevCourse) return null;
        return {
          ...prevCourse,
          TAs: [...prevCourse.TAs, addedTA!]
        };
      });
      setSelectedTA("");
      toast.success("TA added successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add TA");
      setError(err.message || "Failed to add TA");
    }
  };
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
      
      const data = await res.json();
      if (!res.ok) {
        if (data.message.includes("already a TA")) {
          toast.error("Cannot add as student: User is already a TA in this course");
          setError("Cannot add as student: User is already a TA in this course");
          return;
        }
        throw new Error(data.message || "Failed to add student");
      }
      const addedStudent = allStudents.find(student => student._id === selectedStudent);
      setCourse(prevCourse => {
        if (!prevCourse) return null;
        return {
          ...prevCourse,
          students: [...prevCourse.students, addedStudent!]
        };
      });
      setSelectedStudent("");
      toast.success("Student added successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add student");
      setError(err.message || "Failed to add student");
    }
  };
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
            course: courseId,
            student: selectedStudent,
            examType,
            fileUrl,
          }),
        }
      );
      if (res.ok) {
        setSelectedStudent("");
        setExamType("quiz");
        setFileUrl("");
        setError("Answer sheet uploaded successfully!");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload answer sheet.");
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
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => setIsBulkTAUploadOpen(true)}
                  className="bg-primary"
                >
                  Bulk Upload TAs
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
                  {course.TAs && course.TAs.length > 0 ? (
                    course.TAs.map((ta) => (
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
                      {allTAs.map((ta) => (
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
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={() => setIsBulkStudentUploadOpen(true)}
                  className="bg-primary"
                >
                  Bulk Upload Students
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
                  {course.students && course.students.length > 0 ? (
                    course.students.map((student) => (
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
                      {allStudents.map((student) => (
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
              <form onSubmit={handleAddAnswerSheet} className="space-y-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStudents.map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Button
                  type="submit"
                  disabled={!selectedStudent || !fileUrl}
                >
                  Upload Answer Sheet
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <BulkMemberExcelUploadDialog
        isOpen={isBulkTAUploadOpen}
        onClose={() => setIsBulkTAUploadOpen(false)}
        courseId={courseId}
        memberType="tas"
        onSuccess={() => {
          fetchCourse();
          setError("TAs uploaded successfully!");
        }}
      />

      <BulkMemberExcelUploadDialog
        isOpen={isBulkStudentUploadOpen}
        onClose={() => setIsBulkStudentUploadOpen(false)}
        courseId={courseId}
        memberType="students"
        onSuccess={() => {
          fetchCourse();
          setError("Students uploaded successfully!");
        }}
      />
    </div>
  );
}