import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL no auto-registra cleanup porque vitest corre sin `globals: true`.
// Sin esto el DOM se acumula entre tests y los queries fallan por duplicados.
afterEach(() => {
  cleanup();
});