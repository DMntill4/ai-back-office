import * as readline from "node:readline";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { grokClient } from "../src/llm/client";
import { AGENT_TOOLS, dispatchToolCall } from "../src/agent/toolsDefinition";
import { db, pool } from "../src/db/client";
import { detectActivatedSuperpowers, buildSuperpowerContext } from "../src/agent/superpowers";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const baseMdPath = path.join(__dirname, "../src/agent/prompts/base.md");
const baseSystemPrompt = fs.readFileSync(baseMdPath, "utf-8");

const MAX_STEPS = 10;

console.log("==================================================");
console.log("🤖 MINT - TERMINAL INTERACTIVA CON SUPERPODERES");
console.log("==================================================");
console.log("Escribe 'salir' o 'exit' para terminar la sesión.\n");

function promptUser() {
  rl.question("Usuario > ", async (input) => {
    const trimmed = input.trim();
    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "salir") {
      console.log("\nCerrando sesión de terminal...");
      await pool.end().catch(() => {});
      rl.close();
      return;
    }

    if (!trimmed) {
      promptUser();
      return;
    }

    // Detectar Superpoderes activados para esta consulta
    const superpowers = detectActivatedSuperpowers(trimmed);
    const superpowerBadges = superpowers.map((s) => s.badge).join(" | ");
    console.log(`\n${superpowerBadges}`);

    const superpowerContext = buildSuperpowerContext(superpowers);
    const dynamicSystemPrompt = `${baseSystemPrompt}\n${superpowerContext}`;

    const messages: any[] = [
      {
        role: "system",
        content: dynamicSystemPrompt,
      },
      {
        role: "user",
        content: trimmed,
      },
    ];

    const caseId = `chat_${randomUUID()}`;

    // Intentar registrar el caso de manera resiliente si la BD está activa
    try {
      await db
        .insert(require("../src/db/schema").cases)
        .values({
          id: caseId,
          title: "Sesión de Terminal Interactiva",
          description: trimmed,
          status: "en_proceso",
          priority: "normal",
        })
        .onConflictDoNothing();
    } catch {
      // Fallback silencioso en modo autónomo/local sin conexión a Postgres
    }

    try {
      let totalCostAccumulated = 0;
      let isDone = false;
      let stepCount = 0;

      while (!isDone && stepCount < MAX_STEPS) {
        stepCount++;

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

            console.log(` ⚙️  [Ejecutando herramienta: ${toolName}]`);

            let result: any;
            try {
              const res = await dispatchToolCall(toolName, toolArgs);
              result = res.result;
            } catch (toolErr: any) {
              result = {
                isSuccess: false,
                error: toolErr.message || "Error ejecutando la herramienta",
              };
            }

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
        } else {
          messages.push(response.message);
          console.log(`\nMINT > ${response.content}\n`);
          console.log(`📊 [Métricas: Pasos=${stepCount} | Costo USD: $${totalCostAccumulated.toFixed(6)}]\n`);
          isDone = true;
        }
      }

      if (!isDone && stepCount >= MAX_STEPS) {
        console.log(`\n⚠️  [Límite de seguridad alcanzado: ${MAX_STEPS} pasos. Se detiene el ciclo por seguridad.]\n`);
      }
    } catch (err: any) {
      console.log(`\n❌ [ERROR AGENTE]: ${err.message}\n`);
    }

    promptUser();
  });
}

promptUser();
