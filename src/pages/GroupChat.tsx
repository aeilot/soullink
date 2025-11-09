import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  ArrowLeft, 
  Users, 
  Settings, 
  Image as ImageIcon, 
  Smile, 
  Paperclip,
  Shield,
  Sparkles,
  Heart,
  Zap,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { generateGroupChatResponse } from "@/ai";

interface GroupMessage {
  id: number;
  content: string;
  sender: "user" | "ai" | "other";
  senderName: string;
  timestamp: Date;
  aiRole?: "moderator" | "guide" | "entertainer";
  aiIntervention?: boolean;
}

const aiRoles = [
  {
    id: "moderator",
    name: "调解员",
    icon: Shield,
    color: "text-primary",
    description: "帮助化解矛盾，维护群聊和谐",
    greeting: "我会帮助大家保持理性沟通",
  },
  {
    id: "guide",
    name: "话题引导者",
    icon: MessageCircle,
    color: "text-secondary",
    description: "引导有趣话题，激发讨论",
    greeting: "让我们聊点有意思的话题吧",
  },
  {
    id: "entertainer",
    name: "气氛活跃者",
    icon: Zap,
    color: "text-warning",
    description: "活跃气氛，增添趣味",
    greeting: "我会让群聊更加有趣",
  },
];

const groups = {
  "1": { name: "工作小组", members: 5 },
  "2": { name: "朋友聚会", members: 8 },
  "3": { name: "学习小组", members: 12 },
};

const GroupChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<GroupMessage[]>([
    {
      id: 1,
      content: "大家好！",
      sender: "other",
      senderName: "小明",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: 2,
      content: "今天讨论什么主题呢？",
      sender: "other",
      senderName: "小红",
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: 3,
      content: "大家好！我注意到大家都在期待今天的话题。不如我们聊聊最近大家的工作进展如何？",
      sender: "ai",
      senderName: "Soul",
      timestamp: new Date(Date.now() - 180000),
      aiRole: "guide",
      aiIntervention: true,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [currentRole, setCurrentRole] = useState<string>("guide");
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const group = groups[id as keyof typeof groups];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newMessage: GroupMessage = {
      id: messages.length + 1,
      content: inputValue,
      sender: "user",
      senderName: "你",
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    const messageToSend = inputValue;
    setInputValue("");

    // Generate AI response if @Soul is mentioned
    if (messageToSend.includes("@Soul")) {
      setIsLoading(true);
      try {
        // Build group history for context
        const groupHistory = messages.map(m => ({
          sender: m.senderName,
          content: m.content,
        }));

        // Generate AI response using the new function
        const aiContent = await generateGroupChatResponse(
          messageToSend,
          groupHistory,
          currentRole as "moderator" | "guide" | "entertainer"
        );

        const aiResponse: GroupMessage = {
          id: messages.length + 2,
          content: aiContent,
          sender: "ai",
          senderName: "Soul",
          timestamp: new Date(),
          aiRole: currentRole as any,
          aiIntervention: true,
        };
        
        setMessages((prev) => [...prev, aiResponse]);
      } catch (error) {
        console.error("Failed to generate AI response:", error);
        toast({
          title: "AI 回复失败",
          description: error instanceof Error ? error.message : "请检查 API 配置",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRoleChange = (roleId: string) => {
    setCurrentRole(roleId);
    setShowRoleChange(true);
    const role = aiRoles.find((r) => r.id === roleId);
    
    setTimeout(() => {
      const announcement: GroupMessage = {
        id: messages.length + 1,
        content: `我现在切换到${role?.name}模式了！${role?.greeting}`,
        sender: "ai",
        senderName: "Soul",
        timestamp: new Date(),
        aiRole: roleId as any,
        aiIntervention: true,
      };
      setMessages((prev) => [...prev, announcement]);
      setShowRoleChange(false);
    }, 500);
  };

  const getCurrentRoleInfo = () => {
    return aiRoles.find((r) => r.id === currentRole);
  };

  const roleInfo = getCurrentRoleInfo();
  const RoleIcon = roleInfo?.icon || Sparkles;

  if (!group) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>群聊不存在</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-effect px-4 py-4 shadow-soft">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/group")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{group.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {group.members} 人
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <RoleIcon className={cn("w-5 h-5", roleInfo?.color)} />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>AI 角色设置</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="p-4 rounded-xl gradient-soft border border-primary/20">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                        <RoleIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">当前角色</h3>
                        <p className="text-sm text-muted-foreground">
                          {roleInfo?.name}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {roleInfo?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">切换角色</h3>
                    {aiRoles.map((role) => {
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.id}
                          onClick={() => handleRoleChange(role.id)}
                          className={cn(
                            "w-full p-4 rounded-xl text-left transition-all duration-300 border",
                            currentRole === role.id
                              ? "bg-primary/10 border-primary/20"
                              : "bg-card border-border hover:border-primary/20"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                currentRole === role.id
                                  ? "gradient-primary"
                                  : "bg-muted"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-4 h-4",
                                  currentRole === role.id
                                    ? "text-white"
                                    : role.color
                                )}
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{role.name}</h4>
                            </div>
                            {currentRole === role.id && (
                              <Badge variant="secondary">使用中</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground ml-11">
                            {role.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" className="rounded-xl">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Role Change Notification */}
      {showRoleChange && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="px-4 py-2 rounded-full glass-effect shadow-elevated border border-primary/20">
            <p className="text-sm font-medium">
              Soul 切换为 {roleInfo?.name} 🎭
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <div className="max-w-lg mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-slide-up",
                message.sender === "user" && "flex-row-reverse"
              )}
            >
              {message.sender !== "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  {message.sender === "ai" ? (
                    <div className="w-full h-full gradient-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <AvatarFallback className="bg-muted text-xs">
                      {message.senderName[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
              )}

              <div className="flex-1 flex flex-col gap-1">
                {message.sender !== "user" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {message.senderName}
                    </span>
                    {message.sender === "ai" && message.aiRole && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20"
                      >
                        {aiRoles.find((r) => r.id === message.aiRole)?.name}
                      </Badge>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-soft transition-smooth relative",
                    message.sender === "ai" && message.aiIntervention
                      ? "bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20"
                      : message.sender === "ai"
                      ? "bg-card"
                      : message.sender === "user"
                      ? "gradient-primary text-white ml-auto"
                      : "bg-card"
                  )}
                >
                  {message.sender === "ai" && message.aiIntervention && (
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full gradient-primary flex items-center justify-center shadow-soft">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span
                    className={cn(
                      "text-xs mt-1 block",
                      message.sender === "user"
                        ? "text-white/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {message.sender === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-muted text-xs">你</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 glass-effect border-t border-border px-4 py-4 shadow-elevated">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInputValue(inputValue + "@Soul ")}
              className="rounded-lg text-xs h-7 px-2"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              @Soul
            </Button>
            <p className="text-xs text-muted-foreground">
              快速请求 AI 协助
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-xl">
                  <Smile className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>😊 表情</DropdownMenuItem>
                <DropdownMenuItem>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  图片
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Paperclip className="w-4 h-4 mr-2" />
                  文件
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
              placeholder="输入消息..."
              disabled={isLoading}
              className="flex-1 rounded-xl border-border bg-background/50"
            />
            <Button
              onClick={handleSend}
              size="icon"
              disabled={!inputValue.trim() || isLoading}
              className="rounded-xl gradient-primary shadow-soft hover:shadow-elevated transition-all duration-300 hover:scale-105 disabled:opacity-50"
            >
              {isLoading ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
