const { test, expect } = require('@playwright/test');
const path = require('path');

test('can reach results page', async ({ page }) => {
  const fileUrl = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(fileUrl);

  await page.selectOption('#birthYear', { label: '1985年' });
  await page.selectOption('#birthMonth', { value: '1' });
  await page.fill('#income', '30');
  await page.selectOption('#occupation', 'employee');

  await page.click('#step1 button.btn--primary');

  const costIds = ['housing','food','utilities','communication','insurance','vehicle','education','subscriptions','others'];
  for (const id of costIds) {
    await page.fill(`#cost-${id}`, '0');
  }
  await page.click('#step2 button.btn--primary');

  await page.click('#step3 button.btn--primary');

  await page.click('#step4 button.btn--calculate');

  await expect(page.locator('#step5')).toHaveClass(/active/);
});
