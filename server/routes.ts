import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { updateSharedCodeSchema, insertSharedFileSchema } from "../shared/schema.js";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage.js";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function registerRoutes(app: Express): Promise<Server> {
  // Get shared code
  app.get("/api/code", async (req, res) => {
    try {
      const code = await storage.getSharedCode();
      if (!code) {
        // Create initial empty code if none exists
        const newCode = await storage.createSharedCode({
          content: "",
          language: "text"
        });
        res.json(newCode);
      } else {
        res.json(code);
      }
    } catch (error) {
      console.error("Error fetching shared code:", error);
      res.status(500).json({ message: "Failed to fetch shared code" });
    }
  });

  // Update shared code
  app.put("/api/code", async (req, res) => {
    try {
      const validatedData = updateSharedCodeSchema.parse(req.body);
      const updatedCode = await storage.updateSharedCode(validatedData);
      res.json(updatedCode);
    } catch (error) {
      console.error("Error updating shared code:", error);
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ message: "Invalid request data" });
      } else {
        res.status(500).json({ message: "Failed to update shared code" });
      }
    }
  });

  // Get shared files
  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getSharedFiles();
      res.json(files);
    } catch (error) {
      console.error("Error fetching shared files:", error);
      res.status(500).json({ message: "Failed to fetch shared files" });
    }
  });

  // Check upload configuration (Vercel Blob vs Local)
  app.get("/api/upload/config", (req, res) => {
    res.json({
      isVercelBlob: !!process.env.BLOB_READ_WRITE_TOKEN
    });
  });

  // Handle Vercel Blob client upload handshake
  app.post("/api/upload/token", async (req, res) => {
    console.log('[TOKEN] Request received for upload token');

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('[TOKEN] BLOB_READ_WRITE_TOKEN not set');
      return res.status(500).json({ error: 'Blob storage not configured' });
    }

    const body = req.body as HandleUploadBody;
    console.log('[TOKEN] Request body:', JSON.stringify(body, null, 2));

    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          console.log('[TOKEN] Generating token for pathname:', pathname);
          // Allow all content types by not restricting them
          return {
            addRandomSuffix: true,
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Optional: verify upload or do post-processing
          console.log('[TOKEN] Blob upload completed:', blob.url);
        },
      });

      console.log('[TOKEN] Token generated successfully');
      res.json(jsonResponse);
    } catch (error) {
      console.error("[TOKEN] Error in upload token generation:", error);
      res.status(400).json({ error: "Token generation failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Upload file - direct upload (Legacy/Local fallback)
  app.post("/api/files/upload", async (req, res) => {
    try {
      const { filename, file } = req.body;

      if (!filename || !file) {
        return res.status(400).json({ error: "filename and file (base64) are required" });
      }

      const objectStorageService = new ObjectStorageService();

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(file, 'base64');

      // Upload to Vercel Blob
      const { url, pathname } = await objectStorageService.uploadFile(filename, fileBuffer);

      res.json({
        uploadURL: url,
        pathname: pathname
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });


  // Save file metadata after upload
  app.post("/api/files", async (req, res) => {
    console.log('[FILES] Saving file metadata request:', JSON.stringify(req.body, null, 2));
    try {
      if (!req.body.fileURL || !req.body.filename || !req.body.fileSize) {
        console.log('[FILES] Missing required fields');
        return res.status(400).json({ error: "fileURL, filename, and fileSize are required" });
      }

      // fileURL is already the complete Vercel Blob URL or local path
      const objectPath = req.body.fileURL;

      const validatedData = insertSharedFileSchema.parse({
        filename: req.body.filename,
        objectPath: objectPath,
        fileSize: req.body.fileSize.toString(),
      });

      console.log('[FILES] Calling createSharedFile with:', JSON.stringify(validatedData, null, 2));
      const savedFile = await storage.createSharedFile(validatedData);
      console.log('[FILES] File metadata saved successfully. ID:', savedFile.id);
      res.json(savedFile);
    } catch (error) {
      console.error("[FILES] Error creating shared file metadata:", error);
      console.error("[FILES] Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      });
      res.status(500).json({
        message: "Failed to save file",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Download file
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Get the file metadata from storage
      const files = await storage.getSharedFiles();
      // Fix: Remove spaces and handle potential leading slashes
      const requestedPath = req.params.objectPath;

      // Find file by matching objectPath or ending with it
      const file = files.find(f =>
        f.objectPath === requestedPath ||
        f.objectPath.endsWith(requestedPath) ||
        f.objectPath === `/objects/${requestedPath}`
      );

      if (!file) {
        return res.sendStatus(404);
      }

      // Download from Vercel Blob
      await objectStorageService.downloadObject(file.objectPath, res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });


  // Delete shared file
  app.delete("/api/files/:id", async (req, res) => {
    try {
      // Get file info first to delete the blob
      const files = await storage.getSharedFiles();
      const file = files.find(f => f.id === req.params.id);

      if (file && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          // Delete from Vercel Blob
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.deleteFile(file.objectPath);
        } catch (e) {
          console.error("Error deleting blob:", e);
          // Continue to delete metadata even if blob deletion fails (might be already gone)
        }
      }

      const deleted = await storage.deleteSharedFile(req.params.id);
      if (deleted) {
        res.json({ message: "File deleted successfully" });
      } else {
        res.status(404).json({ message: "File not found" });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
