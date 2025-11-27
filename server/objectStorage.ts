import { put, del, head } from '@vercel/blob';
import { Response } from "express";
import { randomUUID } from "crypto";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // Gets the upload URL for an object entity
  async getObjectEntityUploadURL(): Promise<string> {
    // For Vercel Blob, we'll return a placeholder URL
    // The actual upload will happen via the blob.put() method
    const objectId = randomUUID();
    return `/api/files/upload/${objectId}`;
  }

  // Upload file to Vercel Blob or local storage
  async uploadFile(filename: string, fileBuffer: Buffer): Promise<{ url: string; pathname: string }> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Local fallback
      const uniqueFilename = `${Date.now()}-${filename}`;
      const filePath = path.join(this.uploadDir, uniqueFilename);

      await writeFile(filePath, fileBuffer);

      const url = `/uploads/${uniqueFilename}`;
      return {
        url: url,
        pathname: uniqueFilename
      };
    }

    const blob = await put(filename, fileBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
    };
  }

  // Download object from Vercel Blob or local storage
  async downloadObject(blobUrl: string, res: Response) {
    try {
      // Check if it's a local file
      if (blobUrl.startsWith('/uploads/')) {
        const filename = blobUrl.split('/uploads/')[1];
        const filePath = path.join(this.uploadDir, filename);

        if (!fs.existsSync(filePath)) {
          throw new ObjectNotFoundError();
        }

        res.download(filePath);
        return;
      }

      // Fetch the blob content
      const response = await fetch(blobUrl);

      if (!response.ok) {
        throw new ObjectNotFoundError();
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      // Set appropriate headers
      res.set({
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      });

      // Send the buffer
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        if (error instanceof ObjectNotFoundError) {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    }
  }

  // Delete file from Vercel Blob or local storage
  async deleteFile(blobUrl: string): Promise<void> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Local fallback
      if (blobUrl.startsWith('/uploads/')) {
        const filename = blobUrl.split('/uploads/')[1];
        const filePath = path.join(this.uploadDir, filename);

        if (fs.existsSync(filePath)) {
          await unlink(filePath);
        }
        return;
      }
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN not set");
    }

    await del(blobUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  }

  // Normalize object path (for backward compatibility)
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's already a Vercel Blob URL, return as-is
    if (rawPath.startsWith('https://')) {
      return rawPath;
    }

    // If it's a local upload path, return as-is
    if (rawPath.startsWith('/uploads/')) {
      return rawPath;
    }

    // For local paths, return with /objects prefix
    if (!rawPath.startsWith('/objects/')) {
      return `/objects/${rawPath}`;
    }

    return rawPath;
  }

  // Set ACL policy (no-op for Vercel Blob - files are public by default)
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: any
  ): Promise<string> {
    // Vercel Blob doesn't have ACL policies
    // Files are public by default when uploaded with access: 'public'
    return this.normalizeObjectEntityPath(rawPath);
  }

  // Get object file - for backward compatibility
  async getObjectEntityFile(objectPath: string): Promise<{ url: string }> {
    // In Vercel Blob, we just return the URL
    // The actual file existence check happens during download
    return { url: objectPath };
  }
}