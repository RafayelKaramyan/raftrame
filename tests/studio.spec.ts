import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const matchTab = (page: Page) => page.getByRole('button', { name: /^match$/i });
async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Make the moment move.' })).toBeVisible();
  await expect(page.getByText('Saved on this browser', { exact: true })).toBeVisible();
}
async function commitField(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press('Tab');
}
async function saved(page: Page) {
  await expect(page.getByText('Saved on this browser', { exact: true })).toBeVisible();
}
test('opens a composed studio and navigates every page without losing the canonical base', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator('.stage-renderer')).toHaveText(/WEBGL|VECTOR/);
  await expect(page.getByLabel('Scene sequence').locator('.scene-card')).toHaveCount(4);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Good things/ })).toBeVisible();
  await page.getByRole('link', { name: 'Field notes', exact: true }).click();
  await expect(page.getByRole('heading', { name: /A good moment/ })).toBeVisible();
  await page.getByRole('link', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/raftrame\/$/);
  await page.reload();
  await saved(page);
  await page.screenshot({ path: info.outputPath('studio.png'), fullPage: true });
  expect(errors).toEqual([]);
});
test('edits match data, rejects invalid input, and persists after reload', async ({ page }) => {
  await ready(page);
  await matchTab(page).click();
  await commitField(page, 'Home team name', 'Harbor Athletic');
  await commitField(page, 'Home score', '4');
  await saved(page);
  await commitField(page, 'Home score', '100');
  await expect(page.getByLabel('Home score', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await commitField(page, 'Home score', '5');
  await saved(page);
  await page.reload();
  await matchTab(page).click();
  await expect(page.getByLabel('Home team name', { exact: true })).toHaveValue('Harbor Athletic');
  await expect(page.getByLabel('Home score', { exact: true })).toHaveValue('5');
});
test('undoes and redoes a committed duration change', async ({ page }) => {
  await ready(page);
  await commitField(page, 'Duration · seconds', '8');
  await expect(page.getByLabel('Duration · seconds')).toHaveValue('8');
  await page.getByRole('button', { name: 'Undo edit', exact: true }).click();
  await expect(page.getByLabel('Duration · seconds')).toHaveValue('6');
  await page.getByRole('button', { name: 'Redo edit', exact: true }).click();
  await expect(page.getByLabel('Duration · seconds')).toHaveValue('8');
});
test('adds, reorders, duplicates and removes scenes with reversible editing', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Add scene', exact: true }).click();
  await page.getByRole('button', { name: /Goal moment.*A moment worth/ }).click();
  await expect(page.locator('.scene-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Move scene earlier', exact: true }).click();
  await expect(page.locator('.scene-card').nth(3)).toContainText('Goal moment');
  await page.getByRole('button', { name: 'Duplicate scene', exact: true }).click();
  await expect(page.locator('.scene-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Delete scene', exact: true }).click();
  await page.getByRole('button', { name: 'Remove scene', exact: true }).click();
  await expect(page.locator('.scene-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Undo edit', exact: true }).click();
  await expect(page.locator('.scene-card')).toHaveCount(6);
});
test('seeks, plays, pauses and stops at an exact endpoint', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await expect(page.getByTestId('timecode')).toHaveText('00:00.0');
  await page.getByRole('button', { name: 'Play timeline', exact: true }).click();
  await expect(page.getByTestId('timecode')).not.toHaveText('00:00.0');
  await page.getByRole('button', { name: 'Pause playback', exact: true }).click();
  const paused = await page.getByTestId('timecode').textContent();
  await expect(page.getByRole('button', { name: 'Play timeline', exact: true })).toBeVisible();
  await page.getByLabel('Playhead position').press('Home');
  await page.getByLabel('Playhead position').press('ArrowRight');
  await expect(page.getByTestId('timecode')).toHaveText('00:00.1');
  expect(paused).not.toBe('00:00.0');
  await page.getByRole('button', { name: 'Go to end', exact: true }).click();
  await expect(page.getByTestId('timecode')).toHaveText('00:27.0');
});
test('moves the composition with a keyboard and resets it', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Move composition', exact: true }).click();
  const move = page.getByRole('group', { name: /Move active scene/ });
  await move.press('ArrowRight');
  await move.press('Shift+ArrowDown');
  await expect(page.getByLabel('Horizontal · px')).toHaveValue('2');
  await expect(page.getByLabel('Vertical · px')).toHaveValue('10');
  await page.getByRole('button', { name: 'Reset position', exact: true }).click();
  await expect(page.getByLabel('Horizontal · px')).toHaveValue('0');
  await expect(page.getByLabel('Vertical · px')).toHaveValue('0');
});
test('exports actual project bytes and imports them as a separate copy', async ({ page }) => {
  await ready(page);
  await matchTab(page).click();
  await commitField(page, 'Goal scorer', 'Julian Grey');
  await saved(page);
  await page.getByRole('button', { name: 'Export project', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /Editable project JSON/ }).click();
  const download = await pending;
  const file = (await download.path())!;
  const doc = JSON.parse(await readFile(file, 'utf8'));
  expect(doc).toMatchObject({
    format: 'raftrame-project',
    version: 1,
    project: { scorer: 'Julian Grey' },
  });
  expect(doc.project.scenes).toHaveLength(4);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByLabel('Import project file', { exact: true }).setInputFiles(file);
  await expect(
    page.getByRole('status').filter({ hasText: 'Project imported as a separate, editable copy.' }),
  ).toBeVisible();
  await saved(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(2);
});
test('exports a full-size PNG at the current playhead', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Export project', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /Still frame PNG/ }).click();
  const bytes = await readFile((await (await pending).path())!);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBe(1920);
  expect(bytes.readUInt32BE(20)).toBe(1080);
  expect(bytes.length).toBeGreaterThan(10000);
});
test('rejects a malformed import without changing the project', async ({ page }) => {
  await ready(page);
  await page.getByLabel('Import project file', { exact: true }).setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  });
  await expect(
    page.getByRole('status').filter({ hasText: 'This file is not valid JSON.' }),
  ).toBeVisible();
  await expect(page.locator('.scene-card')).toHaveCount(4);
});
test('creates a new art direction, searches and removes a project', async ({ page }) => {
  await ready(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: /02.*CLEAN.*Press/ }).click();
  await expect(
    page.getByRole('button', { name: 'Press edition / new match', exact: true }),
  ).toBeVisible();
  await saved(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(2);
  await page.getByLabel('Find a project').fill('does-not-exist');
  await expect(page.getByRole('heading', { name: 'No frames by that name.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: /Delete Press edition/ }).click();
  await page.getByRole('button', { name: 'Remove project', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
});
test('keeps dialog focus contained and returns it on Escape', async ({ page }) => {
  await ready(page);
  const opener = page.getByRole('button', { name: 'Add scene', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});
test('keeps all tools within compact viewports', async ({ page }, info) => {
  await ready(page);
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.getByRole('button', { name: /^style$/i }).click();
    await expect(page.getByRole('button', { name: /Press edition Apply/ })).toBeVisible();
    await page.getByRole('button', { name: /^scene$/i }).click();
    await page.screenshot({ path: info.outputPath(`compact-${width}.png`), fullPage: true });
  }
});
test('honors reduced motion and allows deliberate playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await expect(page.getByText('Reduced motion · complete compositions')).toBeVisible();
  await page.getByRole('button', { name: 'Go to start', exact: true }).click();
  await expect(
    page.locator('.stage-vector svg text').filter({ hasText: 'NORTHSTAR' }).first(),
  ).toHaveAttribute('opacity', '1');
  await page.getByRole('button', { name: 'Play timeline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause playback', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause playback', exact: true }).click();
});
test('falls back to editable vector scenes when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId.includes('webgl') || contextId === 'webgpu') return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof original;
  });
  await ready(page);
  await expect(page.locator('.stage-renderer')).toHaveText('VECTOR');
  await expect(page.locator('.stage-vector')).toBeVisible();
  await page.getByLabel('Select scene 4: Goal moment', { exact: true }).click();
  await expect(page.locator('.stage-vector')).toContainText('GOOOAL!');
  await commitField(page, 'Horizontal · px', '20');
  await saved(page);
});
test('surfaces a rejected write and retries without losing the edit', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    let fail = true;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      value: unknown,
      ...args: unknown[]
    ) {
      if (
        fail &&
        value &&
        typeof value === 'object' &&
        'revision' in value &&
        (value as { revision: number }).revision === 1
      ) {
        fail = false;
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      }
      return Reflect.apply(original, this, [value, ...args]);
    } as typeof original;
  });
  await ready(page);
  await commitField(page, 'Duration · seconds', '7');
  await expect(page.getByRole('alert')).toContainText('Storage rejected');
  await expect(page.getByLabel('Duration · seconds')).toHaveValue('7');
  await page.getByRole('button', { name: 'Retry save' }).click();
  await saved(page);
  await page.reload();
  await expect(page.getByLabel('Duration · seconds')).toHaveValue('7');
});
test('passes representative accessibility scans across the studio, project gallery and guide', async ({
  page,
}) => {
  await ready(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['./', './projects', './guide']) {
    await page.goto(route);
    await expect(page.locator('#main')).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  }
});

test('detects competing tab edits and loads the saved winner explicitly', async ({
  page,
  context,
}) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  await matchTab(page).click();
  await matchTab(other).click();
  await Promise.all([
    commitField(page, 'Home team name', 'West Harbour'),
    commitField(other, 'Home team name', 'Southbank City'),
  ]);
  await expect
    .poll(
      async () =>
        (await page.getByRole('alert').count()) + (await other.getByRole('alert').count()),
    )
    .toBe(1);
  const loser = (await page.getByRole('alert').count()) ? page : other;
  const winner = loser === page ? other : page;
  const name = await winner.getByLabel('Home team name', { exact: true }).inputValue();
  await loser.getByRole('button', { name: 'Load saved workspace', exact: true }).click();
  await expect(loser.getByLabel('Home team name', { exact: true })).toHaveValue(name);
  await saved(loser);
  await other.close();
});

test('preserves unreadable records and makes replacement an explicit recovery action', async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('raftrame-studio');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('documents', 'readwrite');
          tx.objectStore('documents').put({ broken: 'preserve me' }, 'workspace');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Let’s recover your workspace.' })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save original data', exact: true }).click();
  expect(JSON.parse(await readFile((await (await pending).path())!, 'utf8'))).toEqual({
    broken: 'preserve me',
  });
  await page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Let’s recover your workspace.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Replace workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make the moment move.' })).toBeVisible();
  await saved(page);
});
