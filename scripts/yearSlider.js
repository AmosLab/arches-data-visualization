// pulls JSON file containing year values from local directory
var graphFile = "ARCHES_connections.json";
// define min and max year values, then creates slider HTML element using JQuery UI
d3.json(graphFile).then(function(graph) {
	maxYearValue = parseInt(graph.values[0].maxYear);
	minYearValue = parseInt(graph.values[0].minYear);
	
	$(document).ready(function() {
		$("#slider").slider({
			min: minYearValue,
			max: maxYearValue,
			step: 1,
			range: true,
			values: [2015, 2020],
			slide: function(event, ui) {
			  for (var i = 0; i < ui.values.length; ++i) {
				$("input.sliderValue[data-index=" + i + "]").val(ui.values[i]);
			  }
			}
		});

		$("input.sliderValue").change(function() {
			var $this = $(this);
			$("#slider").slider("values", $this.data("index"), $this.val());
		});
	});
});