var width = getWidth() - 40;
var height = getHeight() - 30;

// pulls JSON file containing nodes and links from local directory
var graphFile = "ARCHES_connections7.json";

// Keeps track of the IDs of specific project types that should be removed
var filterIDs = [];

function loadNetwork(graphFile){

d3.json(graphFile).then(function(graph) {

    var clickedID = 'None';

    var searchedName = "None";

    var infoBarOnName = "None";

    var svg = d3.select("svg");
    svg.selectAll("*").remove();
    
    var label = {
        'nodes': [],
        'links': [],
    };

    var possiblePIs = []
    // Check through the filterIDs array and delete links that are 
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
            console.log("Not in links")
            var piIdx = -1;
            for (var piIdx = 0; piIdx < graph.nodes.length; piIdx++) {
                if (graph.nodes[piIdx].id == pi) {
                    break;
                }
            }
            if (piIdx > -1) {
                console.log("Deleting Nodes")
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
			return d3.color(d3.interpolatePlasma(d.fundingLogScaled)).formatHex();
		}
		)
        .attr("stroke", "#fff")
        .attr("stroke-width", "2px");
        
    // Div Tooltip for Displaying Node info
    var divNode = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);
    // Div Tooltip for Displaying Link info
    var div = d3.select("body").append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);

    // hovering over a node with the cursor causes the network to focus on linked nodes
    node.on("mouseover", focus).on("mouseout", unfocus);


    // Search Bar Functionality

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
           console.log('hi')
            rows = [['id','totalFunding']]
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
            link.click(); // This will download the data file named "my_data.csv".

            rows = [['Project Name','Project Number', 'Year','Funding Amount','Investigators']]
            projects = []
            graph.links.forEach(function(l,i) {
                if (!projects.includes(l.projectName)) {
                    rows.push([l.projectName,l.projNum,l.year,l.amount,l.PIs + ", " + l.addInvestigators]);
                    projects.push(l.projectName);
                }
            });
            csvContent = "data:text/csv;charset=utf-8," 
                + rows.map(e => e.join(",")).join("\n");
            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "projects.csv");
            document.body.appendChild(link); // Required for FF
            link.click(); // This will download the data file named "my_data.csv".
       }
   );


   $("#clear").click(
       function clearFocus() {
           //find the node
           node.attr("opacity", 1);
           labelNode.attr("display", "block")
           searchedName = "None";
       }
   );


    //Filtering Work

   $('#filter').on('click',
       function filterNodes() {
            // Reset the filterIDs array
            filterIDs.splice(0,filterIDs.length);

            // Check values of each filter checkbox
            var filterLabels = ['digHealth', 'nextGen', 'commHealth', 'radEff', 'genomics', 'myData', 'sim'];
            for (var filterIdx = 0; filterIdx < filterLabels.length; filterIdx++) {
                var filterName = filterLabels[filterIdx];
                if ($('#' + filterName).is(":checked")) {
                    filterIDs.push(filterName);
                }
                // var filterValue = document.getElementsByName(filterName);
                // if (filterValue[1].checked) {
                //     filterIDs.push(filterName);
                // }
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
        if (searchedName == "None") {
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
              div.html("<b>Project Number</b>" + "<br/>" + l.projNum + "<br/>" + "<b>Project Name</b>" + "<br/>" + l.projectName + "<br/>" + "<b>Year</b>" + "<br/>" + l.year + "<br/>" + "<b>Project Funding</b>" + "<br/>" + "$" + numberWithCommas(l.amount) + "<br/>" + "<b>Principal Investigators</b>" + "<br/>" + l.PIs + "<br/>" + "<b>Other Investigators</b>" + "<br/>" + l.addInvestigators + "<br/>" + "<b>Tags:</b>" + "<br/>" + l.tags + "<br/>" + "<b>Digital Health:</b>" + "<br/>" + l.digHealth + "<br/>" + "<b>Next Generation of Primary Care:</b>" + "<br/>" + l.nextGen + "<br/>" + "<b>Community Health and Social Determinants of Heath:</b>" + "<br/>" + l.commHealth + "<br/>" + "<b>Radical Efficiency:</b>" + "<br/>" + l.radEff + "<br/>" + "<b>Genomics and Precision Medicine:</b>" + "<br/>" + l.genomics + "<br/>" + "<b>My data and the Internet of Medical Things:</b>" + "<br/>" + l.myData + "<br/>" + "<b>Simulation and Education:</b>" + "<br/>" + l.sim)
                  .style("left", (d3.event.pageX) + "px")
                  .style("padding", "7px")        
                  .style("top", (d3.event.pageY - 28) + "px")
                  .style("height","550px");
        }

      });
    link.on("mouseout", unfocus);


    // Creates an Info Bar
    // We still need to add more detailed investigator information to this bar!!!!
    // Weird issue where when the div disappears, it still blocks nodes in that area from being interacted with
    // Clicking any node again closes the info bar.
    node.on("click",function(d) {

        focus(d);
        div.transition()        
        .duration(200)      
        .style("opacity", 0);
        if (clickedID == 'None') {
            clickedID = d.id;
        } else {
            clickedID = 'None'
        }
        numResearchers = 0;
        if (infoBarOnName == "None") {
            $('#infoBar').css("display","none")
            $('#infoBar').fadeTo(500,1);
            $('#Investigator').text(d.id);
            $('#Funding').text("$"+numberWithCommas(d.funding));
            $('#TotalProjects').text(getConnections(d));
            $('#ProjectNames').html(getProjects(d));
            [numResearchers, collabOutput] = getResearchers(d);
            console.log(collabOutput)
            console.log(numResearchers)
            $('#Collab').html(collabOutput);
            infoBarOnName = d.id;
        } else if (infoBarOnName != d.id) {
            $('#Investigator').text(d.id);
            $('#Funding').text("$"+numberWithCommas(d.funding));
            $('#TotalProjects').text(getConnections(d));
            $('#ProjectNames').html(getProjects(d));
            [numResearchers, collabOutput] = getResearchers(d);
            $('#Collab').html(collabOutput);
            infoBarOnName = d.id;
        } else {
            $('#infoBar').fadeTo(500,0);
            $('#infoBar').css("display","block")
            infoBarOnName = "None";
        }
        // For loop this code for each link to work properly.
        for (let totalR = 0; totalR < numResearchers; totalR++) {
            rName = 'researcher' + totalR.toString();
            $('#'+rName).on('click', {'idx':rName},
            function (e) {
                //find the node
                var elem = document.getElementById(e.data.idx);
                var selectedVal= elem.textContent || elem.innerText;
                console.log(selectedVal)
                node.style("opacity", function(d) {
                    return (d.id==selectedVal) ? 1 : 0.1;
                });
                labelNode.attr("display", function(d) {
                    return (d.node.id==selectedVal) ? "block" : "none";
                });
                searchedName = selectedVal;
            }
            );
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
        console.log(clickedID)
        if ((searchedName == "None" || searchedName == d.id)) {
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
            searchedName = "None"
            totalConnections = getConnections(d);
            
            div.transition()        
                .duration(200)      
                .style("opacity", .9);      
            div.html("<b>Investigator Name</b>" + "<br/>" + d.id + "<br/>" + "<b>Total Funding Received</b>" + "<br/>" + "$" + numberWithCommas(d.funding) + "<br/>" + "<b>Total Funded Projects</b>" + "<br/>" + totalConnections)   
                .style("left", (d3.event.pageX) + "px")
                .style("padding", "7px")        
                .style("top", (d3.event.pageY - 28) + "px")
                .style("height","100px");
        }

    }



    
    // resets opacity to full once node is unfocused
    function unfocus() {
        if ((searchedName == "None" || searchedName == d.id) && clickedID == 'None') {
            labelNode.attr("display", "block");
            node.style("opacity", 1);
            link.style("opacity", 1);
            node.attr("r", 10);
            div.transition()     
            .duration(500)       
            .style("opacity", 0);  
        }
  
    }

    // Adds commas to the number to show funding a little prettier
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Get total connections from one node
    function getConnections(d) {
        connections = 0
        projects = []
        for (var indexL = 0; indexL < graph.links.length; indexL++) {
            link1 = graph.links[indexL];
            if (d.id == link1.source.id || d.id == link1.target.id) {
                if (!projects.includes(link1.projectName)) {
                    projects.push(link1.projectName);
                    connections += 1; 
                }
    
            }
        }
        return connections;
    }

    // Gets the names of all the projects an invesitgator was a part of in a bulleted list
    function getProjects(d) {
        projectsString = "<ul>";
        projects = []
        for (var indexL = 0; indexL < graph.links.length; indexL++) {
            link1 = graph.links[indexL];
            if (d.id == link1.source.id || d.id == link1.target.id) {
                if (!projects.includes(link1.projectName)) {
                    projects.push(link1.projectName);
                    projectsString += "<li>" + link1.projectName + "</li>";
                }
            }
        }
        return projectsString +=  '</ul>';
    }

    // Gets the names of all the projects an invesitgator was a part of in a bulleted list
    function getResearchers(d) {
        researcherString = "<ul>";
        totalResearchers = 0;
        graph.nodes.forEach(function(d2, index) {
            if (neigh(index, d.index) && d != d2) {
                researcherString += '<li><button id="researcher'+ totalResearchers.toString() + '" class="Investigator">' + d2.id + "</button></li>";
                totalResearchers += 1;
            }
        });
        return [totalResearchers, researcherString += "</ul>"];
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

function togglePanel() {
    var x = document.getElementById("filterBar");
    if (x.style.display === "none") {
        x.style.display = "block";
    }
    else {
        x.style.display = "none";
    }
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