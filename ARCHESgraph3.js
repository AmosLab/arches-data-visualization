import {getProjects, getConnections, neigh, getResearchers} from './scripts/graphIndexers3.js';

//	data stores
var graph;
var store;

// pulls JSON file containing nodes and links from local directory
var graphFile = "ARCHES_connections3.json";

//	window sizing
var width = getWidth() - 40,
	height = getHeight() - 30;

//	IDs of filtered investigator organizations to keep
var orgFilterList = [];

//  IDs of filtered project parameters to keep
var filterYears = [];
var tagIDs = [];
var yearFilteredYet = false;

//  values for node and text styles
var activeNameOpacity = 1;
var activeFundingVis = 1;

// values for hovering and clicking
var clickedID = 'None';
var searchedName = "None";
var infoPanelOnName = "None";
var clickThrough = false;
var linkClicked = false;
var nodeClicked = false;
var adjlist = [];
var storeAdjlist = [];

//	data read and store
d3.json(graphFile)
	.then(function(g) {
		store = $.extend(true, {}, g);
		store.nodes.forEach(function(n) {
			n.visible = true;
		});
		store.links.forEach(function(l) {
			l.visible = true;
			l.sourceVisible = true;
			l.targetVisible = true;
		});
		graph = g;
		
		// find indexes of investigators who have collaborated on projects
		store.links.forEach(function(l) {
			var sourceIndex;
			var targetIndex;
			store.nodes.forEach(function(n, i) {
				if (l.source == n.id) {
					sourceIndex = i;
				}
				if (l.target == n.id) {
					targetIndex = i;
				}
			})
			if (sourceIndex !== null & targetIndex !== null) {
				storeAdjlist[sourceIndex + "-" + targetIndex] = true;
				storeAdjlist[targetIndex + "-" + sourceIndex] = true;
			}
		});
		update();
	}).catch(function(error){ 
		throw error;
		});

// CONTAINER FORMATTING

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
var link = container.append("g").attr("class", "linkGroup").selectAll(".link"),
	node = container.append("g").attr("class", "nodeGroup").selectAll(".node");

// GRAPH SIMULATION

// Create D3 force-directed graph
var graphLayout = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-3000))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.5))
    .force("y", d3.forceY(height / 2).strength(0.5))
    .force("link", d3.forceLink().id(function(d) {return d.id; }).distance(50).strength(1))
    .on("tick", ticked);

//	filter button event handler
$("#filter").on("click", function addFilters() {
	// Reset the tagIDs array
	tagIDs.splice(0,tagIDs.length);
	// Reset the orgFilterList array
	orgFilterList.splice(0,orgFilterList.length);
	// Use data in JSON file to find orgs
	d3.json(graphFile).then(function(g) {
		// Check values of each filter checkbox in the tags section
		for (var i = 0; i < g.tagNames.length; i++) {
			// get tag name
			var tagName = g.tagNames[i].id;
			// If the tag is checked, add it to the tagIDs to filter project links
			if ($('#' + reformatTagName(tagName)).is(":checked")) {
				tagIDs.push(tagName);
			}
		}
		console.log(tagIDs);
		
		// Check values of each filter checkbox in the organization affiliation section
		for (var i = 0; i < g.orgNames.length; i++) {
			// get org name
			var orgName = g.orgNames[i].id;
			orgName = reformatTagName(orgName);
			// If the org is checked, add it to the orgFilterList to filter investigator nodes
			if ($('#org' + orgName).is(":checked")) {
				orgFilterList.push(orgName);
			}
		}
		console.log(orgFilterList);
		
		// Check values of each year slider handle
		filterYears[0] = $("#slider").slider("values",0);
		filterYears[1] = $("#slider").slider("values",1);
		console.log("Year filter range: " + filterYears);
		filter();
	})
});

//	clear filter button event handler
$("#clearFilter").on("click", function clearFilters() {
	// Reset orgFilterList array
	orgFilterList.splice(0,orgFilterList.length);
	// Uncheck all organization checkboxes
	$('#orgFilterWindow :checkbox:enabled').prop('checked', false);
	// Reset tagIDs array
	tagIDs.splice(0,tagIDs.length);
	// Uncheck all tag checkboxes
	$('#tagListWindow :checkbox:enabled').prop('checked', false);
	// Reset filterYears array
	filterYears[0] = parseInt(graph.values[0].minYear);
	filterYears[1] = parseInt(graph.values[0].maxYear);
	// Reset year slider
	$("#slider").slider("values", 0, graph.values[0].minYear);
	$("#slider").slider("values", 1, graph.values[0].maxYear);
	yearFilteredYet = false;
	console.log("Reset filters");
	filter();
});

//	general update pattern for updating the graph
function update() {
	graphLayout.stop()
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
	var newNode = node.enter().append("g");
	newNode.append("circle")
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
	
	newNode.append("text")
		.text(function(d){
			return d.id;
		})
		.style("fill", "#000")
        .style("font-family", "Arial")
        .style("font-size", 18)
		.attr("font-weight", 700)
		.style("stroke", "#fff")
        .style("stroke-width", 0.6)
		.style("pointer-events", "none") // to prevent mouseover/drag capture
		.style("opacity", activeNameOpacity) // label visibility is toggled by button	
		.attr('dy', 1);
		
	//	ENTER + UPDATE
	node = node.merge(newNode);

	//	UPDATE
	link = link.data(graph.links, function(d) { return d.id;});
	//	EXIT
	link.exit().remove();
	//	ENTER
	var newLink = link.enter().append("line")
		.attr("class", "link")
        .attr("stroke", "#bbb")
		// link width is function of project funding, scaled by 1/$20000
        .attr("stroke-width", function(d) {
            return d.amount/20000 + 2;
        });
	//	ENTER + UPDATE
	link = link.merge(newLink);

	//	update graphLayout nodes, links, and alpha
	graphLayout
		.nodes(graph.nodes)
		.on("tick", ticked);

  	graphLayout.force("link")
  		.links(graph.links);

	// update adjlist
	adjlist = [];
	graph.links.forEach(function(l) {
		var sourceIndex;
		var targetIndex;
		graph.nodes.forEach(function(n, i) {
			if (l.source.id == n.id) {
				sourceIndex = i;
			}
			if (l.target.id == n.id) {
				targetIndex = i;
			}
		})
		if (sourceIndex !== null & targetIndex !== null) {
			adjlist[sourceIndex + "-" + targetIndex] = true;
			adjlist[targetIndex + "-" + sourceIndex] = true;
		}
	});
	// restart simulation
  	graphLayout.alpha(1).alphaTarget(0).restart();
}

//	drag event handlers
function dragstarted(d) {
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

//	tick event handler
function ticked() {
	node.call(updateNode);
	link.call(updateLink);
    // hovering over a node with the cursor causes the network to focus on linked nodes creates a popup with some investigator info
    node.on("mouseover", focus).on("mouseout", unfocus);
	// Hovering over a link performs focusing and creates a popup with some project info
	link.on("mouseover", focusLink);
	// Moving away from node or links resets attributes and styles
	link.on("mouseout", unfocus);
	// Clicking any node opens or closes the node info panel
    node.on("click", clickNode);
	// Clicking any link opens or closes the link info panel
	link.on("click",clickLink);
}

function fixna(x) {
	if (isFinite(x)) return x;
	return 0;
}

// redraws nodes per tick with long duration to reduce twitchiness
function updateNode(node) {
	node.transition()
		.duration(100)
		.attr("transform", function(d) {
		return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
		})	
}

// redraws link endpoints per tick with long duration to reduce twitchiness
function updateLink(link) {
	link.transition()
		.duration(100)
		.attr("x1", function(d) { return fixna(d.source.x); })
		.attr("y1", function(d) { return fixna(d.source.y); })
		.attr("x2", function(d) { return fixna(d.target.x); })
		.attr("y2", function(d) { return fixna(d.target.y); });
}

// upon node mouseover, decreases opacity of nodes and links that are not linked to focused node
function focus(d) {
	if (((searchedName == "None" || searchedName == d.id) && infoPanelOnName == "None") || clickThrough) {
		// get index of node in graph.nodes or index of link in graph.links
		var index = d3.select(d3.event.target).datum().index;
		// if a node is linked to the selected node, keep opacity at 1, otherwise opacity is set to 0.1
		node.style("opacity", function(o) {
			return neigh(index, o.index, adjlist) ? 1 : 0.1;
		});
		// the selected node radius increases from 10 to 15
		d3.select(this).select("circle").transition()
			.duration(100)
			.attr("r", function(o) {
				return neigh(index, o.index, adjlist) ? 15 : 10;
			});
		// if a link is connected to the selected node, keep opacity at 1, otherwise opacity is set to 0.1
		link.style("opacity", function(o) {
			return o.source.index == index || o.target.index == index ? 1 : 0.1;
		});
		searchedName = "None";
		var totalConnections = getConnections(d, store);
		// Handle Making Pop Ups
		div.transition()        
			.duration(200)      
			.style("opacity", .9);
			// Check toggleFunding button if investigator funding needs to be hidden
			if (activeFundingVis == 1) {
				div.html("<b>Investigator Name</b>" + "<br/>" + d.id + "<br/>" + "<b>Affiliation</b>" + "<br/>" + d.affiliation.toUpperCase() + "<br/>" + "<b>Total Funding Received as PI</b>" + "<br/>" + "$" + numberWithCommas(d.funding) + "<br/>" + "<b>Total Funded Projects</b>" + "<br/>" + totalConnections)
				.style("left", (d3.event.pageX) + "px")
				.style("padding", "7px")
				.style("top", (d3.event.pageY - 28) + "px");
			}
			else {
				div.html("<b>Investigator Name</b>" + "<br/>" + d.id + "<br/>" + "<b>Affiliation</b>" + "<br/>" + d.affiliation.toUpperCase() + "<br/>" + "<b>Total Funding Received as PI</b>" + "<br/>" + "" + "<br/>" + "<b>Total Funded Projects</b>" + "<br/>" + totalConnections)
				.style("left", (d3.event.pageX) + "px")
				.style("padding", "7px")
				.style("top", (d3.event.pageY - 28) + "px");
			}
		// Handle Name Focusing
		if (activeNameOpacity == 0) {
			var labelText = node.selectAll("text").style("opacity", function(o) {
				return neigh(index, o.node.index, adjlist) ? 1 : 0;
			});
			labelText.exit().remove()	
		}
	}
	clickThrough = false;
}

// upon link mouseover, decreases opacity of all other nodes and links except the 2 nodes the end of the focused link
function focusLink(l) {
	if (searchedName == "None" && infoPanelOnName == "None") {
		// Changes styling of nodes and links to focus only on the current link at hand
		// Nodes on each end of link keep opacity at 1, all other nodes have opacity of 0.1
		node.style('opacity', function(d) {
			return (d === l.source || d === l.target) ? 1 : 0.1;
		});
		node.select("circle").attr("r", function(d) {
			return (d === l.source || d === l.target) ? 15 : 10;
		});
		// Selected link has opacity of 1, all other links have opacity of 0.1
		link.style("opacity", function(l2) {
			return (l2 == l) ? 1 : 0.1;
		});

		// Creates a pop up with some simple information on the projects involved
		div.transition()
			.duration(200)
			.style("opacity", .9);
		div.html("<b>Project Number</b>" + "<br/>" + l.projNum + "<br/>" + "<b>Project Name</b>" + "<br/>" + l.projectName + "<br/>" + "<b>Year</b>" + "<br/>" + l.year + "<br/>" + "<b>Project Funding</b>" + "<br/>" + "$" + numberWithCommas(l.amount) + "<br/>" + "<b>Principal Investigators</b>" + "<br/>" + l.PIs + "<br/>" + "<b>Other Investigators</b>" + "<br/>" + l.addInvestigators + "<br/>" + "<b>Tags</b>" + "<br/>" + l.tags)
			.style("left", (d3.event.pageX) + "px")
			.style("padding", "7px")
			.style("top", (d3.event.pageY - 28) + "px");
	}
}

// resets opacity to full once node or link is unfocused
function unfocus() {
	if (searchedName == "None" && infoPanelOnName == 'None') {
		node.style("opacity", 1);
		link.style("opacity", 1);
		d3.selectAll("circle").transition()
			.duration(100)
			.attr("r", 10);
		div.transition()     
		.duration(500)       
		.style("opacity", 0);
	}
}

// Creates a node info panel
function clickNode(d) {
	// If a link has been clicked, fade out its info panel
	if (linkClicked) {
		console.log("Exit link info panel");
		$('#infoPanelL').fadeTo(500,0);
		$('#infoPanelL').css("display","block")
		$('#infoPanelL').css("pointer-events","none")
		infoPanelOnName = "None";
		linkClicked = false;
	}
	// Focus on current node
	clickThrough = true;
	focus(d);
	clickThrough = false;
	// Get rid of pop up
	div.transition()
	.duration(200)
	.style("opacity", 0);
	// Variables for the collaborators names and the total number of researchers worked with
	var collabOutput = "";
	var numResearchers = 0;
	console.log("Open node info panel");
	if (infoPanelOnName == "None") {
		// Initialize all relevant sections to the right information from the graph
		$('#infoPanel').css("pointer-events","auto")
		$('#infoPanel').css("display","none")
		$('#infoPanel').fadeTo(500,1);
		$('#Investigator').text(d.id);
		$('#Affiliation').text(d.affiliation.toUpperCase());
		// Check toggleFunding button if investigator funding needs to be hidden
		if (activeFundingVis == 1) {
			$('#Funding').text("$"+numberWithCommas(d.funding));
		}
		else {
			$('#Funding').text("");
		}
		$('#TotalProjects').text(getConnections(d, store));
		$('#ProjectNames').html(getProjects(d, store));
		[numResearchers, collabOutput] = getResearchers(d, graph, adjlist, store, storeAdjlist);
		$('#Collab').html(collabOutput);
		// Set the infoPanelOnName to the current node and nodeClicked to true
		infoPanelOnName = d.id;
		nodeClicked = true;
	}
	else if (infoPanelOnName != d.id) {
		// Initialize all relevant sections to the right information from the graph
		$('#infoPanel').css("pointer-events","auto")
		$('#Investigator').text(d.id);
		$('#Affiliation').text(d.affiliation.toUpperCase());
		// Check toggleFunding button if investigator funding needs to be hidden
		if (activeFundingVis == 1) {
			$('#Funding').text("$"+numberWithCommas(d.funding));
		}
		else {
			$('#Funding').text("");
		}
		$('#TotalProjects').text(getConnections(d, store));
		$('#ProjectNames').html(getProjects(d, store));
		[numResearchers, collabOutput] = getResearchers(d, graph, adjlist, store, storeAdjlist);
		$('#Collab').html(collabOutput);
		// Set the infoPanelOnName to the current node and nodeClicked to true
		infoPanelOnName = d.id;
		nodeClicked = true;
	}
	else {
		console.log("Exit node info panel");
		// Fade out node info panel
		$('#infoPanel').fadeTo(500,0);
		$('#infoPanel').css("display","block")
		$('#infoPanel').css("pointer-events","none")
		// Reset infoPanelOn and nodeClicked
		infoPanelOnName = "None";
		nodeClicked = false;
		searchedName = "None";
	}
	// For loop this code for each link to highlight other nodes of investigators to work properly.
	for (let totalR = 0; totalR < numResearchers; totalR++) {
		const rName = 'researcher' + totalR.toString();
		$('#'+rName).on('click', {'idx':rName},
		function (e) {
			//find the node
			var elem = document.getElementById(e.data.idx);
			var selectedVal= elem.textContent || elem.innerText;
			node.style("opacity", function(d) {
				return (d.id==selectedVal) ? 1 : 0.1;
			});
			searchedName = selectedVal;
		});
	}
}

// Creates a link info panel
function clickLink(l) {
	// If a node was previously clicked, fade out its info panel
	if (nodeClicked) {
		console.log("Exit node info panel");
		$('#infoPanel').fadeTo(500,0);
		$('#infoPanel').css("display","block")
		$('#infoPanel').css("pointer-events","none")
		infoPanelOnName = "None";
		nodeClicked = false;
	}
	clickThrough = true;
	focusLink(l);
	clickThrough = false;
	// Fade out the pop up for the link
	div.transition()        
	.duration(200)      
	.style("opacity", 0);
	// Names of sectionIDs to change and their corresponding JSON IDs
	var sectionIDs = ["#ProjectName", "#ProjectNumber", "#ProjectYear", "#CloseDate", "#ProjectFunding", "#PrincipleInvest", "#AddlInvest", "#Tags", "#BoxLink"];
	var linkJSON_IDs = ["projectName","projNum","year", "closeDate", "amount", "PIs","addInvestigators", "tags", "boxLink"];
	var boxURL = "none";
	console.log("Open link info panel");
	if (infoPanelOnName == "None") {
		// Show the Info Panel and all pointer events
		$('#infoPanelL').css("pointer-events","auto")
		$('#infoPanelL').css("display","none")
		$('#infoPanelL').fadeTo(500,1);
		// Fill in all relevant sections
		for (var index= 0; index < sectionIDs.length; index++) {
			$(sectionIDs[index]).text(l[linkJSON_IDs[index]]);
			if (index == sectionIDs.length - 1) {
				boxURL = l[linkJSON_IDs[index]];
				console.log(boxURL);
			}
		}
		// Replace URL with hyperlink to Box file
		$("#BoxLink").prop("href", boxURL);
		$('#BoxLink').text('Link to File');
		// Set infoPanelOnName to the current link ID
		infoPanelOnName = l.source+l.target;
		// Set linkClicked to be true
		linkClicked = true;
	}
	else if (infoPanelOnName != l.source+l.target) {
		$('#infoPanelL').css("pointer-events","auto")
		for (var index= 0; index < sectionIDs.length; index++) {
			console.log(sectionIDs[index]);
			$(sectionIDs[index]).text(l[linkJSON_IDs[index]]);
			if (index == sectionIDs.length - 1) {
				boxURL = l[linkJSON_IDs[index]];
				console.log(boxURL);
			}
		}
		// Replace URL with hyperlink to Box file
		$("#BoxLink").prop("href", boxURL);
		$('#BoxLink').text('Link to File');
		// Set infoPanelOnName to the current link ID
		infoPanelOnName = l.source+l.target;
		// Set linkClicked to be true
		linkClicked = true;
	}
	else {
		console.log("Exit link info panel");
		// Fade out the link info panel
		$('#infoPanelL').fadeTo(500,0);
		$('#infoPanelL').css("display","block")
		$('#infoPanelL').css("pointer-events","none")
		// Reset values for infoPanelOnName and linkClicked
		infoPanelOnName = "None";
		linkClicked = false;
	}
}

// If x button is clicked on info panel, fade out info panel
$(".exitPanel").on("click", function exitPanel() {
	if (nodeClicked) {
		console.log("Exit node info panel");
		// Fade out node info panel
		$('#infoPanel').fadeTo(500,0);
		$('#infoPanel').css("display","block")
		$('#infoPanel').css("pointer-events","none")
		// Reset infoPanelOnName and nodeClicked
		infoPanelOnName = "None";
		nodeClicked = false;
		searchedName = "None";
		unfocus;
	}
	else if (linkClicked) {
		console.log("Exit link info panel");
		// Fade out the link info Panel
		$('#infoPanelL').fadeTo(500,0);
		$('#infoPanelL').css("display","block")
		$('#infoPanelL').css("pointer-events","none")
		// Reset values for infoPanelOnName linkClicked
		infoPanelOnName = "None";
		linkClicked = false;
		unfocus;
	}
})

//	FILTERING

function filter() {
	// if no project tags or organizations are selected and filter year range is min to max years, reset network
	if (orgFilterList.length == 0 && tagIDs.length == 0 && filterYears[0] == parseInt(graph.values[0].minYear) && filterYears[1] == parseInt(graph.values[0].maxYear)){
		console.log("Reset: show all nodes and links");
		store.nodes.forEach(function(n) {
			if (!n.visible) {
				n.visible = true;
				graph.nodes.push($.extend(true, {}, n));
				console.log("Added " + n.id);
			}
		});
		store.links.forEach(function(l) {
			l.sourceVisible = true;
			l.targetVisible = true;
			if (!l.visible) {
				l.visible = true;
				graph.links.push($.extend(true, {}, l));
				console.log("Added link " + l.id);
			}
		});
	}
	// if some filters are selected
	else {
		// if organizations are selected, filter investigator nodes
		if (orgFilterList.length > 0) {
			console.log("Org(s) selected, filtering nodes");
			store.nodes.forEach(function(n) {
				// add filter match nodes from store
				if (orgFilterList.includes(n.affiliation) && !(n.visible)) {
					n.visible = true; // makes visible
					// add the node to the graph
					graph.nodes.push($.extend(true, {}, n));
					console.log("Added " + n.id);
				}
				// remove filter non-match from graph
				if (!(orgFilterList.includes(n.affiliation)) && n.visible) {
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
		}
		// if no organizations are selected, reset investigator nodes
		else {
			console.log("No orgs selected, reseting nodes for filtering");
			store.nodes.forEach(function(n) {
				if (!n.visible) {
					n.visible = true;
					graph.nodes.push($.extend(true, {}, n));
					console.log("Added " + n.id);
				}
			});
		}
		
		// if tags are selected, add and remove links from data based on availability of nodes, project year range, and selected tags
		if (tagIDs.length > 0) {
			console.log("Tag(s) selected, filtering links");
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
				var containsEveryTag = tagIDs.every(item => l.tags.includes(item));
				// if either node is not visible and link is visible
				if (!(l.sourceVisible && l.targetVisible) && l.visible) {
					l.visible = false;
					graph.links.forEach(function(d, i) {
						if (l.id === d.id) {
							// remove the link from the graph
							graph.links.splice(i, 1);
							console.log("Removed link " + l.id);	
						}
					})
				}
				// if (both nodes are visible and link is not visible) & (project year is within filtered range and project has all filtered tags)
				else if (l.sourceVisible && l.targetVisible && !l.visible && (l.year >= filterYears[0]) && (l.year <= filterYears[1]) && containsEveryTag) {
					l.visible = true;
					// add the link to the graph
					graph.links.push($.extend(true, {}, l));
					console.log("Added link " + l.id);
				}
				// if both nodes are visible and link is visible & (project year is not within filtered range or doesn't have all filtered tags)
				else if (l.sourceVisible && l.targetVisible && l.visible && ((l.year < filterYears[0]) || (l.year > filterYears[1]) || !containsEveryTag)) {
					l.visible = false;
					graph.links.forEach(function(d, i) {
						if (l.id === d.id) {
							// remove the link from the graph
							graph.links.splice(i, 1);
							console.log("Removed link " + l.id);
						}
					})
				}
			});
		}
		// if no tags are selected, reset all links to be visible before filtering by node availability and project year range
		else {
			console.log("No tags selected, reseting links for filtering");
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
				// 1st, reset links: if both nodes are visible and link is not visible
				if (l.sourceVisible && l.targetVisible && !l.visible) {
					l.visible = true;
					// add the link to the graph
					graph.links.push($.extend(true, {}, l));
					console.log("Added link " + l.id);
				}
				// 2nd, filter links by node availability and project year
				// if either node is not visible and link is visible
				if (!(l.sourceVisible && l.targetVisible) && l.visible) {
					l.visible = false;
					graph.links.forEach(function(d, i) {
						if (l.id === d.id) {
							// remove the link from the graph
							graph.links.splice(i, 1);
							console.log("Removed link " + l.id);	
						}
					})
				}
				// if (both nodes are visible and link is not visible) & project year is within filtered range
				else if (l.sourceVisible && l.targetVisible && !l.visible && (l.year >= filterYears[0]) && (l.year <= filterYears[1])) {
					l.visible = true;
					// add the link to the graph
					graph.links.push($.extend(true, {}, l));
					console.log("Added link " + l.id);
				}
				// if both nodes are visible and link is visible & project year is not within filtered range
				else if (l.sourceVisible && l.targetVisible && l.visible && ((l.year < filterYears[0]) || (l.year > filterYears[1]))) {
					l.visible = false;
					graph.links.forEach(function(d, i) {
						if (l.id === d.id) {
							// remove the link from the graph
							graph.links.splice(i, 1);
							console.log("Removed link " + l.id);
						}
					})
				}
			});		
		}
	}
	update();
}

// FILTERING HELPER FUNCTIONS

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

//INVESTIGATOR FUNDING TOGGLE

// Detects event when toggle funding button is clicked
var changeFundingVis = d3.select("#toggleFunding").on('click', toggleFundingVis);

// Changes investigator funding in popup to either 0 (hidden) or 1 (visible), and changes text accordingly in toggleFunding button
function toggleFundingVis(event) {
	var labelFunding = d3.select("#toggleFunding").node();
	if (activeFundingVis == 1) {
		activeFundingVis = 0;
		labelFunding.innerHTML = "Show Funding";
	}
	else if (activeFundingVis == 0) {
		activeFundingVis = 1;
		labelFunding.innerHTML = "Hide Funding";
	}
}

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

	var labelText = node.selectAll("text")
		.style("opacity", activeNameOpacity);
	labelText.exit().remove()	
}

// INVESTIGATOR SEARCH BAR FUNCTION

// Detects event when investigator find search button is clicked
$('#searchF').on('click',
   function searchNode() {
	   //find the node
	   var selectedVal = document.getElementById('search').value;
	   node.style("opacity", function(o) {
		   return (o.id==selectedVal) ? 1 : 0.1;
	   });
	   searchedName = selectedVal;
   }
);
// Detects event when investigator clear search button is clicked
$("#clear").click(
	function clearFocus() {
		//find the node
		node.style("opacity", 1);
		link.style("opacity", 1);
		searchedName = "None";
		infoPanelOnName = "None";
		$('#infoPanel').fadeTo(500,0);
		$('#infoPanel').css("display","block")
		$('#infoPanel').css("pointer-events","none")
		unfocus();
	}
);

// DOWNLOAD DATA

// Downloads all ARCHES data as two csv files
$('#download').on('click', 
function exportCSV() {
	var rows = [['id','totalFunding']]
	store.nodes.forEach(function(d,i) {
		rows.push([d.id,d.funding]);
	});
	let csvContent = "data:text/csv;charset=utf-8," 
		+ rows.map(e => e.join(",")).join("\n");
	var encodedUri = encodeURI(csvContent);
	var link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", "investigators.csv");
	document.body.appendChild(link); // Required for FF
	link.click(); // This will download the data file named "investigators.csv".

	rows = [['Project Name','Project Number', 'Year','Funding Amount','Investigators']]
	var projects = []
	store.links.forEach(function(l,i) {
		if (!projects.includes(l.projectName)) {
			rows.push([l.projectName,l.projNum,l.year,l.amount,l.PIs + ", " + l.addInvestigators]);
			projects.push(l.projectName);
		}
	});
	csvContent = "data:text/csv;charset=utf-8," 
		+ rows.map(e => e.join(",")).join("\n");
	encodedUri = encodeURI(csvContent);
	link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute("download", "projects.csv");
	document.body.appendChild(link); // Required for FF
	link.click(); // This will download the data file named "projects.csv".
}
);

// DOCUMENT SIZE

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