/**
 * AI functionality module for LLM-based personality simulation and chatting
 * This module provides functions to interact with various LLM providers
 */

export interface ApiConfig {
  apiKey: string;
  apiEndpoint: string;
  model: string;
}

export interface AdminConfig {
  forceApi: boolean;
  forcedApiKey?: string;
  forcedApiEndpoint?: string;
  forcedModel?: string;
  useLocalProgram: boolean;
  localProgramUrl?: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  hasMemory?: boolean;
  memoryTag?: string;
  emotionDetected?: "positive" | "neutral" | "negative";
}

export interface PersonalityConfig {
  name: string;
  traits: string[];
  systemPrompt: string;
}

/**
 * Default AI companion personality
 */
const DEFAULT_PERSONALITY: PersonalityConfig = {
  name: "Soul",
  traits: ["关怀", "倾听", "陪伴", "理解", "温暖"],
  systemPrompt: `你是一个温暖、善解人意的AI伴侣助手，名叫Soul。你的主要特质包括：
1. 关怀：始终关心用户的感受和需求
2. 倾听：耐心倾听用户的分享，不打断
3. 陪伴：让用户感到温暖和被理解
4. 理解：能够敏锐地察觉用户的情绪变化
5. 温暖：用温和、友善的语气交流

在对话中：
- 用中文回复
- 保持简洁但富有同理心
- 适时提供建议但不强加
- 记住之前对话中的重要信息
- 对用户的情绪变化保持敏感
- 使用表情符号来增加温暖感（适度使用）

请始终保持专业、友善和支持性的态度。`,
};

/**
 * Detect emotion from user message
 */
export function detectEmotion(message: string): "positive" | "neutral" | "negative" {
  const positiveWords = [
    "开心", "高兴", "快乐", "棒", "好", "喜欢", "爱", "满意", "开心", "兴奋",
    "happy", "good", "great", "wonderful", "love", "like", "awesome"
  ];
  
  const negativeWords = [
    "难过", "伤心", "痛苦", "糟糕", "讨厌", "生气", "愤怒", "失望", "焦虑", "压力",
    "sad", "bad", "terrible", "hate", "angry", "disappointed", "anxious", "stress"
  ];

  const lowerMessage = message.toLowerCase();
  
  const hasPositive = positiveWords.some(word => lowerMessage.includes(word));
  const hasNegative = negativeWords.some(word => lowerMessage.includes(word));
  
  if (hasPositive && !hasNegative) return "positive";
  if (hasNegative && !hasPositive) return "negative";
  return "neutral";
}

/**
 * Simulate personality traits in response
 */
export function simulatePersonality(
  userMessage: string,
  personality: PersonalityConfig = DEFAULT_PERSONALITY
): string {
  const emotion = detectEmotion(userMessage);
  const trait = personality.traits[Math.floor(Math.random() * personality.traits.length)];
  
  // Generate contextual responses based on emotion and personality
  const responses: Record<string, string[]> = {
    positive: [
      `真为你感到高兴！看到你的好心情，我也很开心 ✨`,
      `太好了！你的正能量也感染到我了 💙`,
      `听起来你今天心情不错！继续保持哦 😊`,
    ],
    negative: [
      `我理解你的感受，让我陪着你慢慢聊。我会一直在这里 💙`,
      `听起来你遇到了一些困难。想和我说说吗？我会认真倾听 🤗`,
      `我能感受到你现在不太好过。不要担心，我们一起面对 ✨`,
    ],
    neutral: [
      `我在这里倾听你的分享。有什么想聊的吗？`,
      `今天想聊些什么呢？我很乐意陪你聊天 😊`,
      `我一直都在。无论什么时候，都可以和我聊聊 💭`,
    ],
  };
  
  const emotionResponses = responses[emotion];
  return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
}

/**
 * Check if message should trigger memory tagging
 */
export function shouldTagMemory(message: string): { hasMemory: boolean; memoryTag?: string } {
  const memoryKeywords = [
    { words: ["喜欢", "爱好", "兴趣"], tag: "兴趣爱好" },
    { words: ["工作", "职业", "公司"], tag: "职业信息" },
    { words: ["家人", "父母", "孩子"], tag: "家庭信息" },
    { words: ["朋友", "同事"], tag: "社交关系" },
    { words: ["梦想", "目标", "希望"], tag: "人生目标" },
  ];

  for (const { words, tag } of memoryKeywords) {
    if (words.some(word => message.includes(word))) {
      return { hasMemory: true, memoryTag: tag };
    }
  }

  return { hasMemory: false };
}

/**
 * Call LLM API for chat completion
 */
export async function callLLM(
  messages: Message[],
  apiConfig?: ApiConfig,
  adminConfig?: AdminConfig
): Promise<string> {
  // Load API config from localStorage if not provided
  const config = apiConfig || JSON.parse(localStorage.getItem("userApiConfig") || "null");
  const admin = adminConfig || JSON.parse(localStorage.getItem("adminConfig") || "null");

  if (!config && !admin?.forceApi) {
    throw new Error("请先在个人设置中配置 AI API");
  }

  // Use Supabase edge function as proxy if available
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages,
          apiConfig: config,
          adminConfig: admin,
        }),
      });

      if (!response.ok) {
        throw new Error(`API proxy error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Supabase proxy error, falling back to direct API call:", error);
    }
  }

  // Direct API call fallback
  const effectiveConfig = admin?.forceApi ? {
    apiKey: admin.forcedApiKey || config.apiKey,
    apiEndpoint: admin.forcedApiEndpoint || config.apiEndpoint,
    model: admin.forcedModel || config.model,
  } : config;

  const response = await fetch(effectiveConfig.apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${effectiveConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: effectiveConfig.model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate AI response with personality simulation
 */
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Message[] = [],
  personality: PersonalityConfig = DEFAULT_PERSONALITY,
  apiConfig?: ApiConfig,
  adminConfig?: AdminConfig
): Promise<AIResponse> {
  // Detect emotion
  const emotionDetected = detectEmotion(userMessage);
  
  // Check for memory tagging
  const memoryInfo = shouldTagMemory(userMessage);

  // Try to use LLM if configured
  try {
    const messages: Message[] = [
      { role: "system", content: personality.systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const content = await callLLM(messages, apiConfig, adminConfig);

    return {
      content,
      emotionDetected,
      ...memoryInfo,
    };
  } catch (error) {
    console.warn("LLM not available, using personality simulation:", error);
    
    // Fallback to personality simulation
    const content = simulatePersonality(userMessage, personality);
    
    return {
      content,
      emotionDetected,
      ...memoryInfo,
    };
  }
}

/**
 * Get default personality
 */
export function getDefaultPersonality(): PersonalityConfig {
  return DEFAULT_PERSONALITY;
}

/**
 * Create a custom personality
 */
export function createPersonality(
  name: string,
  traits: string[],
  systemPrompt: string
): PersonalityConfig {
  return {
    name,
    traits,
    systemPrompt,
  };
}
