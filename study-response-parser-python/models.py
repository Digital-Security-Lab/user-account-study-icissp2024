import json


def loadJSON(file):
    f = open(file)
    data = json.load(f)
    f.close()
    return data

def contains_nodeId(nodeId, auth_nodes=[]):
    for i, node in enumerate(auth_nodes):
        if node["nodeId"] == nodeId:
            return i
    return -1

def process_node(node, auth_nodes=[]):
    if not "children" in node.keys() or len(node["children"]) == 0:
        # Verify if node exists in auth_nodes
        index = contains_nodeId(node["nodeId"], auth_nodes)
        if index > -1:
            if "devices" in auth_nodes[index]:
                node["devices"] = auth_nodes[index]["devices"]
            return node
        else:
            return None
    else:

        children = []
        for i, _ in enumerate(node["children"]):
            result = process_node(node["children"][i], auth_nodes)
            if not result == None:
                children.append(result)
        # Sanitize graph from unnecessary leaf nodes
        if len(children) == 0 and node["type"] == "operator":
            return None

        node["children"] = children
        return node
    
def process_template(node, subgraph):
    if not "children" in node.keys() or len(node["children"]) == 0:
        # If is leaf node and is type graph, replace with subgraph
        if node["type"] == "graph":
            return subgraph
        else:
            return node
    else:
        children = []
        for i, _ in enumerate(node["children"]):
            result = process_template(node["children"][i], subgraph)
            if not result == None:
                children.append(result)
        # Sanitize graph from unnecessary leaf nodes
        if len(children) == 0 and node["type"] == "operator":
            return None

        node["children"] = children
        return node


def graph_from_file(file, auth_nodes=[], devices=[]):
    modelData = loadJSON(file)

    # Iterate over children, remove leaf nodes that do not appear in auth_nodes and create device mapping
    modelData["graph"] = process_node(modelData["graph"], auth_nodes)

    modelData["devices"] = devices
    return modelData

def graph_from_template(file, subgraph):
    templateData = loadJSON(file)

    # Iterate over children, remove leaf nodes that do not appear in auth_nodes and create device mapping
    templateData["graph"] = process_template(templateData["graph"], subgraph["graph"])

    templateData["devices"] = subgraph["devices"]
    return templateData
