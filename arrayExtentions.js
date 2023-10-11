function README(){
    /* 
	Adds the following functions to all arrays:
		
		// aggregation
		count(filter)
		sum(lamdba)
		avg(lambda)
		stdev(lambda)
		min(lambda)
		max(lambda)
		range(lambda)		

		// statistics
		desc()
		median(lambda)
		mode(lambda)
		variance(lambda)
		covariance(lambda1, lambda2)
		correlation(lambda1, lambda2)

		// data manipulation		
		toObject()			
		distinct(lambda)
		agg(operations) 
		df() 

		// sql like functions
		select(columns, aliases)
		leftJoin(other, leftKeySelector, rightKeySelector, resultSelector)
		innerJoin(other, leftKeySelector, rightKeySelector, resultSelector)


    After including this module, these functions are available 
	on all arrays (they're added to the Array.prototype) so 
	you can just call them on any array after including the 
	arrayExtentions module: 
	
		arrayExtentions = require('arrayExtentions.js')
		[1,2,3,4,5].sum() // sum function is now available on all arrays

		arr1 = [1,2,3,4,5]
		arr1.sum()
		
		// use a lambda function to get the value from an object
		arr2 = [{a : 1}, {a : 2}, {a : 3}]
		arr2.sum('a') or 
		arr2.sum(e => e.a)

		// use a lambda function to compute a value from an array of objects
		arr3 = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
		arr3.sum(e => e.a * e.b)



	Methods are implemented using Kahan's algorithm to get precise results 
	for larger arrays.

		

	*/
}

Array.prototype.count = function (filter) {	
	if(!filter) return this.length;
	return this.filter(filter).length;
}

Array.prototype.sum = function (lambda) {
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

	for (let i = 0; i < this.length; i++) {
		
		// If a lambda function is provided, use it to get the value; otherwise, use the array value directly.
		let value = lambda ? lambda(this[i]) : this[i];

		// sum with Kahan's algorithm to get correct results for larger arrays
		let y = value - c;
		let t = sum + y;
		c = (t - sum) - y;
		sum = t;
	}

	return sum;
}

Array.prototype.avg = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum	

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	// compute the average by dividing the sum by the number of elements
	return this.sum(lambda) / this.length;
}

Array.prototype.stdev = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}	

	let avg = this.avg(lambda);
	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.

	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		let y = value - avg;
		let t = sum + y * y;
		c = (t - sum) - y * y;
		sum = t;
	}

	return Math.sqrt(sum / (this.length - 1));
}

Array.prototype.min = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let min = Number.MAX_VALUE;
	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		min = Math.min(min, value);
	}
	return min;
}

Array.prototype.max = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let max = Number.MIN_VALUE;
	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		max = Math.max(max, value);
	}
	return max;
}

Array.prototype.range = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	return this.max(lambda) - this.min(lambda);
}

Array.prototype.median = function (lambda) {	
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let sorted = this.sort(lambda);
	let mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

Array.prototype.mode = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let counts = {};
	let max = 0;
	let mode = [];
	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
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

Array.prototype.variance = function (lambda) {
	// lamdba is either a string with the property name or a lambda function that returns the value to sum
	
	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let avg = this.avg(lambda);
	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.

	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		let y = value - avg;
		let t = sum + y * y;
		c = (t - sum) - y * y;
		sum = t;
	}

	return sum / (this.length - 1);	
}

Array.prototype.covariance = function (lambda1, lambda2) {
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

	let avg1 = this.avg(lambda1);
	let avg2 = this.avg(lambda2);
	let sum = 0.0;
	let c = 0.0; // A running compensation for lost low-order bits.

	for (let i = 0; i < this.length; i++) {
		let value1 = lambda1 ? lambda1(this[i]) : this[i];
		let value2 = lambda2 ? lambda2(this[i]) : this[i];
		let y = (value1 - avg1) * (value2 - avg2);
		let t = sum + y;
		c = (t - sum) - y;
		sum = t;
	}

	return sum / (this.length - 1);
}

Array.prototype.correlation = function (lambda1, lambda2) {
	
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

	let covariance = this.covariance(lambda1, lambda2);
	console.log(covariance);
	let stdev1 = this.stdev(lambda1);
	console.log(stdev1);	
	let stdev2 = this.stdev(lambda2);
	console.log(stdev2);
	return covariance / (stdev1 * stdev2);	
}

Array.prototype.toObject = function (keySelector) {
	// creates an object from an array of objects, using the values of a specified column as keys
	// this makes it easy and fast to look up objects by key	

	if(keySelector === undefined) throw new Error('keySelector is required')
	if(typeof keySelector === 'string') {
		prop = '' + keySelector;	// force to copy to string b/c we converting the variable to a lambda
		keySelector = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let dict = {};
	for (let i = 0; i < this.length; i++) {
		let key = keySelector(this[i][keyColumn]);
			
		dict[key] = value;
	}
	return dict;
}

// unique values for a column
Array.prototype.unique = function (lambda) {

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let distinct = [];
	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		if (distinct.indexOf(value) === -1) distinct.push(value);
	}
	return distinct;
}

// returns an array { Column, Min, Max, Sum, Avg, Stdev, Count } that describes the array
Array.prototype.desc = function () {	

	let df = this.df()
	return Object.entries(df).map(([column, values]) => (
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

// these are the operations that can be used in the agg function
// this allows the { column : operation } syntax to work because the operations are defined as symbols
 group = Symbol('group');
 sum = Symbol('sum');
 min = Symbol('min');
 max = Symbol('max');
 count = Symbol('count');
 avg = Symbol('avg');
 stdev = Symbol('stdev');

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

Array.prototype.agg = function(operations) {
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

    this.forEach(item => {
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

Array.prototype.select = function (columns, aliases=columns) {	
	// creates an array of objects with only the specified columns
	// columns is a string with property names separated by comma's
	// aliases is a string with aliases for the columns separated by comma's

	// myArray.select('Name, Age, City')
	// myArray.select('Name, Age, City', 'Name, Years, Location')
	
	
	let result = [];
	for (let i = 0; i < this.length; i++) {
		let item = {};
		for (let j = 0; j < columns.length; j++) {
			let column = columns[j];
			let alias = aliases[j];
			item[alias] = this[i][column];
		}
		result.push(item);
	}
	return result;
}

Array.prototype.leftJoin = function (rightArray, leftKeySelector, rightKeySelector, resultSelector) {
	
	let result = [];
	for (let i = 0; i < this.length; i++) {
		let left = this[i];
		let leftKey = leftKeySelector(left);
		let right = rightArray.filter(e => rightKeySelector(e) === leftKey);
		let resultItem = resultSelector(left, right);
		result.push(resultItem);
	}
	return result;
}

Array.prototype.innerJoin = function (other, leftKeySelector, rightKeySelector, resultSelector) {
	
	let result = [];
	for (let i = 0; i < this.length; i++) {
		let left = this[i];
		let leftKey = leftKeySelector(left);
		let right = other.filter(e => rightKeySelector(e) === leftKey);
		if (right.length > 0) {
			let resultItem = resultSelector(left, right);
			result.push(resultItem);
		}
	}
	return result;

}


Array.prototype.df = function(columns=null){

	// covert an array of objects into an object of arrays, where every property of the object becomes an array
	// columns is a string with property names separated by comma's
	// if omitted, all properties of the object are used

	let df = {};
	let keys = columns ? columns.split(',') : Object.keys(this[0]);
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		df[key] = this.map(e=>e[key]);
	}
	return df;
}

exports.README = README;