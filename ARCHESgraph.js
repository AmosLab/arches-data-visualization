import { exportCSV } from './scripts/downloadCSV.js';
import {getProjects, getConnections, neigh, getResearchers} from './scripts/graphIndexers.js';
// import {exportCSV} from './scripts/donwloadCSV.js';

var width = getWidth() - 40;
var height = getHeight() - 30;
// const { getProjects} = require('./graphIndexers.js')


// pulls JSON file containing nodes and links from local directory
var graphFile = "ARCHES_connections.json";

// Keeps track of the IDs of specific project types that should be removed
var filterIDs = [];
var tagIDs =[];

var activeNameOpacity = 1;

function loadNetwork(graphFile){

d3.json(graphFile).then(function(graph) {

    var clickedID = 'None';
    var searchedName = "None";
    var infoBarOnName = "None";
    var clickThrough = false;

    var svg = d3.select("svg");
    svg.selectAll("*").remove();
    
    var label = {
        'nodes': [],
        'links': [],
    };


    function findCommonElements3(arr1, arr2) {
        return arr1.some(item => arr2.includes(item))
    }

    // let a = ["a", "b", "c"];
    // let b = ["c", "x", "x"];
    // let c = ["d", "e", "f"];

    // console.log(findCommonElements3(a,b))
    // console.log(findCommonElements3(a,c))
    // console.log(tagIDs)

    var possiblePIs = []
    // Check through the filterIDs array and delete links that are projects that aren't in the tags
    for (var idx = 0; idx < filterIDs.length; idx++) {
        var filterName = filterIDs[idx];
        graph.links.forEach(function(link, index) {
            
            if (link[filterName] == "No") { // If the link with this filterName is not that type, delete it
                graph.links.splice(index,1);
                if (!possiblePIs.includes(link.source)) {
                    possiblePIs.push(link.source);
                }
                if (!possiblePIs.includes(link.target)) {
                    possiblePIs.push(link.target);
                }
            } 

        });
    }
    // Delete projects that that have tags that aren't correct.
    if(!(tagIDs.length < 1 || tagIDs == undefined)) {
        graph.links.forEach(function(link, index) {
            var extraTags = link["tags"].split(",");
            for (var index2 = 0; index2 < extraTags.length; index2++) {
                var tagName = extraTags[index2]
                // remove spaces in tag name
                tagName = tagName.replace(/\s+/g, '');
                // replace special characters with hyphen
                tagName = tagName.replace('&', '-');
                tagName = tagName.replace('/', '-');
                tagName = tagName.replace('(', '-');
                tagName = tagName.replace(')', '-');
                // replace tag name with new processed tag name
                extraTags[index2] = tagName;
            console.log(extraTags);
            if (!findCommonElements3(extraTags,tagIDs)) { // If the link doesn't include any of the extra tags selected, delete it
                graph.links.splice(index,1);
                if (!possiblePIs.includes(link.source)) {
                    possiblePIs.push(link.source);
                }
                if (!possiblePIs.includes(link.target)) {
                    possiblePIs.push(link.target);
                }
            }
            }
        });
    }


    // Delete all Nodes of PIs no longer in links after filtering
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


    // Investigator Search Bar Functionality

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

   // Filter Search Bar

    var tags = [];
    for (var key in graph.tagNames) {
        tags.push(graph.tagNames[key].id);
    }
    tags.sort();
    $(function () {
        $("#tagSearch").autocomplete({
            source: tags,
        });
    });

    // Filter Tag Search Function
    $('#addTag').on('click',
        function searchTags() {
            // Get the tagName from the input box
            var tagName = document.getElementById('tagSearch').value;
            // Delete spaces
            tagName = tagName.replace(/\s+/g, '');
            // replace special characters with hyphen
            tagName = tagName.replace('&', '-');
            tagName = tagName.replace('/', '-');
            tagName = tagName.replace('(', '-');
            tagName = tagName.replace(')', '-');
            // Change checked state
            if ($('#'+tagName).is(':checked')) {
                $('#'+tagName).prop('checked',false);
            } else {
                $('#'+tagName).prop('checked',true);
            }

        }
    );

    // Clear Tag Search Filters 
    $('#clearTags').on('click',
        function clearTags() {
            for (var idx in tags) {
                var tagName = tags[idx];
                // Delete spaces
                tagName = tagName.replace(/\s+/g, '');
                // replace special characters with hyphen
                tagName = tagName.replace('&', '-');
                tagName = tagName.replace('/', '-');
                tagName = tagName.replace('(', '-');
                tagName = tagName.replace(')', '-');
                // Change checked state to false
                $('#'+tagName).prop('checked',false);
            }
        }
    );


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


    //Filtering Work

   $('#filter').on('click',
       function filterNodes() {
            // Reset the filterIDs array
            filterIDs.splice(0,filterIDs.length);

            // Check values of each filter checkbox in the first section
            var filterLabels = ['digHealth', 'nextGen', 'commHealth', 'radEff', 'genomics', 'myData', 'sim'];
            for (var filterIdx = 0; filterIdx < filterLabels.length; filterIdx++) {
                var filterName = filterLabels[filterIdx];
                if ($('#' + filterName).is(":checked")) {
                    filterIDs.push(filterName);
                }
            }
            // Check values of each filter checkbox in the tags section
            for (var i = 0; i < graph.tagNames.length; i++) {
                // get tag name
                var tagName = graph.tagNames[i].id;
                // remove spaces in tag name
                tagName = tagName.replace(/\s+/g, '');
                // replace special characters with hyphen
                tagName = tagName.replace('&', '-');
                tagName = tagName.replace('/', '-');
                tagName = tagName.replace('(', '-');
                tagName = tagName.replace(')', '-');
                // If the tag is checked, add it to the tadIDs to filter array
                if ($('#' + tagName).is(":checked")) {
                    tagIDs.push(tagName);
                }
            }
            // Reload the network
            loadNetwork(graphFile);
        }
    );

    $('#clearFilter').on('click',
        function ClearFilterNodes() {
            filterIDs.splice(0,filterIDs.length);
            loadNetwork(graphFile);
        }
    );

    // Hovering over a link performs focusing and creates a popup with some relevant project info

    link.on('mouseover', function(l) {
        if (searchedName == "None" && infoBarOnName == "None") {
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
            div.transition()        
                  .duration(200)      
                  .style("opacity", .9);      
            div.html("<b>Project Number</b>" + "<br/>" + l.projNum + "<br/>" + "<b>Project Name</b>" + "<br/>" + l.projectName + "<br/>" + "<b>Year</b>" + "<br/>" + l.year + "<br/>" + "<b>Project Funding</b>" + "<br/>" + "$" + numberWithCommas(l.amount) + "<br/>" + "<b>Principal Investigators</b>" + "<br/>" + l.PIs + "<br/>" + "<b>Other Investigators</b>" + "<br/>" + l.addInvestigators + "<br/>" + "<b>Tags</b>" + "<br/>" + l.tags + "<br/>" + "<b>Digital Health</b>" + "<br/>" + l.digHealth + "<br/>" + "<b>Next Generation of Primary Care</b>" + "<br/>" + l.nextGen + "<br/>" + "<b>Community Health and Social Determinants of Heath</b>" + "<br/>" + l.commHealth + "<br/>" + "<b>Radical Efficiency</b>" + "<br/>" + l.radEff + "<br/>" + "<b>Genomics and Precision Medicine</b>" + "<br/>" + l.genomics + "<br/>" + "<b>My data and the Internet of Medical Things</b>" + "<br/>" + l.myData + "<br/>" + "<b>Simulation and Education</b>" + "<br/>" + l.sim)
                  .style("left", (d3.event.pageX) + "px")
                  .style("padding", "7px")        
                  .style("top", (d3.event.pageY - 28) + "px")
                  .style("height","550px");
        }

      });
    link.on("mouseout", unfocus);


    // Creates an Info Bar
    // We still need to add more detailed investigator information to this bar!!!!
    // Clicking any node again closes the info bar.
    node.on("click",function clickNode(d) {
        clickThrough = true;
        var collabOutput = "";
        focus(d);
        div.transition()        
        .duration(200)      
        .style("opacity", 0);
        if (clickedID == 'None') {
            clickedID = d.id;
        } else {
            clickedID = 'None'
        }
        var numResearchers = 0;
        if (infoBarOnName == "None") {
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
            infoBarOnName = d.id;
        } else if (infoBarOnName != d.id) {
            $('#infoBar').css("pointer-events","auto")
            $('#Investigator').text(d.id);
            $('#Affiliation').text(d.affiliation.toUpperCase());
            $('#Funding').text("$"+numberWithCommas(d.funding));
            $('#TotalProjects').text(getConnections(d, graph.links));
            $('#ProjectNames').html(getProjects(d, graph.links));
            [numResearchers, collabOutput] = getResearchers(d, graph, adjlist);
            $('#Collab').html(collabOutput);
            infoBarOnName = d.id;
        } else {
            $('#infoBar').fadeTo(500,0);
            $('#infoBar').css("display","block")
            $('#infoBar').css("pointer-events","none")

            infoBarOnName = "None";
        }
        // For loop this code for each link to work properly.
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
                var labelText = d3.select("#viz").select(".labelnodes").selectAll("text").style("opacity", function(o) {
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
                labelText = d3.select("#viz").select(".labelnodes").selectAll("text").style("opacity", 0);
            }  
        }
  
    }

    // Adds commas to the number to show funding a little prettier
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

 	// creates circle stroke color legend for investigator nodes
 	var legendCircle = d3.symbol().type(d3.symbolCircle)();
 	// assigning circle shape to each organization
 	var symbolScale =  d3.scaleOrdinal()
 		.domain(["OSF", "UICOMP", "UIUC"])
 		.range([legendCircle, legendCircle, legendCircle] );
 	// assigning colors to each organization
 	var colorScale = d3.scaleOrdinal()
 		.domain(["OSF", "UICOMP", "UIUC"])
 		.range(["#70362a", "#001E62", "#E84A27"]);
 	// creating new container to hold node stroke color legend and placing in bottom right corner
 	var container2 = svg.append("g")
 		.attr("class", "legendSymbol")
 		.attr("transform", "translate(" + (width-100) + "," + (height-175) + ")")
 		.style("font-family", "sans-serif")
 		.style("font-size", "16px")
 	// using d3-legend
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
}
);
}
loadNetwork(graphFile);

$('#filterPanel').on('click', function() {
    if ($('#filterBar').css("display") == "none") {
        $('#filterBar').css("display","block");
        $('#filterPanel').text("Hide Filters");
    } else {
        $('#filterBar').css("display","none");
        $('#filterPanel').text("Show Filters");
    }
});



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
  
// detects event when toggle name button is clicked
var changeNameOpacity = d3.select("#toggleNames").on('click', toggleNameOpacity);

// changes label text opacity to either 0 or 1, and changes text accordingly in toggle name button
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

	var labelText = d3.select("#viz").select(".labelnodes").selectAll("text")
		.style("opacity", activeNameOpacity);
	labelText.exit().remove()	
}