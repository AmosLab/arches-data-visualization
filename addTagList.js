// pulls JSON file containing funding values from local directory
var graphFile = "ARCHES_connections.json";

// define min and max values for legend, create color and axis scales
d3.json(graphFile).then(function(graph) {

function createTagList() {
	graph.tagNames.forEach(function(key, value) {
		// create div for new tag
		const newTag = document.createElement('div');
		newTag.setAttribute("id", String(key));
		
		// create a new checkbox element
		const newCheckbox = document.createElement("INPUT");
		newCheckbox.setAttribute("type", "checkbox");
		newCheckbox.setAttribute("id", String(value));
		newTag.appendChild(newCheckbox);
		
		// and give it a label
		const newLabel = document.createElement("Label");
		newLabel.innerHTML = String(value);
		newTag.appendChild(newLabel);
	
		// add break
		const br = document.createElement("br");
		newTag.appendChild(br);
		
		// add div to tagList form
		const tagListForm = document.getElementById("tagListWindow"); //need to add id tagList to form 
		console.log(tagListForm);
		tagListForm.appendChild(newTag);
	}
)
};

createTagList();

}
);