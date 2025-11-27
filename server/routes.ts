import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateSharedCodeSchema, insertSharedFileSchema } from "@shared/schema";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

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

  // Upload file - get upload URL
  app.post("/api/files/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Save file metadata after upload
  app.post("/api/files", async (req, res) => {
    try {
      if (!req.body.fileURL || !req.body.filename || !req.body.fileSize) {
        return res.status(400).json({ error: "fileURL, filename, and fileSize are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.fileURL);
      
      // Set ACL policy for public access
      await objectStorageService.trySetObjectEntityAclPolicy(req.body.fileURL, {
        owner: "anonymous",
        visibility: "public",
      });

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
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
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
