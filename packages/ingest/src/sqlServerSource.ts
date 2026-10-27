export interface SqlServerConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  encrypt?: boolean;
}

export interface SqlServerTableInfo {
  tableName: string;
  schema: string;
  columns: Array<{
    columnName: string;
    dataType: string;
    isNullable: boolean;
  }>;
}

/**
 * Parsea y normaliza los parámetros de una cadena de conexión a SQL Server
 */
export function parseSqlServerConnectionString(connStr: string): SqlServerConfig {
  const config: SqlServerConfig = {};
  if (connStr.startsWith("mssql://")) {
    try {
      const u = new URL(connStr);
      config.host = u.hostname;
      config.port = u.port ? parseInt(u.port, 10) : 1433;
      config.user = decodeURIComponent(u.username);
      config.password = decodeURIComponent(u.password);
      config.database = u.pathname.replace(/^\//, "");
      return config;
    } catch {
      // Fallback a parser ADO.NET
    }
  }

  const parts = connStr.split(";").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const val = part.slice(eqIdx + 1).trim();

    if (key === "server" || key === "data source") {
      const [host, port] = val.split(",");
      config.host = host;
      if (port) config.port = parseInt(port, 10);
    } else if (key === "database" || key === "initial catalog") {
      config.database = val;
    } else if (key === "user id" || key === "uid" || key === "user") {
      config.user = val;
    } else if (key === "password" || key === "pwd") {
      config.password = val;
    } else if (key === "encrypt") {
      config.encrypt = val.toLowerCase() === "true" || val.toLowerCase() === "yes";
    }
  }

  return config;
}

/**
 * Valida la conectividad a SQL Server comprobando sintaxis y accesibilidad de red
 */
export async function testSqlServerConnectivity(
  configOrStr: SqlServerConfig | string,
): Promise<{ success: boolean; latencyMs: number; error?: string; config: SqlServerConfig }> {
  const start = Date.now();
  const cfg = typeof configOrStr === "string" ? parseSqlServerConnectionString(configOrStr) : configOrStr;

  if (!cfg.host || !cfg.database) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: "Cadena de conexión SQL Server incompleta: se requiere Server (host) y Database.",
      config: cfg,
    };
  }

  // Comprobar accesibilidad TCP al puerto especificado (por defecto 1433)
  const net = await import("node:net");
  const port = cfg.port || 1433;

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);
    socket.once("connect", () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({
        success: true,
        latencyMs,
        config: cfg,
      });
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve({
        success: false,
        latencyMs: Date.now() - start,
        error: `Tiempo de espera agotado al conectar con SQL Server en ${cfg.host}:${port} (${timeout}ms).`,
        config: cfg,
      });
    });

    socket.once("error", (err: any) => {
      socket.destroy();
      resolve({
        success: false,
        latencyMs: Date.now() - start,
        error: `Error de red conectando con SQL Server en ${cfg.host}:${port}: ${err.message}`,
        config: cfg,
      });
    });

    socket.connect({ port, host: cfg.host });
  });
}
