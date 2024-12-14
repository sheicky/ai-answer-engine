export type Message = {
  role: "user" | "ai";
  content: string;
};

export type Chat = {
  id: string;
  messages: Message[];
  createdAt: Date;
  isShared?: boolean;
}; 