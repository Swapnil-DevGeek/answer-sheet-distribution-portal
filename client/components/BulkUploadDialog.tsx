import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import JSZip from 'jszip';

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onSuccess: () => void;
}

export default function BulkUploadDialog({
  isOpen,
  onClose,
  courseId,
  onSuccess
}: BulkUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [examType, setExamType] = useState("quiz");
  const [files, setFiles] = useState<FileList | null>(null);
  const token = localStorage.getItem("token");

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
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
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const fileUrls = [];

      if (files[0].name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(files[0]);
        
        for (const [filename, file] of Object.entries(zipContent.files)) {
          if (!file.dir && filename.endsWith('.pdf')) {
            const content = await file.async('blob');
            const pdfFile = new File([content], filename, { type: 'application/pdf' });
            const url = await uploadToCloudinary(pdfFile);
            fileUrls.push({ name: filename, url });
          }
        }
      } else {
        for (const file of Array.from(files)) {
          if (file.type === 'application/pdf') {
            const url = await uploadToCloudinary(file);
            fileUrls.push({ name: file.name, url });
          }
        }
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/answersheets/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseId,
            fileUrls,
            examType,
          }),
        }
      );

      const result = await res.json();
      
      if (result.successful?.length > 0) {
        const updatedCount = result.successful.filter(s => s.status === 'updated').length;
        const createdCount = result.successful.filter(s => s.status === 'created').length;
        
        if (updatedCount > 0) {
          toast.success(`Updated ${updatedCount} existing answer sheets`);
        }
        if (createdCount > 0) {
          toast.success(`Added ${createdCount} new answer sheets`);
        }
      }
      
      if (result.failed?.length > 0) {
        toast.error(`Failed to upload ${result.failed.length} files`);
        result.failed.forEach(failure => {
          toast.error(`${failure.name}: ${failure.reason}`);
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Upload Answer Sheets</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".zip,.pdf"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              disabled={uploading}
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload a ZIP file containing PDFs or multiple PDF files
            </p>
          </div>
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="midsem">Midsem</SelectItem>
              <SelectItem value="compre">Compre</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={uploading || !files}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}