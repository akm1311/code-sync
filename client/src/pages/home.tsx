import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleFileUploader } from "@/components/SimpleFileUploader";
import {
  Code,
  Copy,
  Check,
  Moon,
  Sun,
  RefreshCw,
  Wifi,
  Clock,
  Info,
  Zap,
  Smartphone,
  Shield,
  FileArchive,
  Download,
  Upload,
  Trash2,
  File
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import type { SharedCode, SharedFile } from "@shared/schema";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("text");
  const [copied, setCopied] = useState(false);
  // const [isLoading, setIsLoading] = useState(false); // Removed manual loading state
  const lastEditTime = useRef(0);

  // Fetch shared code
  const { data: sharedCode, isLoading: isFetching } = useQuery<SharedCode>({
    queryKey: ["/api/code"],
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Fetch shared files
  const { data: sharedFiles = [], isLoading: isLoadingFiles } = useQuery<SharedFile[]>({
    queryKey: ["/api/files"],
    refetchInterval: 5000, // Poll every 5 seconds for files
  });

  // Update content and language when shared code changes (but not during typing)
  useEffect(() => {
    if (sharedCode) {
      const timeSinceLastEdit = Date.now() - lastEditTime.current;
      // Only update if user hasn't typed for 2 seconds AND server version is newer
      // We assume server time is roughly synced or at least monotonic for our purposes
      const serverTime = new Date(sharedCode.updatedAt).getTime();

      if (timeSinceLastEdit > 2000 && serverTime > lastEditTime.current) {
        if (sharedCode.content !== content) {
          setContent(sharedCode.content);
        }
        if (sharedCode.language !== language) {
          setLanguage(sharedCode.language);
        }
      }
    }
  }, [sharedCode]);

  // Update shared code mutation
  const updateCodeMutation = useMutation({
    mutationFn: async (data: { content: string; language: string }) => {
      const response = await apiRequest("PUT", "/api/code", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Debounced content update
  // Debounced content update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sharedCode && (content !== sharedCode.content || language !== sharedCode.language)) {
        // setIsLoading(true); // Removed
        updateCodeMutation.mutate({ content, language });
        // setTimeout(() => setIsLoading(false), 500); // Removed
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, language, sharedCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/code"] });
    toast({
      title: "Refreshed",
      description: "Content has been refreshed",
    });
  };

  // File upload handler
  const handleFileUpload = async (file: File) => {
    try {
      console.log('[UPLOAD] Starting upload for:', file.name, 'Size:', file.size);

      // Check upload config
      const configRes = await apiRequest("GET", "/api/upload/config");
      const config = await configRes.json();
      console.log('[UPLOAD] Config received:', config);

      let uploadURL = "";
      let pathname = "";

      if (config.isVercelBlob) {
        console.log('[UPLOAD] Using Vercel Blob client-side upload');
        try {
          const blob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload/token',
          });
          console.log('[UPLOAD] Blob upload successful:', blob);
          uploadURL = blob.url;
          pathname = blob.pathname;
        } catch (blobError) {
          console.error('[UPLOAD] Blob upload failed, falling back to server upload:', blobError);
          throw blobError; // Re-throw to use the main error handler
        }
      } else {
        console.log('[UPLOAD] Using server-side upload (local mode)');
        // Local fallback (server-side upload)
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;

        const response = await apiRequest("POST", "/api/files/upload", {
          filename: file.name,
          file: base64Data,
        });

        const data = await response.json();
        uploadURL = data.uploadURL;
        pathname = data.pathname;
      }

      // Save file metadata
      await apiRequest("POST", "/api/files", {
        fileURL: uploadURL,
        filename: file.name,
        fileSize: file.size,
      });

      // Refresh files list
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });

      toast({
        title: "✅ Upload Successful!",
        description: `${file.name} is now available for sharing`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "❌ Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload file",
        variant: "destructive",
      });
    }
  };

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest("DELETE", `/api/files/${fileId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "File Deleted",
        description: "File has been removed from shared files.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteFile = (fileId: string) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleDownloadFile = (file: SharedFile) => {
    const downloadUrl = file.objectPath.startsWith('http')
      ? file.objectPath
      : `${window.location.origin}${file.objectPath}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: `Downloading ${file.filename}...`,
    });
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLastUpdated = (date: string) => {
    const now = new Date();
    const updated = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));

    if (diffInMinutes === 0) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    return `${diffInMinutes} minutes ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Code className="text-white text-sm" size={16} />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">CodeSync</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Sync Status */}
              <Badge variant="outline" className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                Synced
              </Badge>

              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Instructions Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="text-white" size={12} />
            </div>
            <div>
              <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Quick Start</h2>
              <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                Type or paste your code below - it instantly syncs across all your devices!
                Share the URL with others to collaborate in real-time. No sign-up needed.
              </p>
            </div>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="code" className="flex items-center space-x-2">
              <Code size={16} />
              <span>📝 Code Editor</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center space-x-2">
              <FileArchive size={16} />
              <span>📦 File Sharing</span>
            </TabsTrigger>
          </TabsList>

          {/* Code Editor Tab */}
          <TabsContent value="code">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              {/* Editor Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-4">
                  <h3 className="font-medium text-slate-900 dark:text-white">✨ Live Code Editor</h3>
                  <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                    <Clock size={12} />
                    <span data-testid="text-last-updated">
                      {sharedCode ? formatLastUpdated(sharedCode.updatedAt.toString()) : "Start typing..."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Language Selector */}
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[140px]" data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Plain Text</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="css">CSS</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Copy Button */}
                  <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700" data-testid="button-copy">
                    {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Code Textarea */}
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    lastEditTime.current = Date.now();
                  }}
                  placeholder="✍️ Start typing your code here... Changes save automatically in real-time!"
                  className="min-h-96 p-6 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-sm leading-relaxed resize-none border-0 focus-visible:ring-0 placeholder-slate-400 dark:placeholder-slate-500"
                  data-testid="textarea-code"
                />

                {/* Loading Overlay */}
                {(updateCodeMutation.isPending || isFetching) && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Syncing...</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* File Sharing Tab */}
          <TabsContent value="files">
            <div className="space-y-6">
              {/* Upload Section */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-slate-900 dark:text-white">📤 Upload Files</h3>
                      <Badge variant="outline" className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                        <Upload size={12} className="mr-1" />
                        Max 50MB
                      </Badge>
                    </div>

                    <SimpleFileUploader
                      onUpload={handleFileUpload}
                      buttonText="Upload File"
                    />

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      💡 Tip: You can upload any file type (images, documents, archives, etc.)
                    </p>
                  </div>
                </div>
              </Card>

              {/* Files List */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900 dark:text-white">📁 Your Shared Files</h3>
                    <Badge variant="outline" className="px-3 py-1.5">
                      {sharedFiles.length} {sharedFiles.length === 1 ? 'file' : 'files'}
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  {isLoadingFiles ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                      <span className="text-slate-600 dark:text-slate-400">Loading files...</span>
                    </div>
                  ) : sharedFiles.length === 0 ? (
                    <div className="text-center py-12">
                      <FileArchive className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                      <p className="text-slate-600 dark:text-slate-400 mb-2 font-medium">No files yet</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">Upload your first file to start sharing!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sharedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <File className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate" data-testid={`text-filename-${file.id}`}>
                                {file.filename}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>Uploaded {formatLastUpdated(file.uploadedAt.toString())}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(file)}
                              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              data-testid={`button-download-${file.id}`}
                            >
                              <Download size={14} className="mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFile(file.id)}
                              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                              disabled={deleteFileMutation.isPending}
                              data-testid={`button-delete-${file.id}`}
                            >
                              {deleteFileMutation.isPending ? (
                                <RefreshCw size={14} className="animate-spin mr-1" />
                              ) : (
                                <Trash2 size={14} className="mr-1" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Connection Status */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            {/* Device Count */}
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
              <Wifi size={12} />
              <span data-testid="text-device-count">Auto-sync enabled</span>
            </div>
          </div>

          {/* Manual Refresh */}
          <Button variant="ghost" size="sm" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw size={12} className="mr-2" />
            Refresh
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="p-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <Zap className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">⚡ Instant Sync</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Type once, see everywhere. Your changes appear instantly on all connected devices.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
              <Smartphone className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">📱 Works Everywhere</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Desktop, tablet, or mobile - share code seamlessly across all your devices.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
              <Shield className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">🔒 Simple & Secure</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              No login needed. Just share the URL. Your code stays private and secure.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
