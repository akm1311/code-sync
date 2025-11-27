import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sharedCode = pgTable("shared_code", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull().default(""),
  language: text("language").notNull().default("text"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sharedFiles = pgTable("shared_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  objectPath: text("object_path").notNull(),
  fileSize: text("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSharedCodeSchema = createInsertSchema(sharedCode).pick({
  content: true,
  language: true,
});

export const updateSharedCodeSchema = createInsertSchema(sharedCode).pick({
  content: true,
  language: true,
});

export const insertSharedFileSchema = createInsertSchema(sharedFiles).pick({
  filename: true,
  objectPath: true,
  fileSize: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SharedCode = typeof sharedCode.$inferSelect;
export type InsertSharedCode = z.infer<typeof insertSharedCodeSchema>;
export type UpdateSharedCode = z.infer<typeof updateSharedCodeSchema>;
export type SharedFile = typeof sharedFiles.$inferSelect;
export type InsertSharedFile = z.infer<typeof insertSharedFileSchema>;
