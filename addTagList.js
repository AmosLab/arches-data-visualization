// pulls JSON file containing funding values from local directory
var graphFile = "ARCHES_connections.json";

// define min and max values for legend, create color and axis scales
d3.json(graphFile).then(function(graph) {

function createTagList() {
	for (var i = 0; i < graph.tagNames.length - 1; i++) {
		// get tag name
		var tagName = graph.tagNames[i].id;
		
		// remove spaces in tag name
		tagName = tagName.replace(/\s+/g, '');
		
		// create div for new tag, assign the ID to be the same as the tag name
		const newTag = document.createElement('div');
		newTag.setAttribute("id", tagName.concat("_Div"));
		
		// create a new checkbox element
		const newCheckbox = document.createElement("INPUT");
		newCheckbox.setAttribute("type", "checkbox");
		newCheckbox.setAttribute("id", tagName);
		newTag.appendChild(newCheckbox);
		
		// and give it a label with the tag name, keep spaces
		const newLabel = document.createElement("Label");
		newLabel.innerHTML = graph.tagNames[i].id;
		newTag.appendChild(newLabel);
	
		// add break
		const br = document.createElement("br");
		newTag.appendChild(br);
		
		// add div to tagList form
		const tagListForm = document.getElementById("tagListWindow"); //need to add id tagList to form
		tagListForm.appendChild(newTag);
	}
};

createTagList();

}
);