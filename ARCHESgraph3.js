//	data stores
var graph;
var store;

// pulls JSON file containing nodes and links from local directory
var graphFile = "ARCHES_connections3.json";

//	sizing
var width = getWidth() - 40,
	height = getHeight() - 30,
    radius = 10;

// creates svg container in the viz svg element to draw menu and network visualization elements
    var svg = d3.select("#viz").attr("width", width).attr("height", height);
    var container = svg.append("g");
    
// uses mouse scroll wheel as zoom function to scale the svg container
svg.call(
	d3.zoom()
		.scaleExtent([.1, 4])
		.on("zoom", function() { container.attr("transform", d3.event.transform); })
);

var link = container.append("g").selectAll(".link"),
	node = container.append("g").selectAll(".node");

//	force simulation initialization
var simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-250))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink().id(function(d) {return d.id; }).distance(50).strength(0.2))
        .on("tick", ticked);

//	filtered types
var typeFilterList = [];

//	filter button event handler
$(".filter-btn").on("click", function() {
	// Reset the typeFilterList array
	typeFilterList.splice(0,typeFilterList.length);
	// Use data in JSON file to find orgs
	d3.json(graphFile).then(function(g) {
		// Check values of each filter checkbox in the tags section
		for (var i = 0; i < g.orgNames.length; i++) {
			// get org name
			var orgName = g.orgNames[i].id;
			orgName = reformatTagName(orgName);
			// If the org is checked, add it to the typeFilterList
			if ($('#' + orgName).is(":checked")) {
				typeFilterList.push(orgName);
			}
		}
		console.log(typeFilterList);
		filter();
		update();
	})
});

//	data read and store
d3.json(graphFile)
	.then(function(g) {

		var nodeByID = {};
		g.nodes.forEach(function(n) {
			nodeByID[n.id] = n;
		});

		var linkByID = {};
		g.links.forEach(function(l) {
			linkByID[l.id] = l;
		});

		graph = g;
		store = $.extend(true, {}, g);

		store.nodes.forEach(function(n) {
			n.visible = true;
		});
		
		store.links.forEach(function(l) {
			l.visible = true;
			l.sourceVisible = true;
			l.targetVisible = true;
		});

		update();
	}).catch(function(error){ 
		throw error;
	});

//	general update pattern for updating the graph
function update() {
	//	UPDATE
	node = node.data(graph.nodes, function(d) { return d.id;});
	//	EXIT
	node.exit().remove();
	//	ENTER
	var newNode = node.enter().append("circle")
		.attr("class", "node")
		.attr("r", radius)
		.attr("fill", function(d) {
			if (d.fundingLogScaled == "-1") {
				return "#696969";
			}
			else {
				return d3.color(d3.interpolatePlasma(d.fundingLogScaled)).formatHex();
			}
		}
		)
		.attr("stroke", function(d) {
            if (d.affiliation == "OSF") {
                return "#70362a";
            }
            else if (d.affiliation == "UICOMP") {
                return "#001E62";
            }
            else if (d.affiliation == "UIUC") {
                return "#E84A27";
            }
			else if (d.affiliation == "Other") {
				return "#FFCE30";
			}
            else {
                return "#fff";
            };
        })
        .attr("stroke-width", "2px")
		.call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
        )

    newNode.append("title")
      .text(function(d) { return "group: " + d.affiliation + "\n" + "id: " + d.id; });
	//	ENTER + UPDATE
	node = node.merge(newNode);

	//	UPDATE
	link = link.data(graph.links, function(d) { return d.id;});
	//	EXIT
	link.exit().remove();
	//	ENTER
	newLink = link.enter().append("line")
		.attr("class", "link")
        .attr("stroke", "#bbb")
		// link width is function of project funding, scaled by 1/$20000
        .attr("stroke-width", function(d) {
            return d.amount/20000 + 2;
        }
		);
		
	newLink.append("title")
      .text(function(d) { return "source: " + d.source + "\n" + "target: " + d.target; });
	//	ENTER + UPDATE
	link = link.merge(newLink);

	//	update simulation nodes, links, and alpha
	simulation
		.nodes(graph.nodes)
		.on("tick", ticked);

  	simulation.force("link")
  		.links(graph.links);

  	simulation.alpha(1).alphaTarget(0).restart();
}

//	drag event handlers
function dragstarted(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function dragended(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}

//	tick event handler
function ticked() {
	node.call(updateNode);
	link.call(updateLink);
}

function fixna(x) {
	if (isFinite(x)) return x;
	return 0;
}

// redraws nodes per tick
function updateNode(node) {
	node.attr("transform", function(d) {
		return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
	});
}

// redraws link endpoints per tick
function updateLink(link) {
	link.attr("x1", function(d) { return fixna(d.source.x); })
		.attr("y1", function(d) { return fixna(d.source.y); })
		.attr("x2", function(d) { return fixna(d.target.x); })
		.attr("y2", function(d) { return fixna(d.target.y); });
}

//	filter function
function filter() {
	//	add and remove nodes from data based on type filters
	store.nodes.forEach(function(n) {
		// if node contains affiliation and isn't present on graph
		if (typeFilterList.includes(n.affiliation) && !(n.visible)) {
			n.visible = true; // makes visible
			// add the node to the graph
			graph.nodes.push($.extend(true, {}, n));
			console.log("Added " + n.id);
		// if node doesn't contain affiliation and is present on graph
		} else if (!(typeFilterList.includes(n.affiliation)) && n.visible) {
			n.visible = false;
			// remove the node from the graph
			graph.nodes.forEach(function(d, i) {
				if (n.id === d.id) {
					graph.nodes.splice(i, 1);
					console.log("Removed " + n.id);
				}
			});
		}
	});
	//	add and remove links from data based on availability of nodes
	store.links.forEach(function(l) {
		store.nodes.forEach(function(n) {
			// find node visibilities at ends of link
			if (l.source == n.id) {
				l.sourceVisible = n.visible;
			}
			if (l.target == n.id) {
				l.targetVisible = n.visible;
			}
		})
		// if either node is not visible and link is visible
		if (!(l.sourceVisible && l.targetVisible) && l.visible) {
			l.visible = false;
			graph.links.forEach(function(d, i) {
				if (l.id === d.id) {
					// add the link to the graph
					graph.links.splice(i, 1);
					console.log("Removed " + l.id);
				}
			})
		}
		// if both nodes are visible and link is not visible
		else if (l.sourceVisible && l.targetVisible && !l.visible) {
			l.visible = true;
			// add the link to the graph
			graph.links.push($.extend(true, {}, l));
			console.log("Added " + l.id);
		}
	});
}

// Reformat tag names to match the ids in the HTML
function reformatTagName(tagName) {
	// remove spaces in tag name (HTML id's can't have spaces)
	tagName = tagName.replace(/\s+/g, '');
	// replace special characters with hyphen (HTML id's can't have special characters)
	tagName = tagName.replace('&', '-');
	tagName = tagName.replace('/', '-');
	tagName = tagName.replace('(', '-');
	tagName = tagName.replace(')', '-');
	return tagName;
}

function getWidth() {
	return Math.max(
		document.body.scrollWidth,
		document.documentElement.scrollWidth,
		document.body.offsetWidth,
		document.documentElement.offsetWidth,
		document.documentElement.clientWidth
    );
}
  
function getHeight() {
    return Math.max(
		document.body.scrollHeight,
		document.documentElement.scrollHeight,
		document.body.offsetHeight,
		document.documentElement.offsetHeight,
		document.documentElement.clientHeight
    );
}