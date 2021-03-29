// pulls JSON file containing funding values from local directory
var graphFile = "ARCHES_connections7.json";

// define min and max values for legend, create color and axis scales
d3.json(graphFile).then(function(graph) {
	var max = parseFloat(graph.values[0].maxPITotal);
	var min = parseFloat(graph.values[0].minPITotal);
	var colorScale = d3.scaleSequential(d3.interpolatePlasma)
	.domain([0, 20]);
	var legendLogScale = d3.scaleLog()
		.domain([min,max]);
	continuous("#colorLegend", colorScale, legendLogScale);
});

// create continuous color legend
function continuous(selector_id, colorscale, axisScale) {
	var legendheight = 100,
		legendwidth = 500,
		margin = {top: 65, right: 20, bottom: 20, left: 20};

	var canvas = d3.select(selector_id)
		.style("height", legendheight + "px")
		.style("width", legendwidth + "px")
		.append('xhtml:canvas')
		.attr("height", 1)
		.attr("width", legendwidth - margin.left - margin.right)
		.style("height", (legendheight - margin.top - margin.bottom) + "px")
		.style("width", (legendwidth - margin.left - margin.right) + "px")
//		.style("box-sizing", "border-box")
		.style("border", "1px solid #000")
		.style("transform", "translate(20px,50px)")
		.node();

	var ctx = canvas.getContext("2d");

	var legendscale = d3.scaleLinear()
		.range([1, legendwidth - margin.left - margin.right])
		.domain(colorscale.domain());

	// image data hackery based on http://bl.ocks.org/mbostock/048d21cf747371b11884f75ad896e5a5
	var image = ctx.createImageData(legendwidth, 1);
	d3.range(legendwidth).forEach(function(i) {
		var c = d3.rgb(colorscale(legendscale.invert(i)));
		image.data[4*i] = c.r;
		image.data[4*i + 1] = c.g;
		image.data[4*i + 2] = c.b;
		image.data[4*i + 3] = 255;
	});
	ctx.putImageData(image, 0, 0);
	
	//sets width of axis
	axisScale
		.range([1, legendwidth - margin.left - margin.right]);

	//creates axis
	var legendaxis = d3.axisBottom()
		.scale(axisScale)
		.tickSize(6)
		.ticks(8);

	//creates svg container for axis and title
	var svg = d3.select(selector_id)
		.append("svg")
		.attr("height", (legendheight) + "px")
		.attr("width", (legendwidth) + "px")
	
	//creates axis svg
	svg
		.append("g")
		.attr("class", "axis")
		.style("font", "12px sans-serif")	
		.attr("transform", "translate(20," + (legendheight - margin.top - margin.bottom + 33) + ")")
		.call(legendaxis);
		
	//creates title
	svg
		.append("text")
		.text("Total funding as Principal Investigator ($)")
		.attr("transform", "translate(" + ((legendwidth - margin.left - margin.right)/2 + 20) + " ," + (legendheight - margin.top - margin.bottom + 10) + ")")
		.style("color", "black")
		.style("text-anchor", "middle")
		.style("z-index","2");
}