// pulls JSON file containing funding values from local directory
var graphFile = "ARCHES_connections.json";

// define min and max values for legend, create color and axis scales
d3.json(graphFile).then(function(graph) {

function createTagList() {
	graph.tagNames.forEach(function(key, value) {
		// tag numbers start at 1, but JS array indexes start at 0
		tagNumber = value+1;
		
		// create div for new tag, assign the ID to be the same as the tag name
		const newTag = document.createElement('div');
		newTag.setAttribute("id", String(key[tagNumber]));
		
		// create a new checkbox element
		const newCheckbox = document.createElement("INPUT");
		newCheckbox.setAttribute("type", "checkbox");
		newCheckbox.setAttribute("id", String(key[tagNumber]));
		newTag.appendChild(newCheckbox);
		
		// and give it a label with the tag name
		const newLabel = document.createElement("Label");
		newLabel.innerHTML = String(key[tagNumber]);
		newTag.appendChild(newLabel);
	
		// add break
		const br = document.createElement("br");
		newTag.appendChild(br);
		
		// add div to tagList form
		const tagListForm = document.getElementById("tagListWindow"); //need to add id tagList to form
		tagListForm.appendChild(newTag);
	}
)
};

createTagList();

}
);