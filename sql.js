group = Symbol('group');
sum = Symbol('sum');
min = Symbol('min');
max = Symbol('max');
count = Symbol('count');
avg = Symbol('avg');
stdev = Symbol('stdev');

function f_count(array, filter) {
	// if a filter function is provided, count only the elements that match the filter
	if (filter) {
		let filtered = array.filter(filter);
		return filtered.length;
	} else {
		return array.length;
	}
}



function f_sum(array, lambda) {
	// lamdba is either
	// empty, to sum up values: myArr.sum()
	// a string with the property name to sum up for an array of objects (aka table): myArr.sum('Amount')
	// a lambda function that returns the value to sum: myArr.sum(e => e.Amount * e.Quantity)

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		let prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda
	}

	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.

	for (let i = 0; i < array.length; i++) {

		// If a lambda function is provided, use it to get the value; otherwise, use the array value directly.
		let value = lambda ? lambda(array[i]) : array[i];

		// sum with Kahan's algorithm to get correct results for larger arrays
		let y = value - c;
		let t = sum + y;
		c = (t - sum) - y;
		sum = t;
	}

	return sum;
}

function f_avg (array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		let prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda
	}

	// compute the average by dividing the sum by the number of elements
	return array.sum(lambda) / array.length;
}

function f_stdev(array, lambda) {
	// SAMPLE standard deviation, dividing by (n - 1).
	// This matches Excel's STDEV.S / STDEV (use the population variant only when you have the whole population).
	// lamdba is either a string with the property name or a lambda function that returns the value to sum

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		let prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda
	}

	let avg = array.avg(lambda);
	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.

	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : array[i];
		let y = value - avg;
		let t = sum + y * y;
		c = (t - sum) - y * y;
		sum = t;
	}

	return Math.sqrt(sum / (array.length - 1));
}

function f_min(array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		let prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda
	}

	// seed with +Infinity so the first real value always wins, including all-negative arrays
	let min = Infinity;
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : array[i];
		min = Math.min(min, value);
	}
	return min;
}

function f_max(array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		let prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda
	}

	// seed with -Infinity so the first real value always wins, including all-negative arrays
	let max = -Infinity;
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : array[i];
		max = Math.max(max, value);
	}
	return max;
}

function unique(array, lambda) {

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		let prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda
	}

	// use a Set for O(n) lookups instead of indexOf (O(n^2)) - matters for large datalake pulls
	let seen = new Set();
	let distinct = [];
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : array[i];
		if (!seen.has(value)) {
			seen.add(value);
			distinct.push(value);
		}
	}
	return distinct;
}

function df(array, columns=null){

	// myArray.df() // convert all columns
	// myArray.df('Name, Age, City') // convert only these columns

	// covert an array of objects into an object of arrays, where every property of the object becomes an array
	// columns is a string with property names separated by comma's
	// if omitted, all properties of the object are used

	let dfr = {};
	// trim the column names so 'Name, Age' works the same as 'Name,Age'; guard against an empty array
	let keys = columns ? columns.split(',').map(s => s.trim()) : (array.length ? Object.keys(array[0]) : []);
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		dfr[key] = array.map(e=>e[key]);
	}
	return dfr;
}

function kahanSum(array) {
	// sum with Kahan's algorithm to keep precision on larger arrays
	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.
	for (let i = 0; i < array.length; i++) {
		const y = array[i] - c;
		const t = sum + y;
		c = (t - sum) - y;
		sum = t;
	}
	return sum;
}

function toObject(array, keySelector) {
	// creates an object (dictionary) from an array of objects, using the value of a column as the key.
	// this makes it fast to look up a row by its key: let byId = rows.toObject('Id'); byId[42]
	// keySelector is either a string with the property name or a lambda that returns the key

	if(keySelector === undefined) throw new Error('keySelector is required');
	if(typeof keySelector === 'string') {
		let prop = '' + keySelector;	// force to copy to string b/c we converting the variable to a lambda
		keySelector = e => e[prop];		// force to copy to string b/c we converting the variable to a lambda
	}

	let dict = {};
	for (let i = 0; i < array.length; i++) {
		let key = keySelector(array[i]);
		dict[key] = array[i];
	}
	return dict;
}

function desc(array) {
	// returns an array of { Column, Min, Max, Sum, Avg, StDev, Count, Unique } describing each column of the table
	let dfr = df(array);
	return Object.entries(dfr).map(([column, values]) => ({
		Column: column,
		Min:    values.min(),
		Max:    values.max(),
		Sum:    values.sum(),
		Avg:    values.avg(),
		StDev:  values.stdev(),
		Count:  values.length,
		Unique: values.unique().length
	}));
}

function agg(array, operations) {
	/*
	Operations is a object where each property is a column name and the value is the operation to perform on that column.
	for instance myArray.agg({ Account : group, Amount : sum }) will return an array of objects with unique accounts and the sum of the amounts for each account.
	Operations can be any of the following:
		group : group by this column
		sum   : sum the values in this column
		min   : minimum value in this column
		max   : maximum value in this column
		count : number of rows
		avg   : average value in this column
		stdev : SAMPLE standard deviation of the values in this column (n - 1, matches Excel STDEV.S)
	*/
    const result = {};

    array.forEach(item => {
        const key = JSON.stringify(Object.keys(operations).map(k => {
            if (item.hasOwnProperty(k) && operations[k] === group) {
                return item[k];
            }
            return '';
        }));

        if (!result[key]) {
            result[key] = {};
            for (const k in operations) {
                switch (operations[k]) {
                    case group:
                        result[key][k] = item[k];
                        break;
                    case sum:
                    case count:
                        result[key][k] = 0;
                        break;
                    case min:
                    case max:
                        // null = "not set yet" so that a real 0 or negative values are handled correctly
                        result[key][k] = null;
                        break;
                    case avg:
                    case stdev:
                        // collect the values, compute the final figure once all rows are seen
                        result[key][`${k}_values`] = [];
                        result[key][k] = 0;
                        break;
                }
            }
        }

        for (const k in operations) {
            switch (operations[k]) {
                case sum:
                    result[key][k] += item[k]; // Here you can also replace with Kahan's if needed.
                    break;
                case min:
                    if (result[key][k] === null || item[k] < result[key][k]) {
                        result[key][k] = item[k];
                    }
                    break;
                case max:
                    if (result[key][k] === null || item[k] > result[key][k]) {
                        result[key][k] = item[k];
                    }
                    break;
                case count:
                    result[key][k]++;
                    break;
                case avg:
                case stdev:
                    result[key][`${k}_values`].push(item[k]);
                    break;
            }
        }
    });

    // Final calculations for avg and stdev using Kahan's
    for (const key in result) {
        for (const k in operations) {
            switch (operations[k]) {
                case avg:
                    result[key][k] = kahanSum(result[key][`${k}_values`]) / result[key][`${k}_values`].length;
                    delete result[key][`${k}_values`];
                    break;
                case stdev:
                    const values = result[key][`${k}_values`];
                    const mean = kahanSum(values) / values.length;
                    // sample variance: divide by (n - 1) to match Excel STDEV.S and f_stdev above
                    const variance = kahanSum(values.map(value => (value - mean) ** 2)) / (values.length - 1);
                    result[key][k] = Math.sqrt(variance);
                    delete result[key][`${k}_values`];
                    break;
            }
        }
    }

    return Object.values(result);
}

function copyColumnsFrom(target, source, keys, columns = null) {
	/*
	Copy columns from an old table onto a fresh one, matching rows by key.

	Use case: you pull a fresh table from an API (target), but the user had
	manually added/edited some columns in the previous pull (source). This
	carries those columns over to the fresh data, row by row.

		freshPull.copyColumnsFrom(oldTable, 'Id', ['Notes', 'Category']);

	Arguments:
		target  : the fresh table (array of objects) to copy INTO. Returned and mutated in place.
		source  : the old table (array of objects) to copy FROM.
		keys    : key column(s) used to match rows between the two tables.
				  string of comma-separated names ('Id' or 'Id, Date') or an array.
		columns : array of column names to copy from source to target, e.g. ['Notes', 'Category'].
				  if omitted, every column present in source but NOT in target is copied
				  (i.e. the columns the user added that the API doesn't return).

	Notes:
		- rows are matched on the composite of all key columns.
		- target rows with no match in source are left untouched.
		- if a column is missing on a target row it is created; existing target
		  values for that column ARE overwritten with the source value.
	*/

	// normalize keys into an array of trimmed names (accepts 'Id, Date' or ['Id','Date'])
	let keyList = Array.isArray(keys) ? keys.slice() : ('' + keys).split(',').map(s => s.trim()).filter(s => s.length);

	// columns to copy is an array; if omitted, copy columns in source but not in target (the user's added columns)
	let colList;
	if (columns) {
		colList = columns;
	} else {
		let targetCols = target.length ? Object.keys(target[0]) : [];
		let sourceCols = source.length ? Object.keys(source[0]) : [];
		colList = sourceCols.filter(c => targetCols.indexOf(c) === -1);
	}

	// build composite key for a row from the key columns
	let makeKey = row => JSON.stringify(keyList.map(k => row[k]));

	// index the source rows by their composite key for O(1) lookup
	let lookup = {};
	for (let i = 0; i < source.length; i++) {
		lookup[makeKey(source[i])] = source[i];
	}

	// for each fresh row, find its old counterpart and copy the columns over
	for (let i = 0; i < target.length; i++) {
		let match = lookup[makeKey(target[i])];
		if (!match) continue;
		for (let j = 0; j < colList.length; j++) {
			let col = colList[j];
			if (match.hasOwnProperty(col)) target[i][col] = match[col];
		}
	}

	return target;
}

function README() {
/*
	SQL.js - A simple SQL-like query engine for JavaScript arrays

	How to use:
	1. Import the library:
		sql = require('sql.js');

	2. On simple arrays:
		arrayData = [1, 2, 3, 4, 5];
		total = arrayData.sum(); // 15

	3. On arrays of objects (tables):
		 tableData = [
			{ id: 1, name: 'Alice', age: 30 },
			{ id: 2, name: 'Bob', age: 25 },
			{ id: 3, name: 'Charlie', age: 35 }
		];

		The lambda argument can be either a string with the property name or a lambda that returns the value to sum.

		// name a property to sum:
		averageAge = tableData.avg('age'); // 30

		// use a lambda function to sum:
		totalAge = tableData.sum(e => e.age); // 90

		Available functions:
		myArray.sum(lambda) - Sums the values in the array or the specified property of objects
		myArray.avg(lambda) - Calculates the average of the values in the array or the specified property of objects
		myArray.min(lambda) - Finds the minimum value in the array or the specified property of objects
		myArray.max(lambda) - Finds the maximum value in the array or the specified property of objects
		myArray.count(filter) - Counts the elements in the array (optionally only those matching a filter)
		myArray.stdev(lambda) - Sample standard deviation (n - 1, matches Excel STDEV.S)
		myArray.unique(lambda) - Returns an array of unique values or unique values of the specified property
		myArray.toObject(keySelector) - Converts the array to a lookup object keyed by the given column
		myArray.df(columns) - Converts the array to a dataframe-like object (object of arrays)
		myArray.desc() - Describes each column: { Column, Min, Max, Sum, Avg, StDev, Count, Unique }

	Aggregation:
		myArray.agg(operations) - Aggregates the array based on the specified operations, where operations is an object with keys as property names and values as aggregation functions (group, sum, min, max, count, avg, stdev)

		Usage example:
		let aggregated = tableData.agg({
			name: group,
			age: sum
		});

		available operations:
		group - Group by this property
		sum   - Sum the values of this property
		min   - Find the minimum value of this property
		max   - Find the maximum value of this property
		count - Count the number of elements
		avg   - Calculate the average of this property
		stdev - Sample standard deviation of this property (n - 1, matches Excel STDEV.S)

	Carry over user edits onto a fresh pull:
		freshPull.copyColumnsFrom(oldTable, 'Id', ['Notes', 'Category'])
		- Matches rows by key column(s) and copies the named columns from the old table onto the fresh one.
		- Omit the columns argument to copy every column that exists in the old table but not the fresh one.

	Note on dependencies:
		This module is self-contained - it does not require any other module.

	*/
}

exports.README= README;

Array.prototype.count = function(filter) { return f_count(this, filter) };
Array.prototype.sum = function(lambda) { return f_sum(this, lambda) }
Array.prototype.min = function(lambda) { return f_min(this, lambda) }
Array.prototype.max = function(lambda) { return f_max(this, lambda) }

Array.prototype.avg = function(lambda) { return f_avg(this, lambda) }
Array.prototype.stdev = function(lambda) { return f_stdev(this, lambda) }

Array.prototype.toObject = function(keySelector) { return toObject(this, keySelector) }
Array.prototype.unique = function(lambda) { return unique(this, lambda) }
Array.prototype.desc = function() { return desc(this) }
Array.prototype.df = function(columns) { return df(this, columns) }
Array.prototype.agg = function(operations) { return agg(this, operations) }
Array.prototype.copyColumnsFrom = function(source, keys, columns) { return copyColumnsFrom(this, source, keys, columns) }
