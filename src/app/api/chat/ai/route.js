export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "../../../../../config/db";
import Chat from "../../../../../models/Chat";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ✅ Model fallback list — all free on OpenRouter
const MODEL_CANDIDATES = [
  process.env.OPENROUTER_MODEL,
  "openrouter/free",                         // ✅ Auto-picks best available free model
  "deepseek/deepseek-r1:free",               // DeepSeek R1
  "deepseek/deepseek-chat-v3-0324:free",     // DeepSeek V3 (updated ID)
  "meta-llama/llama-3.3-70b-instruct:free",  // Llama fallback
  "google/gemma-3-27b-it:free",              // Gemma fallback
].filter(Boolean);

// ✅ OpenRouter API call with model fallback
const generateWithFallback = async (messages) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  let lastError;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "DeepSeek Clone",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData?.error?.message || response.statusText;

        console.warn(`❌ Failed model ${model}: ${errorMsg}`);

        if (response.status === 429 || response.status === 503 || response.status === 404) {
          lastError = new Error(errorMsg);
          continue; // try next model
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) throw new Error("Empty response from model");

      console.log(`✅ Success with model: ${model}`);
      return { text, model };

    } catch (error) {
      lastError = error;
      console.warn(`❌ Failed model ${model}: ${error.message}`);
      continue;
    }
  }

  throw lastError || new Error("All models exhausted.");
};

// Friendly error message
const getFriendlyErrorMessage = (error) => {
  const message = error?.message || "";

  if (message.includes("rate limit") || message.includes("429")) {
    return "Rate limit reached. Please try again in a moment.";
  }
  if (message.includes("API key") || message.includes("401")) {
    return "Invalid OpenRouter API key. Check your .env.local file.";
  }
  if (message.includes("quota") || message.includes("billing")) {
    return "OpenRouter quota exceeded. Check your account at openrouter.ai.";
  }

  return message || "Failed to generate AI response.";
};

// HTTP status mapper
const getHttpStatus = (error) => {
  const message = (error?.message || "").toLowerCase();
  if (message.includes("rate limit") || message.includes("429")) return 429;
  if (message.includes("api key") || message.includes("401")) return 401;
  return 500;
};

// MAIN API
export async function POST(req) {
  try {
    const { userId } = getAuth(req);
    const { chatId, prompt } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!prompt || !chatId) {
      return NextResponse.json(
        { success: false, message: "Missing prompt or chatId" },
        { status: 400 }
      );
    }

    await connectDB();

    const chat = await Chat.findOne({ userId, _id: chatId });

    if (!chat) {
      return NextResponse.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    // Save user message
    const userPrompt = {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    chat.messages.push(userPrompt);

    const MAX_HISTORY = 10;

    // ✅ OpenRouter uses standard OpenAI-style messages (no Gemini parts format)
    const messages = [
      {
        role: "system",
        content: "You are a helpful AI assistant like DeepSeek. Reply helpfully and concisely.",
      },
      ...chat.messages
        .slice(-MAX_HISTORY)
        .map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
    ];

    // Generate AI response
    const { text, model } = await generateWithFallback(messages);

    const aiMessage = {
      role: "assistant",
      content: text,
      timestamp: Date.now(),
    };

    console.log("🤖 Model used:", model);

    // Save AI response
    chat.messages.push(aiMessage);
    await chat.save();

    return NextResponse.json({
      success: true,
      data: aiMessage,
    });

  } catch (error) {
    console.error("❌ AI route error:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: getFriendlyErrorMessage(error),
      },
      { status: getHttpStatus(error) }
    );
  }
}