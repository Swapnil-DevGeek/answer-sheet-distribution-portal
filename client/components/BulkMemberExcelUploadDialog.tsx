import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface BulkMemberExcelUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  memberType: 'students' | 'tas';
  onSuccess: () => void;
}

export default function BulkMemberExcelUploadDialog({
  isOpen,
  onClose,
  courseId,
  memberType,
  onSuccess
}: BulkMemberExcelUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const token = localStorage.getItem("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip header row and process data
        const excelData = rawData.slice(1).map((row: any) => ({
          name: row[0]?.toString().trim(),
          email: row[1]?.toString().trim()
        })).filter(item => item.name && item.email);

        if (excelData.length === 0) {
          throw new Error('No valid data found in Excel file');
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/courses/${courseId}/members/bulk-excel`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              memberType,
              excelData
            }),
          }
        );

        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.message || 'Upload failed');
        }

        if (result.successful?.length > 0) {
          toast.success(`Successfully added ${result.successful.length} ${memberType}`);
        }
        
        if (result.failed?.length > 0) {
          const roleConflicts = result.failed.filter((f: any) => 
            f.reason.includes('already a TA') || f.reason.includes('already a student')
          );
          
          if (roleConflicts.length > 0) {
            toast.error(`${roleConflicts.length} users had role conflicts`);
            roleConflicts.forEach((conflict: any) => {
              toast.error(`${conflict.email}: ${conflict.reason}`);
            });
          }

          const otherFailures = result.failed.filter((f: any) => 
            !f.reason.includes('already a TA') && !f.reason.includes('already a student')
          );

          if (otherFailures.length > 0) {
            toast.error(`Failed to add ${otherFailures.length} ${memberType}`);
            console.error('Failed entries:', otherFailures);
          }
        }

        onSuccess();
        onClose();
      };

      reader.readAsBinaryString(file);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Bulk Upload {memberType === 'tas' ? 'Teaching Assistants' : 'Students'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Excel File</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            <p className="text-sm text-gray-500">
              Upload an Excel file with columns: name, email
            </p>
          </div>

          <Button type="submit" disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}