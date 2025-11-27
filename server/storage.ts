import { randomUUID } from "crypto";
import type { User, InsertUser, SharedCode, SharedFile, InsertSharedCode, UpdateSharedCode, InsertSharedFile } from "@shared/schema";

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

export const storage = new MemStorage();
