const { test, expect } = require('@playwright/test');
const progressKey = 'mon-kit-72h-v1';
const groceriesKey = 'mon-kit-72h-groceries-v1';
const languageKey = 'mon-kit-72h-language';
async function language(page, code) {
  await page.locator(`[data-lang="${code}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', code);
  await expect(page.locator(`[data-lang="${code}"]`)).toHaveAttribute('aria-pressed', 'true');
}

test('both languages cover all four steps, groceries and affiliate links', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('header .language')).toBeVisible();
  const titles = {
    fr: ['Choisir son sac', 'Acheter les provisions', 'Compléter le kit', 'Vérifier et entretenir'],
    en: ['Choose a backpack', 'Buy supplies', 'Complete the kit', 'Check and maintain']
  };
  for (let i = 0; i < 4; i++) {
    await page.locator('.step').nth(i).click();
    const frenchDescription = await page.locator('#description').textContent();
    const frenchItems = await page.locator('#items label strong, #items label > small').allTextContents();
    for (const code of ['en', 'fr', 'en', 'fr']) {
      await language(page, code);
      await expect(page.locator('#heading')).toHaveText(`${i + 1}. ${titles[code][i]}`);
      await expect(page.locator('.step').nth(i)).toContainText(code === 'en' ? 'Step' : 'Étape');
      await expect(page.locator('#previous')).toHaveText(code === 'en' ? '← Previous' : '← Précédent');
      await expect(page.locator('#countText')).toHaveText(`0 / 22 ${code === 'en' ? 'tasks' : 'actions'}`);
      if (i === 1) {
        await expect(page.locator('#shopping')).toBeVisible();
        await expect(page.locator('#shop-water + label')).toContainText(code === 'en' ? 'Drinking water' : 'Eau potable');
        await expect(page.locator('#copyShop')).toHaveText(code === 'en' ? 'Copy shopping list' : 'Copier ma liste');
        await expect(page.locator('[data-count="1"]')).toHaveAttribute('aria-label', code === 'en' ? 'Add one person' : 'Ajouter une personne');
      } else {
        await expect(page.locator('#shopping')).toBeHidden();
        await expect(page.locator('#items')).toBeVisible();
      }
      if (code === 'en') {
        expect(await page.locator('#description').textContent()).not.toBe(frenchDescription);
        const englishItems = await page.locator('#items label strong, #items label > small').allTextContents();
        englishItems.forEach((text, index) => expect(text).not.toBe(frenchItems[index]));
      }
      const links = page.locator('.inline-affiliate a');
      await expect(links).toHaveCount(i === 0 ? 1 : i === 2 ? 4 : 0);
      for (const link of await links.all()) {
        await expect(link).toHaveText(code === 'en' ? 'Find on Amazon' : 'Voir sur Amazon');
        const url = new URL(await link.getAttribute('href'));
        expect(url.origin + url.pathname).toBe('https://www.amazon.fr/s');
        expect(url.searchParams.get('tag')).toBe('monkit72h-21');
        expect(url.searchParams.get('k')).toBeTruthy();
        await expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
      }
    }
  }
  await page.locator('#next').click();
  await expect(page.locator('#heading')).toContainText('1.');
  await expect(page.locator('#previous')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('existing storage survives language changes, navigation and reload; reset honors cancellation', async ({ page }) => {
  await page.addInitScript(({progressKey, groceriesKey, languageKey}) => {
    if (localStorage.getItem('test-seeded')) return;
    localStorage.setItem(progressKey, JSON.stringify({checked: {'0-0': true, '1-0': true, '2-1': true}, step: 2}));
    localStorage.setItem(groceriesKey, JSON.stringify({people: 3, checked: {water: true}}));
    localStorage.setItem(languageKey, 'en');
    localStorage.setItem('unrelated', 'keep');
    localStorage.setItem('test-seeded', 'yes');
  }, {progressKey, groceriesKey, languageKey});
  await page.goto('/');
  await expect(page.locator('#heading')).toHaveText('3. Complete the kit');
  await expect(page.locator('#item-2-1')).toBeChecked();
  await expect(page.locator('#item-2-1').locator('..').locator('a')).toBeVisible();
  await expect(page.locator('#progressText')).toHaveText('14% ready');
  const before = await page.evaluate(() => ({p: localStorage.getItem('mon-kit-72h-v1'), g: localStorage.getItem('mon-kit-72h-groceries-v1')}));
  await language(page, 'fr');
  await language(page, 'en');
  expect(await page.evaluate(() => ({p: localStorage.getItem('mon-kit-72h-v1'), g: localStorage.getItem('mon-kit-72h-groceries-v1')}))).toEqual(before);
  await page.locator('#item-2-1').uncheck();
  await expect(page.locator('#progressText')).toHaveText('9% ready');
  await expect(page.locator('#item-2-1').locator('..').locator('a')).toBeVisible();
  await page.locator('#previous').click();
  await expect(page.locator('#shop-water')).toBeChecked();
  await expect(page.locator('.shop-counter strong')).toHaveText('3');
  await page.locator('[data-count="1"]').click();
  await page.locator('#shop-meals').check();
  await page.reload();
  await expect(page.locator('.shop-counter strong')).toHaveText('4');
  await expect(page.locator('#shop-meals')).toBeChecked();
  await expect(page.locator('#progressText')).toHaveText('14% ready');
  await language(page, 'fr');
  await expect(page.locator('#progressText')).toHaveText('14 % prêt');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#reset').click();
  await expect(page.locator('#shop-meals')).toBeChecked();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#reset').click();
  await expect(page.locator('#progressText')).toHaveText('0 % prêt');
  await page.locator('#next').click();
  await expect(page.locator('#shop-water')).not.toBeChecked();
  await expect(page.locator('.shop-counter strong')).toHaveText('4');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
});

test('shopping quantities stay bounded and copied list follows language', async ({ page }) => {
  await page.addInitScript(() => {
    window.copied = [];
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => window.copied.push(text)}});
  });
  await page.goto('/');
  await page.locator('#next').click();
  await page.locator('[data-count="-1"]').click();
  await expect(page.locator('.shop-counter strong')).toHaveText('1');
  for (let i = 0; i < 9; i++) await page.locator('[data-count="1"]').click();
  await expect(page.locator('.shop-counter strong')).toHaveText('8');
  await page.locator('#shop-water').check();
  await page.locator('#copyShop').click();
  await expect(page.locator('#copyShop')).toHaveText('Liste copiée !');
  expect(await page.evaluate(() => window.copied[0])).toContain('☑ Eau potable : 48 litres');
  await language(page, 'en');
  await page.locator('#copyShop').click();
  await expect(page.locator('#copyShop')).toHaveText('List copied!');
  expect(await page.evaluate(() => window.copied[1])).toContain('☑ Drinking water : 48 litres');
});

test('malformed storage does not prevent startup', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mon-kit-72h-v1', '{bad');
    localStorage.setItem('mon-kit-72h-groceries-v1', '{bad');
  });
  await page.goto('/');
  await language(page, 'en');
  await expect(page.locator('#heading')).toHaveText('1. Choose a backpack');
});

test('keyboard checklist action updates progress and affiliate visibility; delayed copy tolerates navigation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => new Promise(resolve => { window.finishCopy = resolve; })}});
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('#item-0-0').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#item-0-0')).toBeChecked();
  await expect(page.locator('.inline-affiliate')).toHaveCount(1);
  await expect(page.locator('.inline-affiliate a')).toBeVisible();
  await page.reload();
  await expect(page.locator('#item-0-0')).toBeChecked();
  await expect(page.locator('.inline-affiliate a')).toBeVisible();
  await language(page, 'en');
  await expect(page.locator('.inline-affiliate a')).toHaveText('Find on Amazon');
  await language(page, 'fr');
  await expect(page.locator('.inline-affiliate a')).toHaveText('Voir sur Amazon');
  await expect(page.locator('#progress')).toHaveAttribute('aria-valuenow', '5');
  await page.locator('#next').click();
  await page.locator('#copyShop').click();
  await page.locator('#next').click();
  await language(page, 'en');
  await page.evaluate(() => window.finishCopy());
  expect(errors).toEqual([]);
});
