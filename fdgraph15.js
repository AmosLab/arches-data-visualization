var width = 1600;
var height = 750;
var colorCategories = d3.schemeSet2.concat(d3.schemeCategory10.concat(d3.schemePaired));
var ThirdOrderColorCategories = colorCategories.slice(0,17);

var student1 = "totalEdges_Student1_new2.json";
var student2 = "totalEdges_Student2_new2.json";
var activeFile = localStorage.getItem("activeNetworkLoaded");
if (activeFile == null) {
	activeFile = student1;
}

var activeStroke = localStorage.getItem("activeStrokeLoaded");
if (activeStroke == null) {
	activeStroke = 1;
}

var activeIntersection = localStorage.getItem("activeIntersectionLoaded");
if (activeIntersection == null) {
	activeIntersection = 1;
}

function loadNetwork(studentJSON){

    d3.json(studentJSON).then(function(graph) {
    
    var label = {
        'nodes': [],
        'links': [],
        'links2': []
    };
    
    graph.nodes.forEach(function(d, i) {
        label.nodes.push({node: d});
        label.nodes.push({node: d});
        label.links.push({
            source: i * 2,
            target: i * 2 + 1
        });
    });
    
    var labelLayout = d3.forceSimulation(label.nodes)
        .force("charge", d3.forceManyBody().strength(-200))
        .force("link", d3.forceLink(label.links).distance(0).strength(3));
    
    var graphLayout = d3.forceSimulation(graph.nodes)
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink(graph.links).id(function(d) {return d.id; }).distance(20).strength(0.2))
        .on("tick", ticked)
        .force("link2", d3.forceLink(graph.links2).id(function(d) {return d.id; }).distance(60).strength(0.03))
        .on("tick", ticked);
    
	var force_button = d3.select("#changeIntersectionForce").on("click", function(){
		if (activeIntersection == null) {
			activeIntersection = 1;
			this.innerHTML = "Remove tag intersection";
		}
		if (activeIntersection == 1) {
			this.innerHTML = "Show tag intersection";
			activeIntersection = 0;			
		}
		else if (activeIntersection == 0) {
			this.innerHTML = "Remove tag intersection";
			activeIntersection = 1;
		}
	
		graphLayout.force("link2").strength(0.03 * activeIntersection);
		graphLayout.alpha(1).restart();
		console.log("Force interaction toggled to " + activeIntersection);
		localStorage.setItem("activeIntersectionLoaded", activeIntersection);
	});

    var adjlist = [];
    
    graph.links.forEach(function(d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });
    
    graph.links2.forEach(function(d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });
    
    function neigh(a, b) {
        return a == b || adjlist[a + "-" + b];
    }
    
    
    var svg = d3.select("#viz").attr("width", width).attr("height", height);
    var container = svg.append("g");
    
    svg.call(
        d3.zoom()
            .scaleExtent([.1, 4])
            .on("zoom", function() { container.attr("transform", d3.event.transform); })
    );
    
    var link = container.append("g").attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke", "#bbb")
        .attr("stroke-width", "3px");
    
    var link2 = container.append("g").attr("class", "links")
        .selectAll("line")
        .data(graph.links2)
        .enter()
        .append("line")
        .attr("stroke", "#bbb")
        .attr("stroke-width", "0px");
    
    var node = container.append("g").attr("class", "nodes")  
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 10)
        .attr("fill", function(d) {
		if (d.score != -1)
    		{
    			return d3.color(d3.interpolateRdYlGn(d.score)).formatHex();
    		}
    		else
    		{
    			return "#000";
    		}
	})

    	.attr("stroke", function(d) { 
		return colorCategories[d.group - 1];
     	})

    	.attr("stroke-width", 2*activeStroke)

	
    
    node.on("mouseover", focus).on("mouseout", unfocus);
    
    node.call(
        d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
    );
    
    var labelNode = container.append("g").attr("class", "labelNodes")
        .selectAll("text")
        .data(label.nodes)
        .enter()
        .append("text")
        .text(function(d, i) { return i % 2 == 0 ? "" : d.node.id; })
        .style("fill", "#000")
        .style("font-family", "Arial")
        .style("font-size", 18)
	.attr("font-weight", 700)
	.style("stroke", "#fff")
	.style("stroke-width", 0.6)
        .style("pointer-events", "none"); // to prevent mouseover/drag capture
    
    node.on("mouseover", focus).on("mouseout", unfocus);
    
    function ticked() {
    
        node.call(updateNode);
        link.call(updateLink);
    
        labelLayout.alphaTarget(0.3).restart();
        labelNode.each(function(d, i) {
            if(i % 2 == 0) {
                d.x = d.node.x;
                d.y = d.node.y;
            } else {
                var b = this.getBBox();
    
                var diffX = d.x - d.node.x;
                var diffY = d.y - d.node.y;
    
                var dist = Math.sqrt(diffX * diffX + diffY * diffY);
    
                var shiftX = b.width * (diffX - dist) / (dist * 2);
                shiftX = Math.max(-b.width, Math.min(0, shiftX));
                var shiftY = 16;
                this.setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
            }
        });
        labelNode.call(updateNode);
    
    }
    
    function fixna(x) {
        if (isFinite(x)) return x;
        return 0;
    }
    
    function focus(d) {
        var index = d3.select(d3.event.target).datum().index;
        node.style("opacity", function(o) {
            return neigh(index, o.index) ? 1 : 0.1;
        });
        labelNode.attr("display", function(o) {
          return neigh(index, o.node.index) ? "block": "none";
        });
        link.style("opacity", function(o) {
            return o.source.index == index || o.target.index == index ? 1 : 0.1;
        });
    }
    
    function unfocus() {
       labelNode.attr("display", "block");
       node.style("opacity", 1);
       link.style("opacity", 1);
    }
    
    function updateLink(link) {
        link.attr("x1", function(d) { return fixna(d.source.x); })
            .attr("y1", function(d) { return fixna(d.source.y); })
            .attr("x2", function(d) { return fixna(d.target.x); })
            .attr("y2", function(d) { return fixna(d.target.y); });
    }
    
    function updateNode(node) {
        node.attr("transform", function(d) {
            return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
        });
    }
    
    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    
    function dragended(d) {
        if (!d3.event.active) graphLayout.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
	
	var znumbering = [];
	var zmin = -2.0;
	var zmax = 2.0;	
	for (i = zmin; i <= zmax; i += (zmax - zmin)/10) {
		if (i.toFixed(1).toString() === "-0.0") {
			znumbering[znumbering.length]= "0.0";
		}
		else {
			znumbering[znumbering.length]= i.toFixed(1).toString();
		}
	}

	var legendSequential = d3.legendColor()
  		.shapeWidth(50)
  		.cells(11)
  		.orient('horizontal')
		.title("Z-score colors: (black indicates no data)")
		.titleWidth(300)
		.labels(znumbering)
  		.scale(sequentialScale);

	var container2 = svg.append("g")
  		.attr("class", "legendSequential")
  		.attr("transform", "translate("+(width/2)+","+(height-50)+")")
        	.style("fill", "#000")
		.style("font-size","15px")
		.style("font-family", "Arial");

	svg.select(".legendSequential")
  		.call(legendSequential);

	var legendOrdinal = d3.legendColor()
		.shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
  		.shapePadding(10)
		.title("Third Order Tag Groups")
		.scale(colorThird);

	var container3 = svg.append("g")
  		.attr("class", "legendOrdinal")
 		.attr("transform", "translate(20,50)")
        	.style("fill", "#000")
		.style("font-size","15px")
		.style("font-family", "Arial");

	svg.select(".legendOrdinal")
  		.call(legendOrdinal);

    });
	
	var s = d3.select("#changeNodeStroke").node();
	if (activeStroke == null) {
		activeStroke = 1;
		s.innerHTML = "Hide tag colors";
	}
	if (activeStroke == 1) {
		s.innerHTML = "Hide tag colors";
		
	}
	else if (activeStroke == 0) {
		s.innerHTML = "Show tag colors";
	}
}

loadNetwork(activeFile);

var sequentialScale = d3.scaleSequential(d3.interpolateRdYlGn)
	.domain([0,1]);

var colorThird = d3.scaleOrdinal()
	.domain(["Mathematics", "Data Visualization", "Tool Usage", "System/Controller Design", "System Identification", "System Analysis", "Signal Response", "Nyquist-Shannon Sampling Criteria", "Error", "Transforms", "Damping Ratio", "Correlation", "Initial and Final Value Theorem", "Kirchhoff's Current Law", "Kirchhoff's Voltage Law", "System Types", "Transfer Function"])
	.range(ThirdOrderColorCategories);

var c = d3.select("#changeNetworkSource").node();
if  (activeFile == student2) {
	c.innerHTML = "Load Student 1";
} else {
	c.innerHTML = "Load Student 2";
}

var changeNetwork = d3.select("#changeNetworkSource").on('click', toggleNetworkSource);

function toggleNetworkSource(event) {
	if (activeFile == null) {
		activeFile = student1;
	}
	if (activeFile == student1){
		activeFile = student2;
	}
	else {
		activeFile = student1;
	}
	loadNetwork(activeFile);
	window.location.reload(true);
	localStorage.setItem("activeNetworkLoaded", activeFile);
	console.log("Switched network source to " + activeFile);		
}

var changeNode = d3.select("#changeNodeStroke").on('click', toggleNodeStroke);

function toggleNodeStroke(event) {
	var s = d3.select("#changeNodeStroke").node();
	if (activeStroke == null) {
		activeStroke = 1;
		s.innerHTML = "Hide tag colors";
	}
	if (activeStroke == 1) {
		activeStroke = 0;
		s.innerHTML = "Show tag colors";
	}
	else if (activeStroke == 0) {
		activeStroke = 1;
		s.innerHTML = "Hide tag colors";
	}
	
	 
	var circles = d3.select("#viz").select(".nodes").selectAll("circle")
		.attr("stroke-width", 2*activeStroke);
	circles.exit().remove()

	localStorage.setItem("activeStrokeLoaded", activeStroke);
	console.log("Switched node stroke visibility to " + activeStroke);		
}