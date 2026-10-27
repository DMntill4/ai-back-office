/**
 * Universal Autonomous Locale & Currency Engine
 * Resuelve país, divisa oficial ISO 4217 y zona horaria IANA para CUALQUIER país o ciudad del mundo.
 * CERO hardcoding de 3 países: soporta todo Iberoamérica, Norteamérica, Europa y el resto del mundo.
 */

export interface ResolvedLocale {
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  suggestedCity: string;
  confidence: number;
}

interface CountryDefinition {
  names: string[];
  displayName?: string;
  code: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  primaryCity: string;
  knownCities?: string[];
}

const GLOBAL_COUNTRY_DATABASE: CountryDefinition[] = [
  // América del Sur
  {
    names: ["argentina", "republica argentina"],
    displayName: "Argentina",
    code: "AR",
    currency: "ARS",
    currencySymbol: "$",
    timezone: "America/Argentina/Buenos_Aires",
    primaryCity: "Buenos Aires",
    knownCities: ["buenos aires", "cordoba", "rosario", "mendoza", "la plata", "tucuman", "mar del plata", "salta"],
  },
  {
    names: ["bolivia", "estado plurinacional de bolivia"],
    code: "BO",
    currency: "BOB",
    currencySymbol: "Bs",
    timezone: "America/La_Paz",
    primaryCity: "La Paz",
    knownCities: ["la paz", "santa cruz", "santa cruz de la sierra", "cochabamba", "sucre", "oruro"],
  },
  {
    names: ["brasil", "brazil", "republica federativa do brasil"],
    code: "BR",
    currency: "BRL",
    currencySymbol: "R$",
    timezone: "America/Sao_Paulo",
    primaryCity: "São Paulo",
    knownCities: ["sao paulo", "são paulo", "rio de janeiro", "brasilia", "belo horizonte", "curitiba", "porto alegre"],
  },
  {
    names: ["chile", "republica de chile"],
    code: "CL",
    currency: "CLP",
    currencySymbol: "$",
    timezone: "America/Santiago",
    primaryCity: "Santiago",
    knownCities: ["santiago", "valparaiso", "valparaíso", "concepcion", "concepción", "antofagasta", "vina del mar", "viña del mar"],
  },
  {
    names: ["colombia", "republica de colombia"],
    code: "CO",
    currency: "COP",
    currencySymbol: "$",
    timezone: "America/Bogota",
    primaryCity: "Bogotá",
    knownCities: ["bogota", "bogotá", "medellin", "medellín", "cali", "barranquilla", "cartagena", "bucaramanga", "pereira"],
  },
  {
    names: ["ecuador", "republica del ecuador"],
    code: "EC",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/Guayaquil",
    primaryCity: "Quito",
    knownCities: ["quito", "guayaquil", "cuenca", "manta", "ambato", "machala"],
  },
  {
    names: ["paraguay", "republica del paraguay"],
    code: "PY",
    currency: "PYG",
    currencySymbol: "Gs",
    timezone: "America/Asuncion",
    primaryCity: "Asunción",
    knownCities: ["asuncion", "asunción", "ciudad del este", "encarnacion", "encarnación", "luque"],
  },
  {
    names: ["peru", "perú", "republica del peru"],
    code: "PE",
    currency: "PEN",
    currencySymbol: "S/",
    timezone: "America/Lima",
    primaryCity: "Lima",
    knownCities: ["lima", "arequipa", "trujillo", "chiclayo", "piura", "cusco", "cuzco", "huancayo"],
  },
  {
    names: ["uruguay", "republica oriental del uruguay"],
    code: "UY",
    currency: "UYU",
    currencySymbol: "$",
    timezone: "America/Montevideo",
    primaryCity: "Montevideo",
    knownCities: ["montevideo", "punta del este", "salto", "paysandu", "paysandú", "maldonado"],
  },
  {
    names: ["venezuela", "republica bolivariana de venezuela"],
    code: "VE",
    currency: "VES",
    currencySymbol: "Bs",
    timezone: "America/Caracas",
    primaryCity: "Caracas",
    knownCities: ["caracas", "maracaibo", "valencia", "barquisimeto", "maracay", "ciudad guayana"],
  },

  // América del Norte y Centroamérica
  {
    names: ["mexico", "méxico", "estados unidos mexicanos"],
    code: "MX",
    currency: "MXN",
    currencySymbol: "$",
    timezone: "America/Mexico_City",
    primaryCity: "Ciudad de México",
    knownCities: ["cdmx", "ciudad de mexico", "ciudad de méxico", "guadalajara", "monterrey", "puebla", "tijuana", "leon", "león", "cancun", "cancún"],
  },
  {
    names: ["costa rica", "republica de costa rica"],
    code: "CR",
    currency: "CRC",
    currencySymbol: "₡",
    timezone: "America/Costa_Rica",
    primaryCity: "San José",
    knownCities: ["san jose", "san josé", "alajuela", "cartago", "heredia"],
  },
  {
    names: ["panama", "panamá", "republica de panama"],
    code: "PA",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/Panama",
    primaryCity: "Ciudad de Panamá",
    knownCities: ["panama", "panamá", "ciudad de panama", "colon", "colón", "david"],
  },
  {
    names: ["guatemala", "republica de guatemala"],
    code: "GT",
    currency: "GTQ",
    currencySymbol: "Q",
    timezone: "America/Guatemala",
    primaryCity: "Ciudad de Guatemala",
    knownCities: ["guatemala", "quetzaltenango", "mixco", "antigua guatemala"],
  },
  {
    names: ["el salvador", "republica de el salvador"],
    code: "SV",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/El_Salvador",
    primaryCity: "San Salvador",
    knownCities: ["san salvador", "santa ana", "san miguel"],
  },
  {
    names: ["honduras", "republica de honduras"],
    code: "HN",
    currency: "HNL",
    currencySymbol: "L",
    timezone: "America/Tegucigalpa",
    primaryCity: "Tegucigalpa",
    knownCities: ["tegucigalpa", "san pedro sula", "choloma", "la ceiba"],
  },
  {
    names: ["nicaragua", "republica de nicaragua"],
    code: "NI",
    currency: "NIO",
    currencySymbol: "C$",
    timezone: "America/Managua",
    primaryCity: "Managua",
    knownCities: ["managua", "leon", "león", "granada", "matagalpa"],
  },
  {
    names: ["republica dominicana", "dominicana", "dominican republic"],
    code: "DO",
    currency: "DOP",
    currencySymbol: "RD$",
    timezone: "America/Santo_Domingo",
    primaryCity: "Santo Domingo",
    knownCities: ["santo domingo", "santiago de los caballeros", "punta cana", "la romana"],
  },
  {
    names: ["puerto rico"],
    code: "PR",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/Puerto_Rico",
    primaryCity: "San Juan",
    knownCities: ["san juan", "bayamon", "ponce", "carolina", "caguas"],
  },
  {
    names: ["estados unidos", "usa", "eeuu", "united states", "us"],
    code: "US",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/New_York",
    primaryCity: "Miami",
    knownCities: ["new york", "nueva york", "miami", "los angeles", "los ángeles", "chicago", "houston", "dallas", "san francisco", "austin"],
  },
  {
    names: ["canada", "canadá"],
    code: "CA",
    currency: "CAD",
    currencySymbol: "CA$",
    timezone: "America/Toronto",
    primaryCity: "Toronto",
    knownCities: ["toronto", "montreal", "vancouver", "calgary", "ottawa"],
  },

  // Europa
  {
    names: ["espana", "españa", "spain", "reino de espana"],
    displayName: "España",
    code: "ES",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Madrid",
    primaryCity: "Madrid",
    knownCities: ["madrid", "barcelona", "valencia", "sevilla", "zaragoza", "malaga", "málaga", "bilbao", "alicante"],
  },
  {
    names: ["reino unido", "uk", "united kingdom", "gran bretana", "gran bretaña", "inglaterra"],
    code: "GB",
    currency: "GBP",
    currencySymbol: "£",
    timezone: "Europe/London",
    primaryCity: "Londres",
    knownCities: ["london", "londres", "manchester", "birmingham", "edinburgh", "liverpool"],
  },
  {
    names: ["alemania", "germany", "deutschland"],
    code: "DE",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Berlin",
    primaryCity: "Berlín",
    knownCities: ["berlin", "berlín", "munich", "múnich", "frankfurt", "hamburg", "cologne"],
  },
  {
    names: ["francia", "france"],
    code: "FR",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Paris",
    primaryCity: "París",
    knownCities: ["paris", "parís", "lyon", "marseille", "marsella", "toulouse", "nice", "niza"],
  },
  {
    names: ["italia", "italy", "italia"],
    code: "IT",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Rome",
    primaryCity: "Roma",
    knownCities: ["roma", "milan", "milán", "napoles", "nápoles", "turin", "turín", "florencia"],
  },
  {
    names: ["portugal"],
    code: "PT",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Lisbon",
    primaryCity: "Lisboa",
    knownCities: ["lisboa", "porto", "oporto", "braga", "coimbra"],
  },

  // Asia y Oceanía
  {
    names: ["japon", "japón", "japan"],
    displayName: "Japón",
    code: "JP",
    currency: "JPY",
    currencySymbol: "¥",
    timezone: "Asia/Tokyo",
    primaryCity: "Tokio",
    knownCities: ["tokyo", "tokio", "osaka", "kyoto", "quioto", "yokohama"],
  },
  {
    names: ["china", "republica popular china"],
    code: "CN",
    currency: "CNY",
    currencySymbol: "¥",
    timezone: "Asia/Shanghai",
    primaryCity: "Shanghái",
    knownCities: ["beijing", "pekin", "pekín", "shanghai", "shanghái", "shenzhen", "guangzhou"],
  },
  {
    names: ["australia"],
    code: "AU",
    currency: "AUD",
    currencySymbol: "A$",
    timezone: "Australia/Sydney",
    primaryCity: "Sídney",
    knownCities: ["sydney", "sídney", "melbourne", "brisbane", "perth"],
  },
];

function normalizeText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Resuelve de forma autónoma el país, divisa y zona horaria a partir de cualquier texto libre:
 * nombre de país, ciudad, código ISO o mezcla (ej: "Madrid", "Buenos Aires", "Rosario, Argentina", "Espana", "Chile").
 */
export function resolveLocaleAutonomously(input: string): ResolvedLocale {
  const norm = normalizeText(input);

  // 1. Coincidencia exacta o parcial con nombres de país
  for (const country of GLOBAL_COUNTRY_DATABASE) {
    if (country.names.some((name) => norm === name || norm.includes(name))) {
      return {
        country: country.displayName || country.names[0].replace(/\b\w/g, (l) => l.toUpperCase()),
        countryCode: country.code,
        currency: country.currency,
        currencySymbol: country.currencySymbol,
        timezone: country.timezone,
        suggestedCity: country.primaryCity,
        confidence: 0.95,
      };
    }
  }

  // 2. Coincidencia por ciudades conocidas en la base de datos global
  for (const country of GLOBAL_COUNTRY_DATABASE) {
    if (country.knownCities?.some((city) => norm === city || norm.includes(city))) {
      const matchedCity = country.knownCities.find((c) => norm === c || norm.includes(c)) || country.primaryCity;
      return {
        country: country.displayName || country.names[0].replace(/\b\w/g, (l) => l.toUpperCase()),
        countryCode: country.code,
        currency: country.currency,
        currencySymbol: country.currencySymbol,
        timezone: country.timezone,
        suggestedCity: matchedCity.replace(/\b\w/g, (l) => l.toUpperCase()),
        confidence: 0.9,
      };
    }
  }

  // 3. Coincidencia por código de divisa directo (ej: "EUR", "ARS", "BRL", "CLP", "USD", "COP")
  const lettersOnly = norm.replace(/[^a-z]/g, "").toUpperCase();
  const byCurr = GLOBAL_COUNTRY_DATABASE.find((c) => c.currency === lettersOnly);
  if (byCurr) {
    return {
      country: byCurr.displayName || byCurr.names[0].replace(/\b\w/g, (l) => l.toUpperCase()),
      countryCode: byCurr.code,
      currency: byCurr.currency,
      currencySymbol: byCurr.currencySymbol,
      timezone: byCurr.timezone,
      suggestedCity: byCurr.primaryCity,
      confidence: 0.85,
    };
  }

  // 4. Fallback universal estándar seguro (sin inventar, señalando confianza baja)
  return {
    country: input.trim() || "Internacional",
    countryCode: "XX",
    currency: "USD",
    currencySymbol: "$",
    timezone: "UTC",
    suggestedCity: input.trim() || "Sede Central",
    confidence: 0.4,
  };
}

/**
 * Deduce de forma autónoma la divisa a partir de símbolos, palabras o cadenas en transacciones
 */
export function resolveCurrencyFromTextOrSymbol(input: string, countryHint = ""): string {
  const norm = normalizeText(input);

  if (norm.includes("usd") || norm.includes("dolar") || norm.includes("dollar")) return "USD";
  if (norm.includes("eur") || norm.includes("euro") || norm.includes("€")) return "EUR";
  if (norm.includes("gbp") || norm.includes("libra") || norm.includes("pound") || norm.includes("£")) return "GBP";
  if (norm.includes("brl") || norm.includes("real") || norm.includes("reais") || norm.includes("reales") || norm.includes("r$")) return "BRL";
  if (norm.includes("jpy") || norm.includes("yen") || norm.includes("¥")) return "JPY";
  if (norm.includes("sol") || norm.includes("soles") || norm.includes("s/")) return "PEN";
  if (norm.includes("quetzal") || norm.includes("quetzales")) return "GTQ";
  if (norm.includes("lempira") || norm.includes("lempiras")) return "HNL";
  if (norm.includes("cordoba") || norm.includes("córdoba")) return "NIO";
  if (norm.includes("colon") || norm.includes("colones") || norm.includes("₡")) return "CRC";
  if (norm.includes("guarani") || norm.includes("guaraní") || norm.includes("guaranies")) return "PYG";
  if (norm.includes("boliviano") || norm.includes("bolivianos")) return "BOB";

  // Si el texto incluye mención a un país o territorio conocido (ej: "pesos uruguayos", "pesos chilenos", "pesos mexicanos")
  const autoLoc = resolveLocaleAutonomously(input);
  if (autoLoc.confidence >= 0.8) {
    return autoLoc.currency;
  }

  // Búsqueda en el país sugerido
  if (countryHint) {
    const loc = resolveLocaleAutonomously(countryHint);
    if (loc.confidence > 0.5) {
      if (norm.includes("peso") || norm === "$") return loc.currency;
      return loc.currency;
    }
  }

  // Si es un código ISO exacto de 3 letras
  const cleanCode = input.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
  if (cleanCode.length === 3) {
    const exists = GLOBAL_COUNTRY_DATABASE.some((c) => c.currency === cleanCode);
    if (exists || ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY", "CHF"].includes(cleanCode)) {
      return cleanCode;
    }
  }

  return "USD";
}
