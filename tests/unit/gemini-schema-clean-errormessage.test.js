import { describe, it, expect } from "vitest";
import { cleanJSONSchemaForAntigravity } from "../../open-sse/translator/formats/gemini.js";
import { openaiToGeminiRequest } from "../../open-sse/translator/request/openai-to-gemini.js";

// Gemini's Schema proto has no field for ajv-errors / zod-to-json-schema
// annotations. One leftover key anywhere in a tool schema fails the whole
// request with: Unknown name "errorMessage" at '...parameters...items'.
describe("cleanJSONSchemaForAntigravity: validation-library annotations", () => {
  it("strips errorMessage from nested array items", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string", errorMessage: "tag must be a string" },
        },
      },
    };

    const cleaned = cleanJSONSchemaForAntigravity(schema);

    expect(cleaned.properties.tags.items).toEqual({ type: "string" });
  });

  it("strips errorMessage / errorMessages at every level, including object-valued ones", () => {
    const schema = {
      type: "object",
      errorMessage: { required: "missing field" },
      properties: {
        id: { type: "integer", errorMessage: { type: "must be int" } },
        nested: {
          type: "object",
          properties: {
            k: { type: "string", errorMessages: ["bad"] },
          },
        },
      },
    };

    const cleaned = cleanJSONSchemaForAntigravity(schema);

    expect(JSON.stringify(cleaned)).not.toMatch(/errorMessage/);
    expect(cleaned.properties.id).toEqual({ type: "integer" });
    expect(cleaned.properties.nested.properties.k).toEqual({ type: "string" });
  });

  it("does not touch a property that is legitimately named errorMessage", () => {
    const schema = {
      type: "object",
      properties: {
        errorMessage: { type: "string", description: "message to show the user" },
      },
      required: ["errorMessage"],
    };

    const cleaned = cleanJSONSchemaForAntigravity(schema);

    expect(cleaned.properties.errorMessage).toEqual({
      type: "string",
      description: "message to show the user",
    });
    expect(cleaned.required).toEqual(["errorMessage"]);
  });

  it("end-to-end: OpenAI tool → Gemini functionDeclarations carries no errorMessage keyword", () => {
    const body = {
      messages: [{ role: "user", content: "hi" }],
      tools: [{
        type: "function",
        function: {
          name: "list_files",
          description: "list",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string" },
              ignore: { type: "array", items: { type: "string", errorMessage: "must be a string" } },
              errorMessage: { type: "string", description: "legit param name" },
            },
          },
        },
      }],
    };

    const out = openaiToGeminiRequest("gemini-2.5-pro", body, false);
    const params = out.tools[0].functionDeclarations[0].parameters;

    expect(params.properties.ignore.items).toEqual({ type: "string" });
    expect(params.properties.errorMessage).toEqual({ type: "string", description: "legit param name" });
  });
});
