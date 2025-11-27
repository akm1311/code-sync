import { put, del, head } from '@vercel/blob';
import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() { }

  // Gets the upload URL for an object entity
  async getObjectEntityUploadURL(): Promise<string> {
    // For Vercel Blob, we'll return a placeholder URL
    // The actual upload will happen via the blob.put() method
    const objectId = randomUUID();
    return `/api/files/upload/${objectId}`;
  }

  // Upload file to Vercel Blob
  async uploadFile(filename: string, fileBuffer: Buffer): Promise<{ url: string; pathname: string }> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN not set. This is auto-provided by Vercel when you deploy."
      );
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

  // Download object from Vercel Blob
  async downloadObject(blobUrl: string, res: Response) {
    try {
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
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Delete file from Vercel Blob
  async deleteFile(blobUrl: string): Promise<void> {
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