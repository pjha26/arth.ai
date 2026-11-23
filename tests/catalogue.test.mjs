import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogueFilters, parseCatalogue } from '../shared/catalogue.js';

const sample = readFileSync(new URL('../public/business-catalogue.csv', import.meta.url), 'utf8').trim();

test('CSV imports quoted names, Unicode, and the checked-in sample', () => {
  const { rows, duplicates } = parseCatalogue(`\uFEFF${sample}\nCafé Atelier,https://atelier.example,France,,Lyon,Design,Open catalogue`);
  assert.equal(rows[0].name, 'Northwind, Demo Studio');
  assert.equal(rows[2].name, 'Café Atelier');
  assert.equal(rows[2].regionKey, '');
  assert.equal(duplicates, 0);
  assert.deepEqual(catalogueFilters({ country: ' INDIA ', city: 'bENGALURU', industry: 'Accounting' }),
    { countryKey: 'india', cityKey: 'bengaluru', industryKey: 'accounting' });
});

test('duplicate locations merge within an import but branches in different regions remain distinct', () => {
  const { rows, duplicates } = parseCatalogue(`${sample}\nDuplicate,https://www.ledger.example/products,india,karnataka,bengaluru,Accounting,Owned list\nSecond branch,https://ledger.example,India,Other region,Bengaluru,Accounting,Owned list`);
  assert.equal(duplicates, 1);
  assert.equal(rows.length, 3);
  assert.equal(rows[1].name, 'Example Ledger');
  assert.equal(rows[2].name, 'Second branch');
});

test('rejects invalid headers, unsafe website syntax, missing provenance and oversized files', () => {
  assert.throws(() => parseCatalogue('name,website,name\na,b,c'), /headers/);
  assert.throws(() => parseCatalogue(sample.replace('https://ledger.example', 'http://127.0.0.1')), /public business website.*3/);
  assert.throws(() => parseCatalogue(sample.replace('ledger.example,India,Karnataka,Bengaluru,Accounting,Synthetic example', 'ledger.example,India,Karnataka,Bengaluru,Accounting,')), /source/);
  assert.throws(() => parseCatalogue(sample.repeat(5000)), /256 KiB/);
  const [header, row] = sample.split('\n');
  assert.throws(() => parseCatalogue([header, ...Array(1001).fill(row)].join('\n')), /1,000 rows/);
});
