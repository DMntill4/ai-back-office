/* ==========================================================================
   Mint Desktop App - Autonomous Logistics Control Tower Client
   Zero-dependency Vanilla JS connecting directly to Mint Core & Notifiers
   ========================================================================== */

let activeTab = "dashboard";
let currentCompanyId = "comp_default";
let productsCache = [];
let channelsCache = [];
let decisionsCache = [];

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initCompanySelector();
  initChannelModal();
  initForceScan();
  initSearch();
  initLogisticsForms();
  initAgentConsole();
  initLogs();

  // Initial load
  loadSession().then(() => {
    loadAllData();
  });

  // Background Live Pulse every 25 seconds
  setInterval(() => {
    loadDashboardMetrics();
    appendTelemetryLog("Coordinator 24/7", "Pulso periódico completado. Catálogo, ROP dinámico y guías en monitoreo.");
  }, 25000);
});

// Toast System
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✔" : "❌"}</span> <div>${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Navigation Tabs
function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      switchTab(target);
    });
  });
}

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".view-pane").forEach((v) => v.classList.remove("active"));

  const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  const activeView = document.getElementById(`view-${tabId}`);

  if (activeBtn) activeBtn.classList.add("active");
  if (activeView) activeView.classList.add("active");

  if (tabId === "inventory") loadProducts();
  if (tabId === "logistics") loadLogisticsOverview();
  if (tabId === "channels") loadChannels();
  if (tabId === "decisions") loadDecisions();
  if (tabId === "dashboard") loadDashboardMetrics();
}

// Session & Company
async function loadSession() {
  try {
    const res = await fetch("/api/session");
    const data = await res.json();
    if (data.success) {
      currentCompanyId = data.session.companyId;
      document.getElementById("sessionUserName").textContent = data.session.userName;
      document.getElementById("sessionUserRole").textContent = data.session.userRole.toUpperCase();

      const sel = document.getElementById("companySelect");
      sel.innerHTML = "";
      data.companies.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.name} [${c.id}]`;
        if (c.id === currentCompanyId) opt.selected = true;
        sel.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Error loading session:", err);
  }
}

function initCompanySelector() {
  const sel = document.getElementById("companySelect");
  sel.addEventListener("change", async () => {
    currentCompanyId = sel.value;
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: currentCompanyId }),
    });
    showToast(`Empresa cambiada a ${currentCompanyId}`);
    loadAllData();
  });
}

function loadAllData() {
  loadDashboardMetrics();
  loadProducts();
  loadLogisticsOverview();
  loadChannels();
  loadDecisions();
}

// 1. Dashboard Metrics
async function loadDashboardMetrics() {
  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    if (data.success) {
      const m = data.metrics;
      document.getElementById("kpiTotalProducts").textContent = m.totalProducts;
      document.getElementById("kpiHealthy").textContent = m.healthyProducts;
      document.getElementById("kpiLowStock").textContent = m.lowStock;
      document.getElementById("kpiOutOfStock").textContent = m.outOfStock;
      document.getElementById("kpiTotalSpend").textContent = `$${m.totalSpendMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

      document.getElementById("productsCountPill").textContent = m.totalProducts;
      document.getElementById("channelsCountPill").textContent = m.activeChannels;
      document.getElementById("pendingDecisionsPill").textContent = m.pendingDecisions;
      const shipPill = document.getElementById("shipmentsCountPill");
      if (shipPill) shipPill.textContent = m.activeShipments || 0;

      renderMiniChannelsList();
    }
  } catch (err) {
    console.error("Error loading dashboard metrics:", err);
  }
}

function renderMiniChannelsList() {
  const container = document.getElementById("dashboardChannelsList");
  if (!channelsCache.length) {
    container.innerHTML = `
      <div class="empty-hint" style="padding:14px; text-align:center; color:var(--text-dim);">
        No hay canales de notificación registrados aún.<br>
        <button class="btn btn-mint btn-xs" style="margin-top:8px;" onclick="switchTab('channels')">+ Configurar Discord / Slack / Telegram</button>
      </div>`;
    return;
  }

  container.innerHTML = channelsCache
    .map(
      (c) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-subtle);">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="platform-badge platform-${c.type}">${c.type}</span>
        <span style="font-size:13px; font-weight:600;">${c.name}</span>
      </div>
      <button class="btn btn-outline btn-xs" onclick="sendTestNotice('${c.type}', '${c.id}')">Probar</button>
    </div>
  `,
    )
    .join("");
}

// 2. Logistics Control Tower & GPS
async function loadLogisticsOverview() {
  try {
    const res = await fetch("/api/logistics/overview");
    const data = await res.json();
    if (!data.success) return;

    renderShipmentsTable(data.shipments || []);
    renderConsolidatedLoads(data.consolidatedLoads || []);
    renderLogisticsNodes(data.warehouses || [], data.suppliers || []);
  } catch (err) {
    console.error("Error loading logistics overview:", err);
  }
}

function renderShipmentsTable(ships) {
  const tbody = document.getElementById("shipmentsTableBody");
  if (!tbody) return;
  if (!ships.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:18px; color:var(--text-dim);">No hay embarques en curso. Despacha un envío arriba o aprueba una orden de compra en la Bandeja HITL.</td></tr>`;
    return;
  }

  tbody.innerHTML = ships
    .map((s) => {
      const isDelivered = s.status === "entregado";
      const badgeClass = isDelivered ? "badge-mint" : s.status === "retrasado" ? "badge-red" : "badge-amber";
      const eta = s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : "N/A";
      const orig = s.originLocation || s.origin || "Origen";
      const dest = s.destinationLocation || s.destination || "Destino";
      return `
      <tr>
        <td><code>${s.trackingNumber}</code></td>
        <td>${orig}</td>
        <td>${dest}</td>
        <td>${s.carrier}</td>
        <td>${eta}</td>
        <td><span class="badge ${badgeClass}">${s.status.toUpperCase()}</span></td>
        <td class="text-center">
          ${
            !isDelivered
              ? `<button class="btn btn-mint btn-xs" onclick="receiveShipment('${s.trackingNumber}')">📥 Recibir y Sumar Stock</button>`
              : `<span style="color:var(--text-dim); font-size:12px;">✔ Recibido</span>`
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

async function receiveShipment(trackingNumber) {
  try {
    const res = await fetch("/api/logistics/receive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingOrOrderId: trackingNumber }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      loadAllData();
      appendTelemetryLog("Recepción Embarque", data.message);
    } else {
      showToast(data.message || "Error al recibir guía", "error");
    }
  } catch (err) {
    showToast("Error de conexión", "error");
  }
}

function renderConsolidatedLoads(loads) {
  const box = document.getElementById("consolidatedLoadsBox");
  if (!box) return;
  if (!loads.length) {
    box.innerHTML = `<div style="padding:12px; color:var(--mint);">✔ Todos los SKUs están sobre su Punto de Reorden Dinámico. Cero camiones pendientes por consolidar.</div>`;
    return;
  }

  box.innerHTML = loads
    .map(
      (l) => `
    <div style="border:1px solid var(--border-subtle); border-radius:8px; padding:12px; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>🏢 ${l.supplierName} (${l.supplierCity})</strong>
        <span class="badge badge-mint">LANDED COST: $${l.totalLandedCostMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</span>
      </div>
      <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
        Ruta OSRM: ${l.distanceKm} km (${l.durationFormatted}) │ Productos: $${l.productsCostMxn.toLocaleString("es-MX")} │ Flete: $${l.freightCostMxn.toLocaleString("es-MX")} (Ahorro consolidado: $${l.consolidationSavingsMxn.toFixed(2)})
      </div>
      <div style="margin-top:8px; font-size:12px;">
        ${l.items.map((i) => `<div>• <code>${i.sku}</code> ${i.productName}: <strong>${i.quantity}u</strong> ($${i.lineCostMxn.toLocaleString("es-MX")} MXN)</div>`).join("")}
      </div>
    </div>
  `,
    )
    .join("");
}

function renderLogisticsNodes(warehouses, suppliers) {
  const box = document.getElementById("logisticsNodesBox");
  if (!box) return;

  const whHtml = warehouses
    .map(
      (w) => `
    <div style="padding:6px 0; border-bottom:1px solid var(--border-subtle); font-size:13px;">
      🏭 <strong>${w.name}</strong> — ${w.city || w.location || "N/A"}
      <span style="float:right; font-family:monospace; color:var(--mint);">
        ${w.latitude && w.longitude ? `${Number(w.latitude).toFixed(4)}, ${Number(w.longitude).toFixed(4)}` : "Sin GPS"}
      </span>
    </div>
  `,
    )
    .join("");

  const suppHtml = suppliers
    .slice(0, 6)
    .map(
      (s) => `
    <div style="padding:6px 0; border-bottom:1px solid var(--border-subtle); font-size:13px;">
      🏢 <strong>${s.name}</strong> — ${s.city || s.streetAddress || s.location || "N/A"}
      <span style="float:right; font-family:monospace; color:var(--text-muted);">
        ${s.latitude && s.longitude ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : "Auto-GPS"}
      </span>
    </div>
  `,
    )
    .join("");

  box.innerHTML = whHtml + (suppHtml || `<div style="padding:8px 0; font-size:12px; color:var(--text-dim);">Modalidad Compra Directa / RFQ activa para cualquier SKU sin proveedor fijo.</div>`);
}

function initLogisticsForms() {
  const dispForm = document.getElementById("dispatchForm");
  if (dispForm) {
    dispForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const productQuery = document.getElementById("dispProduct").value;
      const quantity = Number(document.getElementById("dispQty").value || 1);
      const destinationAddressOrCity = document.getElementById("dispDest").value;
      const customerName = document.getElementById("dispCustomer").value;
      const outBox = document.getElementById("dispatchResultBox");

      outBox.textContent = "⏳ Seleccionando almacén más cercano con stock y calculando ruta vial OSRM...";
      try {
        const res = await fetch("/api/logistics/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productQuery, quantity, destinationAddressOrCity, customerName }),
        });
        const data = await res.json();
        if (data.success) {
          outBox.textContent = `✔ ${data.message}`;
          showToast(`Guía ${data.trackingNumber} despachada (${data.distanceKm} km)`);
          loadAllData();
          appendTelemetryLog("Despacho Outbound", data.message);
        } else {
          outBox.textContent = `❌ ${data.message}`;
          showToast(data.message, "error");
        }
      } catch (err) {
        outBox.textContent = "❌ Error al procesar despacho.";
      }
    });
  }

  const gpsForm = document.getElementById("nodeGpsForm");
  if (gpsForm) {
    gpsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nodeType = document.getElementById("nodeTypeSelect").value;
      const nodeIdOrName = document.getElementById("nodeNameInput").value;
      const addressOrCity = document.getElementById("nodeCityInput").value;

      const res = await fetch("/api/logistics/node-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeType, nodeIdOrName, addressOrCity }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadLogisticsOverview();
        appendTelemetryLog("Nodo GPS", data.message);
      } else {
        showToast(data.message || "Error geocodificando ubicación", "error");
      }
    });
  }

  const routeForm = document.getElementById("routeCalcForm");
  if (routeForm) {
    routeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const origin = document.getElementById("routeOrigin").value;
      const destination = document.getElementById("routeDest").value;
      const box = document.getElementById("routeCalcResult");
      box.textContent = "Calculando ruta OSRM...";

      const res = await fetch("/api/logistics/route-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const data = await res.json();
      if (data.success) {
        box.innerHTML = `✔ <strong>${data.route.distanceKm} km</strong> (${data.route.durationFormatted}) │ Flete estimado: <strong>${data.route.costoFleteFormatted}</strong> [${data.route.motorUtilizado}]`;
      } else {
        box.textContent = `❌ ${data.message}`;
      }
    });
  }
}

// 3. Coordinator AI Console
function initAgentConsole() {
  const form = document.getElementById("agentChatForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("agentChatInput");
    const msg = input.value.trim();
    if (!msg) return;
    await executeAgentMission(msg);
  });
}

function runQuickAgentPrompt(promptText) {
  const input = document.getElementById("agentChatInput");
  if (input) input.value = promptText;
  executeAgentMission(promptText);
}

async function executeAgentMission(message) {
  const btn = document.getElementById("btnSendAgentChat");
  const statusBadge = document.getElementById("agentStatusBadge");
  const timelineBox = document.getElementById("agentToolsTimeline");
  const outputBox = document.getElementById("agentResponseOutput");

  btn.disabled = true;
  btn.textContent = "⏳ Ejecutando...";
  statusBadge.textContent = "DELIBERANDO EN VIVO";
  timelineBox.innerHTML = "";
  outputBox.textContent = "Ejecutando herramientas del Coordinador Logístico sobre PostgreSQL y OSRM...";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, companyId: currentCompanyId }),
    });
    const data = await res.json();
    if (data.success) {
      statusBadge.textContent = (data.status || "RESUELTO").toUpperCase();
      if (data.multiAgentEvents && data.multiAgentEvents.length) {
        timelineBox.innerHTML = data.multiAgentEvents
          .map((ev) => `<span class="badge badge-mint">⚙ ${ev.action} (${ev.agent})</span>`)
          .join("");
      }
      outputBox.textContent = data.response || "Operación completada.";
      loadAllData();
      appendTelemetryLog("Coordinador IA", `Misión completada (${data.multiAgentEvents?.length || 0} tools ejecutadas).`);
    } else {
      outputBox.textContent = "Error al ejecutar misión.";
    }
  } catch (err) {
    outputBox.textContent = `Error de red: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Ejecutar Orden IA";
  }
}

// 4. Inventory / Catalog
async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (data.success) {
      productsCache = data.products;
      renderInventoryTable(productsCache);
    }
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

function renderInventoryTable(items) {
  const tbody = document.getElementById("inventoryTableBody");
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-dim);">No hay productos registrados en el catálogo de esta empresa.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((p) => {
      let badgeClass = "badge-mint";
      if (p.status === "AGOTADO") badgeClass = "badge-red";
      else if (p.status === "BAJO") badgeClass = "badge-amber";

      return `
      <tr>
        <td><code>${p.sku}</code></td>
        <td style="font-weight:600;">${p.name}</td>
        <td><span style="color:var(--text-dim); font-size:12px;">${p.category || "General"}</span></td>
        <td class="text-right" style="font-weight:700; font-size:14px;" id="stock-val-${p.id}">${p.stock}u</td>
        <td class="text-right" style="color:var(--text-muted);">${p.minStock}u / ROP: ${p.dynamicRop ?? p.minStock}u</td>
        <td class="text-center"><span class="badge ${badgeClass}">${p.status || "ÓPTIMO"}</span></td>
        <td class="text-center">
          <div class="stock-adjust-group">
            <button class="btn-icon" title="Restar 1 unidad" onclick="adjustStock('${p.id}', -1)">-</button>
            <button class="btn-icon" title="Sumar 1 unidad" onclick="adjustStock('${p.id}', 1)">+</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function adjustStock(productId, delta) {
  try {
    const res = await fetch("/api/products/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, delta }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Stock actualizado: ${data.newStock}u`);
      loadProducts();
      loadDashboardMetrics();
      loadLogisticsOverview();
      appendTelemetryLog(
        "Ajuste Stock",
        `Producto ${productId} ajustado en ${delta > 0 ? "+" + delta : delta} unidades. Stock final: ${data.newStock}u.`,
      );
    } else {
      showToast(data.error || "Error al ajustar stock", "error");
    }
  } catch (err) {
    showToast("Error de conexión", "error");
  }
}

function initSearch() {
  const input = document.getElementById("inventorySearchInput");
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    const filtered = productsCache.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
    renderInventoryTable(filtered);
  });
}

// 5. Channels Management
async function loadChannels() {
  try {
    const res = await fetch("/api/channels");
    const data = await res.json();
    if (data.success) {
      channelsCache = data.channels;
      renderChannelsGrid(channelsCache);
      renderMiniChannelsList();
    }
  } catch (err) {
    console.error("Error loading channels:", err);
  }
}

function renderChannelsGrid(channels) {
  const grid = document.getElementById("channelsGrid");
  if (!channels.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; background:var(--bg-card); border:1px dashed var(--border-mint); border-radius:var(--radius-md); padding:36px; text-align:center;">
        <h3 style="font-size:18px; margin-bottom:8px;">No tienes canales de notificación vinculados</h3>
        <p style="color:var(--text-muted); font-size:13px; max-width:480px; margin:0 auto 18px auto;">
          Conecta un Webhook de Discord, Slack o tu Bot de Telegram para que Mint te avise inmediatamente ante desabastos o compras de reposición.
        </p>
        <button class="btn btn-mint" onclick="document.getElementById('btnOpenAddChannelModal').click()">+ Conectar Mi Primer Canal</button>
      </div>`;
    return;
  }

  grid.innerHTML = channels
    .map((c) => {
      const topics = (c.config && c.config.topics) || ["logs", "stock", "logistics", "critical"];
      const topicLabels = {
        logs: "📜 Logs",
        stock: "📦 Stock Updates",
        logistics: "🚚 Logística & Pedidos",
        critical: "⚠️ Alertas Críticas",
      };

      return `
      <div class="channel-card">
        <div class="channel-header">
          <div class="channel-identity">
            <span class="platform-badge platform-${c.type}">${c.type}</span>
            <span class="channel-name">${c.name}</span>
          </div>
          <span class="channel-status">● ACTIVO</span>
        </div>

        <div class="channel-topics-list">
          ${topics.map((t) => `<span class="topic-tag">${topicLabels[t] || t}</span>`).join("")}
        </div>

        <div class="channel-actions">
          <span style="font-size:11px; color:var(--text-dim);">Registrado con persistencia</span>
          <button class="btn btn-outline btn-xs" onclick="sendTestNotice('${c.type}', '${c.id}')">
            ⚡ Probar Envío
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

async function sendTestNotice(type, channelId) {
  showToast(`Enviando aviso de prueba a canal ${type.toUpperCase()}...`);
  try {
    const channel = channelsCache.find((c) => c.id === channelId);
    const config = channel ? channel.config : {};

    const res = await fetch("/api/channels/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, config, topic: "Prueba desde Mint Desktop App" }),
    });
    const data = await res.json();
    if (data.success && data.result.success) {
      showToast(`¡Aviso enviado exitosamente a ${type.toUpperCase()}!`);
      appendTelemetryLog(
        "Test Canal",
        `Aviso interactivo despachado exitosamente a canal ${type.toUpperCase()} (Message ID: ${data.result.messageId || "OK"}).`,
      );
    } else {
      showToast(`Error al enviar: ${data.result?.error || data.error || "Fallo en webhook/bot"}`, "error");
    }
  } catch (err) {
    showToast("Error de conexión al enviar aviso", "error");
  }
}

// Channel Modal
function initChannelModal() {
  const modal = document.getElementById("addChannelModal");
  const btnOpen = document.getElementById("btnOpenAddChannelModal");
  const btnClose = document.getElementById("btnCloseModal");
  const btnCancel = document.getElementById("btnCancelModal");
  const form = document.getElementById("channelForm");
  const btnTest = document.getElementById("btnTestChannel");

  btnOpen.addEventListener("click", () => modal.classList.add("active"));
  const closeModal = () => modal.classList.remove("active");
  btnClose.addEventListener("click", closeModal);
  btnCancel.addEventListener("click", closeModal);

  const platformRadios = document.querySelectorAll('input[name="channelPlatform"]');
  const webhookGroup = document.getElementById("webhookFieldsGroup");
  const telegramGroup = document.getElementById("telegramFieldsGroup");

  platformRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (r.value === "telegram") {
        webhookGroup.style.display = "none";
        telegramGroup.style.display = "block";
      } else {
        webhookGroup.style.display = "block";
        telegramGroup.style.display = "none";
      }
    });
  });

  btnTest.addEventListener("click", async () => {
    const platform = document.querySelector('input[name="channelPlatform"]:checked').value;
    const webhookUrl = document.getElementById("webhookUrl").value;
    const botToken = document.getElementById("telegramBotToken").value;
    const chatId = document.getElementById("telegramChatId").value;

    const config = platform === "telegram" ? { botToken, chatId } : { webhookUrl };
    showToast(`Probando conexión con ${platform.toUpperCase()}...`);

    const res = await fetch("/api/channels/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: platform, config }),
    });
    const data = await res.json();
    if (data.success && data.result.success) {
      showToast(`¡Conexión verificada con ${platform.toUpperCase()}!`);
    } else {
      showToast(`Fallo en prueba: ${data.result?.error || data.error || "Verifica la URL o credenciales"}`, "error");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const platform = document.querySelector('input[name="channelPlatform"]:checked').value;
    const name = document.getElementById("channelName").value;
    const webhookUrl = document.getElementById("webhookUrl").value;
    const botToken = document.getElementById("telegramBotToken").value;
    const chatId = document.getElementById("telegramChatId").value;

    const checkedTopics = Array.from(document.querySelectorAll('input[name="channelTopics"]:checked')).map(
      (cb) => cb.value,
    );

    const payload = {
      type: platform,
      name,
      webhookUrl,
      botToken,
      chatId,
      topics: checkedTopics,
    };

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Canal ${name} guardado con éxito`);
      closeModal();
      form.reset();
      loadChannels();
      loadDashboardMetrics();
      appendTelemetryLog("Canal Creado", `Nuevo canal ${name} (${platform.toUpperCase()}) registrado para ${currentCompanyId}.`);
    } else {
      showToast(data.error || "Error al guardar canal", "error");
    }
  });
}

// 6. Decisions (HITL)
async function loadDecisions() {
  try {
    const res = await fetch("/api/decisions");
    const data = await res.json();
    if (data.success) {
      decisionsCache = data.decisions;
      renderDecisionsList(decisionsCache);
    }
  } catch (err) {
    console.error("Error loading decisions:", err);
  }
}

function renderDecisionsList(decs) {
  const container = document.getElementById("decisionsList");
  if (!decs.length) {
    container.innerHTML = `
      <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:36px; text-align:center; color:var(--text-dim);">
        No hay decisiones ni propuestas en bandeja. ¡Todas las operaciones están al día!
      </div>`;
    return;
  }

  container.innerHTML = decs
    .map((d) => {
      const isPending = d.policyDecision === "escalated_to_human" || d.policyDecision === "pending_approval";
      return `
      <div class="decision-card">
        <div class="decision-info">
          <h3>${d.title}</h3>
          <div class="decision-meta">
            <span><strong>Costo:</strong> $${Number(d.costMxn).toLocaleString("es-MX")} MXN</span>
            <span><strong>Agente:</strong> ${d.proposingAgent || "compras_agent"}</span>
            <span><strong>Decisión:</strong> <span class="badge ${isPending ? "badge-amber" : "badge-mint"}">${d.policyDecision}</span></span>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin-top:8px;">${d.policyReason || "Propuesta de compra lista para autorización humana."}</p>
        </div>

        <div class="decision-actions">
          ${
            isPending
              ? `
            <button class="btn btn-mint btn-sm" onclick="approveDecision('${d.id}')">Aprobar & Emitir Guía</button>
            <button class="btn btn-danger btn-sm" onclick="rejectDecision('${d.id}')">Rechazar</button>
          `
              : `<span class="badge badge-outline">${d.policyDecision.toUpperCase()}</span>`
          }
        </div>
      </div>
    `;
    })
    .join("");
}

async function approveDecision(id) {
  try {
    const res = await fetch(`/api/decisions/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      showToast(data.result?.message || "Propuesta aprobada y guía de embarque generada");
      loadAllData();
      appendTelemetryLog("HITL Aprobada", data.result?.message || `Decisión ${id} autorizada.`);
    } else {
      showToast(data.error || "Error al aprobar", "error");
    }
  } catch (err) {
    showToast("Error de conexión", "error");
  }
}

async function rejectDecision(id) {
  const reason = prompt("Indica el motivo del rechazo:", "No autorizado por presupuesto");
  if (reason === null) return;

  try {
    const res = await fetch(`/api/decisions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (data.success) {
      showToast("Propuesta rechazada y archivada");
      loadDecisions();
      loadDashboardMetrics();
      appendTelemetryLog("HITL Rechazada", `Decisión ${id} rechazada por operador: "${reason}".`);
    } else {
      showToast(data.error || "Error al rechazar", "error");
    }
  } catch (err) {
    showToast("Error de conexión", "error");
  }
}

// 7. Force Proactive Scan
function initForceScan() {
  const btn = document.getElementById("btnForceScan");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "⏳ Auditando...";
    showToast("Ejecutando escaneo proactivo y enviando alertas a Discord/Telegram...");

    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const s = data.result;
        showToast(`Auditoría lista: ${s.stockDeficitsFound} desabastos, ${s.delayedShipmentsFound} demoras`);
        loadAllData();
        appendTelemetryLog(
          "Escaneo Manual",
          `Auditoría forzada: ${s.stockDeficitsFound} desabastos detectados, ${s.processedDecisions.length} propuestas generadas y notificadas.`,
        );
      }
    } catch (err) {
      showToast("Error en escaneo", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "⚡ Escanear & Notificar";
    }
  });
}

// 8. Telemetry & Logs
function initLogs() {
  const btnClear = document.getElementById("btnClearLogs");
  btnClear.addEventListener("click", () => {
    document.getElementById("terminalLogsBody").innerHTML = "";
    showToast("Vista de logs despejada");
  });

  appendTelemetryLog("Coordinator", "Mint Logistics Control Tower inicializada. Conexión relacional a PostgreSQL activa.");
  appendTelemetryLog("Coordinator", "Motor OSRM GPS, Consolidación de Cargas y Canales Discord/Telegram en línea.");
}

function appendTelemetryLog(tag, message) {
  const body = document.getElementById("terminalLogsBody");
  if (!body) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-tag log-tag-info">[${tag}]</span>
    <span>${message}</span>
  `;
  body.appendChild(entry);
  body.scrollTop = body.scrollHeight;
}
