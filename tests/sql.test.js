// Unit tests for sql.js
//
// sql.js is pure ECMAScript (no API / host calls), so it can be tested under any V8 -
// Node embeds the same V8 engine XLConnect uses, and the semantics are identical.
//
// Run from the modules folder with:
//     node --test
// or just this file:
//     node --test tests/sql.test.js

const { test } = require('node:test');
const assert = require('node:assert');

// requiring sql.js attaches the methods to Array.prototype and defines the
// agg operation symbols (group, sum, ...) as globals
require('../sql.js');

// helper for floating point comparisons
function approx(actual, expected, eps = 1e-9) {
	assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be ~${expected}`);
}

// ---------------------------------------------------------------------------
// simple arrays
// ---------------------------------------------------------------------------

test('sum of a number array', () => {
	assert.strictEqual([1, 2, 3, 4, 5].sum(), 15);
	assert.strictEqual([].sum(), 0);
});

test('sum with a property name and with a lambda', () => {
	const rows = [{ Amount: 100 }, { Amount: 200 }, { Amount: 150 }];
	assert.strictEqual(rows.sum('Amount'), 450);
	assert.strictEqual([{ a: 2, b: 3 }, { a: 4, b: 5 }].sum(e => e.a * e.b), 26);
});

test('avg', () => {
	assert.strictEqual([1, 2, 3, 4, 5].avg(), 3);
	approx([{ v: 1 }, { v: 2 }].avg('v'), 1.5);
});

test('count, with and without a filter', () => {
	assert.strictEqual([1, 2, 3, 4, 5].count(), 5);
	assert.strictEqual([1, 2, 3, 4, 5].count(e => e > 3), 2);
});

test('min / max on a positive array', () => {
	assert.strictEqual([3, 1, 4, 1, 5].min(), 1);
	assert.strictEqual([3, 1, 4, 1, 5].max(), 5);
});

test('min / max on an all-negative array (regression: Number.MIN_VALUE seed bug)', () => {
	assert.strictEqual([-3, -1, -2].max(), -1);
	assert.strictEqual([-3, -1, -2].min(), -3);
});

test('min / max with a property selector', () => {
	const rows = [{ Amount: 100 }, { Amount: 300 }, { Amount: 200 }];
	assert.strictEqual(rows.min('Amount'), 100);
	assert.strictEqual(rows.max('Amount'), 300);
});

test('stdev is the SAMPLE standard deviation (n-1, Excel STDEV.S)', () => {
	// [2,4,6]: mean 4, squared devs 4+0+4 = 8, sample variance 8/2 = 4, stdev 2
	approx([2, 4, 6].stdev(), 2);
	// [1,2,3,4,5]: sample variance 10/4 = 2.5
	approx([1, 2, 3, 4, 5].stdev(), Math.sqrt(2.5));
});

test('unique on primitives and on a column', () => {
	assert.deepStrictEqual([1, 2, 2, 3, 1].unique(), [1, 2, 3]);
	const rows = [{ Name: 'John' }, { Name: 'Jane' }, { Name: 'John' }];
	assert.deepStrictEqual(rows.unique('Name'), ['John', 'Jane']);
});

// ---------------------------------------------------------------------------
// tables -> dataframe / lookup / describe
// ---------------------------------------------------------------------------

test('df converts a table to an object of arrays, trimming column names', () => {
	const rows = [{ Name: 'a', Age: 1 }, { Name: 'b', Age: 2 }];
	assert.deepStrictEqual(rows.df(), { Name: ['a', 'b'], Age: [1, 2] });
	// regression: 'Name, Age' (with a space) must work the same as 'Name,Age'
	assert.deepStrictEqual(rows.df('Name, Age'), { Name: ['a', 'b'], Age: [1, 2] });
});

test('df on an empty array does not throw', () => {
	assert.deepStrictEqual([].df(), {});
});

test('toObject builds a lookup keyed by a column', () => {
	const rows = [{ Id: 1, Name: 'Alice' }, { Id: 2, Name: 'Bob' }];
	const byId = rows.toObject('Id');
	assert.strictEqual(byId[1].Name, 'Alice');
	assert.strictEqual(byId[2].Name, 'Bob');
});

test('toObject requires a key selector', () => {
	assert.throws(() => [{ Id: 1 }].toObject(), /keySelector is required/);
});

test('desc describes each column', () => {
	const rows = [{ v: 2 }, { v: 4 }, { v: 6 }];
	const d = rows.desc();
	const v = d.find(r => r.Column === 'v');
	assert.strictEqual(v.Min, 2);
	assert.strictEqual(v.Max, 6);
	assert.strictEqual(v.Sum, 12);
	assert.strictEqual(v.Avg, 4);
	approx(v.StDev, 2);
	assert.strictEqual(v.Count, 3);
	assert.strictEqual(v.Unique, 3);
});

// ---------------------------------------------------------------------------
// agg
// ---------------------------------------------------------------------------

test('agg groups and sums', () => {
	const rows = [
		{ Name: 'John', Amount: 100 },
		{ Name: 'Jane', Amount: 200 },
		{ Name: 'John', Amount: 150 },
		{ Name: 'Jane', Amount: 300 },
	];
	const out = rows.agg({ Name: group, Amount: sum });
	const john = out.find(r => r.Name === 'John');
	const jane = out.find(r => r.Name === 'Jane');
	assert.strictEqual(john.Amount, 250);
	assert.strictEqual(jane.Amount, 500);
});

test('agg count', () => {
	const rows = [{ g: 'a' }, { g: 'a' }, { g: 'b' }];
	const out = rows.agg({ g: group, g2: count });
	assert.strictEqual(out.find(r => r.g === 'a').g2, 2);
	assert.strictEqual(out.find(r => r.g === 'b').g2, 1);
});

test('agg min / max handle a real 0 and negatives (regression: 0-sentinel bug)', () => {
	const rows = [{ g: 'a', v: 0 }, { g: 'a', v: -5 }, { g: 'a', v: 3 }];
	const out = rows.agg({ g: group, v: max });
	assert.strictEqual(out[0].v, 3);

	const rows2 = [{ g: 'a', v: 0 }, { g: 'a', v: -5 }];
	const out2 = rows2.agg({ g: group, v: max });
	assert.strictEqual(out2[0].v, 0); // was -5 before the fix

	const out3 = [{ g: 'a', v: 5 }, { g: 'a', v: 0 }, { g: 'a', v: 8 }].agg({ g: group, v: min });
	assert.strictEqual(out3[0].v, 0);
});

test('agg avg does not throw and is correct (regression: missing _values init)', () => {
	const rows = [{ g: 'a', v: 10 }, { g: 'a', v: 20 }, { g: 'a', v: 30 }];
	const out = rows.agg({ g: group, v: avg });
	approx(out[0].v, 20);
});

test('agg stdev is the sample standard deviation (matches Array.stdev)', () => {
	const rows = [{ g: 'a', v: 2 }, { g: 'a', v: 4 }, { g: 'a', v: 6 }];
	const out = rows.agg({ g: group, v: stdev });
	approx(out[0].v, 2);
	// and it agrees with the standalone stdev on the same values
	approx(out[0].v, [2, 4, 6].stdev());
});

// ---------------------------------------------------------------------------
// copyColumnsFrom
// ---------------------------------------------------------------------------

test('copyColumnsFrom copies the named columns onto matched rows', () => {
	const oldTable = [
		{ Id: 1, Notes: 'VIP', Category: 'A' },
		{ Id: 2, Notes: 'call me', Category: 'B' },
	];
	const fresh = [{ Id: 1, Name: 'Alice' }, { Id: 2, Name: 'Bob' }, { Id: 3, Name: 'Carol' }];
	const out = fresh.copyColumnsFrom(oldTable, 'Id', ['Notes', 'Category']);
	assert.strictEqual(out[0].Notes, 'VIP');
	assert.strictEqual(out[1].Category, 'B');
	assert.strictEqual(out[2].Notes, undefined); // unmatched row untouched
});

test('copyColumnsFrom without columns copies cols present in source but not target', () => {
	const oldTable = [{ Id: 1, Name: 'Alice', Notes: 'VIP' }];
	const fresh = [{ Id: 1, Name: 'Alice Smith' }];
	const out = fresh.copyColumnsFrom(oldTable, 'Id');
	assert.strictEqual(out[0].Notes, 'VIP');       // Notes only existed in source -> copied
	assert.strictEqual(out[0].Name, 'Alice Smith'); // Name exists in target -> NOT overwritten
});

test('copyColumnsFrom matches on a composite key', () => {
	const oldTable = [{ Id: 1, Date: '2026-01', Notes: 'keep' }];
	const fresh = [
		{ Id: 1, Date: '2026-01', Amount: 10 },
		{ Id: 1, Date: '2026-02', Amount: 20 },
	];
	const out = fresh.copyColumnsFrom(oldTable, ['Id', 'Date'], ['Notes']);
	assert.strictEqual(out[0].Notes, 'keep');
	assert.strictEqual(out[1].Notes, undefined); // different Date -> no match
});
