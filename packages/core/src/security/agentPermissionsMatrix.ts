import { db } from "../db/client";
import { businessConfig, operationalEvents } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AgentRole } from "../agent/contracts/agentContract";

/**
 * Matriz de Permisos por Agente — Principio de Mínimo Privilegio (MINT Security)
 *
 * Define exactamente que puede consultar (read), analizar (analyze),
 * proponer (propose), solicitar (create_request), ejecutar (execute),
 * modificar (update), notificar (notify), aprobar (approve) y configurar (configure_business)
 * cada agente de MINT.
 *
 * NOTA ARQUITECTONICA DE ROLES Y AISLAMIENTO:
 * Todos los roles humanos (owner, admin de negocio, supervisor, operador, auditor, finanzas, chofer, cliente)
 * existen y residen ESTRICTAMENTE dentro de la base de datos de la empresa cargada (companyId).
 * En MINT NO existe ningun 'admin global' ni roles transversales no contenidos en la base de datos cargada.
 *
 * Restricciones Inmutables del Sistema:
 * 1. NINGUN agente de IA tiene permiso de 'delete' (prohibido por defecto).
 * 2. NINGUN agente de IA tiene permiso de 'approve' (estrictamente reservado a humanos HITL de la empresa cargada).
 * 3. NINGUN agente de IA tiene permiso de 'configure_business' / 'admin' (reservado a owner, supervisor o admin del negocio en BD).
 * 4. El Coordinador puede orquestar, pero JAMAS puede conceder permisos a otros agentes ni auto-aprobarse.
 * 5. La autorizacion se valida en tiempo de ejecucion (just-in-time) antes de cada herramienta u operacion sensible.
 * 6. Revocaciones de permisos aplican inmediatamente a tareas pendientes.
 * 7. Todo intento denegado se audita sin exponer secretos ni informacion sensible.
 */

export type SecurityRole = AgentRole | "human_user" | "system";

export type AgentActionType =
  | "read"               // Consultar informacion necesaria
  | "analyze"            // Analizar datos y derivar conclusiones
  | "propose"            // Preparar propuestas o recomendaciones
  | "create_request"     // Crear solicitudes internas autorizadas (sin ejecutar compras ni pagos)
  | "execute"            // Ejecutar acciones rutinarias autorizadas
  | "update"             // Modificar datos permitidos
  | "delete"             // Eliminar informacion (PROHIBIDO para agentes de IA)
  | "notify"             // Enviar mensajes mediante canales autorizados
  | "approve"            // Aprobar operaciones (PROHIBIDO para agentes de IA, reservado a humanos HITL)
  | "configure_business" // Modificar directivas de la empresa cargada en BD (PROHIBIDO para IA; reservado a owner/admin de negocio/supervisor local)
  | "admin";             // Alias de compatibilidad para configure_business (local a la empresa cargada)

export type ResourceDomain =
  | "inventario"
  | "proveedores"
  | "ordenes_compra"
  | "logistica"
  | "notificaciones"
  | "datos_fuentes"
  | "auditoria"
  | "configuracion"
  | "decisiones";

export interface PermissionCheckContext {
  companyId: string;
  targetCompanyId?: string;
  caseId?: string;
  userId?: string;
  toolName?: string;
  isHumanCaller?: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  code:
    | "ALLOWED"
    | "DENIED_ACTION_NOT_PERMITTED"
    | "DENIED_DOMAIN_NOT_PERMITTED"
    | "DENIED_ROLE_CANNOT_APPROVE"
    | "DENIED_ROLE_CANNOT_DELETE"
    | "DENIED_ROLE_CANNOT_ADMIN"
    | "DENIED_CROSS_TENANT_VIOLATION"
    | "DENIED_COMPANY_OVERRIDE_REVOKED"
    | "DENIED_AGENT_DISABLED_BY_COMPANY"
    | "DENIED_ORCHESTRATOR_ELEVATION_ATTEMPT";
  auditLogged: boolean;
}

export type DomainPermissions = {
  [action in AgentActionType]?: ResourceDomain[];
};

/**
 * Matriz Base del Sistema (Techo Inmutable de Permisos para Agentes de IA)
 * Ninguna configuración por empresa ni instrucción de prompt puede superar estos límites.
 */
export const BASE_AGENT_PERMISSIONS: Record<SecurityRole, DomainPermissions> = {
  orchestrator: {
    read: [
      "inventario",
      "proveedores",
      "ordenes_compra",
      "logistica",
      "notificaciones",
      "datos_fuentes",
      "auditoria",
      "decisiones",
    ],
    analyze: [
      "inventario",
      "proveedores",
      "ordenes_compra",
      "logistica",
      "notificaciones",
      "datos_fuentes",
      "auditoria",
      "decisiones",
    ],
    propose: [
      "inventario",
      "proveedores",
      "ordenes_compra",
      "logistica",
      "notificaciones",
      "datos_fuentes",
      "auditoria",
      "decisiones",
    ],
    create_request: ["ordenes_compra", "decisiones"],
    execute: ["decisiones"], // Solo coordinación, asignación y orquestación
    update: [],              // No modifica datos empresariales directamente
    delete: [],              // Prohibido
    notify: ["notificaciones"],
    approve: [],             // Prohibido para IA: no puede aprobar órdenes ni auto-aprobarse
    configure_business: [],  // Prohibido para IA: no puede modificar directivas de la empresa
    admin: [],               // Prohibido para IA
  },
  inventario: {
    read: ["inventario", "datos_fuentes"],
    analyze: ["inventario"],
    propose: ["inventario", "ordenes_compra"],
    create_request: ["inventario"], // Solicitudes internas de reorden
    execute: ["inventario", "decisiones"],        // Reconciliaciones rutinarias y escalación
    update: ["inventario"],         // Solo ajustes explícitos autorizados
    delete: [],
    notify: ["notificaciones"],     // Alertas de inventario y stock crítico
    approve: [],
    configure_business: [],
    admin: [],
  },
  compras: {
    read: ["proveedores", "inventario", "ordenes_compra"],
    analyze: ["proveedores", "ordenes_compra"],
    propose: ["ordenes_compra"],
    create_request: ["ordenes_compra"], // Crear solicitud interna de reposición
    execute: ["ordenes_compra", "decisiones"],        // Solo creación de borradores autorizados y escalación; CERO pagos
    update: ["ordenes_compra"],         // Solo borradores de solicitudes
    delete: [],
    notify: ["notificaciones"],         // Solicitudes y alertas autorizadas
    approve: [],
    configure_business: [],
    admin: [],
  },
  logistica: {
    read: ["logistica", "ordenes_compra"],
    analyze: ["logistica"],
    propose: ["logistica"],
    create_request: ["logistica"],
    execute: ["logistica", "decisiones"],        // Actualizaciones operativas expresamente autorizadas y escalación
    update: ["logistica", "logistica"],         // Solo campos permitidos en envíos
    delete: [],
    notify: ["notificaciones"],     // Alertas logísticas
    approve: [],
    configure_business: [],
    admin: [],
  },
  notificaciones: {
    read: ["notificaciones", "decisiones"], // Eventos aprobados para comunicar
    analyze: ["notificaciones"],            // Preparar mensajes estructurados
    propose: ["notificaciones"],
    create_request: [],
    execute: ["notificaciones", "decisiones"],            // Enviar mensajes validados y escalación
    update: [],
    delete: [],
    notify: ["notificaciones"],             // Despacho a canales permitidos
    approve: [],
    configure_business: [],
    admin: [],
  },
  datos_integraciones: {
    read: ["datos_fuentes", "inventario"],
    analyze: ["datos_fuentes"],
    propose: ["datos_fuentes"],        // Proponer mapeos y correcciones
    create_request: ["datos_fuentes"],
    execute: ["datos_fuentes", "decisiones"],        // Ingestas autorizadas y escalación
    update: ["datos_fuentes"],         // Operaciones de ingesta validadas
    delete: [],
    notify: ["notificaciones"],        // Alertas de conexión y deriva de datos
    approve: [],
    configure_business: [],
    admin: [],
  },
  auditoria: {
    read: ["auditoria", "decisiones", "ordenes_compra", "inventario", "proveedores"],
    analyze: ["auditoria", "decisiones"],
    propose: ["auditoria"],            // Recomendar medidas correctivas
    create_request: ["auditoria"],
    execute: ["auditoria", "decisiones"],            // Comprobaciones no destructivas y escalación
    update: [],
    delete: [],
    notify: ["notificaciones"],        // Alertas de seguridad e incidencias
    approve: [],
    configure_business: [],
    admin: [],
  },
  human_user: {
    read: ["inventario", "proveedores", "ordenes_compra", "logistica", "notificaciones", "datos_fuentes", "auditoria", "configuracion", "decisiones"],
    analyze: ["inventario", "proveedores", "ordenes_compra", "logistica", "notificaciones", "datos_fuentes", "auditoria", "configuracion", "decisiones"],
    propose: ["inventario", "proveedores", "ordenes_compra", "logistica", "notificaciones", "datos_fuentes", "auditoria", "configuracion", "decisiones"],
    create_request: ["ordenes_compra", "inventario", "logistica", "datos_fuentes"],
    execute: ["inventario", "proveedores", "ordenes_compra", "logistica", "notificaciones", "datos_fuentes", "auditoria", "decisiones"],
    update: ["inventario", "proveedores", "ordenes_compra", "logistica", "configuracion", "decisiones"],
    delete: ["ordenes_compra", "datos_fuentes"],
    notify: ["notificaciones"],
    approve: ["decisiones", "ordenes_compra"], // Autorización humana (HITL)
    configure_business: ["configuracion"],      // Directivas de la empresa en la base de datos
    admin: ["configuracion"],                  // Alias de compatibilidad
  },
  system: {
    read: ["inventario", "proveedores", "ordenes_compra", "logistica", "notificaciones", "datos_fuentes", "auditoria", "configuracion", "decisiones"],
    analyze: ["inventario", "proveedores", "ordenes_compra", "logistica", "notificaciones", "datos_fuentes", "auditoria", "configuracion", "decisiones"],
    propose: ["decisiones"],
    create_request: ["decisiones"],
    execute: ["decisiones", "notificaciones", "auditoria"],
    update: ["decisiones", "auditoria"],
    delete: [],
    notify: ["notificaciones"],
    approve: [],
    configure_business: [],
    admin: [],
  },
};

/**
 * Mapeo de Herramientas del Sistema a Dominios y Acciones Requeridas
 */
export interface ToolPermissionRequirement {
  domain: ResourceDomain;
  action: AgentActionType;
  allowedRoles: SecurityRole[];
  isDestructive: boolean;
  requiresHumanApproval: boolean;
}

export const TOOL_PERMISSION_REQUIREMENTS: Record<string, ToolPermissionRequirement> = {
  consultar_stock: {
    domain: "inventario",
    action: "read",
    allowedRoles: ["orchestrator", "inventario", "compras", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  ver_ordenes_abiertas: {
    domain: "ordenes_compra",
    action: "read",
    allowedRoles: ["orchestrator", "compras", "logistica", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  ver_ordenes_compra_abiertas: {
    domain: "ordenes_compra",
    action: "read",
    allowedRoles: ["orchestrator", "compras", "logistica", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  crear_orden_compra: {
    domain: "ordenes_compra",
    action: "create_request",
    allowedRoles: ["orchestrator", "compras", "human_user"],
    isDestructive: false,
    requiresHumanApproval: true, // Siempre genera propuesta que requiere firma HITL
  },
  evaluar_proveedores: {
    domain: "proveedores",
    action: "read",
    allowedRoles: ["orchestrator", "compras", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  pronosticar_demanda: {
    domain: "inventario",
    action: "analyze",
    allowedRoles: ["orchestrator", "inventario", "compras", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  consultar_envios: {
    domain: "logistica",
    action: "read",
    allowedRoles: ["orchestrator", "logistica", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  calcular_ruta_logistica: {
    domain: "logistica",
    action: "read",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  despachar_envio_cliente: {
    domain: "logistica",
    action: "execute",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  recibir_mercancia_envio: {
    domain: "logistica",
    action: "execute",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  ajustar_stock: {
    domain: "inventario",
    action: "update",
    allowedRoles: ["orchestrator", "inventario", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  verificar_frescura_datos: {
    domain: "datos_fuentes",
    action: "read",
    allowedRoles: ["orchestrator", "datos_integraciones", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  consultar_estado_sistema: {
    domain: "datos_fuentes",
    action: "read",
    allowedRoles: ["orchestrator", "datos_integraciones", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  auditar_anomalias: {
    domain: "auditoria",
    action: "execute",
    allowedRoles: ["orchestrator", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  auditar_anomalias_operativas: {
    domain: "auditoria",
    action: "execute",
    allowedRoles: ["orchestrator", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  analisis_financiero: {
    domain: "ordenes_compra",
    action: "analyze",
    allowedRoles: ["orchestrator", "auditoria", "compras", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  simular_escenario: {
    domain: "logistica",
    action: "analyze",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  simular_escenario_logistico: {
    domain: "logistica",
    action: "analyze",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  consultar_historial_decisiones: {
    domain: "decisiones",
    action: "read",
    allowedRoles: ["orchestrator", "auditoria", "notificaciones", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  consultar_memoria_obsidian: {
    domain: "auditoria",
    action: "read",
    allowedRoles: ["orchestrator", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  reporte_general: {
    domain: "inventario",
    action: "read",
    allowedRoles: ["orchestrator", "inventario", "compras", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  reportes_generales: {
    domain: "inventario",
    action: "read",
    allowedRoles: ["orchestrator", "inventario", "compras", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  resolver_caso: {
    domain: "decisiones",
    action: "execute",
    allowedRoles: ["orchestrator", "human_user", "system"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  escalar_caso: {
    domain: "decisiones",
    action: "execute",
    allowedRoles: [
      "orchestrator",
      "inventario",
      "compras",
      "logistica",
      "notificaciones",
      "datos_integraciones",
      "auditoria",
      "human_user",
      "system",
    ],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  enviar_notificacion_operativa: {
    domain: "notificaciones",
    action: "notify",
    allowedRoles: ["orchestrator", "notificaciones", "auditoria", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  consultar_canales_notificacion: {
    domain: "notificaciones",
    action: "read",
    allowedRoles: ["orchestrator", "notificaciones", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  probar_canal_notificacion: {
    domain: "notificaciones",
    action: "execute",
    allowedRoles: ["orchestrator", "notificaciones", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  consolidar_cargas_y_rebalancear: {
    domain: "logistica",
    action: "analyze",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  configurar_nodo_logistico_gps: {
    domain: "logistica",
    action: "update",
    allowedRoles: ["orchestrator", "logistica", "human_user"],
    isDestructive: false,
    requiresHumanApproval: false,
  },
  // Acción de Aprobación Formal (CERO agentes de IA)
  aprobar_decision: {
    domain: "decisiones",
    action: "approve",
    allowedRoles: ["human_user"], // Estrictamente humano
    isDestructive: false,
    requiresHumanApproval: true,
  },
  // Acción destructiva de borrado (PROHIBIDA para agentes)
  eliminar_registro: {
    domain: "datos_fuentes",
    action: "delete",
    allowedRoles: ["human_user"],
    isDestructive: true,
    requiresHumanApproval: true,
  },
};

/**
 * Consulta la configuración de permisos personalizada para una empresa.
 * Las empresas pueden restringir o revocar permisos, pero JAMÁS ampliar
 * más allá del techo inmutable BASE_AGENT_PERMISSIONS.
 */
export async function getCompanyPermissionOverrides(
  companyId: string,
): Promise<{
  revokedActions?: Partial<Record<SecurityRole, AgentActionType[]>>;
  disabledAgents?: SecurityRole[];
  requireHitlOnAllRequests?: boolean;
}> {
  try {
    const [cfg] = await db
      .select({ value: businessConfig.value })
      .from(businessConfig)
      .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "agent_permissions")))
      .limit(1);

    if (cfg?.value) {
      return JSON.parse(cfg.value);
    }
  } catch {
    // Si no hay configuración o falla la lectura, se aplica la matriz base
  }

  return {};
}

/**
 * Registra un intento de violación de permisos en auditoría de forma segura (sin filtrar secretos)
 */
export async function auditLogPermissionViolation(violation: {
  companyId: string;
  agentRole: SecurityRole;
  action: AgentActionType;
  domain: ResourceDomain;
  toolName?: string;
  reason: string;
  code: string;
  caseId?: string;
}): Promise<void> {
  try {
    // Sanitización estricta: sólo identificadores y razones operativas
    const safePayload = {
      agentRole: violation.agentRole,
      action: violation.action,
      domain: violation.domain,
      toolName: violation.toolName || "direct_invocation",
      code: violation.code,
      reason: violation.reason,
      timestamp: new Date().toISOString(),
    };

    await db.insert(operationalEvents).values({
      id: `ev_sec_${randomUUID().slice(0, 8)}`,
      companyId: violation.companyId,
      eventType: "SECURITY_PERMISSION_VIOLATION",
      title: `Intento de acceso no autorizado denegado: [${violation.agentRole}] -> [${violation.action}:${violation.domain}]`,
      description: violation.reason,
      payload: safePayload,
      status: "COMPLETED",
      createdAt: new Date(),
    });
  } catch (err: any) {
    // Falla de logging no debe interrumpir el rechazo de seguridad
    console.error(`[SECURITY AUDIT] Error al registrar violación: ${err.message}`);
  }
}

/**
 * Validador Central de Autorización en el Backend
 * Principio: Cada llamada u operación es evaluada en tiempo de ejecución.
 */
export async function checkAgentPermission(
  agentRole: SecurityRole,
  action: AgentActionType,
  domain: ResourceDomain,
  context: PermissionCheckContext,
): Promise<PermissionCheckResult> {
  const companyId = context.companyId || "comp_default";

  // 1. RESTRICCIÓN MULTITENANT ESTRICTA: Aislamiento entre empresas
  if (context.targetCompanyId && context.targetCompanyId !== companyId) {
    const reason = `Aislamiento multitenant violado: el agente '${agentRole}' de empresa '${companyId}' intentó acceder a datos de empresa '${context.targetCompanyId}'.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_CROSS_TENANT_VIOLATION",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_CROSS_TENANT_VIOLATION",
      auditLogged: true,
    };
  }

  // 2. REGLA INMUTABLE: NINGÚN agente de IA puede ejecutar 'delete'
  if (action === "delete" && agentRole !== "human_user") {
    const reason = `Operación destructiva prohibida: ningún agente de IA tiene permisos de eliminación (delete) de datos.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_ROLE_CANNOT_DELETE",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_ROLE_CANNOT_DELETE",
      auditLogged: true,
    };
  }

  // 3. REGLA INMUTABLE: NINGÚN agente de IA puede 'approve' (estrictamente reservado a HITL)
  if (action === "approve" && agentRole !== "human_user") {
    const reason = `Auto-aprobación prohibida: los agentes de IA no tienen permiso de aprobación ('approve'). Toda operación requiere autorización de un operador humano autenticado.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_ROLE_CANNOT_APPROVE",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_ROLE_CANNOT_APPROVE",
      auditLogged: true,
    };
  }

  // 4. REGLA INMUTABLE: NINGUN agente de IA puede 'configure_business' ni 'admin'
  if ((action === "configure_business" || action === "admin") && agentRole !== "human_user") {
    const reason = `Acceso denegado: la modificacion de directivas o configuracion de la empresa cargada esta reservada a personal humano autorizado (owner, supervisor o admin del negocio en la base de datos de la empresa cargada). No existen administradores globales.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_ROLE_CANNOT_ADMIN",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_ROLE_CANNOT_ADMIN",
      auditLogged: true,
    };
  }

  // 5. Verificación contra la Matriz Base del Sistema (Ceiling)
  const rolePermissions = BASE_AGENT_PERMISSIONS[agentRole];
  if (!rolePermissions) {
    const reason = `Rol de agente desconocido o no registrado: '${agentRole}'.`;
    return {
      allowed: false,
      reason,
      code: "DENIED_ACTION_NOT_PERMITTED",
      auditLogged: false,
    };
  }

  const allowedDomains = rolePermissions[action] || [];
  if (!allowedDomains.includes(domain)) {
    const reason = `Permiso denegado: el agente '${agentRole}' no tiene permiso de '${action}' sobre el dominio '${domain}'.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_DOMAIN_NOT_PERMITTED",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_DOMAIN_NOT_PERMITTED",
      auditLogged: true,
    };
  }

  // 6. Verificación de Overrides y Revocaciones de la Empresa (Configuración Dinámica)
  const overrides = await getCompanyPermissionOverrides(companyId);

  // 6.1 Comprobar si el agente está deshabilitado para esta empresa
  if (overrides.disabledAgents && overrides.disabledAgents.includes(agentRole)) {
    const reason = `Agente deshabilitado: el agente '${agentRole}' ha sido desactivado en la configuración de la empresa '${companyId}'.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_AGENT_DISABLED_BY_COMPANY",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_AGENT_DISABLED_BY_COMPANY",
      auditLogged: true,
    };
  }

  // 6.2 Comprobar si la acción específica fue revocada por la empresa para este agente
  if (overrides.revokedActions && overrides.revokedActions[agentRole]?.includes(action)) {
    const reason = `Permiso revocado por política empresarial: la acción '${action}' está inhabilitada para el agente '${agentRole}' en la empresa '${companyId}'.`;
    await auditLogPermissionViolation({
      companyId,
      agentRole,
      action,
      domain,
      toolName: context.toolName,
      reason,
      code: "DENIED_COMPANY_OVERRIDE_REVOKED",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_COMPANY_OVERRIDE_REVOKED",
      auditLogged: true,
    };
  }

  return {
    allowed: true,
    code: "ALLOWED",
    auditLogged: false,
  };
}

/**
 * Validador de Autorización de Herramientas
 * Evalúa si un agente específico tiene permiso para ejecutar una herramienta concreta.
 */
export async function checkToolAuthorization(
  agentRole: SecurityRole,
  toolName: string,
  context: PermissionCheckContext,
): Promise<PermissionCheckResult> {
  const req = TOOL_PERMISSION_REQUIREMENTS[toolName];
  if (!req) {
    // Herramienta no mapeada: denegar por defecto
    const reason = `Herramienta desconocida o sin política de permisos registrada: '${toolName}'.`;
    return {
      allowed: false,
      reason,
      code: "DENIED_ACTION_NOT_PERMITTED",
      auditLogged: false,
    };
  }

  // Comprobar si el rol está en la lista blanca de la herramienta
  if (!req.allowedRoles.includes(agentRole)) {
    const reason = `Uso indebido de herramienta: el agente '${agentRole}' no tiene autorización para ejecutar la herramienta '${toolName}' perteneciente a otro agente o reservada a humanos.`;
    await auditLogPermissionViolation({
      companyId: context.companyId,
      agentRole,
      action: req.action,
      domain: req.domain,
      toolName,
      reason,
      code: "DENIED_ACTION_NOT_PERMITTED",
      caseId: context.caseId,
    });
    return {
      allowed: false,
      reason,
      code: "DENIED_ACTION_NOT_PERMITTED",
      auditLogged: true,
    };
  }

  // Evaluar permisos de dominio y acción
  return checkAgentPermission(agentRole, req.action, req.domain, {
    ...context,
    toolName,
  });
}

/**
 * Configura los permisos de agentes para una empresa (con guardrails de techo inmutable)
 */
export async function setCompanyAgentPermissions(
  companyId: string,
  config: {
    revokedActions?: Partial<Record<SecurityRole, AgentActionType[]>>;
    disabledAgents?: SecurityRole[];
    requireHitlOnAllRequests?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar que no se intente conceder permisos imposibles (approve, delete, admin a agentes de IA)
    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: "agent_permissions",
        value: JSON.stringify(config),
        description: "Matriz de permisos configurables por empresa",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: {
          value: JSON.stringify(config),
          updatedAt: new Date(),
        },
      });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
