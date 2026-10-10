
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = "gemini-3.8-flash";

// Shared helper: generate and parse JSON from Gemini
async function generateJSON(prompt) {
    if (!ai) {
        const error = new Error(
            "Gemini API key missing. Check your .env file."
        );
        error.statusCode = 500;
        throw error;
    }

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    if (!response.text) {
        throw new Error("Gemini returned an empty response.");
    }

    return JSON.parse(response.text);
}

// Shared error handler
function handleAPIError(res, error, routeName) {
    console.error(`${routeName} error:`, error);

    const message = String(error?.message || "");
    const status = Number(error?.status || error?.statusCode || 0);

    if (
        status === 429 ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.toLowerCase().includes("quota")
    ) {
        return res.status(429).json({
            message:
                "Gemini API quota limit reached. Please try again after your quota resets."
        });
    }

    if (
        message.includes("503") ||
        message.includes("UNAVAILABLE")
    ) {
        return res.status(503).json({
            message:
                "The AI service is temporarily busy. Please try again later."
        });
    }

    if (message.includes("API key") || message.includes("API_KEY")) {
        return res.status(500).json({
            message:
                "There is an API key configuration issue. Please check your .env file."
        });
    }

    return res.status(status >= 400 && status < 600 ? status : 500).json({
        message:
            "Unable to complete the request right now. Please try again later."
    });
}

// Main career recommendation
app.post("/api/recommend", async (req, res) => {
    try {
        const { education, skills, interests, experience } = req.body;

        if (
            !education?.trim() ||
            !skills?.trim() ||
            !interests?.trim() ||
            !experience
        ) {
            return res.status(400).json({
                message: "Please fill all the details."
            });
        }

        const prompt = `
You are an AI career guidance assistant.

Analyze this student's profile:
Education: ${education}
Current skills: ${skills}
Interests: ${interests}
Experience level: ${experience}

Recommend a suitable career based on the student's profile.
Be realistic for a student and explain in simple language.

Return ONLY valid JSON in this exact structure:
{
  "message": "A short personalized career analysis",
  "career": "Recommended career title",
  "careerSuggestions": ["Career option 1", "Career option 2", "Career option 3"],
  "missingSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "roadmap": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
}

Make the recommendations relevant to the student's interests.
Do not include Markdown or code fences.
`;

        const result = await generateJSON(prompt);

        if (
            !result.career ||
            !Array.isArray(result.careerSuggestions) ||
            !Array.isArray(result.missingSkills) ||
            !Array.isArray(result.roadmap)
        ) {
            throw new Error("Gemini returned an unexpected response format.");
        }

        return res.json({
            message: result.message || "Your career analysis is ready!",
            education,
            experience,
            career: result.career,
            careerSuggestions: result.careerSuggestions,
            missingSkills: result.missingSkills,
            roadmap: result.roadmap
        });

    } catch (error) {
        return handleAPIError(res, error, "Career recommendation");
    }
});

// Detailed information for a selected career
app.post("/api/career-details", async (req, res) => {
    try {
        const { career, education, skills, interests, experience } = req.body;

        if (
            !career?.trim() ||
            !education?.trim() ||
            !skills?.trim() ||
            !interests?.trim() ||
            !experience
        ) {
            return res.status(400).json({
                message: "Career and student details are required."
            });
        }

        const prompt = `
You are an AI career guidance assistant.

Give detailed information about this career: ${career}

Student profile:
Education: ${education}
Current skills: ${skills}
Interests: ${interests}
Experience: ${experience}

Return ONLY valid JSON in this structure:
{
  "description": "Explain this career in simple language",
  "requiredSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "jobRoles": ["Job role 1", "Job role 2", "Job role 3"],
  "roadmap": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
}

Personalize the guidance for this student.
Do not include Markdown or code fences.
`;

        const details = await generateJSON(prompt);

        if (
            !details.description ||
            !Array.isArray(details.requiredSkills) ||
            !Array.isArray(details.jobRoles) ||
            !Array.isArray(details.roadmap)
        ) {
            throw new Error("Invalid career details received.");
        }

        return res.json(details);

    } catch (error) {
        return handleAPIError(res, error, "Career details");
    }
});

// Health check
app.get("/api/health", (req, res) => {
    return res.json({
        message: "AI Career Recommendation Server is running!"
    });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});