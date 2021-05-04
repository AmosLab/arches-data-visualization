function clearFocus(node,link,labelNode,searchedName,infoBarOnName) {
    //find the node
    node.style("opacity", 1);
    link.style("opacity", 1);
    labelNode.attr("display", "block")
    searchedName = "None";
    infoBarOnName = "None";
    $('#infoBar').fadeTo(500,0);
    $('#infoBar').css("display","block")
    $('#infoBar').css("pointer-events","none")
    unfocus();
}

function unfocus(searchedName, infoBarOnName, labelNode, node, link, div, activeNameOpacity, d3, labelText) {
    if (searchedName == "None" && infoBarOnName == 'None') {
        labelNode.attr("display", "block");
        node.style("opacity", 1);
        link.style("opacity", 1);
        node.attr("r", 10);
        div.transition()     
        .duration(500)       
        .style("opacity", 0);
        if (activeNameOpacity == 0) {
            labelText = d3.select("#viz").select(".labelnodes").selectAll("text").style("opacity", 0);
        }  
    }
}

export {clearFocus, unfocus}

