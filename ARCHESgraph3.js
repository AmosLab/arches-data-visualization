//	data stores
var graph;
var store;
var labelGraph = {
	'nodes': [],
	'links': [],
};
var labelStore;

// pulls JSON file containing nodes and links from local directory
var graphFile = "ARCHES_connections3.json";

//	window sizing
var width = getWidth() - 40,
	height = getHeight() - 30;

var activeNameOpacity = 1;
var activeFundingVis = 1;

// creates svg container in the viz svg element to draw menu and network visualization elements
var svg = d3.select("#viz").attr("width", width).attr("height", height);
var container = svg.append("g");

// Div Tooltip for Displaying Link info, appended to .graphToolContainer to prevent overflow beyond page bounds
var div = d3.select(".graphToolContainer").append("div")   
	.attr("class", "tooltip")               
	.style("opacity", 0);
    
// uses mouse scroll wheel as zoom function to scale the svg container
svg.call(
	d3.zoom()
		.scaleExtent([.1, 4])
		.on("zoom", function() { container.attr("transform", d3.event.transform); })
);

// creates g elements to group link and node SVG elements
var link = container.append("g").selectAll(".link"),
	node = container.append("g").selectAll(".node"),
	labelNode = container.append("g").selectAll("text");

//	force simulation initialization for node and link interactions
var simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-250))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink().id(function(d) {return d.id; }).distance(50).strength(0.2))
        .on("tick", ticked);

// sets force of repulsion (negative value) between labels, and very strong force of attraction between labels and their respective nodes
var labelLayout = d3.forceSimulation()
        .force("charge", d3.forceManyBody().strength(-200))
        .force("link", d3.forceLink().distance(0).strength(3))
		.on("tick", ticked);

//	filtered types
var typeFilterList = [];

//	filter button event handler
$(".filterButton").on("click", function() {
	// Reset the typeFilterList array
	typeFilterList.splice(0,typeFilterList.length);
	// Use data in JSON file to find orgs
	d3.json(graphFile).then(function(g) {
		// Check values of each filter checkbox in the organization affiliation section
		for (var i = 0; i < g.orgNames.length; i++) {
			// get org name
			var orgName = g.orgNames[i].id;
			orgName = reformatTagName(orgName);
			// If the org is checked, add it to the typeFilterList
			if ($('#org' + orgName).is(":checked")) {
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

		g.nodes.forEach(function(d, i) {
			var investigatorName = d.id;
			labelGraph.nodes.push({node: d});
			labelGraph.nodes.push({node: d});
			labelGraph.links.push({
				source: i * 2,
				target: i * 2 + 1,
				id: investigatorName
			});
		});

		labelStore = $.extend(true, {}, labelGraph);
		labelStore.nodes.forEach(function(n) {
			n.visible = true;
		});
		labelStore.links.forEach(function(l) {
			l.visible = true;
			l.sourceVisible = true;
		});
		update();
	
	}).catch(function(error){ 
		throw error;
	});

//	general update pattern for updating the graph
function update() {
	
	// Investigator Search Bar Functionality using JQuery
	var optArray = [];
	for (var i = 0; i < graph.nodes.length - 1; i++) {
		optArray.push(graph.nodes[i].id);
	}
	optArray = optArray.sort();
	$(function () {
		$("#search").autocomplete({
			source: optArray,
		});
	});
	
	//	UPDATE
	node = node.data(graph.nodes, function(d) { return d.id;});
	//	EXIT
	node.exit().remove();
	//	ENTER
	var newNode = node.enter().append("circle")
		.attr("class", "node")
		.attr("r", 10)
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
		// prevents mouse capture
		.call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
        )

    newNode.append("title")
      .text(function(d) { return "id: " + d.id + "\n" + "affiliation: " + d.affiliation; });
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
	
	//	UPDATE
	labelNode = labelNode.data(labelGraph.nodes, function(d) { return d.id;});
	//	EXIT
	labelNode.exit().remove();
	//	ENTER
	var newLabelNode = labelNode.enter().append("g")
		.attr("class", "labelNodes")
		.append("text")
        .text(function(d, i) { return i % 2 == 0 ? "" : d.node.id; }) // only odd-numbered nodes are labeled
        .style("fill", "#000")
        .style("font-family", "Arial")
        .style("font-size", 18)
        .attr("font-weight", 700)
        .style("stroke", "#fff")
        .style("stroke-width", 0.6)
        .style("pointer-events", "none") // to prevent mouseover/drag capture
		.style("opacity", activeNameOpacity); // label visibility is toggled by button	
	//	ENTER + UPDATE
	labelNode = labelNode.merge(newLabelNode);

	//  update label simulation nodes and alpha
	labelLayout
		.nodes(labelGraph.nodes)
		.on("tick", ticked);
	
	labelLayout.force("link")
  		.links(labelGraph.links);
	
	labelLayout.alpha(1).alphaTarget(0).restart();
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
		}
		// if node doesn't contain affiliation and is present on graph
		else if (!(typeFilterList.includes(n.affiliation)) && n.visible) {
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
					// remove the link from the graph
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

	//	add and remove label nodes from data based on type filters
	labelStore.nodes.forEach(function(n,k) {
		// if node contains affiliation and isn't present on graph
		if (typeFilterList.includes(n.node.affiliation) && !(n.visible)) {
			n.visible = true; // makes visible
			// add the node to the label graph
			console.log(n);
			// ERROR OCCURS HERE:
			labelGraph.nodes.push($.extend(true, {}, n));
			console.log(labelGraph.nodes);
		}
		// if node doesn't contain affiliation and is present on graph
		else if (!(typeFilterList.includes(n.node.affiliation)) && n.visible) {
			n.visible = false;
			// remove the node from the label graph
			labelGraph.nodes.forEach(function(d, i) {
				if (n.node.id === d.node.id) {
					labelGraph.nodes.splice(i, 1);
				}
			});	
		}
	});
	//	add and remove label links from data based on availability of nodes
	labelStore.links.forEach(function(l) {
		labelStore.nodes.forEach(function(n) {
			// find node visibilities at ends of link
			if (l.id == n.node.id) {
				l.sourceVisible = n.visible;
			}
		})
		// if source label node is not visible and link is visible
		if (!l.sourceVisible && l.visible) {
			l.visible = false;
			labelGraph.links.forEach(function(d, i) {
				if (l.id === d.id) {
					// remove the link from the graph
					labelGraph.links.splice(i, 1);
				}
			})
		}
		// if source label node is visible and link is not visible
		else if (l.sourceVisible && !l.visible) {
			l.visible = true;
			// add the link to the graph
			labelGraph.links.push($.extend(true, {}, l));
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

// Adds commas to the number to show funding with better formatting
function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// See if two arrays share a common element
function findCommonElements3(arr1, arr2) {
	return arr1.some(item => arr2.includes(item))
}

// Detects event when Filter Panel button is clicked, either opens the panel if currently closed or vice versa
$('#filterPanel').on('click', function() {
	if ($('#filterBar').css("display") == "none") {
		$('#filterBar').css("display","block");
		$('#filterPanel').text("Hide Filters");
	}
	else {
		$('#filterBar').css("display","none");
		$('#filterPanel').text("Show Filters");
	}
});

//INVESTIGATOR LABEL TOGGLE

// Detects event when toggle name button is clicked
var changeNameOpacity = d3.select("#toggleNames").on('click', toggleNameOpacity);

// Changes label text opacity to either 0 (hidden) or 1 (visible), and changes text accordingly in toggle name button
function toggleNameOpacity(event) {
	var labelNames = d3.select("#toggleNames").node();
	if (activeNameOpacity == 1) {
		activeNameOpacity = 0;
		labelNames.innerHTML = "Show Names";
	}
	else if (activeNameOpacity == 0) {
		activeNameOpacity = 1;
		labelNames.innerHTML = "Hide Names";
	}

	var labelText = d3.select("#viz").selectAll(".labelNodes").selectAll("text")
		.style("opacity", activeNameOpacity);
	labelText.exit().remove()	
}

// Search Function 
$('#searchF').on('click',
   function searchNode() {
	   //find the node
	   var selectedVal = document.getElementById('search').value;
	   node.style("opacity", function(o) {
		   return (o.id==selectedVal) ? 1 : 0.1;
	   });
	   labelNode.attr("display", function(d) {
		   return (d.node.id==selectedVal) ? "block" : "none";
	   });
	   searchedName = selectedVal;
   }
);
$("#clear").click(
	function clearFocus() {
		//find the node
		node.style("opacity", 1);
		link.style("opacity", 1);
		labelNode.attr("display", "block")
		searchedName = "None";
		infoBarOnName = "None";
		$('#infoBar').fadeTo(500,0);
		$('#infoBar').css("display","block")
		$('#infoBar').css("pointer-events","none")
		unfocus();
	}
);

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