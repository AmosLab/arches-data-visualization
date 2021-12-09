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
// Gets the names of all the projects an investigator was a part of in a sorted bulleted list
function getProjects(d, store) {
	var projects = [];
    var projectsStringArray = [];
	var projectsString = "<ul>";
    store.links.forEach(function(l) {
		if (d.id == l.source || d.id == l.target) {
			if (!projects.includes(l.projectName)) {
                projects.push(l.projectName);
				projectsStringArray.push("<li>" + l.year + ": " + l.projectName + "</li>");
            }
        }
    })
	projectsStringArray.sort();
	for (var i = 0; i < projectsStringArray.length; i++) {
		projectsString += projectsStringArray[i];
	}
    return projectsString +=  '</ul>';
}

// Gets the names of all the investigators an investigator has collaborated with in a bulleted list
function getResearchers(node, graph, adjlist, store, storeAdjlist) {
	var researcherArray = [];
	var researcherString = "<ul>";
	// find investigators currently on the graph
    graph.nodes.forEach(function(node2, index) {
		// if investigator has collaborated with selected investigator
        if (neigh(index, node.index, adjlist) && node != node2) {
			researcherArray.push([node2.id, true]);
        }
    });
	// find investigators not currently on the graph
	// find index of selected investigator in store, since its index is different in graph
	var storeIndex = store.nodes.findIndex(el => el.id === node.id)
	store.nodes.forEach(function(node2, index) {
		// if investigator has collaborated with selected investigator and isn't already in researcherArray
        if (neigh(index, storeIndex, storeAdjlist) && node.id != node2.id && !(researcherArray.find(el => el[0] === node2.id))) {
			researcherArray.push([node2.id, false]);
        }
    });
	// sort investigators alphabetically
	researcherArray.sort();
	// add all investigators to string
	for (var i = 0; i < researcherArray.length; i++) {
		// if investigator is on the graph, add a button link
		if (researcherArray[i][1])
		{
			researcherString += '<li><button id="researcher'+ i.toString() + '" class="Investigator">' + researcherArray[i][0] + "</button></li>";
		}
		// if investigator is not on the graph, add text
		else {
			researcherString += '<li>' + researcherArray[i][0] + '</li>';
		}
	}
    return [researcherArray.length, researcherString += "</ul>"];
}

// helper function to check if two nodes are neighbors in the graph
function neigh(node1, node2, adjlist) {
    return node1 == node2 || adjlist[node1 + "-" + node2];
}

export {getProjects, getConnections, neigh, getResearchers}