import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, RefreshCw } from "lucide-react";

interface SimpleFileUploaderProps {
    onUpload: (file: File) => Promise<void>;
    accept?: string;
    maxSize?: number;
    buttonText?: string;
    className?: string;
}

export function SimpleFileUploader({
    onUpload,
    accept,
    maxSize = 50 * 1024 * 1024, // 50MB default
    buttonText = "Upload File",
    className = "",
}: SimpleFileUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > maxSize) {
                alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            await onUpload(selectedFile);
            setSelectedFile(null);
            // Reset file input
            const fileInput = document.getElementById("file-upload") as HTMLInputElement;
            if (fileInput) fileInput.value = "";
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`flex items-center space-x-3 ${className}`}>
            <Input
                id="file-upload"
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={isUploading}
                className="max-w-xs"
            />
            <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
                {isUploading ? (
                    <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <Upload size={16} className="mr-2" />
                        {buttonText}
                    </>
                )}
            </Button>
        </div>
    );
}
