function README(){
    /* 

	EXPERIMANTAL: This module is still in development, has not been tested completely and may change in the future without notice. 
	USE WITH CAUTION
	
	Helper functions to make it easier to work with arrays and arrays of objects (aka tables).
	They are similar to the functions in the pandas library for python.

	These functions can be used in two ways:

	1. As methods on an array. To use this mode, please execute the following line of code after including this module:	

		arrayExtentions = require('arrayExtentions.js')		// include the module
		arrayExtentions.attachExtentions() 					// this adds the functions to the Array.prototype so the functions are available on all arrays

		myArray.sum() 										// returns the sum of the array
		myArray.sum('Amount')								// returns the sum of the Amount property (column)

		when browsing the functions in the Engine pane, please omit the first parameter (array) when using in this mode. 

	2. As functions that take an array as the first parameter and return a value. 
		
		ae = require('arrayExtentions.js')		// include the module (but not attach to Arrays)

		ae.sum(myArray, 'Amount') 				// returns the sum of the Amount column

	
    Examples:	

		// Simple functions		
		[1,2,3,4,5].sum() 

		arr1 = [1,2,3,4,5]
		arr1.sum()
		
		// use a lambda function to get the value from an object
		arr2 = [{a : 1}, {a : 2}, {a : 3}]
		arr2.sum('a') or 
		arr2.sum(e => e.a)

		// use a lambda function to compute a value from an array of objects
		arr3 = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
		arr3.sum(e => e.a * e.b)

		// Aggregations
		arr4 = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
		arr4.agg({ a : group, b : sum }) 
		arr4.agg({ a : group, b : sum, c : min }) 

		please note the symbols used for the operations that are added to global scope to make the syntax work:
			group : group by this column
			sum   : sum the values in this column
			min   : minimum value in this column
			max   : maximum value in this column
			count : number of rows
			avg   : average value in this column
			stdev : standard deviation of the values in this column		

		// Joins
		left = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
		right = [{a : 1, c: 5}, {a : 2, c : 6}, {a : 3, c : 7}]

		left.leftJoin(right, 'a')
		left.leftJoin(right, e => e.a, e => e.a)

		left.innerJoin(right, 'a')
		left.innerJoin(right, l => l.a, r => r.a)

		// Dataframes
		// convert an array of objects into an object of arrays, where every property of the object becomes an array
		// the arrays make it easier to apply functions to columns
		// columns is a string with property names separated by comma's		
		arr7 = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
		arr7.df()
		arr7.df('a,b')

		// Descriptive statistics
		// returns an array { Column, Min, Max, Sum, Avg, Stdev, Count } that describes the array
		arr8 = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
		arr8.desc()

	Methods are implemented using Kahan's algorithm to get precise results 
	for larger arrays.		

	*/
}

exports.README = README;
exports.attachExtentions = attachExtentions;

exports.count = f_count;
exports.sum = f_sum;
exports.min = f_min;
exports.max = f_max;
exports.range = range;

exports.avg = f_avg;
exports.stdev = f_stdev;
exports.median = median;
exports.mode = mode;
exports.variance = variance;
exports.covariance = covariance;
exports.correlation = correlation;

exports.toObject = toObject;
exports.unique = unique;
exports.desc = desc;
exports.agg = agg;
exports.select = select;
exports.leftJoin = leftJoin;
exports.innerJoin = innerJoin;
exports.df = df;

// these are the operations that can be used in the agg function
// this allows the { column : operation } syntax to work because the operations are defined as symbols
group = Symbol('group');
sum = Symbol('sum');
min = Symbol('min');
max = Symbol('max');
count = Symbol('count');
avg = Symbol('avg');
stdev = Symbol('stdev');

function f_count (array, filter) {	
	if(!filter) return array.length;
	return array.filter(filter).length;
}


function f_sum(array, lambda) {
	// lamdba is either
	// empty, to sum up values: myArr.sum() 
	// a string with the property name to sum up for an array of objects (table) myArr.sum('Amount') 
	// a lambda function that returns the value to sum myArr.sum(e => e.Amount * e.Quantity)
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
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
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	// compute the average by dividing the sum by the number of elements
	return array.sum(lambda) / array.length;
}

function f_stdev(array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
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
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let min = Number.MAX_VALUE;
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
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let max = Number.MIN_VALUE;
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : array[i];
		max = Math.max(max, value);
	}
	return max;
}

function range(array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	return array.max(lambda) - array.min(lambda);
}

function median(array, lambda) {	
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let sorted = array.sort(lambda);
	let mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mode(array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let counts = {};
	let max = 0;
	let mode = [];
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : thiarrays[i];
		if (!counts[value]) counts[value] = 0;
		counts[value]++;
		if (counts[value] > max) {
			mode = [value];
			max = counts[value];
		} else if (counts[value] === max) {
			mode.push(value);
			max = counts[value];
		}
	}
	return mode;
}

function variance(array, lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
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

	return sum / (array.length - 1);	
}

function covariance(array, lambda1, lambda2) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda1 === 'string') {
		prop1 = '' + lambda1;	// force to copy to string b/c we converting the variable to a lambda
		lambda1 = e => e[prop1];	// force to copy to string b/c we converting the variable to a lambda 	
	}
	if(typeof lambda2 === 'string') {
		prop2 = '' + lambda2;	// force to copy to string b/c we converting the variable to a lambda
		lambda2 = e => e[prop2];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let avg1 = array.avg(lambda1);
	let avg2 = array.avg(lambda2);
	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.

	for (let i = 0; i < array.length; i++) {
		let value1 = lambda1 ? lambda1(array[i]) : array[i];
		let value2 = lambda2 ? lambda2(array[i]) : array[i];
		let y = (value1 - avg1) * (value2 - avg2);
		let t = sum + y;
		c = (t - sum) - y;
		sum = t;
	}

	return sum / (array.length - 1);
}

function correlation(array, lambda1, lambda2) {
	
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda1 === 'string') {
		prop1 = '' + lambda1;	// force to copy to string b/c we converting the variable to a lambda
		lambda1 = e => e[prop1];	// force to copy to string b/c we converting the variable to a lambda 	
	}
	if(typeof lambda2 === 'string') {
		prop2 = '' + lambda2;	// force to copy to string b/c we converting the variable to a lambda
		lambda2 = e => e[prop2];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let covariance = array.covariance(lambda1, lambda2);
	console.log(covariance);
	let stdev1 = array.stdev(lambda1);
	console.log(stdev1);	
	let stdev2 = array.stdev(lambda2);
	console.log(stdev2);
	return covariance / (stdev1 * stdev2);	
}

function toObject(array, keySelector) {
	// creates an object from an array of objects, using the values of a specified column as keys
	// this makes it easy and fast to look up objects by key	

	if(keySelector === undefined) throw new Error('keySelector is required')
	if(typeof keySelector === 'string') {
		prop = '' + keySelector;	// force to copy to string b/c we converting the variable to a lambda
		keySelector = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let dict = {};
	for (let i = 0; i < array.length; i++) {
		let key = keySelector(array[i][keyColumn]);
			
		dict[key] = value;
	}
	return dict;
}

// unique values for a column
function unique(array, lambda) {

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let distinct = [];
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(thiarrays[i]) : array[i];
		if (distinct.indexOf(value) === -1) distinct.push(value);
	}
	return distinct;
}

// returns an array { Column, Min, Max, Sum, Avg, Stdev, Count } that describes the array
function desc(array) {	

	let dfr = df(array)
	return Object.entries(dfr).map(([column, values]) => (
		{ 
			Column: column, 
			Min:  values.min(), 
			Max: values.max(), 
			Sum: values.sum(),
			Avg: values.avg(),
			StDev: values.stdev(),
			Count: values.length,
			Unique: values.unique().length
	}));	
}



function kahanSum(array) {
    let sum = 0.0;
    let c = 0.0;  // A running compensation for lost low-order bits.
    for (let i = 0; i < array.length; i++) {
        const y = array[i] - c;  
        const t = sum + y;  
        c = (t - sum) - y;
        sum = t;
    }
    return sum;
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
		stdev : standard deviation of the values in this column		
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
                    case min:
                    case max:
                    case count:
                    case avg:
                        result[key][k] = 0;
                        break;
                    case stdev:
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
                    if (result[key][k] === 0 || item[k] < result[key][k]) {
                        result[key][k] = item[k];
                    }
                    break;
                case max:
                    if (result[key][k] === 0 || item[k] > result[key][k]) {
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
                    break;
                case stdev:
                    const mean = kahanSum(result[key][`${k}_values`]) / result[key][`${k}_values`].length;
                    const variance = kahanSum(result[key][`${k}_values`].map(value => (value - mean) ** 2)) / result[key][`${k}_values`].length;
                    result[key][k] = Math.sqrt(variance);
                    delete result[key][`${k}_values`];
                    break;
            }
        }
    }

    return Object.values(result);
}

function select(array, columns, aliases=columns) {	
	// creates an array of objects with only the specified columns
	// columns is a string with property names separated by comma's
	// aliases is a string with aliases for the columns separated by comma's

	// myArray.select('Name, Age, City')
	// myArray.select('Name, Age, City', 'Name, Years, Location')
	
	const columns2 = columns.split(',').map(s => s.trim());
	const aliases2 = aliases.split(',').map(s => s.trim());
	
	let result = [];
	for (let i = 0; i < array.length; i++) {
		let item = {};
		for (let j = 0; j < columns2.length; j++) {
			let column = columns2[j];
			let alias = aliases2[j];
			item[alias] = array[i][column];
		}
		result.push(item);
	}
	return result;
}

function sortBy(array, properties) {
    if (typeof properties !== 'string') {
        throw new Error("Properties should be provided as a comma-separated string.");
    }

    const propArray = properties.split(',').map(prop => prop.trim());

    array.sort((a, b) => {
        for (let prop of propArray) {
            if (!a.hasOwnProperty(prop) || !b.hasOwnProperty(prop)) {
                throw new Error(`Property ${prop} not found on items.`);
            }

            let aValue = a[prop];
            let bValue = b[prop];

            if (typeof aValue !== typeof bValue) {
                throw new Error("Mismatched property types.");
            }

            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                if (comparison !== 0) return comparison;
            } else if (typeof aValue === 'number') {
                if (aValue !== bValue) return aValue - bValue;
            } else if (typeof aValue === 'boolean') {
                if (aValue !== bValue) return aValue ? -1 : 1;
            } else if (aValue instanceof Date) {
                const dateA = aValue.getTime();
                const dateB = bValue.getTime();
                if (dateA !== dateB) return dateA - dateB;
            } else {
                throw new Error(`Unsupported property type: ${typeof aValue}.`);
            }
        }
        return 0; // If all properties are equal
    });

    return array;
}

function leftJoin(array, rightArray, leftKey, rightKey) {		

	// someArray.join(otherArray, 'columnName') 					// if column names are the same	
	// someArray.join(otherArray, 'columnName1', 'columnName2')		// if column names are different
	// someArray.join(otherArray, l => l.columnName1, r => r.columnName2) // using lambdas (for instance if property is nested)

	// leftKeySelector is either a string with the property name or a lambda function that returns the value to sum
	// rightKeySelector is either a string with the property name or a lambda function that returns the value to sum
	
	if(typeof leftKey === 'string' ){
		let propl = '' + leftKey;	// force to copy to string b/c we converting the variable to a lambda
		leftKey = e => e[propl];	// force to copy to string b/c we converting the variable to a lambda 	
	}
	if(!rightKey) rightKey = leftKey;
	if(typeof rightKey === 'string' ){
		let propr = '' + rightKey;	// force to copy to string b/c we converting the variable to a lambda
		rightKey = e => e[propr];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let result = [];
	for (let i = 0; i < array.length; i++) {
		let left = array[i];
		let leftId = leftKey(left);
		let right = rightArray.filter(e => rightKey(e) === leftId);		
		result.push({...left, ...right});
	}

	return result;
}

function innerJoin(array, other, leftKeySelector, rightKeySelector) {
	
	if(typeof leftKeySelector === 'string'){
		let propl = '' + leftKeySelector;	// force to copy to string b/c we converting the variable to a lambda
		leftKeySelector = e => e[propl];	// force to copy to string b/c we converting the variable to a lambda 	
	}
	if(!rightKeySelector)	rightKeySelector = leftKeySelector;
	if(typeof rightKeySelector === 'string' ){
		let propr = '' + rightKeySelector;	// force to copy to string b/c we converting the variable to a lambda
		rightKeySelector = e => e[propr];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let result = [];
	for (let i = 0; i < array.length; i++) {
		let left = array[i];
		let leftId = leftKeySelector(left);
		let right = other.filter(e => rightKeySelector(e) === leftId);
		if (right.length > 0) {			
			result.push({...left, ...right});
		}
	}
	return result;

}


function df(array, columns=null){

	// myArray.df() // convert all columns
	// myArray.df('Name, Age, City') // convert only these columns

	// covert an array of objects into an object of arrays, where every property of the object becomes an array
	// columns is a string with property names separated by comma's
	// if omitted, all properties of the object are used

	let dfr = {};
	let keys = columns ? columns.split(',') : Object.keys(array[0]);
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		dfr[key] = array.map(e=>e[key]);
	}
	return dfr;
}

function attachExtentions(){
	// attach the extentions to the Array.prototype
	Array.prototype.count = function(filter) { return f_count(this, filter) };
	Array.prototype.sum = function(lambda) { return f_sum(this, lambda) }
	Array.prototype.min = function(lambda) { return f_min(this, lambda) }
	Array.prototype.max = function(lambda) { return f_max(this, lambda) }
	Array.prototype.range = function(lambda) { return range(this, lambda) }

	Array.prototype.avg = function(lambda) { return f_avg(this, lambda) }
	Array.prototype.stdev = function(lambda) { return f_stdev(this, lambda) }
	Array.prototype.median = function(lambda) { return median(this, lambda) }
	Array.prototype.mode = function(lambda) { return mode(this, lambda) }
	Array.prototype.variance = function(lambda) { return variance(this, lambda) }
	Array.prototype.covariance = function(lambda1, lambda2) { return covariance(this, lambda1, lambda2) }
	Array.prototype.correlation = function(lambda1, lambda2) { return correlation(this, lambda1, lambda2) }

	Array.prototype.toObject = function(keySelector) { return toObject(this, keySelector) }
	Array.prototype.unique = function(lambda) { return unique(this, lambda) }
	Array.prototype.desc = function() { return desc(this) }
	Array.prototype.agg = function(operations) { return agg(this, operations) }
	Array.prototype.select = function(columns, aliases) { return select(this, columns, aliases) }
	Array.prototype.sortBy = function(properties) { return sortBy(this, properties) }
	Array.prototype.leftJoin = function(other, leftKeySelector, rightKeySelector, resultSelector) { return leftJoin(this, other, leftKeySelector, rightKeySelector, resultSelector) }
	Array.prototype.innerJoin = function(other, leftKeySelector, rightKeySelector, resultSelector) { return innerJoin(this, other, leftKeySelector, rightKeySelector, resultSelector) }
	Array.prototype.df = function(columns) { return df(this, columns) }
}
