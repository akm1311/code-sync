import { randomUUID } from "crypto";
import type { User, InsertUser, SharedCode, SharedFile, InsertSharedCode, UpdateSharedCode, InsertSharedFile } from "../shared/schema.js";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;

  getSharedCode(): Promise<SharedCode | undefined>;
  updateSharedCode(data: UpdateSharedCode): Promise<SharedCode | undefined>;
  createSharedCode(data: InsertSharedCode): Promise<SharedCode>;

  getSharedFiles(): Promise<SharedFile[]>;
  createSharedFile(data: InsertSharedFile): Promise<SharedFile>;
  deleteSharedFile(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sharedCodeData: SharedCode | null;
  private sharedFiles: Map<string, SharedFile>;

  constructor() {
    this.users = new Map();
    this.sharedCodeData = null;
    this.sharedFiles = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getSharedCode(): Promise<SharedCode | undefined> {
    // Return existing data or undefined (starts empty on server restart)
    return this.sharedCodeData ?? undefined;
  }

  async updateSharedCode(data: UpdateSharedCode): Promise<SharedCode | undefined> {
    const now = new Date();

    if (this.sharedCodeData) {
      this.sharedCodeData.content = data.content ?? this.sharedCodeData.content;
      this.sharedCodeData.language = data.language ?? this.sharedCodeData.language;
      this.sharedCodeData.updatedAt = now;
    } else {
      this.sharedCodeData = {
        id: "default",
        content: data.content || "",
        language: data.language || "text",
        updatedAt: now,
      };
    }

    return this.sharedCodeData;
  }

  async createSharedCode(data: InsertSharedCode): Promise<SharedCode> {
    const id = randomUUID();
    const now = new Date();

    const sharedCode: SharedCode = {
      id,
      content: data.content ?? "",
      language: data.language ?? "text",
      updatedAt: now,
    };

    this.sharedCodeData = sharedCode;
    return sharedCode;
  }

  async getSharedFiles(): Promise<SharedFile[]> {
    return Array.from(this.sharedFiles.values());
  }

  async createSharedFile(data: InsertSharedFile): Promise<SharedFile> {
    const id = randomUUID();
    const now = new Date();
    const sharedFile: SharedFile = {
      id,
      filename: data.filename,
      objectPath: data.objectPath,
      fileSize: data.fileSize,
      uploadedAt: now,
    };

    this.sharedFiles.set(id, sharedFile);
    return sharedFile;
  }

  async deleteSharedFile(id: string): Promise<boolean> {
    return this.sharedFiles.delete(id);
  }
}

// Blob-based Storage Implementation for Vercel (no database needed!)
import { put, head, del, list } from '@vercel/blob';

export class BlobStorage implements IStorage {
  private readonly SHARED_CODE_KEY = 'shared-code.json';
  private readonly SHARED_FILES_KEY = 'shared-files.json';

  private async readBlobJSON<T>(key: string, defaultValue: T): Promise<T> {
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        // Local dev fallback
        return defaultValue;
      }

      const { blobs } = await list({
        prefix: key,
        limit: 1,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (blobs.length === 0) {
        return defaultValue;
      }

      const response = await fetch(blobs[0].url);

      if (!response.ok) {
        return defaultValue;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error reading blob ${key}:`, error);
      return defaultValue;
    }
  }

  private async writeBlobJSON<T>(key: string, data: T): Promise<void> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('Skipping writeBlobJSON (no token)');
      return; // Local dev - skip writing
    }

    console.log(`Writing blob ${key}...`);
    try {
      // Delete existing blob first to ensure overwrite works
      const { blobs } = await list({
        prefix: key,
        limit: 1,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      if (blobs.length > 0) {
        console.log(`Deleting existing blob(s) for ${key}...`);
        await del(blobs.map(b => b.url), {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      }

      const jsonString = JSON.stringify(data);
      // const blob = new Blob([jsonString], { type: 'application/json' }); // Node.js < 18 might not have Blob, use string directly

      await put(key, jsonString, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false, // Important: overwrite the file (though we just deleted it)
        contentType: 'application/json',
      });
      console.log(`Successfully wrote blob ${key}`);
    } catch (error) {
      console.error(`Error writing blob ${key}:`, error);
      throw error;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const users = await this.readBlobJSON<Record<string, User>>('users.json', {});
    return users[id];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.readBlobJSON<Record<string, User>>('users.json', {});
    return Object.values(users).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = await this.readBlobJSON<Record<string, User>>('users.json', {});
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    users[id] = user;
    await this.writeBlobJSON('users.json', users);
    return user;
  }

  async getSharedCode(): Promise<SharedCode | undefined> {
    return await this.readBlobJSON<SharedCode | undefined>(this.SHARED_CODE_KEY, undefined);
  }

  async updateSharedCode(data: UpdateSharedCode): Promise<SharedCode | undefined> {
    const existing = await this.getSharedCode();

    const updated: SharedCode = existing
      ? {
        ...existing,
        content: data.content ?? existing.content,
        language: data.language ?? existing.language,
        updatedAt: new Date(),
      }
      : {
        id: randomUUID(),
        content: data.content || "",
        language: data.language || "text",
        updatedAt: new Date(),
      };

    await this.writeBlobJSON(this.SHARED_CODE_KEY, updated);
    return updated;
  }

  async createSharedCode(data: InsertSharedCode): Promise<SharedCode> {
    const sharedCode: SharedCode = {
      id: randomUUID(),
      content: data.content ?? "",
      language: data.language ?? "text",
      updatedAt: new Date(),
    };
    await this.writeBlobJSON(this.SHARED_CODE_KEY, sharedCode);
    return sharedCode;
  }

  async getSharedFiles(): Promise<SharedFile[]> {
    const files = await this.readBlobJSON<Record<string, SharedFile>>(this.SHARED_FILES_KEY, {});
    return Object.values(files);
  }

  async createSharedFile(data: InsertSharedFile): Promise<SharedFile> {
    const files = await this.readBlobJSON<Record<string, SharedFile>>(this.SHARED_FILES_KEY, {});
    const id = randomUUID();
    const file: SharedFile = {
      id,
      filename: data.filename,
      objectPath: data.objectPath,
      fileSize: data.fileSize,
      uploadedAt: new Date(),
    };
    files[id] = file;
    await this.writeBlobJSON(this.SHARED_FILES_KEY, files);
    return file;
  }

  async deleteSharedFile(id: string): Promise<boolean> {
    const files = await this.readBlobJSON<Record<string, SharedFile>>(this.SHARED_FILES_KEY, {});
    delete files[id];
    await this.writeBlobJSON(this.SHARED_FILES_KEY, files);
    return true;
  }
}

// Use blob storage if token is present, otherwise fallback to memory storage
export const storage = process.env.BLOB_READ_WRITE_TOKEN ? new BlobStorage() : new MemStorage();
