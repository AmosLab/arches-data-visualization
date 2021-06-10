// pulls JSON file containing funding values from local directory
var graphFile = "ARCHES_connections.json";

// define min and max values for legend, create color and axis scales
d3.json(graphFile).then(function(graph) {

function createTagList() {
	// Alphabetize N
	names = getObjectValuesAlphabetical(graph.tagNames)
	for (var i = 0; i < names.length; i++) {
		// get tag name
		var tagName = names[i];
		tagName = reformatTagName(tagName);
		
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
		newLabel.innerHTML = names[i];
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

// Filter Search Bar using JQuery
var tags = [];
for (var key in graph.tagNames) {
	tags.push(graph.tagNames[key].id);
}
tags.sort();
$(function () {
	$("#tagSearch").autocomplete({
		source: tags,
	});
});

});

// Takes a list of JSON objects and sorts them by value, and returns the list of the sorted values
function getObjectValuesAlphabetical(dict) {
	var sorted = [];
	for (var index = 0; index < dict.length; index++) {
		sorted.push(dict[index]["id"])
	}
	sorted.sort();
    return sorted;
}

// Filter Tag Search Function using JQuery
$('#addTag').on('click',
	function searchTags() {
		// Get the tagName from the input box and reformat
		var tagName = document.getElementById('tagSearch').value;
		tagName = reformatTagName(tagName);
		// Change checked state
		if ($('#'+tagName).is(':checked')) {
			$('#'+tagName).prop('checked',false);
		}
		else {
			$('#'+tagName).prop('checked',true);
		}
	}
);

// Clear Tag Search Filters using JQuery
$('#clearTags').on('click',
	function clearTags() {
		$('#tagListWindow :checkbox:enabled').prop('checked', false);
	}
);

// Reformat tag names to match the ids in the HTML
function reformatTagName(tagName) {
	// remove spaces in tag name (HTML id's can't have spaces)
	tagName = tagName.replace(/\s+/g, '');
	// replace special characters with hyphen (HTML id's can't have special characters)
	tagName = tagName.replace('&', '-');
	tagName = tagName.replace('/', '-');
	tagName = tagName.replace('(', '-');
	tagName = tagName.replace(')', '-');
	return tagName;
}