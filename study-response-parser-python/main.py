import csv
import json
import result_parser
import models
import os
import argparse

parser = argparse.ArgumentParser(
                    prog='aag-scripts',
                    description='Parse data from CSV file and convert it into account access graphs.',
                    epilog='')

parser.add_argument('inputFile', help="CSV file containing the test results. The format correspond to the respective parser implementation.") 
parser.add_argument('-s', '--service', help="Choose one of the services for which a parser is implemented. Currently 'google' and 'apple'.")

parser.add_argument('--template', nargs='?', help="Indicate a JSON file for AAG templates with a subgraph to generate additional graphs based on the test data. This AAG MUST only include one sub graph object.")

args = parser.parse_args()
print(args)


def writeJSON(file, data):
    with open(file, "w") as outfile:
        json.dump(data, outfile, indent=2)

def processRow(row,service):
    id = result_parser.parse_index(row)

    graph = None
    template_graph = None

    if service == "google":
        account_setup = result_parser.parse_Google_account(row)
        graph = models.graph_from_file(
            "models/graph-google.json", account_setup["auth_nodes"], account_setup["devices"])
        #writeJSON("results/" + id + "-google.json", graph)
        graph["id"] = id
    elif service == "apple":
        account_setup = result_parser.parse_Apple_account(row)
        account_setup["id"] = id
        graph = models.graph_from_file(
            "models/graph-apple.json", account_setup["auth_nodes"], account_setup["devices"])
        #writeJSON("results/" + id + "-apple.json", graph)
        graph["id"] = id
    if not args.template == None:
        template_graph = models.graph_from_template(args.template, graph)
        template_graph["id"] = id
    return {service: graph, "template": template_graph}

with open(args.inputFile) as csv_file:

    service = args.service

    graphs_google = []
    graphs_apple = []
    graphs_template = []    

    # Read CSV file with study results
    csv_reader = csv.reader(csv_file, delimiter=',')

    # Iterate over table rows
    line_count = 0
    for row in csv_reader:
        if line_count == 0:
            line_count += 1
        else:
            result = processRow(row,service)
            if "google" in result:
                graphs_google.append(result["google"])
            if "apple" in result:
                graphs_apple.append(result["apple"])
            if "template" in result:
                graphs_template.append(result["template"])
            line_count += 1
    if service == "google":
        writeJSON("results/results_google.json", graphs_google)
    elif service == "apple":
        writeJSON("results/results_apple.json", graphs_apple)
    
    if not args.template == None:
        writeJSON("results/" + service +"_" + os.path.basename(args.template), graphs_template)
