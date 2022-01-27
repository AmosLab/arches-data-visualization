// A Function to export a CSV file of the data contained within the current filtered graph
function exportCSV(graph) {
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
};

export {exportCSV}