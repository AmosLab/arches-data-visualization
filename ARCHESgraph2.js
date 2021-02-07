var width = 1600;
var height = 750;

// pulls JSON file containing nodes and links from local directory
var graphFile = "http://localhost:8003/ARCHES_connections3.json";

function loadNetwork(graphFile){

d3.json(graphFile).then(function(graph) {
    
    var label = {
        'nodes': [],
        'links': [],
    };
    
    graph.nodes.forEach(function(d, i) {
        label.nodes.push({node: d});
		label.nodes.push({node: d});
        label.links.push({
            source: i * 2,
            target: i * 2 + 1
        });
    });
    
	
	// sets force of repulsion (negative value) between labels, and very strong force of attraction between labels and their respective nodes
    var labelLayout = d3.forceSimulation(label.nodes)
        .force("charge", d3.forceManyBody().strength(-50))
        .force("link", d3.forceLink(label.links).distance(0).strength(3));
    
	// sets force of repulsion (negative value) between nodes, and force of attraction between linked nodes
    var graphLayout = d3.forceSimulation(graph.nodes)
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink(graph.links).id(function(d) {return d.id; }).distance(20).strength(0.2))
        .on("tick", ticked);

    var adjlist = [];
    
    graph.links.forEach(function(d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });
    
    function neigh(a, b) {
        return a == b || adjlist[a + "-" + b];
    }
    
	// creates svg container to draw elements
    var svg = d3.select("#viz").attr("width", width).attr("height", height);
    var container = svg.append("g");
    
	// uses mouse scroll wheel as zoom function to scale the svg container
    svg.call(
        d3.zoom()
            .scaleExtent([.1, 4])
            .on("zoom", function() { container.attr("transform", d3.event.transform); })
    );
    
	// link style formatting
    var link = container.append("g").attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke", "#bbb")
        .attr("stroke-width", function(d) {
			return d.amount/20000;
		}
			);
	
	// node style formatting
    var node = container.append("g").attr("class", "nodes")  
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 10)
        .attr("fill", "#0455A4")
    	.attr("stroke", "#fff")
    	.attr("stroke-width", "2px")

	// hovering over a node with the cursor causes the network to focus on linked nodes
    node.on("mouseover", focus).on("mouseout", unfocus);

    // Attempt to make changes when mouseover on links

    link.on('mouseover', function(l) {
        node.style('opacity', function(d) {
          return (d === l.source || d === l.target) ? 1 : 0.1;
          });
        labelNode.attr("display", function(d) {
            return (d.node.index === l.source.index || d.node.index === l.target.index) ? "block" : "none";
        });
        link.style("opacity", function(l2) {
            return (l2 == l) ? 1 : 0.1;
        });
        node.attr("r", function(d) {
            return (d === l.source || d === l.target) ? 15 : 10;
            });

      });
    link.on("mouseout", unfocus);
    
	// prevents mouse capture
    node.call(
        d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
    );
    
	// label style formatting
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
    
	// updates node and link position per tick
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
    
	// decreases opacity of nodes that are not linked to focused node
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
        node.attr("r", function(o) {
            return neigh(index, o.index) ? 15 : 10;
        });
    }
    
	// resets opacity to full once node is unfocused
    function unfocus() {
       labelNode.attr("display", "block");
       node.style("opacity", 1);
       link.style("opacity", 1);
       node.attr("r", 10);
    }

    // function for showing project info on link mouseover

    function showProjectInfo() {
        d3.select(this).style("stroke", "red");
        node.style('fill', function(d) {
            if (d === l.source || d === l.target)
              return "red";
            else
              return "#0455A4";
            });
        d3.select(this).source.style("fill", "red");
    }


    // function for clearing project info on link mouseover

    function clearProjectInfo() {
        d3.select(this).style("stroke", "#bbb");
        d3.select(this).source.style("fill", "#0455A4");
    }
    
	// redraws link endpoints per tick
    function updateLink(link) {
        link.attr("x1", function(d) { return fixna(d.source.x); })
            .attr("y1", function(d) { return fixna(d.source.y); })
            .attr("x2", function(d) { return fixna(d.target.x); })
            .attr("y2", function(d) { return fixna(d.target.y); });
    }
    
	// redraws nodes per tick
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
}
);
}
loadNetwork(graphFile);