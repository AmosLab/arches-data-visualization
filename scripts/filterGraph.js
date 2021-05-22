// pulls JSON file containing funding values from local directory
var graphFile = "ARCHES_connections.json";

// define min and max values for legend, create color and axis scales
d3.json(graphFile).then(function(graph) {

    var possiblePIs = []
    // Check through the filterIDs array and delete links that are projects that aren't in the tags selected
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
        }
        // Reload the network
        loadNetwork(graphFile);
    });

    $('#clearFilter').on('click',
        function ClearFilterNodes() {
            filterIDs.splice(0,filterIDs.length);
            loadNetwork(graphFile);
        }
    );
});