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