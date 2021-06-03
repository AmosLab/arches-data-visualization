// Get total connections from one node
function getConnections(d, graphLinks) {
    var connections = 0
    var projects = []
    for (var indexL = 0; indexL < graphLinks.length; indexL++) {
        var link1 = graphLinks[indexL];
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
function getProjects(d, graphLinks) {
    var projectsString = "<ul>";
    var projects = []
    for (var indexL = 0; indexL < graphLinks.length; indexL++) {
        var link1 = graphLinks[indexL];
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
function getResearchers(node, graph, adjlist) {
    var researcherString = "<ul>";
    var totalResearchers = 0;
    graph.nodes.forEach(function(node2, index) {
        if (neigh(index, node.index, adjlist) && node != node2) {
            researcherString += '<li><button id="researcher'+ totalResearchers.toString() + '" class="Investigator">' + node2.id + "</button></li>";
            totalResearchers += 1;
        }
    });
    return [totalResearchers, researcherString += "</ul>"];
}


// Helper Function to Check if two nodes are neighbors in the graph
function neigh(node1, node2, adjlist) {
    return node1 == node2 || adjlist[node1 + "-" + node2];
}

export {getProjects, getConnections, neigh, getResearchers}