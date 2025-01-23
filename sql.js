group = Symbol('group');
sum = Symbol('sum');
min = Symbol('min');
max = Symbol('max');
count = Symbol('count');
avg = Symbol('avg');
stdev = Symbol('stdev');

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


Array.prototype.count = function(filter) { return f_count(this, filter) };
Array.prototype.sum = function(lambda) { return f_sum(this, lambda) }
Array.prototype.min = function(lambda) { return f_min(this, lambda) }
Array.prototype.max = function(lambda) { return f_max(this, lambda) }

Array.prototype.avg = function(lambda) { return f_avg(this, lambda) }
Array.prototype.stdev = function(lambda) { return f_stdev(this, lambda) }

Array.prototype.toObject = function(keySelector) { return toObject(this, keySelector) }
Array.prototype.unique = function(lambda) { return unique(this, lambda) }
Array.prototype.desc = function() { return desc(this) }
Array.prototype.agg = function(operations) { return agg(this, operations) }

