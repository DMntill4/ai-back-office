import { describe, it, expect } from "vitest";
import {
  validateEmailAddress,
  validateOperatorName,
  validateCompanyName,
  isGibberish,
  parseCurrencyInput,
} from "../packages/cli/src/commands/onboarding";

describe("Validaciones Estrictas del Wizard de Onboarding", () => {
  describe("Validación de Correo Electrónico (validateEmailAddress)", () => {
    it("debe rechazar correos con longitudes excesivas o texto aberrante", () => {
      const aberration =
        "9wuhnfu9wbu9gbu98wbgu9bw9fgb098wehnf32099032904320942343092942009249042@ojsnfiusnbubgu.com";
      const result = validateEmailAddress(aberration);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceder 50 caracteres|límite de seguridad/);
    });

    it("debe rechazar correos vacíos o demasiado cortos", () => {
      expect(validateEmailAddress("").valid).toBe(false);
      expect(validateEmailAddress("a@b.c").valid).toBe(false);
    });

    it("debe rechazar símbolos especiales peligrosos o de inyección", () => {
      const dangerous = [
        "admin<script>@empresa.com",
        "admin;drop@empresa.com",
        "admin$user@empresa.com",
        "admin{test}@empresa.com",
        "admin%percent@empresa.com",
        "admin*star@empresa.com",
      ];
      for (const email of dangerous) {
        const res = validateEmailAddress(email);
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/símbolos especiales no permitidos/);
      }
    });

    it("debe rechazar secuencias aleatorias de teclado (keyboard mash) en el correo", () => {
      const gibberishEmails = [
        "asdfghjkl@empresa.com",
        "qwertyuiop@gmail.com",
        "bcdfghjklmn@empresa.com",
      ];
      for (const email of gibberishEmails) {
        const res = validateEmailAddress(email);
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/secuencia aleatoria|texto ficticio/);
      }
    });

    it("debe aceptar correos corporativos y personales válidos", () => {
      const valid = [
        "admin@empresa.com",
        "gerencia@logistica.co",
        "carlos.mendez@empresa.net",
        "contacto@tiendacentral.com",
      ];
      for (const email of valid) {
        const res = validateEmailAddress(email);
        expect(res.valid).toBe(true);
      }
    });
  });

  describe("Detección de Aberraciones y Gibberish (isGibberish)", () => {
    it("debe detectar repeticiones consecutivas y keyboard walks", () => {
      expect(isGibberish("aaaaaa")).toBe(true);
      expect(isGibberish("111111")).toBe(true);
      expect(isGibberish("qwertyuiop")).toBe(true);
      expect(isGibberish("asdfghjkl")).toBe(true);
      expect(isGibberish("zxcvbnm")).toBe(true);
    });

    it("debe detectar exceso de consonantes sin vocales", () => {
      expect(isGibberish("wuhnfu9wbu9gbu98wbgu")).toBe(true);
      expect(isGibberish("bcdfghjklmnp")).toBe(true);
    });

    it("no debe marcar como gibberish nombres y palabras en español normales", () => {
      expect(isGibberish("Carlos Mendez")).toBe(false);
      expect(isGibberish("Logistica Central")).toBe(false);
      expect(isGibberish("Distribuidora Bogota")).toBe(false);
      expect(isGibberish("admin@empresa.com")).toBe(false);
    });
  });

  describe("Soporte y Validación de Divisas (parseCurrencyInput)", () => {
    it("debe procesar una sola divisa válida", () => {
      const res = parseCurrencyInput("USD");
      expect(res).not.toBeNull();
      expect(res?.currency).toBe("USD");
      expect(res?.supportedCurrencies).toEqual(["USD"]);
      expect(res?.isMultiCurrency).toBe(false);
    });

    it("debe procesar múltiples divisas para empresas multinacionales", () => {
      const res = parseCurrencyInput("USD, EUR, COP");
      expect(res).not.toBeNull();
      expect(res?.currency).toBe("USD");
      expect(res?.supportedCurrencies).toEqual(["USD", "EUR", "COP"]);
      expect(res?.isMultiCurrency).toBe(true);
    });

    it("debe aceptar la palabra clave 'multidivisa'", () => {
      const res = parseCurrencyInput("multidivisa");
      expect(res).not.toBeNull();
      expect(res?.isMultiCurrency).toBe(true);
      expect(res?.supportedCurrencies).toContain("USD");
      expect(res?.supportedCurrencies).toContain("EUR");
    });

    it("debe retornar null para divisas o textos completamente inválidos", () => {
      expect(parseCurrencyInput("XYZ999")).toBeNull();
      expect(parseCurrencyInput("cualquiercosa")).toBeNull();
    });
  });

  describe("Validación Estricta de Código OTP de 6 Dígitos", () => {
    const OTP_REGEX = /^\d{6}$/;

    it("debe aceptar códigos exactamente de 6 dígitos numéricos", () => {
      expect(OTP_REGEX.test("164289")).toBe(true);
      expect(OTP_REGEX.test("000000")).toBe(true);
      expect(OTP_REGEX.test("999999")).toBe(true);
    });

    it("debe rechazar códigos con letras, símbolos o longitud distinta a 6", () => {
      expect(OTP_REGEX.test("16428")).toBe(false); // 5 dígitos
      expect(OTP_REGEX.test("1642890")).toBe(false); // 7 dígitos
      expect(OTP_REGEX.test("16428a")).toBe(false); // letra
      expect(OTP_REGEX.test("16-428")).toBe(false); // guion
      expect(OTP_REGEX.test("16 428")).toBe(false); // espacio
      expect(OTP_REGEX.test("16428;")).toBe(false); // punto y coma
      expect(OTP_REGEX.test("")).toBe(false);
    });
  });

  describe("Nombre de Operador Obligatorio y Validación (validateOperatorName)", () => {
    it("debe ser estrictamente obligatorio (rechaza vacío o solo espacios)", () => {
      const emptyRes = validateOperatorName("");
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.error).toMatch(/obligatorio/);

      const spaceRes = validateOperatorName("   ");
      expect(spaceRes.valid).toBe(false);
      expect(spaceRes.error).toMatch(/obligatorio/);
    });

    it("debe rechazar nombres demasiado cortos (<3) o largos (>35)", () => {
      expect(validateOperatorName("ab").valid).toBe(false);
      expect(validateOperatorName("A".repeat(36)).valid).toBe(false);
    });

    it("debe rechazar números en el nombre de operador", () => {
      const res = validateOperatorName("Carlos123");
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/sin dígitos numéricos|Sin números/);
    });

    it("debe rechazar símbolos especiales en el nombre de operador", () => {
      const res = validateOperatorName("Carlos@Mendez");
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/sin caracteres como|letras y espacios/);
    });

    it("debe aceptar nombres reales con espacios y acentos", () => {
      expect(validateOperatorName("Carlos Méndez").valid).toBe(true);
      expect(validateOperatorName("Ana María Gómez").valid).toBe(true);
      expect(validateOperatorName("José Ángel Peña").valid).toBe(true);
    });
  });

  describe("Nombre de Empresa Obligatorio y Validación (validateCompanyName)", () => {
    it("debe ser estrictamente obligatorio (rechaza vacío o solo espacios)", () => {
      const emptyRes = validateCompanyName("");
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.error).toMatch(/obligatorio/);

      const spaceRes = validateCompanyName("    ");
      expect(spaceRes.valid).toBe(false);
      expect(spaceRes.error).toMatch(/obligatorio/);
    });

    it("debe rechazar símbolos peligrosos o de inyección", () => {
      expect(validateCompanyName("Mi<script>Empresa").valid).toBe(false);
      expect(validateCompanyName("Empresa;DROP").valid).toBe(false);
      expect(validateCompanyName("Empresa$100").valid).toBe(false);
    });

    it("debe aceptar nombres de empresas comerciales válidos", () => {
      expect(validateCompanyName("Logística Central S.A.").valid).toBe(true);
      expect(validateCompanyName("Distribuciones & Comercio El Trébol").valid).toBe(true);
      expect(validateCompanyName("Mi Tienda Online 2026").valid).toBe(true);
    });
  });
});
