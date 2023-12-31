// * * * * GRAPH * * * * //

document.Graph = {
    settings: {
        nodeWidth: 100,
        nodeHeight: 30,
        horizontalSpace: 30,
        verticalSpace: 40,
        deviceVerticalSpace: 50,
        showScore: "all",
        showDevices: "all"
    },
    onNodeEnter: function(nodeEnter) {

    },
    onNodeUpdate: function(nodeUpdate) {

    }
}

// Types: operator, authentication, account
const OPERATOR_RADIUS = 15;

var treeData = [{
    "type": "account",
    "label": "root",
    "score": 0,
    "children": [{
        "type": "operator",
        "value": "|",
        "score": 0,
        "children": [
            { "type": "operator", "value": "&", "score": 0 }
        ]
    }]
}];

var deviceData = [];
let deviceUseList = [];

// ************** Generate the tree diagram	 *****************
var margin = {
    top: 20,
    right: 50,
    bottom: 20,
    left: 500
};

var i = 0;
var duration = 1000;

var tree = d3.layout.tree();

var diagonal = d3.svg.diagonal()
    .source(function(d) {
        if (d.target.type === "operator") {
            return { x: d.target.x, y: d.target.y - OPERATOR_RADIUS };
        } else {
            return { x: d.target.x, y: d.target.y - document.Graph.settings.nodeHeight / 2 };
        }
    })
    .target(function(d) {
        if (d.source.type === "operator") {
            return { x: d.source.x, y: d.source.y + 4 + OPERATOR_RADIUS };
        } else {
            return { x: d.source.x, y: d.source.y + 4 + document.Graph.settings.nodeHeight / 2 };
        }
    })
    .projection(function(d) {
        return [d.x, d.y];
    });

var svg = d3.select("div#graph").append("svg").attr("viewBox", `0 0 1000 600`)



//Add Arrows
svg.append("defs")
    .append("marker")
    .attr("id", "arrow")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "12")
    .attr("markerHeight", "12")
    .attr("viewbox", "0 0 12 12")
    .attr("refX", "6")
    .attr("refY", "6")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M2,2 L10,6 L2,10 L6,6 L2,2")
    .attr("style", "fill: #000;");

svgGroup = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ") scale(0.5 0.5)");


var zoom = d3.behavior.zoom()
    .scaleExtent([1, 8])
    .on('zoom', function() {
        svgGroup.attr('transform',
            "translate(" + (margin.left + d3.event.translate[0]) + "," + (margin.top + d3.event.translate[1]) + ") " +
            " scale(" + (-0.5 + d3.event.scale) + "," + (-0.5 + d3.event.scale) + ")");
    });

svg.call(zoom);

var deviceLinksGroup = svgGroup.append("g");

root = treeData[0];
root.x0 = 0;
root.y0 = 0;


var selectedNode = null;

function getTreeDepth(node) {
    let m = 0;
    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            let val = getTreeDepth(node.children[i])
            if (val > m) {
                m = val;
            }
        }
        return m + 1;
    } else if (node._children !== null && node._children !== undefined && node._children.length > 0) {
        // Collapsed node
        for (var i = 0; i < node._children.length; i++) {
            let val = getTreeDepth(node._children[i])
            if (val > m) {
                m = val;
            }
            return m + 1;
        }

    } else {
        return 1;
    }
}

function getNodebyNodeId(node, nodeId) {
    if (node.nodeId === nodeId) {
        return node;
    }
    let out = null;
    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            out = getNodebyNodeId(node.children[i], nodeId);
            if (out !== null) {
                break;
            }
        }
    } else if (node._children !== null && node._children !== undefined && node._children.length > 0) {
        // Collapsed node
        for (let i = 0; i < node._children.length; i++) {
            out = getNodebyNodeId(node._children[i], nodeId);
            if (out !== null) {
                break;
            }
        }
    }
    return out;
}

function update(source) {
    tree.nodeSize([document.Graph.settings.nodeWidth + document.Graph.settings.horizontalSpace, document.Graph.settings.nodeHeight])
        .separation(function separation(a, b) {
            return a.parent == b.parent ? 1.1 : 1;
        })

    let treeDepth = getTreeDepth(root);

    // Compute the new tree layout.
    let nodes = tree.nodes(root).reverse(),
        links = tree.links(nodes);

    calculateDeviceUse(root);
    calculateScore(tree.nodes(root)[0]);
    calculateRecovery(tree.nodes(root)[0]);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) {
        d.y = d.depth * (document.Graph.settings.nodeHeight + document.Graph.settings.verticalSpace);
        d.x0 = d.x;
        d.y0 = d.y;
    });


    // Declare the nodes…
    let node = svgGroup.selectAll("g.node")
        .data(nodes, function(d) {
            return d.id || (d.id = ++i);
        });
    node.exit().remove();

    // Enter the nodes.
    let nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + (d.x0) + "," + (d.y0) + ")";
        });
    if (typeof click === "function") {
        nodeEnter.on("click", click)
            .on("mouseover", function(d) {
                d3.select(this).attr("r", 10).style("cursor", "pointer");
            });
    }

    let nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });


    let nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + source.x + "," + source.y + ")";
        })
        .remove();


    nodeEnter.filter(function(d) {
            return d.type == 'account';
        }).append("rect")
        .style("fill", "#fff")
        .style("stroke", "#000")
        .style("stroke-width", "1px")
        .attr("width", document.Graph.settings.nodeWidth)
        .attr("height", document.Graph.settings.nodeHeight)
        .attr('x', function(d) {
            return -document.Graph.settings.nodeWidth / 2;
        })
        .attr('y', function(d) {
            return -document.Graph.settings.nodeHeight / 2;
        })
        .style("fill", "#fff")
        .classed("node-selected", function(d) { return d === selectedNode; })
        .classed("node-collapsed", function(d) {
            return d._children !== null && d._children !== undefined && d._children.length > 0;
        });


    // Draw node
    nodeEnter.filter(function(d) {
            return d.type == 'authentication';
        }).append("rect")
        .style("fill", "#fff")
        .style("stroke", "#000")
        .style("stroke-width", "1px")
        .attr("width", document.Graph.settings.nodeWidth)
        .attr("height", document.Graph.settings.nodeHeight)
        .attr('x', function(d) {
            return -document.Graph.settings.nodeWidth / 2;
        })
        .attr('y', function(d) {
            return -document.Graph.settings.nodeHeight / 2;
        })
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        })
        .style("rx", "5")
        .style("stroke", "#000")
        .classed("node-selected", function(d) { return d === selectedNode; })
        .classed("node-collapsed", function(d) {
            return d._children !== null && d._children !== undefined && d._children.length > 0;
        });

    // Custom nodeEnter operation

    if (document.Graph.settings.showScore !== "none") {
        nodeEnter.filter(function(d) {
                if (document.Graph.settings.showScore == "all") {
                    return d.type == 'authentication' || d.type == 'account';
                } else if (document.Graph.settings.showScore == "leaves") {
                    return (d.type == 'authentication' || d.type == 'account') && (d.children == null || d.children == undefined || d.children.length == 0);
                } else if (document.Graph.settings.showScore == "authentication") {
                    return d.type == 'authentication';
                }
            }).append("circle")
            .style("fill", "#fff")
            .style("stroke", "#000")
            .style("stroke-width", "1px")
            .attr("r", 15)
            .attr("cx", 5 + document.Graph.settings.nodeWidth / 2)
            .attr("cy", -document.Graph.settings.nodeHeight / 2);

        nodeEnter.filter(function(d) {
                if (document.Graph.settings.showScore == "all") {
                    return d.type == 'authentication' || d.type == 'account';
                } else if (document.Graph.settings.showScore == "leaves") {
                    return (d.type == 'authentication' || d.type == 'account') && (d.children == null || d.children == undefined || d.children.length == 0);
                } else if (document.Graph.settings.showScore == "authentication") {
                    return d.type == 'authentication';
                }
            }).append("text")
            .style("font", " 12px sans-serif")
            .attr("class", "node-score")
            .attr("x", 5 + document.Graph.settings.nodeWidth / 2)
            .attr("y", -document.Graph.settings.nodeHeight / 2)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle");
    }

    nodeEnter.filter(function(d) {
            return d.type == 'authentication';
        }).append("image")
        .attr("x", document.Graph.settings.nodeWidth / 2)
        .attr("y", -10 + document.Graph.settings.nodeHeight / 2)
        .attr("width", 20)
        .attr("height", 20)
        .attr("href", function(d) {
            switch (d.value) {
                case "knowledge":
                    return "img/innovative-brain-icon.svg";
                case "software":
                    return "img/coding-icon.svg";
                case "hardware":
                    return "img/semiconductor-icon.svg";
                default:
                    return "";
            }
        });

    node.selectAll("image").filter(function(d) {
            return d.type == 'authentication';
        })
        .attr("href", function(d) {
            switch (d.value) {
                case "knowledge":
                    return "img/innovative-brain-icon.svg";
                case "software":
                    return "img/coding-icon.svg";
                case "hardware":
                    return "img/semiconductor-icon.svg";
                default:
                    return "";
            }
        });




    nodeEnter.filter(function(d) {
            return d.type == 'graph';
        }).append("rect")
        .style("fill", "#fff")
        .style("stroke", "#000")
        .style("stroke-width", "1px")
        .attr("width", document.Graph.settings.nodeWidth)
        .attr("height", document.Graph.settings.nodeHeight)
        .attr('x', function(d) {
            return -document.Graph.settings.nodeWidth / 2;
        })
        .attr('y', function(d) {
            return -document.Graph.settings.nodeHeight / 2;
        })
        .style("fill", "#EEE")
        .classed("node-selected", function(d) { return d === selectedNode; })
        .classed("node-collapsed", function(d) {
            return d._children !== null && d._children !== undefined && d._children.length > 0;
        });

    // Draw operator
    nodeEnter.filter(function(d) {
            return d.type == 'operator';
        }).append("circle")
        .style("fill", "#fff")
        .style("stroke", "#000")
        .style("stroke-width", "1px")
        .attr("r", OPERATOR_RADIUS)
        .classed("operator-node", true)
        .classed("node-selected", function(d) { return d === selectedNode; })
        .classed("node-collapsed", function(d) {
            return d._children !== null && d._children !== undefined && d._children.length > 0;
        });

    if (document.Graph.settings.showScore !== "none") {
        nodeEnter.filter(function(d) {
                if (document.Graph.settings.showScore == "all") {
                    return d.type == 'operator';
                } else if (document.Graph.settings.showScore == "leaves") {
                    return d.type == 'operator' && (d.children == null || d.children == undefined || d.children.length == 0);
                } else if (document.Graph.settings.showScore == "authentication") {
                    return false;
                }
            }).append("circle")
            .style("fill", "#fff")
            .style("stroke", "#000")
            .style("stroke-width", "1px")
            .attr("r", 15)
            .attr("cx", 20)
            .attr("cy", -10);

        nodeEnter.filter(function(d) {
                if (document.Graph.settings.showScore == "all") {
                    return d.type == 'operator';
                } else if (document.Graph.settings.showScore == "leaves") {
                    return d.type == 'operator' && (d.children == null || d.children == undefined || d.children.length == 0);
                } else if (document.Graph.settings.showScore == "authentication") {
                    return false;
                }
            }).append("text")
            .style("font", " 12px sans-serif")
            .attr("class", "node-score")
            .attr("x", 20)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle");
    }

    nodeEnter.filter(function(d) {
            return d.type == 'authentication' || d.type == 'account';
        }).append("text")
        .style("font", " 12px sans-serif")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("class", "node-label")
        .text(function(d) {
            return d.label;
        }).style("fill-opacity", 1);

    nodeUpdate.selectAll(".node-label").filter(function(d) {
        return d.type == 'authentication' || d.type == 'account';
    }).attr("text-decoration", function(d) {
        if ($("select#formScoringView").val() === "Recovery") {
            if (d.recovery === 0) {
                return "line-through";
            }
        }
        return null;
    });

    nodeEnter.filter(function(d) {
            return d.type == 'graph';
        }).append("text")
        .style("font", " 12px sans-serif")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(function(d) {
            return "Graph";
        }).style("fill-opacity", 1);

    nodeEnter.filter(function(d) {
            return d.type == 'operator';
        }).append("text")
        .style("font", " 12px sans-serif")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(function(d) {
            return d.value;
        }).style("fill-opacity", 1);


    document.Graph.onNodeEnter(nodeEnter);


    node.selectAll("text.node-label")
        .text(function(d) {
            if (d.type == 'authentication' || d.type == 'account') {
                return d.label;
            } else if (d.type == "operator") {
                return d.value;
            }
        });


    if (document.Graph.settings.showScore !== "none") {
        node.selectAll("text.node-score")
            .text(function(d) {
                if ($("select#formScoringView").val() === "Security") {
                    switch (d.score) {
                        case 1:
                            return "L";
                        case 2:
                            return "M";
                        case 3:
                            return "H";
                        default:
                            return "-";
                    }
                    //return d.score;
                } else if ($("select#formScoringView").val() === "Recovery") {
                    if (d.recovery === 0) {
                        d3.select(this).style("fill", "red");
                    } else {
                        d3.select(this).style("fill", null);
                    }
                    if (d.recovery % 1 > 0) {
                        return d.recovery.toFixed(2);
                    } else {
                        return d.recovery;
                    }
                }
            });
    }
    // Custom nodeEnter operation
    document.Graph.onNodeUpdate(node);

    // Declare the links…
    var link = svgGroup.selectAll("path.link")
        .data(links, function(d) {
            return d.target.id;
        });

    link.exit().remove()
        // Enter the links.
    link.enter().insert("path", "g").filter(function(d) {
            return d.target.type !== '';
        })
        .attr("class", "link")
        .style("stroke", "#000")
        .style("fill", "none")
        .style("stroke-width", "1px")
        .attr("d", diagonal)
        .attr("marker-end", "url(#arrow)");

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
            var o = {
                x: source.x,
                y: source.y
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });


    svgGroup.selectAll("g.devices").remove();
    deviceLinksGroup.selectAll("line.device-link").remove();
    if (document.Graph.settings.showDevices !== "none") {
        // Lines from nodes to devices
        drawDeviceLinks(root, treeDepth);

        // Devices
        let devices = svgGroup.append("g")
            .attr("class", "devices");
        for (let i = 0; i < deviceData.length; i++) {
            if (document.Graph.settings.showDevices === "all" || (document.Graph.settings.showDevices === "used" && deviceUseList[i] > 0)) {
                let devicePos = getDevicePosition(i, treeDepth);
                let deviceGroup = devices.append("g")
                    .attr("transform", "translate(" + devicePos.x + "," + devicePos.y + ")");
                let deviceRect = deviceGroup.append("rect")
                    .attr("fill", "white")
                    .attr("stroke", "black")
                    .attr("x", -50)
                    .attr("y", -15)
                    .style("rx", "15")
                    .attr("width", 100)
                    .attr("height", 30)
                let deviceText = deviceGroup.append("text")
                    .style("font", " 14px sans-serif")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "middle")
                    .text(deviceData[i].label);
                if (deviceDisabledList.includes(i)) {
                    deviceText.attr("text-decoration", "line-through");
                }
                if (typeof clickDevice === "function") {
                    deviceRect.on("click", function() { clickDevice(i) })
                        .on("mouseover", function() {
                            d3.select(this).style("cursor", "pointer");
                        });
                    deviceText.on("click", function() { clickDevice(i) })
                        .on("mouseover", function() {
                            d3.select(this).style("cursor", "pointer");
                        });
                }
                // Score
                if (document.Graph.settings.showScore !== "none" && $("select#formScoringView").val() === "Recovery" && deviceUseList[i] > 0) {
                    deviceGroup.append("circle")
                        .style("fill", "#fff")
                        .style("stroke", "#000")
                        .style("stroke-width", "1px")
                        .attr("r", 15)
                        .attr("cx", 50)
                        .attr("cy", -15);
                    let recoveryScoreNode = deviceGroup.append("text")
                        .style("font", " 12px sans-serif")
                        .attr("x", 50)
                        .attr("y", -15)
                        .attr("text-anchor", "middle")
                        .attr("alignment-baseline", "middle");

                    if (deviceDisabledList.includes(i)) {
                        recoveryScoreNode.style("fill", "red");
                        recoveryScoreNode.text("0");
                    } else {
                        recoveryScoreNode.style("fill", null);
                        recoveryScoreNode.text((1 / deviceUseList[i]) % 1 !== 0 ? (1 / deviceUseList[i]).toFixed(2) : 1 / deviceUseList[i]);
                    }
                }
            }
        }
    }
}


function getBoundingBoxFromGraph(node, boundingBox = { left: 0, top: 0, bottom: 0, right: 0 }) {
    leftBound = node.x - document.Graph.settings.nodeWidth / 2;
    rightBound = node.x + document.Graph.settings.nodeWidth / 2;
    topBound = node.y - document.Graph.settings.nodeHeight / 2;
    bottomBound = node.y + document.Graph.settings.nodeHeight / 2;
    if (leftBound < boundingBox.left) {
        boundingBox.left = leftBound;
    }
    if (topBound < boundingBox.top) {
        boundingBox.top = topBound;
    }
    if (rightBound > boundingBox.right) {
        boundingBox.right = rightBound;
    }
    if (bottomBound > boundingBox.bottom) {
        boundingBox.bottom = bottomBound;
    }
    if (node.children != null && node.children != undefined && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
            getBoundingBoxFromGraph(node.children[i], boundingBox);
        }
    } else if (node._children != null && node._children != undefined && node._children.length > 0) {
        // Collapsed
        for (let i = 0; i < node._children.length; i++) {
            getBoundingBoxFromGraph(node._children[i], boundingBox);
        }
    }
}

function getBoundingBoxWithDevices(boundingBox = { left: 0, top: 0, bottom: 0, right: 0 }) {
    let treeDepth = getTreeDepth(root);
    for (let i = 0; i < deviceData.length; i++) {
        if (i > 0 && i + 1 < deviceData.length) {
            continue;
        }
        let devicePos = getDevicePosition(i, treeDepth);
        leftBound = devicePos.x - document.Graph.settings.nodeWidth / 2;
        rightBound = devicePos.x + document.Graph.settings.nodeWidth / 2;
        topBound = devicePos.y - document.Graph.settings.nodeHeight / 2;
        bottomBound = devicePos.y + document.Graph.settings.nodeHeight / 2;
        if (leftBound < boundingBox.left) {
            boundingBox.left = leftBound;
        }
        if (topBound < boundingBox.top) {
            boundingBox.top = topBound;
        }
        if (rightBound > boundingBox.right) {
            boundingBox.right = rightBound;
        }
        if (bottomBound > boundingBox.bottom) {
            boundingBox.bottom = bottomBound;
        }
    }
}

function refreshGraph() {
    let tmp_root = root;
    let tmp_deviceData = deviceData;
    root = {};
    deviceData = [];
    update(root);

    root = tmp_root;
    deviceData = tmp_deviceData;
    update(root);
}

function getDeviceIndexById(id) {
    for (let i = 0; i < deviceData.length; i++) {
        if (deviceData[i].id === id) {
            return i;
        }
    }
}

function getDevicePosition(index, treeDepth) {
    return { x: (-((deviceData.length - 1) * 60)) + (index * 120), y: treeDepth * (document.Graph.settings.nodeHeight + document.Graph.settings.verticalSpace) + document.Graph.settings.deviceVerticalSpace };
}

function drawDeviceLinks(node, treeDepth) {

    if (node.type === "authentication") {
        if (node.devices) {
            for (let i = 0; i < node.devices.length; i++) {
                let devicePos = getDevicePosition(getDeviceIndexById(node.devices[i]), treeDepth);
                let nodeOffsetX = 0;
                if (node.x < devicePos.x) {
                    nodeOffsetX = 5;
                } else if (node.x > devicePos.x) {
                    nodeOffsetX = -5;
                }
                deviceLinksGroup.append("line")
                    .attr("class", "device-link")
                    .attr("stroke", "black")
                    .attr("stroke-dasharray", "4")
                    .attr("x2", node.x + nodeOffsetX)
                    .attr("y2", node.y + 5 + document.Graph.settings.nodeHeight / 2)
                    .attr("x1", devicePos.x)
                    .attr("y1", devicePos.y - 15)
                    .attr("marker-end", "url(#arrow)");
            }
        }
    }

    if (node.children != null && node.children != undefined && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
            drawDeviceLinks(node.children[i], treeDepth);
        }
    }


}

// Scoring
$("select#formScoringView").change(function() {
    update();
});

$("select#formScoringAnd").change(function() {
    update();
});

$("select#formScoringOr").change(function() {
    update();
});



function calculateScore(node) {
    let collapsed = false;
    if ((node._children !== undefined && node._children !== null && node._children.length > 0)) {
        collapsed = true;
    }
    if (node.type === 'operator') {
        if (!collapsed) { // Expanded -> use node.children
            // Apply configured operator function to children: min/max/sum
            if (node.children === undefined || node.children.length === 0) {
                return 0;
            }
            var selector = "";
            if (node.value === "&") {
                selector = "select#formScoringAnd";
            } else if (node.value === "|") {
                selector = "select#formScoringOr";
            }
            node.score = calculateScore(node.children[0]);
            let tmpVal = node.score;
            switch ($(selector).val()) {
                case "MIN":
                    for (let i = 1; i < node.children.length; i++) {
                        tmpVal = calculateScore(node.children[i]);
                        if (tmpVal < node.score) {
                            node.score = tmpVal;
                        }
                    }
                    break;
                case "MAX":
                    for (let i = 1; i < node.children.length; i++) {
                        tmpVal = calculateScore(node.children[i]);
                        if (tmpVal > node.score) {
                            node.score = tmpVal;
                        }
                    }
                    break;
                case "SUM":
                    for (let i = 1; i < node.children.length; i++) {
                        node.score += calculateScore(node.children[i]);
                    }
                    break;
                default:
                    break;
            }
        } else { // Collapsed -> use node._children
            // Apply configured operator function to children: min/max/sum
            if (node._children === undefined || node._children.length === 0) {
                return 0;
            }
            var selector = "";
            if (node.value === "&") {
                selector = "select#formScoringAnd";
            } else if (node.value === "|") {
                selector = "select#formScoringOr";
            }
            node.score = calculateScore(node._children[0]);
            let tmpVal = node.score;
            switch ($(selector).val()) {
                case "MIN":
                    for (let i = 1; i < node._children.length; i++) {
                        tmpVal = calculateScore(node._children[i]);
                        if (tmpVal < node.score) {
                            node.score = tmpVal;
                        }
                    }
                    break;
                case "MAX":
                    for (let i = 1; i < node._children.length; i++) {
                        tmpVal = calculateScore(node._children[i]);
                        if (tmpVal > node.score) {
                            node.score = tmpVal;
                        }
                    }
                    break;
                case "SUM":
                    for (let i = 1; i < node._children.length; i++) {
                        node.score += calculateScore(node._children[i]);
                    }
                    break;
                default:
                    break;
            }
        }
    } else if (node.type === 'account') {
        if ((node._children && node._children.length > 0)) {
            node.score = calculateScore(node._children[0]);
        } else if ((node.children === undefined || node.children.length === 0)) {
            node.score = 1;
        } else {
            node.score = calculateScore(node.children[0]);
        }
    }
    return parseInt(node.score);
}


function calculateRecovery(node) {
    let collapsed = false;
    if ((node._children !== undefined && node._children !== null && node._children.length > 0)) {
        collapsed = true;
    }
    if (node.type === 'operator') {
        if (!collapsed) { // Expanded -> use node.children
            if (node.children === undefined || node.children.length === 0) {
                return 0;
            }
            node.recovery = calculateRecovery(node.children[0]);
            let tmpVal = node.recovery;
            if (node.value === "&") { // Calculate min
                for (let i = 1; i < node.children.length; i++) {
                    tmpVal = calculateRecovery(node.children[i]);
                    if (tmpVal < node.recovery) {
                        node.recovery = tmpVal;
                    }
                }
            } else if (node.value === "|") { // Calculate sum
                for (let i = 1; i < node.children.length; i++) {
                    node.recovery += calculateRecovery(node.children[i]);
                }
            }
        } else { // Collapsed -> use node._children
            if (node._children === undefined || node._children.length === 0) {
                return 0;
            }
            node.recovery = calculateRecovery(node._children[0]);
            let tmpVal = node.recovery;
            if (node.value === "&") { // Calculate min
                for (let i = 1; i < node._children.length; i++) {
                    tmpVal = calculateRecovery(node._children[i]);
                    if (tmpVal < node.recovery) {
                        node.recovery = tmpVal;
                    }
                }
            } else if (node.value === "|") { // Calculate sum
                for (let i = 1; i < node._children.length; i++) {
                    node.recovery += calculateRecovery(node._children[i]);
                }
            }
        }
    } else if (node.type === 'authentication') {
        // Calculate recovery based on devices
        node.recovery = 0
        if (node.devices && node.devices.length > 0) {
            for (let i = 0; i < node.devices.length; i++) {
                let deviceIndex = getDeviceIndexById(node.devices[i]);
                if (deviceDisabledList.includes(deviceIndex)) {
                    node.recovery += 0;
                } else {
                    node.recovery += 1 / deviceUseList[deviceIndex];
                }
            }
        } else {
            node.recovery = 1;
        }
        return node.recovery;
    } else if (node.type === 'account') {
        if ((node._children && node._children.length > 0)) {
            node.recovery = calculateRecovery(node._children[0]);
        } else if ((node.children === undefined || node.children.length === 0)) {
            node.recovery = 1;
        } else {
            node.recovery = calculateRecovery(node.children[0]);
        }
    }
    return node.recovery;
}


// Keep track of how often each device / app is used

function calculateDeviceUse(node) {
    // Reset values
    deviceUseList = [];
    for (let i = 0; i < deviceData.length; i++) {
        deviceUseList.push(0);
    }
    calculateDeviceUseNode(node);
}

// Recursive function. Don't call anywhere else.
function calculateDeviceUseNode(node) {
    if (node.type === "authentication") {
        if (node.devices) {
            for (let i = 0; i < node.devices.length; i++) {
                deviceUseList[getDeviceIndexById(node.devices[i])]++;
            }
        }
    }
    if (node.children != null && node.children != undefined && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
            calculateDeviceUseNode(node.children[i]);
        }
    } else if (node._children != null && node._children != undefined && node._children.length > 0) {
        // Collapsed
        for (let i = 0; i < node._children.length; i++) {
            calculateDeviceUseNode(node._children[i]);
        }
    }
}


// Devices

let deviceDisabledList = [];

clickDevice = function(deviceIndex) {
    const index = deviceDisabledList.indexOf(deviceIndex);
    if (index > -1) {
        deviceDisabledList.splice(index, 1);
    } else {
        deviceDisabledList.push(deviceIndex);
    }
    update();
}

function generateRandomDeviceId() {
    return Math.random().toString(36).slice(2, 7);
}


function removeDevice(id) {
    for (let i = 0; i < deviceData.length; i++) {
        if (deviceData[i].id === id) {
            deviceData.splice(i, 1);
            removeDeviceUpdateGraph(root, id);
            update();
            return;
        }
    }
}

function removeDeviceUpdateGraph(node, index) {

    if (node.type === "authentication") {
        if (node.devices) {
            for (let i = 0; i < node.devices.length; i++) {
                if (node.devices[i] === index) {
                    node.devices.splice(i, 1);
                    i--;
                }
            }
        }
    }

    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            removeDeviceUpdateGraph(node.children[i], index);
        }
    } else if (node._children !== null && node._children !== undefined && node._children.length > 0) {
        // Collapsed node
        for (let i = 0; i < node._children.length; i++) {
            removeDeviceUpdateGraph(node._children[i], index);
        }
    }
}

function removeDevicesFromGraph(node) {
    if (node.type === "authentication") {
        node.devices = [];
    }
    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            removeDevicesFromGraph(node.children[i]);
        }
    }
}

function removeParentsFromGraph(node) {
    node.parent = null;
    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            removeParentsFromGraph(node.children[i]);
        }
    }
}

function exportData(node) {
    var obj = new Object();
    obj.type = node.type;
    obj.value = node.value;
    if (node.nodeId) {
        obj.nodeId = node.nodeId;
    } else {
        obj.nodeId = generateRandomNodeId();
    }

    if (obj.type === "authentication") {
        obj.score = node.score;
        if (deviceData.length > 0) {
            obj.devices = node.devices;
        } else {
            obj.devices = [];
        }
        obj.label = node.label;
    } else if (obj.type === "account") {
        obj.label = node.label;
    }

    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        obj.children = [];
        for (var i = 0; i < node.children.length; i++) {
            obj.children.push(exportData(node.children[i]));
        }
    } else if (node._children !== null && node._children !== undefined && node._children.length > 0) {
        // Collapsed node
        obj.children = [];
        for (var i = 0; i < node._children.length; i++) {
            obj.children.push(exportData(node._children[i]));
        }
    }
    return obj;
}

function alignGraph() {
    var boundingBox = { left: 0, top: 0, bottom: 0, right: 0 };
    getBoundingBoxFromGraph(root, boundingBox);
    if (document.Graph.settings.showDevices !== "none") {
        getBoundingBoxWithDevices(boundingBox);
    }


    width = boundingBox.right - boundingBox.left;
    height = boundingBox.bottom - boundingBox.top;

    leftOffset = -(width / 2 + boundingBox.left);

    let scale = 0.9 * 1000 / width;

    if (scale * height > 550) {
        scale = 0.85 * 550 / height;
    }


    zoom.scale(0.5 + scale);
    zoom.translate([leftOffset, 15 * (scale * 2)]);

    svgGroup.attr('transform',
        "translate(" + (margin.left + leftOffset) + "," + (margin.top + 15 * (scale * 2)) + ") " +
        " scale(" + (scale) + "," + (scale) + ")");
};

function downloadSVG() {
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg.node());
    source = '<?xml version="1.0" standalone="no"?>\r\n<svg title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600">' + source + '</svg>';
    var urlData = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", urlData);
    downloadAnchorNode.setAttribute("download", root.label + "_graph.svg");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

};


// Recovery score -> Horn clauses

/*function getExpressionTree(node) {

    let childrenExpression = [];

    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            childrenExpression.push(getExpressionTree(node.children[i]));
        }
    } else if (node._children !== null && node._children !== undefined && node._children.length > 0) {
        // Collapsed node
        for (var i = 0; i < node._children.length; i++) {
            childrenExpression.push(getExpressionTree(node._children[i]));
        }
    } else {
        return node.label;
    }

    if (node.type === "operator" && childrenExpression.length > 0) {
        let out = "";
        out += childrenExpression[0];

        for (let i = 1; i < childrenExpression.length; i++) {
            if (node.value === "&") {
                out += " &and; " + childrenExpression[i]
            } else
            if (node.value === "|") {
                out += " &or; " + childrenExpression[i]
            }
        }
        if (childrenExpression.length > 1) {
            out = "(" + out + ")";
        }
        return out;
    } else if (childrenExpression.length > 0) {
        return childrenExpression[0];
    }
}*/

function getExpressionTreeDevices(node) {

    let childrenExpression = [];

    if (node.children != null && node.children != undefined && node.children.length > 0) {
        // Node with children
        for (var i = 0; i < node.children.length; i++) {
            childrenExpression.push(getExpressionTreeDevices(node.children[i]));
        }
    } else if (node._children !== null && node._children !== undefined && node._children.length > 0) {
        // Collapsed node
        for (var i = 0; i < node._children.length; i++) {
            childrenExpression.push(getExpressionTreeDevices(node._children[i]));
        }
    } else {
        if (node.devices && node.devices.length > 1) {
            let nodes = [];
            for (let i = 0; i < node.devices.length; i++) {
                nodes.push({ type: "value", nodes: node.devices[i], nodeType: "device" })
            }
            return { type: "disjunction", nodes: nodes };
        } else if (node.devices && node.devices.length == 1) {
            return { type: "value", nodes: node.devices[0], nodeType: "device" };
        } else {
            return { type: "value", nodes: node.nodeId, nodeType: node.type };
        }
    }

    if (node.type === "operator" && childrenExpression.length > 0) {
        if (childrenExpression.length > 1) {
            if (node.value === "&") {
                return { type: "conjunction", nodes: childrenExpression };
            } else if (node.value === "|") {
                return { type: "disjunction", nodes: childrenExpression };
            }
        } else {
            return childrenExpression[0];
        }
    } else if (childrenExpression.length > 0) {
        return childrenExpression[0];
    }
}

function expressionNodeIsEqual(nodeA, nodeB) {
    if (nodeA.type !== nodeB.type) {
        return false;
    }
    if (nodeA.type === "value") {
        return nodeA.nodes === nodeB.nodes;
    }
    if (nodeA.type === "conjunction" || nodeA.type === "disjunction") {
        if (nodeA.nodes.length !== nodeB.nodes.length) {
            return false;
        }
        for (let i = 0; i < nodeA.nodes.length; i++) {
            // It is assumed that subterms are sorted.
            if (expressionNodeIsEqual(nodeA.nodes[i], nodeB.nodes[i]) === false) {
                return false;
            }
        }
    }
    return true;
}

function simplifyExpressionTree(treeNode) {
    if (treeNode.type === "value") {
        return treeNode;
    }

    if (treeNode.type === "conjunction" || treeNode.type === "disjunction") {
        let nodes = [];
        for (let i = 0; i < treeNode.nodes.length; i++) {
            nodes.push(simplifyExpressionTree(treeNode.nodes[i]));
        }
        // Sort by length of subterm or alphabet
        nodes.sort(function(a, b) {
            if ((a.type === "conjunction" || a.type === "disjunction") && (b.type === "conjunction" || b.type === "disjunction")) {
                return a.nodes.length - b.nodes.length;
            } else if (a.type === "conjunction" || a.type === "disjunction") {
                return a.nodes.length - 1;
            } else if (b.type === "conjunction" || b.type === "disjunction") {
                return 1 - b.nodes.length;
            } else {
                return a.nodes < b.nodes ? -1 : 1;
            }
        });


        let uniqueNodes = [];
        uniqueNodes.push(nodes[0]);
        for (let i = 1; i < nodes.length; i++) {
            let unique = true;
            for (let j = 0; j < uniqueNodes.length; j++) {
                if (expressionNodeIsEqual(nodes[i], uniqueNodes[j]) === true) {
                    unique = false;
                }
            }
            if (unique) {
                uniqueNodes.push(nodes[i]);
            }
        }

        if (uniqueNodes.length === 1) {
            return uniqueNodes[0];
        }

        uniqueNodes.sort(function(a, b) {
            if ((a.type === "conjunction" || a.type === "disjunction") && (b.type === "conjunction" || b.type === "disjunction")) {
                return a.nodes.length - b.nodes.length;
            } else if (a.type === "conjunction" || a.type === "disjunction") {
                return a.nodes.length - 1;
            } else if (b.type === "conjunction" || b.type === "disjunction") {
                return 1 - b.nodes.length;
            } else {
                return a.nodes < b.nodes ? -1 : 1;
            }
        });


        return { type: treeNode.type, nodes: uniqueNodes };
    }


}

function applyAbsorptionExpressionTree(treeNode) {
    if (treeNode.type === "value") {
        return treeNode;
    }

    if (treeNode.type === "conjunction" || treeNode.type === "disjunction") {
        let nodes = [];
        for (let i = 0; i < treeNode.nodes.length; i++) {
            nodes.push(applyAbsorptionExpressionTree(treeNode.nodes[i]));
        }
        // Sort by length of subterm or alphabet
        nodes.sort(function(a, b) {
            if ((a.type === "conjunction" || a.type === "disjunction") && (b.type === "conjunction" || b.type === "disjunction")) {
                return a.nodes.length - b.nodes.length;
            } else if (a.type === "conjunction" || a.type === "disjunction") {
                return a.nodes.length - 1;
            } else if (b.type === "conjunction" || b.type === "disjunction") {
                return 1 - b.nodes.length;
            } else {
                return a.nodes < b.nodes ? -1 : 1;
            }
        });


        let uniqueNodes = [];
        uniqueNodes.push(nodes[0]);
        for (let i = 1; i < nodes.length; i++) {
            let unique = true;

            // Is other node conjunction?
            if (nodes[i].type === "conjunction") {
                for (let j = 0; j < uniqueNodes.length; j++) {
                    for (let k = 0; k < nodes[i].nodes.length; k++) {
                        // Check if value in conjunction is already present
                        if (expressionNodeIsEqual(nodes[i].nodes[k], uniqueNodes[j]) === true) {
                            unique = false;
                        }
                    }
                }
            }

            if (unique) {
                uniqueNodes.push(nodes[i]);
            }
        }

        if (uniqueNodes.length === 1) {
            return uniqueNodes[0];
        }

        uniqueNodes.sort(function(a, b) {
            if ((a.type === "conjunction" || a.type === "disjunction") && (b.type === "conjunction" || b.type === "disjunction")) {
                return a.nodes.length - b.nodes.length;
            } else if (a.type === "conjunction" || a.type === "disjunction") {
                return a.nodes.length - 1;
            } else if (b.type === "conjunction" || b.type === "disjunction") {
                return 1 - b.nodes.length;
            } else {
                return a.nodes < b.nodes ? -1 : 1;
            }
        });


        return { type: treeNode.type, nodes: uniqueNodes };
    }


}

// Bring horn clause to disj. normal form
function resolveExpressionTree(treeNode) {
    let outNode;
    if (treeNode.type === "conjunction") {
        let nodesA = [];
        for (let i = 0; i < treeNode.nodes.length; i++) {
            let n = resolveExpressionTree(treeNode.nodes[i]);
            if (n.type === "conjunction") {
                for (let j = 0; j < n.nodes.length; j++) {
                    nodesA.push(n.nodes[j]);
                }
            } else {
                nodesA.push(n);
            }
        }

        // Apply distributive law
        let nodesB = [];
        let nodesNotProcessed = [];
        for (let i = 0; i < nodesA.length; i++) {
            // is left term only a value or a subterm?
            if (nodesA[i].type === "conjunction" || nodesA[i].type === "disjunction") {
                for (let j = 0; j < nodesA[i].nodes.length; j++) {
                    // is right term only a value or a subterm?
                    if (nodesA[i + 1].type === "conjunction" || nodesA[i + 1].type === "disjunction") {
                        for (let k = 0; k < nodesA[i + 1].nodes.length; k++) {
                            nodesB.push({ type: "conjunction", nodes: [nodesA[i].nodes[j], nodesA[i + 1].nodes[k]] })
                        }
                    } else {
                        let tmpNodes = [];
                        tmpNodes.push(nodesA[i].nodes[j], nodesA[i + 1]);
                        let obj = { type: "conjunction", nodes: tmpNodes };
                        nodesB.push(obj)
                    }
                }
                i++; // Jump over second term
                // is right term only a value or a subterm?
            } else if (i + 1 < nodesA.length && (nodesA[i + 1].type === "conjunction" || nodesA[i + 1].type === "disjunction")) {
                for (let j = 0; j < nodesA[i + 1].nodes.length; j++) {
                    nodesB.push({ type: "conjunction", nodes: [nodesA[i], nodesA[i + 1].nodes[j]] })
                }
                i++;
            } else {
                nodesNotProcessed.push(nodesA[i]);
            }
        }

        if (nodesB.length === 0) {
            // Distributive law does not apply
            outNode = { type: "conjunction", nodes: nodesNotProcessed };

        } else {
            if (nodesNotProcessed.length > 0) {
                outNode = { type: "conjunction", nodes: nodesNotProcessed };
                outNode.nodes.push(nodesB);
            } else {
                outNode = { type: "disjunction", nodes: nodesB };
            }
        }


    } else if (treeNode.type === "disjunction") {
        let nodes = [];
        for (let i = 0; i < treeNode.nodes.length; i++) {
            let n = resolveExpressionTree(treeNode.nodes[i]);
            if (n.type === "disjunction") {
                for (let j = 0; j < n.nodes.length; j++) {
                    nodes.push(n.nodes[j]);
                }
            } else {
                nodes.push(n);
            }
        }
        outNode = { type: "disjunction", nodes: nodes };
    } else if (treeNode.type === "value") {
        return treeNode;
    } else {
        return null;
    }
    return outNode;
}

function stringifyExpressionTreeHTML(treeNode, parentType = '') {
    let out = "";
    if (treeNode.type === "conjunction") {
        out += stringifyExpressionTreeHTML(treeNode.nodes[0], treeNode.type);
        for (let i = 1; i < treeNode.nodes.length; i++) {
            out += " &and; " + stringifyExpressionTreeHTML(treeNode.nodes[i], treeNode.type);

            // apply distributive law


        }
    } else if (treeNode.type === "disjunction") {
        out += stringifyExpressionTreeHTML(treeNode.nodes[0], treeNode.type);
        for (let i = 1; i < treeNode.nodes.length; i++) {
            out += " &or; " + stringifyExpressionTreeHTML(treeNode.nodes[i], treeNode.type);
        }
    } else if (treeNode.type === "value") {
        return treeNode.nodes;
    } else {
        return "undefined";
    }

    // Set brackets only where necessary
    if (parentType !== "" && parentType !== treeNode.type) {
        out = "(" + out + ")";
    }

    return out;
}

function stringifyExpressionTreeCSV(treeNode, parentType = '') {
    let out = "";
    if (treeNode.type === "conjunction") {
        out += stringifyExpressionTreeCSV(treeNode.nodes[0], treeNode.type);
        for (let i = 1; i < treeNode.nodes.length; i++) {
            out += " ∧ " + stringifyExpressionTreeCSV(treeNode.nodes[i], treeNode.type);

            // apply distributive law


        }
    } else if (treeNode.type === "disjunction") {
        out += stringifyExpressionTreeCSV(treeNode.nodes[0], treeNode.type);
        for (let i = 1; i < treeNode.nodes.length; i++) {
            out += " ∨ " + stringifyExpressionTreeCSV(treeNode.nodes[i], treeNode.type);
        }
    } else if (treeNode.type === "value") {
        return treeNode.nodes;
    } else {
        return "undefined";
    }

    // Set brackets only where necessary
    if (parentType !== "" && parentType !== treeNode.type) {
        out = "(" + out + ")";
    }

    return out;
}

// Return list of values from expression tree including duplicates
function getExpressionTreeElements(treeNode) {
    let arr = [];
    if (treeNode.type === "value") {
        arr.push(treeNode)
    } else if (treeNode.type === "conjunction" || treeNode.type === "disjunction") {
        for (let i = 0; i < treeNode.nodes.length; i++) {
            let children = getExpressionTreeElements(treeNode.nodes[i]);
            for (let j = 0; j < children.length; j++) {
                arr.push(children[j]);
            }
        }
    }
    return arr;
}



function calculateAccessibilityScore(treeNode) {
    // Get elements from tree
    let elements = getExpressionTreeElements(treeNode);
    // Count occurrence and eliminate duplicates
    for (let i = 0; i < elements.length; i++) {
        elements[i].count = 1;
        for (let j = i + 1; j < elements.length; j++) {
            if (expressionNodeIsEqual(elements[i], elements[j])) {
                elements[i].count++;
                elements.splice(j, 1);
                j--;
            }
        }
    }

    return calculateAccessibilityScoreNode(treeNode, elements).toFixed(2);

}

function calculateAccessibilityScoreNode(treeNode, elements) {
    if (treeNode.type === "value") {
        return getAccessibilityValueByElement(treeNode, elements);
    } else if (treeNode.type === "conjunction") {
        // Calculate min
        let value = Number.MAX_SAFE_INTEGER;
        let tmpVal = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < treeNode.nodes.length; i++) {

            tmpVal = calculateAccessibilityScoreNode(treeNode.nodes[i], elements);
            if (tmpVal < value) {
                value = tmpVal
            };
        }

        return value;
    } else if (treeNode.type === "disjunction") {
        // Calculate SUM
        let value = 0;
        for (let i = 0; i < treeNode.nodes.length; i++) {
            value += calculateAccessibilityScoreNode(treeNode.nodes[i], elements);
        }
        return value;
    } else {
        return 0;
    }
}

function getAccessibilityValueByElement(treeNode, elements) {
    for (let i = 0; i < elements.length; i++) {
        if (expressionNodeIsEqual(treeNode, elements[i])) {
            return 1.0 / elements[i].count;
        }
    }
}

// Analysis


// Original account graph model for reference. Can be displayed together with certain statistics.
let analysis_originalModel = null;

// Array of account graphs. Relevant nodes must have the same IDs as in the original model.
let analysis_data = null;

let tmp_root = null;


$("input#formAnalysisOriginalModelFileInput").change(function(event) {
    const fileList = event.target.files;

    analysis_originalModel = null;
    $("button#btnFormAnalysisShowOriginalModel").hide();
    if (fileList.length > 0) {
        const file = fileList[0];
        if (file.type !== 'application/json') {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            let val = reader.result;
            if (val) {
                analysis_originalModel = JSON.parse(val);
                $("button#btnFormAnalysisShowOriginalModel").show();
            }
        });

        reader.readAsText(file)
    }
});


$("button#btnFormAnalysisShowOriginalModel").click(function(event) {
    $("div#graphLabel").html("Original Model");
    tmp_root = root;
    root = analysis_originalModel.graph;
    if (analysis_originalModel.devices) {
        deviceData = analysis_originalModel.devices;
    } else {
        deviceData = [];
    }

    updateDeviceList();
    update(root);
    // Call twice to get Ids
    update(root);
});

$("input#formAnalysisDataFileInput").change(function(event) {
    const fileList = event.target.files;

    if (fileList.length > 0) {
        const file = fileList[0];
        if (file.type !== 'application/json') {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            // Load 
            let val = reader.result;
            if (val) {
                analysis_data = JSON.parse(val);
                // Create clickable list of account graphs
            } else {
                analysis_data = null;
                // Remove clickable list of account graphs
            }
        });
        reader.readAsText(file)
    }
});