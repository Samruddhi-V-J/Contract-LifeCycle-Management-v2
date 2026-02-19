
import { GoogleGenAI, Type } from "@google/genai";
import { Placeholder } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async generateTemplate(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a detailed professional legal contract template based on the following request: "${prompt}". 
      Use Jinja-style placeholders for all variable information (e.g., {{party_a_name}}, {{effective_date}}, {{jurisdiction}}, {{amount}}). 
      Format the output in clean Markdown with professional headers.`,
      config: {
        temperature: 0.7,
      },
    });
    return response.text || "Failed to generate template.";
  },

  async generateTemplateFromText(text: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Convert the following legal text into a professional contract template. 
      Identify all variable information and replace them with Jinja-style placeholders (e.g., {{party_name}}, {{date}}, {{amount}}).
      Ensure the output is in clean Markdown.
      
      Text: "${text}"`,
      config: {
        temperature: 0.3,
      },
    });
    return response.text || "Failed to process text.";
  },

  async extractPlaceholders(content: string): Promise<Placeholder[]> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract all unique Jinja-style placeholders (formatted like {{placeholder_name}}) from the following text. 
      Return them as a JSON object where the keys are the placeholder strings (without brackets) and the values are human-friendly labels.
      
      Text: "${content}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            placeholders: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING }
                },
                required: ["key", "label"]
              }
            }
          }
        }
      },
    });

    try {
      const result = JSON.parse(response.text);
      return result.placeholders || [];
    } catch (e) {
      console.error("Failed to parse placeholders", e);
      // Fallback regex extraction
      const matches = content.match(/\{\{(.*?)\}\}/g) || [];
      const uniqueKeys = Array.from(new Set(matches));
      return uniqueKeys.map(m => {
        const key = m.replace(/\{\{|\}\}/g, '').trim();
        return { key, label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') };
      });
    }
  },

  async removeUnusedClauses(content: string, unselectedKeys: string[]): Promise<string> {
    if (unselectedKeys.length === 0) return content;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a legal document editor. Given a contract template and a list of unselected placeholder keys, remove the entire clauses or sections that contain these unselected placeholders. 
      
      CRITICAL: 
      1. You MUST preserve all other placeholders (those NOT in the unselected list) exactly as they are, including the double curly braces (e.g., {{placeholder_name}}).
      2. If the clauses are numbered (e.g., 1., 2., 3. or Article 1, Article 2), you MUST renumber the remaining clauses sequentially so there are no gaps in the numbering. For example, if clause 2 is removed, the original clause 3 must become clause 2.
      
      Unselected Keys to remove clauses for: ${unselectedKeys.join(', ')}
      
      Contract Content:
      ${content}`,
      config: {
        temperature: 0.1,
      },
    });
    return response.text || content;
  }
};
