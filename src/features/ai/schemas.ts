import z from "zod";

const messageRoleSchema = z.enum(["system", "user", "assistant"]);

export const baseMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  ...baseMessageSchema.shape,
  createdAt: z.date(),
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type MessageRole = z.infer<typeof messageRoleSchema>;
