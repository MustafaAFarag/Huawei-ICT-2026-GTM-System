import { expect, type Page } from "@playwright/test";

/* The sidebar workspace switcher is a button + listbox popover; options carry the id in data-value. */
export async function selectWorkspace(page: Page, id: string) {
  const trigger = page.getByRole("button", { name: "Workspace", exact: true });
  if ((await trigger.getAttribute("data-value")) === id) return;
  await trigger.click();
  await page.locator(`.ws-pop [role="option"][data-value="${id}"]`).click();
  await expectWorkspace(page, id);
}

export async function expectWorkspace(page: Page, id: string) {
  await expect(
    page.getByRole("button", { name: "Workspace", exact: true }),
  ).toHaveAttribute("data-value", id);
}
