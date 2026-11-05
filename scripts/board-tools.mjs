/** Camera and locale utilities live in the collapsible in-game dock. */
export async function openBoardTools(page) {
  const toggle = page.locator('.command-dock button[aria-controls="board-tools"]');
  if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) !== 'true')
    await toggle.click();
}
