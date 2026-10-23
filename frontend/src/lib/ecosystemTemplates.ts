/**
 * Plantillas de Ecosistemas Industriales para Cuentas Nuevas (Rol Empresa)
 * 
 * Permite a empresas que no disponen de una base de datos propia inicializar
 * inmediatamente su catálogo y existencias en PostgreSQL / Supabase, con la
 * garantía de que pueden ser reemplazadas en cualquier momento por su esquema definitivo.
 */

export interface EcosystemTemplate {
  id: string;
  name: string;
  sector: string;
  desc: string;
  sampleItems: string[];
  getSql: (companyId: string) => string;
}

export const ECOSYSTEM_TEMPLATES: EcosystemTemplate[] = [
  {
    id: 'manufactura',
    name: 'Manufactura & Automatización',
    sector: 'Industrial & Robótica',
    desc: 'Servomotores de precisión, variadores de frecuencia VFD, sensores fotoeléctricos, cilindros neumáticos y fuentes de alimentación DIN.',
    sampleItems: [
      'Servomotor Industrial SM-400 (400W 3000 RPM)',
      'Variador de Frecuencia VFD-10 (Trifásico 3HP)',
      'Sensor Fotoeléctrico Óptico Infrarrojo 10m',
      'Cilindro Neumático Doble Efecto ISO 15552',
      'Fuente de Poder DIN 24V 10A Conmutada',
    ],
    getSql: (companyId: string) => `-- ==============================================================
-- CATÁLOGO DEL ECOSISTEMA: MANUFACTURA INDUSTRIAL Y AUTOMATIZACIÓN
-- ==============================================================
INSERT INTO products (id, company_id, name, description, category, sku, min_stock, origin)
VALUES
  ('prod_man_01', '${companyId}', 'Servomotor Industrial SM-400', 'Servomotor brushless 400W 3000 RPM de alta precisión', 'automatizacion', 'SKU-MAN-SM400', 8, 'real'),
  ('prod_man_02', '${companyId}', 'Variador de Frecuencia VFD-10', 'Controlador trifásico 3HP para motores y bombas', 'electricidad', 'SKU-MAN-VFD10', 5, 'real'),
  ('prod_man_03', '${companyId}', 'Sensor Fotoeléctrico Óptico', 'Sensor de proximidad infrarrojo 10m IP67', 'sensores', 'SKU-MAN-OP10', 12, 'real'),
  ('prod_man_04', '${companyId}', 'Cilindro Neumático Doble Efecto', 'Actuador neumático ISO 15552 carrera 100mm', 'neumatica', 'SKU-MAN-CNEU', 6, 'real'),
  ('prod_man_05', '${companyId}', 'Fuente de Poder DIN 24V 10A', 'Fuente conmutada riel DIN 240W certificada', 'electricidad', 'SKU-MAN-DIN24', 15, 'real')
ON CONFLICT (id) DO UPDATE SET origin = 'real', min_stock = EXCLUDED.min_stock;

INSERT INTO inventory (id, company_id, product_id, warehouse_id, stock)
VALUES
  ('inv_man_01', '${companyId}', 'prod_man_01', 'alm_central', 24),
  ('inv_man_02', '${companyId}', 'prod_man_02', 'alm_central', 2), -- ¡Bajo stock crítico para prueba de bot!
  ('inv_man_03', '${companyId}', 'prod_man_03', 'alm_central', 35),
  ('inv_man_04', '${companyId}', 'prod_man_04', 'alm_central', 14),
  ('inv_man_05', '${companyId}', 'prod_man_05', 'alm_central', 18)
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock;`,
  },
  {
    id: 'tecnologia',
    name: 'Tecnología & Redes IT',
    sector: 'Infraestructura & Telecomunicaciones',
    desc: 'Switches gestionables capa 3 PoE+, servidores rack 1U Xeon, transceptores ópticos SFP+ 10G, gateways SD-WAN y sistemas UPS online.',
    sampleItems: [
      'Switch Enterprise 48 Puertos PoE+ (4x SFP+ 10G)',
      'Servidor Rack 1U Intel Xeon 64GB ECC 2TB NVMe',
      'Transceptor Óptico SFP+ 10G Monomodo 10km',
      'Router Gateway SD-WAN Seguro con Firewall',
      'Sistema UPS Rack 3kVA Online Doble Conversión',
    ],
    getSql: (companyId: string) => `-- ==============================================================
-- CATÁLOGO DEL ECOSISTEMA: INFRAESTRUCTURA IT Y TELECOMUNICACIONES
-- ==============================================================
INSERT INTO products (id, company_id, name, description, category, sku, min_stock, origin)
VALUES
  ('prod_tech_01', '${companyId}', 'Switch Enterprise 48 Puertos PoE+', 'Switch gestionable capa 3 con 4 uplinks SFP+ 10G', 'redes', 'SKU-TECH-SW48', 4, 'real'),
  ('prod_tech_02', '${companyId}', 'Servidor Rack 1U Intel Xeon', 'Servidor de virtualización 64GB ECC 2TB NVMe', 'servidores', 'SKU-TECH-SRV1U', 2, 'real'),
  ('prod_tech_03', '${companyId}', 'Transceptor Óptico SFP+ 10G', 'Módulo transceptor monomodo 1310nm LC 10km', 'conectividad', 'SKU-TECH-SFP10', 16, 'real'),
  ('prod_tech_04', '${companyId}', 'Router Gateway SD-WAN Seguro', 'Firewall de alta disponibilidad balanceo multi-WAN', 'seguridad', 'SKU-TECH-RTR01', 5, 'real'),
  ('prod_tech_05', '${companyId}', 'Sistema UPS Rack 3kVA Online', 'Batería de respaldo ininterrumpido onda senoidal', 'energia', 'SKU-TECH-UPS3K', 3, 'real')
ON CONFLICT (id) DO UPDATE SET origin = 'real', min_stock = EXCLUDED.min_stock;

INSERT INTO inventory (id, company_id, product_id, warehouse_id, stock)
VALUES
  ('inv_tech_01', '${companyId}', 'prod_tech_01', 'alm_central', 8),
  ('inv_tech_02', '${companyId}', 'prod_tech_02', 'alm_central', 1), -- ¡Bajo stock crítico para prueba de bot!
  ('inv_tech_03', '${companyId}', 'prod_tech_03', 'alm_central', 45),
  ('inv_tech_04', '${companyId}', 'prod_tech_04', 'alm_central', 11),
  ('inv_tech_05', '${companyId}', 'prod_tech_05', 'alm_central', 4)
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock;`,
  },
  {
    id: 'salud',
    name: 'Salud & Insumos Médicos',
    sector: 'Clínico & Hospitalario',
    desc: 'Monitores de signos vitales multiparámetro, cajas de guantes de nitrilo estéril, bombas de infusión continua, oxímetros OLED y desfibriladores DEA.',
    sampleItems: [
      'Monitor Signos Vitales Multi-Par (ECG, SpO2, PNI)',
      'Caja Guantes Nitrilo Estéril Grado Hospital x100',
      'Bomba de Infusión Continua Peristáltica Digital',
      'Oxímetro de Pulso Digital OLED Recargable',
      'Equipo Desfibrilador DEA Portátil con Autodiagnóstico',
    ],
    getSql: (companyId: string) => `-- ==============================================================
-- CATÁLOGO DEL ECOSISTEMA: SALUD Y EQUIPAMIENTO CLÍNICO
-- ==============================================================
INSERT INTO products (id, company_id, name, description, category, sku, min_stock, origin)
VALUES
  ('prod_med_01', '${companyId}', 'Monitor Signos Vitales Multi-Par', 'Monitor ECG, SpO2, PNI y temperatura clínica 12 pulg', 'equipamiento', 'SKU-MED-MON01', 3, 'real'),
  ('prod_med_02', '${companyId}', 'Caja Guantes Nitrilo Estéril x100', 'Guantes libres de polvo grado hospitalario caja 100u', 'descartables', 'SKU-MED-GNT01', 35, 'real'),
  ('prod_med_03', '${companyId}', 'Bomba de Infusión Continua', 'Bomba peristáltica digital con batería de respaldo', 'equipamiento', 'SKU-MED-BMB01', 4, 'real'),
  ('prod_med_04', '${companyId}', 'Oxímetro de Pulso Digital OLED', 'Sensor de saturación y frecuencia cardíaca pediátrico', 'diagnostico', 'SKU-MED-OXI01', 12, 'real'),
  ('prod_med_05', '${companyId}', 'Equipo Desfibrilador DEA Portátil', 'Desfibrilador externo automatizado con autodiagnóstico', 'emergencias', 'SKU-MED-DEA01', 2, 'real')
ON CONFLICT (id) DO UPDATE SET origin = 'real', min_stock = EXCLUDED.min_stock;

INSERT INTO inventory (id, company_id, product_id, warehouse_id, stock)
VALUES
  ('inv_med_01', '${companyId}', 'prod_med_01', 'alm_central', 6),
  ('inv_med_02', '${companyId}', 'prod_med_02', 'alm_central', 8), -- ¡Bajo stock crítico para prueba de bot!
  ('inv_med_03', '${companyId}', 'prod_med_03', 'alm_central', 5),
  ('inv_med_04', '${companyId}', 'prod_med_04', 'alm_central', 22),
  ('inv_med_05', '${companyId}', 'prod_med_05', 'alm_central', 1) -- ¡Bajo stock crítico para prueba de bot!
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock;`,
  },
  {
    id: 'logistica',
    name: 'Logística, Retail & Consumo',
    sector: 'Distribución, Cadena de Suministro & E-commerce',
    desc: 'Pallets europeos certificados EPAL, película stretch film de emplaye, cajas de cartón corrugado doble coraza, rollos de etiquetas térmicas y cintas de embalaje.',
    sampleItems: [
      'Pallet Europeo Certificado EPAL 1200x800mm',
      'Película Stretch Film 18" Calibre 60 (Emplaye)',
      'Caja Cartón Corrugado Doble Coraza x50 (40x40cm)',
      'Rollo Etiquetas Térmicas Directas 4x6" x1000',
      'Cinta Canela de Embalaje Industrial 48mm x 150m',
    ],
    getSql: (companyId: string) => `-- ==============================================================
-- CATÁLOGO DEL ECOSISTEMA: LOGÍSTICA, EMBALAJE Y CONSUMO MASIVO
-- ==============================================================
INSERT INTO products (id, company_id, name, description, category, sku, min_stock, origin)
VALUES
  ('prod_log_01', '${companyId}', 'Pallet Europeo Certificado EPAL', 'Pallet de madera tratada 1200x800mm norma NIMF-15', 'almacenamiento', 'SKU-LOG-PLT01', 15, 'real'),
  ('prod_log_02', '${companyId}', 'Película Stretch Film 18" Cal 60', 'Rollo de plástico estirable para emplaye de tarimas', 'embalaje', 'SKU-LOG-STR18', 25, 'real'),
  ('prod_log_03', '${companyId}', 'Caja Cartón Corrugado x50', 'Caja doble coraza 40x40x40cm para envíos de carga', 'empaques', 'SKU-LOG-BOX40', 8, 'real'),
  ('prod_log_04', '${companyId}', 'Rollo Etiquetas Térmicas 4x6"', 'Etiquetas autoadheribles para guías de paquetería x1000', 'consumibles', 'SKU-LOG-ETQ01', 30, 'real'),
  ('prod_log_05', '${companyId}', 'Cinta Canela de Embalaje 48mm x 150m', 'Cinta adhesiva acrílica de alta adherencia industrial', 'consumibles', 'SKU-LOG-CNT48', 20, 'real')
ON CONFLICT (id) DO UPDATE SET origin = 'real', min_stock = EXCLUDED.min_stock;

INSERT INTO inventory (id, company_id, product_id, warehouse_id, stock)
VALUES
  ('inv_log_01', '${companyId}', 'prod_log_01', 'alm_central', 42),
  ('inv_log_02', '${companyId}', 'prod_log_02', 'alm_central', 4), -- ¡Bajo stock crítico para prueba de bot!
  ('inv_log_03', '${companyId}', 'prod_log_03', 'alm_central', 19),
  ('inv_log_04', '${companyId}', 'prod_log_04', 'alm_central', 3), -- ¡Bajo stock crítico para prueba de bot!
  ('inv_log_05', '${companyId}', 'prod_log_05', 'alm_central', 55)
ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock;`,
  },
];
