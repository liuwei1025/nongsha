import { expect, test } from '@playwright/test'

test('captures a note, generates a recommendation, and records the result', async ({ page }) => {
  await page.goto('/capture')

  await page.getByTestId('raw-note').fill(
    '下个月妈妈生日，要提前准备。保持每周锻炼。学 React。周末做一顿新菜。',
  )
  await page.getByRole('button', { name: 'Analyze note' }).click()

  await expect(
    page.getByRole('heading', { level: 3, name: /Captured .* loose thoughts|One note, one clearer path/ }),
  ).toBeVisible()
  await expect(page.getByTestId('task-editor').first()).toBeVisible()

  await page.goto('/home')
  await page.getByTestId('recommend-now').click()

  await expect(page.getByText('Option 1')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).first().click()

  await page.goto('/report')
  await expect(page.getByTestId('completed-count')).toContainText('1')
})
