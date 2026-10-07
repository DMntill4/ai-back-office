import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { grokClient } from "../src/llm/client";

dotenv.config();

async function runSmokeTest() {
  console.log("==================================================");
  console.log("🔥 PRUEBA DE HUMO (SMOKE TEST) - GATEWAY DE GROK 🔥");
  console.log("==================================================\n");

  const apiKey = process.env.RETO_KEY || process.env.XAI_API_KEY;
  const baseUrl =
    process.env.GROK_BASE_URL ||
    process.env.RETO_BASE_URL ||
    "https://api.reto.pltk.mx/v1";

  if (!apiKey) {
    console.error("❌ ERROR: No se encontró la llave de API.");
    console.error(
      "Por favor define RETO_KEY o XAI_API_KEY en tu archivo .env antes de ejecutar este script.\n",
    );
    process.exit(1);
  }

  console.log(`📡 URL del Gateway: ${baseUrl}`);
  console.log(`🔑 Llave configurada: ${apiKey.substring(0, 7)}...`);

  const results: Record<string, any> = {
    fecha: new Date().toISOString(),
    baseUrl,
    modelosDisponibles: [] as string[],
    chatBasico: null as any,
    soporteTools: false,
    soporteJson: false,
    datosDeUso: null as any,
    costoPrueba: "0",
  };

  // ----------------------------------------------------
  // 1. DESCUBRIMIENTO DE MODELOS
  // ----------------------------------------------------
  console.log("\n[1/4] Consultando modelos disponibles en /v1/models...");
  try {
    const models = await grokClient.listModels();
    results.modelosDisponibles = models.map((m) => m.id);
    console.log(
      `✅ Modelos encontrados (${results.modelosDisponibles.length}):`,
      results.modelosDisponibles.join(", "),
    );
  } catch (err: any) {
    console.warn(`⚠️ No se pudo consultar /v1/models: ${err.message}`);
    results.modelosDisponibles = ["grok-4.6 (por defecto)"];
  }

  // ----------------------------------------------------
  // 2. PRUEBA DE CHAT BÁSICO ("hola")
  // ----------------------------------------------------
  console.log('\n[2/4] Enviando mensaje básico "hola" a grok-4.6...');
  try {
    const basicRes = await grokClient.chatCompletion({
      messages: [{ role: "user", content: "hola" }],
      maxTokens: 50,
    });

    results.chatBasico = {
      respuesta: basicRes.content,
      latenciaMs: basicRes.latencyMs,
      tokensEntrada: basicRes.usage.promptTokens,
      tokensSalida: basicRes.usage.completionTokens,
      costo: basicRes.cost,
    };
    results.datosDeUso = basicRes.usage;
    results.costoPrueba = basicRes.cost;

    console.log(`✅ Respuesta recibida en ${basicRes.latencyMs}ms:`);
    console.log(`   "${basicRes.content?.trim()}"`);
    console.log(
      `   Tokens: Entrada=${basicRes.usage.promptTokens}, Salida=${basicRes.usage.completionTokens}, Costo estimado=$${basicRes.cost} USD`,
    );
  } catch (err: any) {
    console.error("❌ Falló la prueba básica de chat:", err.message);
    process.exit(1);
  }

  // ----------------------------------------------------
  // 3. PRUEBA DE SOPORTE DE HERRAMIENTAS (TOOL CALLING)
  // ----------------------------------------------------
  console.log("\n[3/4] Probando soporte de herramientas (Function Calling)...");
  try {
    const toolRes = await grokClient.chatCompletion({
      messages: [
        {
          role: "user",
          content: "Por favor consulta el stock del producto con ID prod_st200",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "consultar_stock",
            description: "Consulta el inventario actual de un producto",
            parameters: {
              type: "object",
              properties: {
                producto_id: {
                  type: "string",
                  description: "Código o ID del producto",
                },
              },
              required: ["producto_id"],
            },
          },
        },
      ],
      toolChoice: "auto",
      maxTokens: 100,
    });

    if (toolRes.toolCalls && toolRes.toolCalls.length > 0) {
      results.soporteTools = true;
      const call = toolRes.toolCalls[0];
      if (call.type === "function") {
        console.log(
          `✅ Soporta herramientas. Grok invocó: ${call.function.name}`,
        );
        console.log(`   Argumentos enviados: ${call.function.arguments}`);
      }
    } else {
      console.warn("⚠️ El modelo respondió texto pero no generó tool_calls.");
    }
  } catch (err: any) {
    console.warn(`❌ Error en prueba de herramientas: ${err.message}`);
  }

  // ----------------------------------------------------
  // 4. PRUEBA DE JSON ESTRUCTURADO
  // ----------------------------------------------------
  console.log("\n[4/4] Probando soporte de salida JSON estructurada...");
  try {
    const jsonRes = await grokClient.chatCompletion({
      messages: [
        {
          role: "user",
          content:
            'Devuelve un JSON estrictamente con la estructura {"status": "ok"}',
        },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 50,
    });

    const parsed = JSON.parse(jsonRes.content || "{}");
    if (parsed.status === "ok") {
      results.soporteJson = true;
      console.log("✅ Soporta response_format: json_object exitosamente.");
    } else {
      console.log("⚠️ Devolvió JSON pero sin la estructura esperada.");
    }
  } catch (err: any) {
    console.warn(
      `⚠️ No soporta response_format json_object directo: ${err.message}`,
    );
  }

  // ----------------------------------------------------
  // GUARDAR DECISIÓN EN docs/decisions/001-gateway.md
  // ----------------------------------------------------
  const docPath = path.join(
    process.cwd(),
    "docs",
    "decisions",
    "001-gateway.md",
  );
  const docContent = `# 001-gateway.md — Hallazgos de la prueba de humo del Gateway

> Fecha de ejecución: ${results.fecha}

## 1. Conexión y Autenticación
- **Base URL probada:** \`${results.baseUrl}\`
- **Estado de la llave:** Válida y funcional.
- **Modelos detectados:** ${results.modelosDisponibles.join(", ")}

## 2. Capacidades comprobadas
- **Chat básico:** Funcional (${results.chatBasico?.latenciaMs || 0} ms de respuesta).
- **Soporte de Herramientas (Tools / Function Calling):** ${
    results.soporteTools ? "Soportado ✅" : "No detectado ⚠️"
  }
- **Soporte de JSON estructurado (\`response_format: json_object\`):** ${
    results.soporteJson ? "Soportado ✅" : "No soportado / Manual ⚠️"
  }

## 3. Métricas de uso y costos
- **Datos de uso recibidos:** Entrada=${
    results.datosDeUso?.prompt_tokens || 0
  }, Salida=${results.datosDeUso?.completion_tokens || 0}
- **Costo de la prueba básica:** $${results.costoPrueba} USD
`;

  fs.writeFileSync(docPath, docContent, "utf-8");
  console.log(`\n📄 Reporte generado en docs/decisions/001-gateway.md`);
  console.log("\n==================================================");
  console.log("🎉 PRUEBA DE HUMO FINALIZADA CON ÉXITO");
  console.log("==================================================");
}

runSmokeTest().catch((err) => {
  console.error("Error fatal en smoke test:", err);
  process.exit(1);
});
