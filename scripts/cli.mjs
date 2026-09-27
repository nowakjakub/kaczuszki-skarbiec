// Wspólne wejście/wyjście skryptów uruchamianych przez workflowy GitHub Actions.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { TOTAL_CHILDREN } from '../js/config.js';
import { formatCollectionsJson, openCollectionsTable } from './zbiorki.mjs';

const COLLECTIONS = new URL('../data/collections.json', import.meta.url);
export const EXPENSES = new URL('../data/expenses.json', import.meta.url);
const { GITHUB_STEP_SUMMARY, GITHUB_OUTPUT } = process.env;

export const readCollections = async () => JSON.parse(await readFile(COLLECTIONS, 'utf8'));
export const writeCollections = (data) => writeFile(COLLECTIONS, formatCollectionsJson(data));

export async function report(markdown) {
    console.log(markdown);
    if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, `${markdown}\n\n`);
}

export async function setCommitMessage(message) {
    if (GITHUB_OUTPUT) await appendFile(GITHUB_OUTPUT, `commit_message=${message.replace(/\n/g, ' ')}\n`);
}

async function reportOpenCollections() {
    const { collections } = await readCollections();
    await report(`#### Otwarte zbiórki\n\n${openCollectionsTable(collections, TOTAL_CHILDREN)}`);
}

export async function run(main) {
    try {
        await main();
    } catch (err) {
        console.error(`::error::${err.message.replace(/\n/g, '%0A')}`);
        await report(`### ❌ Nie zapisano zmian\n\n${err.message.replace(/\n/g, '  \n')}`);
        process.exitCode = 1;
    }
    await reportOpenCollections();
}
