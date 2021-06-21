var svg = d3.select("#orgLegendSVG");
	svg.selectAll("*").remove();

// creates circle stroke color legend for investigator nodes
var legendCircle = d3.symbol().type(d3.symbolCircle)();
// assigning circle shape to each organization
var symbolScale =  d3.scaleOrdinal()
	.domain(["OSF", "UICOMP", "UIUC"])
	.range([legendCircle, legendCircle, legendCircle] );
// assigning colors to each organization, used official color scheme hex values
var colorScale = d3.scaleOrdinal()
	.domain(["OSF", "UICOMP", "UIUC"])
	.range(["#70362a", "#001E62", "#E84A27"]);
// creating new container to hold node stroke color legend and placing in bottom right corner of the visualization
var container2 = svg.append("g")
	.attr("class", "legendSymbol")
	.attr("transform", "translate(10,15)")
	.style("font-family", "sans-serif")
	.style("font-size", "16px")
// using d3-legend to create ordinal legend
var legendPath = d3.legendSymbol()
	.scale(symbolScale)
	.orient("vertical")
	.labelWrap(30)
	.title("Affiliation:")
svg.select(".legendSymbol")
	.call(legendPath);
// recalling circle paths to change style of stroke color to color domain and removing fill
svg.selectAll(".cell path").each(function(d) {
d3.select(this).style("stroke", colorScale(d)).style("fill", "none").attr("transform", "scale(2 2)");
})