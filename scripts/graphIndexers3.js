// Get total connections from one node
function getConnections(d, store) {
    var connections = 0;
    var projects = []
	store.links.forEach(function(l) {
		if (d.id == l.source || d.id == l.target) {
			if (!projects.includes(l.projectName)) {
                projects.push(l.projectName);
                connections += 1; 
            }
		}
	})
    return connections;
}
// Gets the names of all the projects an investigator was a part of in a bulleted list
function getProjects(d, store) {
    var projectsString = "<ul>";
    var projects = []
    store.links.forEach(function(l) {
		if (d.id == l.source || d.id == l.target) {
			if (!projects.includes(l.projectName)) {
                projects.push(l.projectName);
                projectsString += "<li>" + l.projectName + "</li>";
            }
        }
    })
    return projectsString +=  '</ul>';
}

// Gets the names of all the projects an investigator was a part of in a bulleted list
function getResearchers(node, store, adjlist) {
    var researcherString = "<ul>";
    var totalResearchers = 0;
    store.nodes.forEach(function(node2, index) {
        if (neigh(index, node.index, adjlist) && node != node2) {
            researcherString += '<li><button id="researcher'+ totalResearchers.toString() + '" class="Investigator">' + node2.id + "</button></li>";
            totalResearchers += 1;
        }
    });
    return [totalResearchers, researcherString += "</ul>"];
}

// helper function to check if two nodes are neighbors in the graph
function neigh(node1, node2, adjlist) {
    return node1 == node2 || adjlist[node1 + "-" + node2];
}

export {getProjects, getConnections, neigh, getResearchers}