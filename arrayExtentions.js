Array.prototype.sum = function (lambda) {
	
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
	return this.sum(lambda) / this.length;
}

Array.prototype.stdev = function (lambda) {

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

	let min = Number.MAX_VALUE;
	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		min = Math.min(min, value);
	}
	return min;
}

Array.prototype.max = function (lambda) {

	let max = Number.MIN_VALUE;
	for (let i = 0; i < this.length; i++) {
		let value = lambda ? lambda(this[i]) : this[i];
		max = Math.max(max, value);
	}
	return max;
}

Array.prototype.range = function (lambda) {
	return this.max(lambda) - this.min(lambda);
}

Array.prototype.median = function (lambda) {	

	let sorted = this.sort(lambda);
	let mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

Array.prototype.mode = function (lambda) {

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
	
	let stdev1 = this.stdev(lambda1);
	let stdev2 = this.stdev(lambda2);
	let covariance = this.covariance(lambda1, lambda2);
	return covariance / (stdev1 * stdev2);	
}

function README(){
    /* 
	Extra functions on array objects sum(), avg(), stdev(), min(), max(), range(), median(), mode(), variance(), covariance(), and correlation().
    the extentions are added to the array prototype directly
    so you can just call them on any array after including the 
	arrayExtentions module: 
	
	[1,2,3,4,5].sum()

    arr1 = [1,2,3,4,5]
	arr1.sum()
	
	// use a lambda function to get the value from an object
	arr2 = ["{a : 1}", "{a : 2}", "{a : 3}"]
	arr2.sum(e=>e.a)

	// use a lambda function to compute a value from an array of objects
	arr3 = [{a : 1, b: 2}, {a : 2, b : 3}, {a : 3, b : 4}]
	arr3.sum(e=>e.a * e.b)
	*/
}

exports.README = README;