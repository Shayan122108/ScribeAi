
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// Simple .env parser since dotenv might not be installed
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, "utf-8");
            content.split("\n").forEach(line => {
                const [key, value] = line.split("=");
                if (key && value && !process.env[key.trim()]) {
                    process.env[key.trim()] = value.trim();
                }
            });
            console.log("Loaded .env file");
        } else {
            console.log("No .env file found");
        }
    } catch (e) {
        console.error("Error loading .env", e);
    }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment or .env file");
    process.exit(1);
}

console.log(`Checking models with API Key: ${apiKey.substring(0, 4)}...`);

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // There isn't a direct "listModels" on the main class in older versions, 
        // but let's try the model manager if available or just test standard models.

        // Actually, in the Node SDK, listModels is often separate or part of the model manager.
        // Let's try to verify the models we want to use directly.

        const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

        console.log("\nTesting specific models...");

        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                const response = await result.response;
                const text = response.text();
                console.log(`✅ Model '${modelName}' is WORKING!`);
            } catch (e: any) {
                console.error(`❌ Model '${modelName}' failed: ${e.message.split('\n')[0]}`);
            }
        }

    } catch (error) {
        console.error("Global error:", error);
    }
}

listModels();
