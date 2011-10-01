// weekend project, so it's pretty terrible!

var outgoingNoodles = {}; // filterBubble[id] -> noodle-element
var noodleConnections = {}; // filterBubble[id] -> filterBubble[id]
var connectionMap = {}; // filterBubble[id] -> [filterNode[id], parameter]
var reverseConnectionMap = {}; // filterNode[id] -> {I/O parameter name: filterBubble[id]}
var parameterMap = {}; // filterNode[id] -> {parameter: <input> element}
var currentID = 0, currentResultID = 0;
var masterInput;
var filterTypes = {}; // filterNode[id] -> filter object

var SVGNS = "http://www.w3.org/2000/svg";

function removeNoodle(id)
{
    if(id in outgoingNoodles)
    {
        outgoingNoodles[id].remove();

        $("#" + id).removeClass("filterBubbleConnected");
        $("#" + noodleConnections[id]).removeClass("filterBubbleConnected");

        if(id in noodleConnections)
        {
            delete noodleConnections[id];
        }

        delete outgoingNoodles[id];
    }

    updateFilter();
}

function newID()
{
    currentID++;
    return "id" + currentID;
}

function newResultID()
{
    currentResultID++;
    return "result" + currentResultID;
}

function connectNoodles(output, input)
{
    for(id in noodleConnections)
    {
        if(noodleConnections[id] == input)
        {
            return false;
        }
    }

    noodleConnections[output] = input;

    updateNoodles();

    updateFilter();

    return true;
}

function getConnectedElements(startId)
{
    function getChildren(id)
    {
        var children = [];

        for(paramName in reverseConnectionMap[id])
        {
            var ch = reverseConnectionMap[id][paramName];

            if(ch in noodleConnections)
            {
                //children.push(noodleConnections[ch]);
                children.push(connectionMap[noodleConnections[ch]][0]);
            }

            //children.push(ch);
        }

        return children;
    }

    var connectedElements = {}
    connectedElements[startId] = 1;
    var searchStack = [startId];

    while(searchStack.length)
    {
        var cid = searchStack.pop();
        var children = getChildren(cid);

        for(child in children)
        {
            var childId = children[child];
            if(!(childId in connectedElements))
            {
                connectedElements[childId] = 1;
                searchStack.push(childId);
            }
        }
    }

    return connectedElements;
}

function getToplevelElements()
{
    var toplevels = {};

    for(nodeName in reverseConnectionMap)
    {
        if(!("in" in reverseConnectionMap[nodeName]))
            toplevels[nodeName] = 1;
    }

    return toplevels;
}

function updateFilter()
{
    var filter = document.createElementNS(SVGNS, "filter");
    var resultIDForOutputBubbleId = {};
    var filterElementForFilterId = {};

    currentResultID = 0;

    filter.setAttribute("id", "filt");

    var reachableFilterElements = getConnectedElements(masterInput.attr("id"));
    var directlyReachableFilterElements = getConnectedElements(masterInput.attr("id"));
    var toplevels = getToplevelElements();
    for(var x in toplevels)
    {
        reachableFilterElements[x] = 1;

        var toplevelChildren = getConnectedElements(x);

        for(toplevelChild in toplevelChildren)
        {
            reachableFilterElements[toplevelChild] = 1;
        }
    }

    for(filterId in filterTypes)
    {
        if(!(filterId in reachableFilterElements))
            continue;

        var filterElement = document.createElementNS(SVGNS, filterTypes[filterId]["displayName"]);
        filterElementForFilterId[filterId] = filterElement;
        var resultId = newResultID();
        resultIDForOutputBubbleId[reverseConnectionMap[filterId]["result"]] = resultId;
        filterElement.setAttribute("result", resultId);
        filter.appendChild(filterElement);
    }

    for(filterId in filterTypes)
    {
        if(!(filterId in reachableFilterElements))
            continue;

        var filterElement = filterElementForFilterId[filterId];

        for(attrName in reverseConnectionMap[filterId])
        {
            if(attrName == "result")
                continue;

            var attrBubbleId = reverseConnectionMap[filterId][attrName];

            // this is bad!
            for(fromBubbleId in noodleConnections)
            {
                var toBubbleId = noodleConnections[fromBubbleId];
                if(toBubbleId == attrBubbleId)
                {
                    var resultID = resultIDForOutputBubbleId[fromBubbleId];
                    if(resultID)
                        filterElement.setAttribute(attrName, resultID);
                    else // add at the beginning if we have no input (yikes.)
                        filterElement.setAttribute(attrName, "SourceGraphic");
                        //$(filter).prepend($(filterElement));

                    break; // maybe not later
                }
            }

            if((attrName == "in" || attrName == "in2") && !filterElement.hasAttribute(attrName))
            {
                filterElement.setAttribute(attrName, "garbage");
            }
        }

        for(paramName in filterTypes[filterId]["parameters"])
        {
            filterElement.setAttribute(paramName, parameterMap[filterId][paramName].get(0).value);
        }

        var foundReferencingElement = reverseConnectionMap[filterId]["result"] in noodleConnections;

        // add at the end if we have no output (yikes.)
        if(!foundReferencingElement)
            $(filter).append($(filterElement));
    }

    // all this trying to get things in the right order is really icky, there's a better way

    if(filter.childNodes.length == 0)
    {
        // passthrough filter
        var filterElement = document.createElementNS(SVGNS, "feOffset");
        filter.appendChild(filterElement);
    }

    var a = getConnectedElements(masterInput.attr("id"));
    var b = " ";
    for(i in a)
    {
        b += i + " ";
        $(filter).append($(filterElementForFilterId[i]));
    }

    var orderedToplevels = [];

    for(var top in toplevels)
    {
        var topChildren = getConnectedElements(top);

        for(topChild in topChildren)
        {
            if(topChild in directlyReachableFilterElements)
            {
                break;
            }

            orderedToplevels.push(topChild);
        }
    }

    orderedToplevels.reverse();

    for(var top in orderedToplevels)
    {
        $(filter).prepend($(filterElementForFilterId[orderedToplevels[top]]));
    }

    $("#defs").empty();
    $("#defs").append(filter);

    //$("#previewContainer").html((new XMLSerializer()).serializeToString(filter).replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    //$("#previewContainer").html(b);
}

function updateNoodles()
{
    var editorOffset = $("#editor").offset();

    for(id in outgoingNoodles)
    {
        var noodleOffset = $("#" + id).offset();
        var destinationNoodleOffset = $("#" + noodleConnections[id]).offset();

        var deltaX = destinationNoodleOffset.left - noodleOffset.left;
        var deltaY = destinationNoodleOffset.top - noodleOffset.top;

        outgoingNoodles[id].css({
            left: noodleOffset.left - editorOffset.left + 6 + "px",
            top: noodleOffset.top - editorOffset.top + 6 + "px",

            height: Math.round(Math.sqrt(deltaY * deltaY + deltaX * deltaX)),
            webkitTransform: "rotate(" + (Math.atan2(deltaY, deltaX) - Math.PI/2) + "rad)"
        });
    }
}

function setupMasterInput()
{
    masterInput = $("<div class='filterNode'><div class='dragHandle'>Filter Input</div></div>");
    masterInput.attr("id", newID());

    var output = $("<div style='bottom: -8px;' class='filterBubble filterBubbleOut' />").appendTo(masterInput);
    connectionDrag(output);

    masterInput.css({top: "20px", left: "20px", position: "absolute"});

    editorFilterDrag(masterInput);
    masterInput.addClass("filterNodeLanded");
    masterInput.addClass("feMasterInput");

    connectionMap[output.attr("id")] = [masterInput.attr("id"), "result"];
    reverseConnectionMap[masterInput.attr("id")] = {"result": output.attr("id")};

    $("#editor").append(masterInput);
}

function connectionDrag(el)
{
    el.attr("id", newID());
    el.drag("start", function(ev, dd) {
        if(!el.hasClass("filterBubbleOut"))
            return false;

        var id = el.attr("id");
        removeNoodle(id);

        var proxy = $("<div class='noodle' />");
        $("#editor").append(proxy);
        outgoingNoodles[id] = proxy;
        var editorOffset = $("#editor").offset();
        var noodleOffset = $(this).offset();
        proxy.css({
            left: noodleOffset.left - editorOffset.left + 6 + "px",
            top: noodleOffset.top - editorOffset.top + 6 + "px",
        });
        $(this).addClass("filterBubbleConnected");
        return proxy;
    }).drag(function(ev, dd) {
        if(!el.hasClass("filterBubbleOut"))
            return false;
        var editorOffset = $("#editor").offset();
        $(dd.proxy).css({
            height: Math.sqrt(dd.deltaY * dd.deltaY + dd.deltaX * dd.deltaX),
            webkitTransform: "rotate(" + (Math.atan2(dd.deltaY, dd.deltaX) - Math.PI/2) + "rad)"
        });
    }).drag("end", function(ev, dd) {
        if(!el.hasClass("filterBubbleOut"))
            return false;

        var id = el.attr("id");
        var destinationId;
        var destination;
        var droppedOnBubble = false;
        var editorOffset = $("#editor").offset();

        var mouseX = dd.startX + dd.deltaX;
        var mouseY = dd.startY + dd.deltaY;

        $(".filterBubbleIn").each(function(index, el) {
            var bubbleOffset = $(el).offset();

            if(mouseX > bubbleOffset.left - 4 && mouseX < bubbleOffset.left + 16 && mouseY > bubbleOffset.top - 4 && mouseY < bubbleOffset.top + 16)
            {
                droppedOnBubble = true;
                destination = $(el);
                destinationId = destination.attr("id");
                return false;
            }
        });

        if (!droppedOnBubble || (destination.parent().attr("id") === $(this).parent().attr("id"))) {
            removeNoodle(id);
            return;
        }

        if(!connectNoodles(id, destinationId))
        {
            removeNoodle(id);
            return;
        }

        destination.addClass("filterBubbleConnected");
    });
}

function editorFilterDrag(el)
{
    el.drag("start", function() {
        $(this).appendTo(this.parentNode);
    }).drag(function(ev, dd) {
        $(this).css({
            top: Math.max(dd.offsetY, 5),
            left: Math.max(dd.offsetX, 5)
        });
        updateNoodles();
    }, {relative: true, handle: ".dragHandle"});
}

function removeFilter(filterName)
{
    $("#" + filterName).addClass("filterNodeRemoved");
    setTimeout("$('#" + filterName + "').remove();", 1000);

    for(var param in reverseConnectionMap[filterName])
    {
        removeNoodle(reverseConnectionMap[filterName][param]);
        removeNoodle(noodleConnections[reverseConnectionMap[filterName][param]]);

        for(var inBubble in noodleConnections)
            if(connectionMap[noodleConnections[inBubble]][0] == filterName)
                removeNoodle(inBubble);
    }

    for(var bubble in connectionMap)
    {
        if(connectionMap[bubble][0] == filterName)
        {
            delete connectionMap[bubble];
        }
    }

    delete reverseConnectionMap[filterName];
    delete parameterMap[filterName];
    delete filterTypes[filterName];

    updateNoodles();
    updateFilter();
}

function loadFilters(filters)
{
    function proxyWithParams(f)
    {
        var proxyId = newID();
        var proxy = $("<div class='filterNode'><div class='dragHandle'>" + f["name"] + "</div></div>");
        proxy.attr("id", proxyId);
        proxy.addClass(f["displayName"]);

        var closeButton = $("<div class='closeButton'></div>");
        closeButton.click({"id": proxyId}, function(ev) {removeFilter(ev.data["id"])});
        proxy.find(".dragHandle").append(closeButton);

        var parameterContainer = $("<table class='parameters'></table>");
        proxy.append(parameterContainer);

        filterTypes[proxy.attr("id")] = f;
        reverseConnectionMap[proxyId] = {};
        parameterMap[proxyId] = {};

        // eventually these need to be dynamic based on the filter

        var inputRight = 8;
        for(i in f["inputs"])
        {
            var input = $("<div class='filterBubble filterBubbleIn' />").appendTo(proxy).css({"right": inputRight, "top": -8});
            connectionDrag(input);
            inputRight += 24;
            var inputAttrName = f["inputs"][i];
            connectionMap[input.attr("id")] = [proxyId, inputAttrName];

            reverseConnectionMap[proxyId][inputAttrName] = input.attr("id");
        }

        var output = $("<div style='bottom: -8px;' class='filterBubble filterBubbleOut' />").appendTo(proxy);
        connectionDrag(output);
        connectionMap[output.attr("id")] = [proxyId, "result"];
        reverseConnectionMap[proxyId]["result"] = output.attr("id");

        for(paramName in f["parameters"])
        {
            var paramSettings = f["parameters"][paramName];
            var paramControl = $("<tr class='parameter'><td class='parameterName leftColumn'>" + paramSettings["name"] + "</td></tr>");
            var paramInput;

            parameterContainer.append(paramControl);

            if(paramSettings["type"] == "number" || paramSettings["type"] == "integer")
            {
                var step = 0.01;
                if(paramSettings["type"] == "integer")
                    step = 1;

                paramInput = $("<input class='rangeInput' type='range' step='" + step + "' min='" + paramSettings["min"] + "' max='" + paramSettings["max"] + "' value='" + paramSettings["default"] + "' />");
                paramInput.change(function() { updateFilter(); })
                var paramTd = $("<td class='rightColumn'/>");
                paramControl.append(paramTd.append(paramInput));
            }
            else if(paramSettings["type"] == "choice")
            {
                paramInput = $("<select class='selectInput' />");

                for(i in paramSettings["choices"])
                {
                    var currentChoice = paramSettings["choices"][i];

                    if(currentChoice == paramSettings["default"])
                        paramInput.append($("<option selected='selected'>" + currentChoice + "</option>"));
                    else
                        paramInput.append($("<option>" + currentChoice + "</option>"));
                }

                paramInput.change(function() { updateFilter(); })

                var paramTd = $("<td class='rightColumn'/>");
                paramControl.append(paramTd.append(paramInput));
            }
            else if(paramSettings["type"] == "color")
            {
                var d = paramSettings["default"].substring(4);
                d = d.substring(0, d.length - 1);
                dparts = d.split(",");
                redDefault = dparts[0];
                greenDefault = dparts[1];
                blueDefault = dparts[2];

                redInput = $("<input class='rangeInput' type='range' step='1' min='0' max='255' value='" + redDefault + "' />");
                greenInput = $("<input class='rangeInput' type='range' step='1' min='0' max='255' value='" + greenDefault + "' />");
                blueInput = $("<input class='rangeInput' type='range' step='1' min='0' max='255' value='" + blueDefault + "' />");
                redInput.change(function() { updateFilter(); })
                greenInput.change(function() { updateFilter(); })
                blueInput.change(function() { updateFilter(); })

                var paramTd = $("<td class='rightColumn'/>");
                paramTd.append(redInput);
                paramTd.append(greenInput);
                paramTd.append(blueInput);
                paramControl.append(paramTd);

                function ColorMerger(ri, gi, bi) {
                    var value = 0;

                    this.__defineGetter__("value", function(){
                        return "rgb(" + ri.get(0).value + ", "+ gi.get(0).value + ", " + bi.get(0).value + ")";
                    });

                    this.__defineSetter__("value", function(val){
                        value = val;
                    });

                    this.get = function (i) { return this; };
                }

                paramInput = new ColorMerger(redInput, greenInput, blueInput);
            }

            parameterMap[proxyId][paramName] = paramInput;
        }

        return proxy;
    }

    function listFilterProxyDrag(el)
    {
        var filterType = f;
        el.drag("start", function(ev, dd) {
            var proxy = proxyWithParams(filterType);
            $("#editor").prepend(proxy);
            return proxy;
        }).drag(function(ev, dd) {
            $(dd.proxy).css({
                top: dd.offsetY,
                left: dd.offsetX
            });
        }).drag("end", function(ev, dd) {
            var editorOffset = $("#editor").offset();
            $(dd.proxy).css({
                position: "absolute",
                left: Math.max(parseInt($(dd.proxy).css("left")) - editorOffset.left, 5) + "px",
                top: Math.max(parseInt($(dd.proxy).css("top")) - editorOffset.top, 5) + "px"
            });

            editorFilterDrag($(dd.proxy));
            $(dd.proxy).addClass("filterNodeLanded");
            $("#dragMessage").addClass("dragMessageClosed");
            $("#libraryList").addClass("noMessage");
            updateFilter();
        });
    }

    for(id in filters)
    {
        var f = filters[id];
        var filterListEntry = $("<li class='filter'><img src='images/" + f["icon"] + "'/><span class='filter-title'>" + f["name"] + "</span></li>");
        listFilterProxyDrag(filterListEntry);
        $("#libraryList").append(filterListEntry);
    }
}