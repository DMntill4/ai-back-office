import * as readline from "node:readline";
import * as dotenv from "dotenv";
import { grokClient } from "../src/llm/client";
import { AGENT_TOOLS, dispatchToolCall } from "../src/agent/toolsDefinition";
import { randomUUID } from "node:crypto";
import { db, pool } from "../src/db/client";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

import * as fs from "node:fs";
import * as path from "node:path";

const baseMdPath = path.join(__dirname, "../src/agent/prompts/base.md");
const systemPrompt = fs.readFileSync(baseMdPath, "utf-8");

const messages: any[] = [
  {
    role: "system",
    content: systemPrompt,
  },
];

console.log("==================================================");
console.log("MINT - TERMINAL INTERACTIVA");
console.log("==================================================");

function promptUser() {
  rl.question("\nUsuario: ", async (input) => {
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "salir") {
      await pool.end();
      rl.close();
      return;
    }

    messages.push({ role: "user", content: input });
    const caseId = `chat_${randomUUID()}`;

    try {
      // Para evitar error de Foreign Key en llm_calls, registramos el caso
      await db.insert(require("../src/db/schema").cases).values({
        id: caseId,
        title: "Sesión de Terminal Interactiva",
        description: input,
        status: "en_proceso",
        priority: "normal",
      }).onConflictDoNothing();

      let totalCostAccumulated = 0;
      let isDone = false;

      process.stdout.write("MINT: ");

      while (!isDone) {
        const response = await grokClient.chatCompletion({
          caseId,
          messages,
          tools: AGENT_TOOLS,
          toolChoice: "auto",
          temperature: 0.1,
        });

        totalCostAccumulated += parseFloat(response.cost || "0");

        if (response.toolCalls && response.toolCalls.length > 0) {
          messages.push(response.message);

          for (const call of response.toolCalls) {
            if (call.type !== "function") continue;

            const toolName = call.function.name;
            const toolArgs = call.function.arguments;

            const { result } = await dispatchToolCall(toolName, toolArgs);

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
        } else {
          messages.push(response.message);
          console.log(response.content);
          console.log(`\n(Costo estimado: $${totalCostAccumulated.toFixed(6)} USD)`);
          isDone = true;
        }
      }
    } catch (err: any) {
      console.log(`\n[ERROR]: ${err.message}`);
    }

    promptUser();
  });
}

promptUser();
