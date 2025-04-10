group = Symbol('group');
sum = Symbol('sum');
min = Symbol('min');
max = Symbol('max');
count = Symbol('count');
avg = Symbol('avg');
stdev = Symbol('stdev');

function README() {
	/*

	 genarl usage of the library
	 1. import the library: 
	 require('sql') // please not eyou don't have to assign it to a variable, it will automatically add the functions to Arrays
	 2. call the functions on the array or object you want to work with:


	// working with simple arrays *********************************
	let arrayData = [1, 2, 3, 4, 5];
	
	let total = arrayData.sum(); // 15
	let unique = arrayData.unique(); // [1, 2, 3, 4, 5]
	let count = arrayData.count(); // 5

	let min = arrayData.min(); // 1
	let max = arrayData.max(); // 5
	let average = arrayData.avg(); // 3
	let stdev = arrayData.stdev(); // 1.58

	let desc = arrayData.desc(); // [5, 4, 3, 2, 1]



	// working with tables ******************************************
	let tableData = [
		{ Name: 'John', Age: 30, City: 'New York', Amount: 100 },
		{ Name: 'Jane', Age: 25, City: 'Los Angeles', Amount: 200 },
		{ Name: 'John', Age: 30, City: 'New York', Amount: 150 },
		{ Name: 'Jane', Age: 25, City: 'Los Angeles', Amount: 300 }
	];


	let totals = objData.agg({ 
		Name : group, 		
		Amount : sum 
	});

	let summed = objData.sum('Amount'); // 650
	let avged  = objData.avg('Amount'); // 162.5
	let stdevd = objData.stdev('Amount'); // 70.71
	let smallest  = objData.min('Amount'); // 100
	let maxd   = objData.max('Amount'); // 300
	let countd = objData.count(); // 4
	let unique = objData.unique('Name'); // ['John', 'Jane']
	
	let desc   = objData.desc(); // sort by the first column in descending order
	
	let df     = objData.df(); // convert to a dataframe
	let df2    = objData.df('Name, Age'); // convert to a dataframe with only the Name and Age columns
	let df3    = objData.df('Name, Age', 'City'); // convert to a dataframe with only the Name and Age columns, grouped by City
	
	let obj    = objData.toObject('Name'); // convert to an object with Name as the key and the rest of the object as the value
	let obj2   = objData.toObject('Name', 'Age'); // convert to an object with Name and Age as the key and the rest of the object as the value
	let obj3   = objData.toObject('Name', 'Age', 'City'); // convert to an object with Name, Age and City as the key and the rest of the object as the value
	let obj4   = objData.toObject('Name', 'Age', 'City', 'Amount'); // convert to an object with Name, Age, City and Amount as the key and the rest of the object as the value
	let obj5   = objData.toObject('Name', 'Age', 'City', 'Amount', 'Date'); // convert to an object with Name, Age, City, Amount and Date as the key and the rest of the object as the value

	*/
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

function unique(array, lambda) {

	// convert a string to a lambda function
	if(typeof lambda === 'string') {
		prop = '' + lambda;	// force to copy to string b/c we converting the variable to a lambda
		lambda = e => e[prop];	// force to copy to string b/c we converting the variable to a lambda 	
	}

	let distinct = [];
	for (let i = 0; i < array.length; i++) {
		let value = lambda ? lambda(array[i]) : array[i];
		if (distinct.indexOf(value) === -1) distinct.push(value);
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

