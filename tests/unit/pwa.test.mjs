import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), 'utf8');

const sw = await read('sw.js');
const precache = [...sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const manifest = JSON.parse(await read('manifest.webmanifest'));
const html = await read('index.html');

async function pngSize(path) {
    const buf = await readFile(new URL(path, ROOT));
    assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${path} nie jest plikiem PNG`);
    return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

test('service worker: każdy plik z listy offline istnieje', async () => {
    for (const path of precache.filter((p) => p !== './')) {
        await access(new URL(path, ROOT)).catch(() => assert.fail(`sw.js zapisuje nieistniejący plik: ${path}`));
    }
});

test('service worker: zapisuje offline wszystkie moduły JS i pliki danych', async () => {
    for (const dir of ['js', 'data']) {
        for (const file of await readdir(new URL(`${dir}/`, ROOT))) {
            assert.ok(precache.includes(`${dir}/${file}`), `dodaj '${dir}/${file}' do PRECACHE w sw.js — inaczej strona nie zadziała offline`);
        }
    }
});

test('manifest: ikony 192 i 512 px oraz maskable, zgodne z rozmiarem plików', async () => {
    for (const icon of manifest.icons) {
        assert.equal(await pngSize(icon.src), icon.sizes, `zły rozmiar ${icon.src}`);
    }
    const sizes = manifest.icons.map((i) => i.sizes);
    assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
    assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
});

test('manifest: adresy względne (strona działa pod /kaczuszki-skarbiec/)', () => {
    for (const key of ['start_url', 'scope', 'id']) {
        assert.ok(!manifest[key].startsWith('/'), `${key} nie może zaczynać się od „/”`);
    }
    assert.equal(manifest.display, 'standalone');
});

test('index.html: linki do manifestu i ikon wskazują na istniejące pliki', async () => {
    const hrefs = [...html.matchAll(/<link rel="(?:manifest|icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.includes('manifest.webmanifest'));
    for (const href of hrefs) await access(new URL(href, ROOT));
    assert.equal(await pngSize('icons/apple-touch-icon.png'), '180x180');
});
