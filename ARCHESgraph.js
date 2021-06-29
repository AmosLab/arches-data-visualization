import {getProjects, getConnections, neigh, getResearchers} from './scripts/graphIndexers.js';

var width = getWidth() - 40;
var height = getHeight() - 30;

// pulls JSON file containing nodes and links from local directory
var graphFile = "ARCHES_connections.json";

// Keeps track of the IDs of specific project types that should be removed
var filterYears = [];
var tagIDs = [];
var yearFilteredYet = false;

var activeNameOpacity = 1;

function loadNetwork(graphFile){

// Fetches JSON file using D3 tool
d3.json(graphFile).then(function(graph) {
	var clickedID = 'None';
	var searchedName = "None";
	var infoBarOnName = "None";
	var clickThrough = false;
    var linkClicked = false;
    var nodeClicked = false;

	var svg = d3.select("svg");
	svg.selectAll("*").remove();
	
	var label = {
		'nodes': [],
		'links': [],
	};

    /**
     * 
     * 
     * ***************************************** FILTERING SECTION **************************************************
     * 
     * 
     *  */ 


    // This function initializes the filters by checking which boxes are checked, adding them to the tagIDs list and then restarting the graph
	
	$('#filter').on('click',
        function filterNodes() {
            // Reset the tagIDs array
            tagIDs.splice(0,tagIDs.length);
            // Check values of each filter checkbox in the tags section
            for (var i = 0; i < graph.tagNames.length; i++) {
                // get tag name
                var tagName = graph.tagNames[i].id;
                tagName = reformatTagName(tagName);
                // If the tag is checked, add it to the tadIDs to filter array
                if ($('#' + tagName).is(":checked")) {
                    tagIDs.push(tagName);
                }
            }
			// Check values of each year slider handle
			filterYears[0] = $("#slider").slider("values",0);
			filterYears[1] = $("#slider").slider("values",1);
			console.log("Year filter range: " + filterYears);
            // Reload the network
            loadNetwork(graphFile);
        }
    );

    // Clicking the Clear button in the filter window resets the filters to all be unselected
    $('#clearFilter').on('click',
        function ClearFilterNodes() {
            tagIDs.splice(0,tagIDs.length);
			filterYears[0] = parseInt(graph.values[0].minYear);
			filterYears[1] = parseInt(graph.values[0].maxYear);
			yearFilteredYet = false;
            loadNetwork(graphFile);
        }
    );

    // array of new links to keep if filtering needs to be applied
    var newLinks = []
    // array of possible PIs to delete when newLinks are applied
	var possiblePIs = []

	// Delete projects that that have tags that aren't correct or have a project year outside the year filter range
	if(tagIDs.length >= 1 && yearFilteredYet == false) {
		console.log("Tags nonzero:" + tagIDs.length);
		yearFilteredYet = true;
		
		// clean up tag names
		var toKeep = tagIDs.map(reformatTagName);
		console.log(toKeep);
		
		// Get all graph link tags
		var gLinks = graph.links;
		var allLinks = gLinks.map(a => a.tags);				
		allLinks = allLinks.map(reformatTagName);
		console.log(allLinks);
		
		// loop over each tag to filter and find the indexes of all links with that tag.
		var matchedLinks = [];
		toKeep.forEach(function(tag, index){
			var matchIndexes = getAllIndexes(allLinks, tag);
			matchedLinks.push.apply(matchedLinks,matchIndexes);
		}
		);
		
		// Get the actual links from the matches for the tags to keep.
		graph.links.forEach(function(link, index){
			if ( parseInt(link["year"]) < filterYears[0] || parseInt(link["year"]) > filterYears[1]){
					link
				}
			if (matchedLinks.includes(index)){
				newLinks.push(link);
			}
			
		});
		console.log(newLinks);
	}

	// If no tags are selected, only push projects within filtering year range
	if (tagIDs.length < 1 && yearFilteredYet == false) {
		console.log("Tags zero");
		yearFilteredYet = true;
		graph.links.forEach(function(link, index) {
			if (parseInt(link["year"]) < filterYears[0] || parseInt(link["year"]) > filterYears[1]) { // If link has year outside of year filter range, delete it
					if (!possiblePIs.includes(link.source)) {
						possiblePIs.push(link.source);
					}
					if (!possiblePIs.includes(link.target)) {
						possiblePIs.push(link.target);
					}
				} else {
					newLinks.push(link);
				}
			});
	}

    // If filtering was performed, you need to replace the graph links
    if (tagIDs.length >= 1 || yearFilteredYet == true) {
        console.log("replaced links");
		yearFilteredYet = false;
        graph.links = newLinks;
    }
    
	// Now delete all nodes of PIs no longer in links after filtering
	var inLinks = false;
	possiblePIs.forEach(function(pi,index2) {
		inLinks = false;
		for (var indexL = 0; indexL < graph.links.length; indexL++) {
			const link1 = graph.links[indexL];
			if (pi == link1.source || pi == link1.target) {
				inLinks = true;
				break;            
			}
		}
		if (!inLinks) {
			var piIdx = -1;
			for (var piIdx = 0; piIdx < graph.nodes.length; piIdx++) {
				if (graph.nodes[piIdx].id == pi) {
					break;
				}
			}
			if (piIdx > -1) {
				graph.nodes.splice(piIdx, 1);
			}
		}
	});

    /**
     * 
     * 
     * ***************************************** GRAPH FORMATTING SECTION **************************************************
     * 
     * 
     *  */ 


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
        .force("charge", d3.forceManyBody().strength(-200))
        .force("link", d3.forceLink(label.links).distance(0).strength(3));
    
    // sets force of repulsion (negative value) between nodes, and force of attraction between linked nodes
    var graphLayout = d3.forceSimulation(graph.nodes)
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink(graph.links).id(function(d) {return d.id; }).distance(50).strength(0.2))
        .on("tick", ticked);

    var adjlist = [];
    
    graph.links.forEach(function(d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });
    
    // creates svg container in the viz svg element to draw menu and network visualization elements
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
		// link width is function of project funding, scaled by 1/$20000
        .attr("stroke-width", function(d) {
            return d.amount/20000 + 2;
        }
            );
    
    // node style formatting
    var node = container.append("g").attr("class", "nodes")  
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("circle")
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
            else {
                return "#fff";
            }
        })
        .attr("stroke-width", "2px");

    // Div Tooltip for Displaying Link info, appended to .graphToolContainer to prevent overflow beyond page bounds
    var div = d3.select(".graphToolContainer").append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);


    // hovering over a node with the cursor causes the network to focus on linked nodes
    node.on("mouseover", focus).on("mouseout", unfocus);


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



    /**
     * 
     * 
     * ***************************************** FOCUSING SECTION **************************************************
     * 
     * 
     *  */ 

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

	// Download function

	$('#download').on('click', 
	function exportCSV() {
		var rows = [['id','totalFunding']]
		graph.nodes.forEach(function(d,i) {
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
		graph.links.forEach(function(l,i) {
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



    // Hovering over a link performs focusing and creates a popup with some relevant project info

    link.on('mouseover', focusLink);

    function focusLink(l) {
        if (searchedName == "None" && infoBarOnName == "None") {

            // Changes styling of nodes and links to focus only on the current link at hand.
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

            // Creates a pop up with some simple information on the projects involved
			div.transition()
				.duration(200)
				.style("opacity", .9);      
            div.html("<b>Project Number</b>" + "<br/>" + l.projNum + "<br/>" + "<b>Project Name</b>" + "<br/>" + l.projectName + "<br/>" + "<b>Year</b>" + "<br/>" + l.year + "<br/>" + "<b>Project Funding</b>" + "<br/>" + "$" + numberWithCommas(l.amount) + "<br/>" + "<b>Principal Investigators</b>" + "<br/>" + l.PIs + "<br/>" + "<b>Other Investigators</b>" + "<br/>" + l.addInvestigators + "<br/>" + "<b>Tags</b>" + "<br/>" + l.tags)
				.style("left", (d3.event.pageX) + "px")
				.style("padding", "7px")        
				.style("top", (d3.event.pageY - 28) + "px")
				.style("height","300px");
		}
	}
    link.on("mouseout", unfocus);


    // Creates an Info Bar
    // Clicking any node again closes the info bar.
    node.on("click",function clickNode(d) {
        // If a link has been clicked, fade it's info bar
        if (linkClicked) {
            $('#infoBarL').fadeTo(500,0);
            $('#infoBarL').css("display","block")
            $('#infoBarL').css("pointer-events","none")
            infoBarOnName = "None";
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

        if (infoBarOnName == "None") {
            // Initialize all relevant sections to the right information from the graph
            $('#infoBar').css("pointer-events","auto")
            $('#infoBar').css("display","none")
            $('#infoBar').fadeTo(500,1);
            $('#Investigator').text(d.id);
            $('#Affiliation').text(d.affiliation.toUpperCase());
            $('#Funding').text("$"+numberWithCommas(d.funding));
            $('#TotalProjects').text(getConnections(d, graph.links));
            $('#ProjectNames').html(getProjects(d, graph.links));
            [numResearchers, collabOutput] = getResearchers(d, graph, adjlist);
            $('#Collab').html(collabOutput);
            // Set the infoBarOnName to the current node and nodeClicked to true
            infoBarOnName = d.id;
            nodeClicked = true;
        } else if (infoBarOnName != d.id) {
            // Initialize all relevant sections to the right information from the graph
            $('#infoBar').css("pointer-events","auto")
            $('#Investigator').text(d.id);
            $('#Affiliation').text(d.affiliation.toUpperCase());
            $('#Funding').text("$"+numberWithCommas(d.funding));
            $('#TotalProjects').text(getConnections(d, graph.links));
            $('#ProjectNames').html(getProjects(d, graph.links));
            [numResearchers, collabOutput] = getResearchers(d, graph, adjlist);
            $('#Collab').html(collabOutput);
            // Set the infoBarOnName to the current node and nodeClicked to true
            infoBarOnName = d.id;
            nodeClicked = true;
        } else {
            // Fade out info bar
            $('#infoBar').fadeTo(500,0);
            $('#infoBar').css("display","block")
            $('#infoBar').css("pointer-events","none")
            // Reset infoBarOn and nodeClicked
            infoBarOnName = "None";
            nodeClicked = false;
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
                labelNode.attr("display", function(d) {
                    return (d.node.id==selectedVal) ? "block" : "none";
                });
                searchedName = selectedVal;
            });
        }
    });

    // Creates an Info Bar for Links
    // Clicking any link again closes this bar
    link.on("click",clickLink);

    // Creates an Info Bar for Links
    // Clicking any link again closes this bar
    function clickLink(l) {
        // If a node was previously clicked, fade put it's info bar
        if (nodeClicked) {
            $('#infoBar').fadeTo(500,0);
            $('#infoBar').css("display","block")
            $('#infoBar').css("pointer-events","none")
            infoBarOnName = "None";
            nodeClicked = false;
        }
        clickThrough = true;
        focusLink(l);
        clickThrough = false;
        // Fade out the Pop up for the link
        div.transition()        
        .duration(200)      
        .style("opacity", 0);
        // Names of sectionIDs to change and their corresponding JSON IDs
        var sectionIDs = ["#ProjectName", "#ProjectNumber", "#ProjectYear", "#CloseDate", "#ProjectFunding", "#PrincipleInvest", "#AddlInvest", "#Tags", "#BoxLink"];
        var linkJSON_IDs = ["projectName","projNum","year", "closeDate", "amount", "PIs","addInvestigators", "tags", "boxLink"];
		var boxURL = "none";
        if (infoBarOnName == "None") {
            // Show the Info Bar and all pointer events
            $('#infoBarL').css("pointer-events","auto")
            $('#infoBarL').css("display","none")
            $('#infoBarL').fadeTo(500,1);
            // Fill in all relevant sections
            for (var index= 0; index < sectionIDs.length; index++) {
                console.log(sectionIDs[index]);
                $(sectionIDs[index]).text(l[linkJSON_IDs[index]]);
				if (index == sectionIDs.length - 1) {
					boxURL = l[linkJSON_IDs[index]];
				}
            }
            // Set infoBarOnName to the current link ID
            infoBarOnName = l.source+l.target;
            // Set linkClicked to be true
            linkClicked = true;
			$('#BoxLink').replaceWith('<a href="' + boxURL + '">Link to File</a>');
        } else if (infoBarOnName != l.source+l.target) {
            $('#infoBarL').css("pointer-events","auto")
            for (var index= 0; index < sectionIDs.length; index++) {
                console.log(sectionIDs[index]);
                $(sectionIDs[index]).text(l[linkJSON_IDs[index]]);
				if (index == sectionIDs.length - 1) {
					boxURL = l[linkJSON_IDs[index]];
				}
            }
            // Set infoBarOnName to the current link ID
            infoBarOnName = l.source+l.target;
            // Set linkClicked to be true
            linkClicked = true;
			$('#BoxLink').replaceWith('<a href="' + boxURL + '">Link to File</a>');
        } else {
            // Fade out the Info Bar
            $('#infoBarL').fadeTo(500,0);
            $('#infoBarL').css("display","block")
            $('#infoBarL').css("pointer-events","none")
            // Reset values for infoBarOnName and linkClicked
            infoBarOnName = "None";
            linkClicked = false;
			$('#BoxLink').replaceWith('<p>None</p>');
        }
    }

    // }
    
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
        .style("pointer-events", "none") // to prevent mouseover/drag capture
		.style("opacity", activeNameOpacity); // label visibility is toggled by button
    
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
        if (((searchedName == "None" || searchedName == d.id) && infoBarOnName == "None") || clickThrough) {
            var index = d3.select(d3.event.target).datum().index;
            node.style("opacity", function(o) {
                return neigh(index, o.index, adjlist) ? 1 : 0.1;
            });
            labelNode.attr("display", function(o) {
                return neigh(index, o.node.index, adjlist) ? "block": "none";
            });
            link.style("opacity", function(o) {
                return o.source.index == index || o.target.index == index ? 1 : 0.1;
            });
            node.attr("r", function(o) {
                return neigh(index, o.index, adjlist) ? 15 : 10;
            });
            searchedName = "None"
            var totalConnections = getConnections(d, graph.links);
            // Handle Making Pop Ups
            div.transition()        
                .duration(200)      
                .style("opacity", .9);      
                div.html("<b>Investigator Name</b>" + "<br/>" + d.id + "<br/>" + "<b>Affiliation</b>" + "<br/>" + d.affiliation.toUpperCase() + "<br/>" + "<b>Total Funding Received as PI</b>" + "<br/>" + "$" + numberWithCommas(d.funding) + "<br/>" + "<b>Total Funded Projects</b>" + "<br/>" + totalConnections)
                .style("left", (d3.event.pageX) + "px")
                .style("padding", "7px")        
                .style("top", (d3.event.pageY - 28) + "px")
                .style("height","140px");
            // Handle Name Focusing
            if (activeNameOpacity == 0) {
                var labelText = d3.select("#viz").select(".labelNodes").selectAll("text").style("opacity", function(o) {
                    return neigh(index, o.node.index, adjlist) ? 1 : 0;
                });
                labelText.exit().remove()
            }
        }
        clickThrough = false;
    }

	// resets opacity to full once node is unfocused
	function unfocus() {
		if (searchedName == "None" && infoBarOnName == 'None') {
			labelNode.attr("display", "block");
			node.style("opacity", 1);
			link.style("opacity", 1);
			node.attr("r", 10);
			div.transition()     
			.duration(500)       
			.style("opacity", 0);
			if (activeNameOpacity == 0) {
				labelText = d3.select("#viz").select(".labelNodes").selectAll("text").style("opacity", 0);
			}  
		}
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

	// Detects cursor drag event
	function dragstarted(d) {
		d3.event.sourceEvent.stopPropagation();
		if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
		d.fx = d.x;
		d.fy = d.y;
	}

	// Drag function allows svg element to follow cursor position
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

// Adds commas to the number to show funding a little prettier
function numberWithCommas(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// See if two arrays share a common element
function findCommonElements3(arr1, arr2) {
	return arr1.some(item => arr2.includes(item))
}

// Get indexes of array that contain an element
function getAllIndexes(arr, val) {
		var indexes = []
		for(var i = 0; i < arr.length; i++){
			if (arr[i].includes(val)){
			indexes.push(i);}
		}
		return indexes;
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

	var labelText = d3.select("#viz").select(".labelNodes").selectAll("text")
		.style("opacity", activeNameOpacity);
	labelText.exit().remove()	
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