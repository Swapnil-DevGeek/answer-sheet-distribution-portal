"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

type AnswerSheet = {
  _id: string;
  examType: string;
  fileUrl: string;
};

export default function StudentCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  
  useEffect(() => {
    if (!courseId) {
      console.error("No courseId provided");
      router.push("/dashboard");
      return;
    }
    console.log("Current courseId:", courseId);
  }, [courseId, router]);

  const [answerSheet, setAnswerSheet] = useState<AnswerSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recheckRequested, setRecheckRequested] = useState(false);
  const [recheckMessage, setRecheckMessage] = useState("");

  const token = localStorage.getItem("token") ;

  useEffect(() => {
    const fetchAnswerSheet = async () => {
      try {
        console.log(courseId)
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/mine?courseId=${courseId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Active-Role': 'student',
            'Content-Type': 'application/json'
          },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch answer sheet.");
        }
        const data = await res.json();
        setAnswerSheet(data?.[0] || null);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Error loading answer sheet.");
        setLoading(false);
      }
    };
    if (token) {
      fetchAnswerSheet();
    }
  }, [courseId, token]);
  const handleRecheckRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rechecks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          'X-Active-Role': 'student' // Add active role
        },
        body: JSON.stringify({
          course: courseId,
          answerSheet: answerSheet?._id,
          message: recheckMessage,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to request recheck.");
      }
      setRecheckRequested(true);
      setRecheckMessage("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error submitting recheck request.");
    }
  };
  if (loading) {
    return <div className="p-6">Loading course details...</div>;
  }
  if (!answerSheet && !error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">No Answer Sheet</h1>
        <p className="text-gray-600">No answer sheet has been uploaded for this course yet.</p>
      </div>
    );
  }
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Answer Sheet</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {answerSheet ? (
        <div className="bg-white shadow-md rounded p-4 mb-6">
          <p className="mb-2">
            <span className="font-semibold">Exam Type:</span> {answerSheet.examType}
          </p>
          <a
            href={answerSheet.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View Answer Sheet
          </a>
        </div>
      ) : (
        <p>No answer sheet available.</p>
      )}
      {/* Recheck Request Section */}
      {answerSheet && !recheckRequested ? (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Request Recheck</h2>
          <form onSubmit={handleRecheckRequest} className="mt-4 space-y-4">
            <textarea
              value={recheckMessage}
              onChange={(e) => setRecheckMessage(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Enter your reason for recheck"
              required
            ></textarea>
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">
              Submit Request
            </button>
          </form>
        </div>
      ) : recheckRequested ? (
        <p className="text-green-600 font-semibold mt-4">
          Recheck request submitted successfully.
        </p>
      ) : null}
    </div>
  );
}
