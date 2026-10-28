// Re-export test globals injected by vitest environment
export const describe = (globalThis as any).describe;
export const it = (globalThis as any).it;
export const test = (globalThis as any).test;
export const expect = (globalThis as any).expect;
export const beforeAll = (globalThis as any).beforeAll;
export const afterAll = (globalThis as any).afterAll;
export const beforeEach = (globalThis as any).beforeEach;
export const afterEach = (globalThis as any).afterEach;
export const vi = (globalThis as any).vi;
export const suite = (globalThis as any).suite;
export default {
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
  suite,
};
