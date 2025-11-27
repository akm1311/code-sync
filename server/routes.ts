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
    const body = req.body as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          // You can add authentication checks here
          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf', 'application/zip', 'application/x-zip-compressed', 'multipart/x-zip'], // We can be more permissive or specific
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Optional: verify upload or do post-processing
          console.log('Blob upload completed:', blob.url);
        },
      });

      res.json(jsonResponse);
    } catch (error) {
      console.error("Error handling upload token:", error);
      res.status(400).json(
        { error: (error as Error).message }
      );
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
    try {
      if (!req.body.fileURL || !req.body.filename || !req.body.fileSize) {
        return res.status(400).json({ error: "fileURL, filename, and fileSize are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = req.body.fileURL;

      const validatedData = insertSharedFileSchema.parse({
        filename: req.body.filename,
        objectPath: objectPath,
        fileSize: req.body.fileSize.toString(),
      });

      const savedFile = await storage.createSharedFile(validatedData);
      res.json(savedFile);
    } catch (error) {
      console.error("Error saving file metadata:", error);
      res.status(500).json({ message: "Failed to save file" });
    }
  });

  // Download file
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Get the file metadata from storage
      const files = await storage.getSharedFiles();
      const requestedPath = `/ objects / ${req.params.objectPath} `;
      const file = files.find(f => f.objectPath === requestedPath || f.objectPath.endsWith(req.params.objectPath));

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
