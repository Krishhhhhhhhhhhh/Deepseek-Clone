export const maxDuration = 60;

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import connectDB from "../../../../../config/db";
import Chat from "../../../../../models/Chat";

// Parse multiple keys from env
const API_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",")
  .map(k => k.trim())
  .filter(Boolean);

// Model fallback list
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
 "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash", 
].filter(Boolean);

// Gemini fallback logic
const generateWithFallbackModel = async (contents) => {
  if (API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured.");
  }

  let lastError;

  for (const apiKey of API_KEYS) {
    const ai = new GoogleGenAI({ apiKey });

    for (const model of MODEL_CANDIDATES) {
      try {
        const result = await ai.models.generateContent({ model, contents });
        console.log(`✅ Success with key ...${apiKey.slice(-4)}, model: ${model}`);
        return { result, model };
      } catch (error) {
        lastError = error;

        const message = error?.message || "";
        const status = error?.status;

        const modelNotFound = message.includes("NOT_FOUND") || message.includes("not found");
        const quotaExhausted = message.includes("RESOURCE_EXHAUSTED") || status === 429;
        const invalidKey = status === 401 || message.toLowerCase().includes("api key");

        console.warn(`❌ Failed key ...${apiKey.slice(-4)}, model ${model}: ${message}`);

        if (modelNotFound) continue;
        if (quotaExhausted || invalidKey) break;

        throw error;
      }
    }
  }

  throw lastError || new Error("All Gemini API keys/models exhausted.");
};

// Friendly error message
const getFriendlyAiErrorMessage = (error) => {
  const message = error?.message || "";
  const status = error?.status;

  if (status === 429 || message.includes("quota")) {
    return "All Gemini API keys exceeded quota. Try again later.";
  }

  if (status === 401 || message.toLowerCase().includes("api key")) {
    return "Invalid Gemini API key. Check your .env file.";
  }

  return message || "Failed to generate AI response";
};

// HTTP status mapper
const getHttpStatusFromError = (error) => {
  const message = (error?.message || "").toLowerCase();
  const status = error?.status;

  if (status === 429 || message.includes("quota")) return 429;
  if (status === 401 || message.includes("api key")) return 502;
  if (status === 400) return 400;

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

    // ✅ Limit history (important)
    const MAX_HISTORY = 10;

    const history = chat.messages
      .slice(-MAX_HISTORY)
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    // ✅ Optional system instruction
    history.unshift({
      role: "user",
      parts: [{ text: "You are a helpful AI assistant like ChatGPT." }],
    });

    // Generate AI response
    const { result, model } = await generateWithFallbackModel(history);

    // ✅ FIXED: correct response extraction
    const text = result.response.text();

    const aiMessage = {
      role: "assistant",
      content: text,
      timestamp: Date.now(),
    };

    console.log("🤖 Gemini model used:", model);

    // Save AI response
    chat.messages.push(aiMessage);
    await chat.save();

    return NextResponse.json({
      success: true,
      data: aiMessage,
    });

  } catch (error) {
    console.error("❌ AI route error:", error.message, error.stack);

    return NextResponse.json(
      {
        success: false,
        message: getFriendlyAiErrorMessage(error),
      },
      { status: getHttpStatusFromError(error) }
    );
  }
}