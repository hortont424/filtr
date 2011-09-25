var liveNodes = [];
var outgoingNoodles = {}; // filterBubble[id] -> noodle-element
var noodleConnections = {}; // filterBubble[id] -> filterBubble[id]
var parameterMap = {}; //filterBubble[id] -> [filterNode[id], parameter]
var currentID = 0;
var masterInput, masterOutput;

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

function updateFilter()
{
    var filterString = "";
    var nextFEId = masterInput.attr("id");

    for(fe in noodleConnections)
    {
        parameterFrom = parameterMap[fe];
        parameterTo = parameterMap[noodleConnections[fe]];
        filterString += parameterFrom[0] + "(" + parameterFrom[1] + ")" + " -> " + parameterTo[0] + "(" + parameterTo[1] + ")" + "; ";
    }

    $("#previewContainer").html(filterString);
}

function updateNoodles()
{
    for(id in outgoingNoodles)
    {
        var editorOffset = $("#editor").offset();
        var noodleOffset = $("#" + id).offset();
        var destinationNoodleOffset = $("#" + noodleConnections[id]).offset();

        var deltaX = destinationNoodleOffset.left - noodleOffset.left;
        var deltaY = destinationNoodleOffset.top - noodleOffset.top;

        outgoingNoodles[id].css({
            left: noodleOffset.left - editorOffset.left + 6 + "px",
            top: noodleOffset.top - editorOffset.top + 6 + "px",

            height: Math.sqrt(deltaY * deltaY + deltaX * deltaX),
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

    parameterMap[output.attr("id")] = [masterInput.attr("id"), "result"];

    $("#editor").append(masterInput);
}

function setupMasterOutput()
{
    masterOutput = $("<div class='filterNode'><div class='dragHandle'>Filter Output</div></div>");
    masterOutput.attr("id", newID());

    var output = $("<div style='top: -8px;' class='filterBubble filterBubbleIn' />").appendTo(masterOutput);
    connectionDrag(output);

    masterOutput.css({bottom: "20px", left: "20px", position: "absolute"});

    editorFilterDrag(masterOutput);
    masterOutput.addClass("filterNodeLanded");
    masterOutput.addClass("feMasterOutput");

    parameterMap[output.attr("id")] = [masterOutput.attr("id"), "in"];

    $("#editor").append(masterOutput);
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

function loadFilters(filters)
{
    function proxyWithParams(f)
    {
        var proxy = $("<div class='filterNode'><div class='dragHandle'>" + f["name"] + "</div></div>");
        proxy.attr("id", newID());

        // eventually these need to be dynamic based on the filter

        var inputRight = 8;
        for(i in f["inputs"])
        {
            var input = $("<div class='filterBubble filterBubbleIn' />").appendTo(proxy).css({"right": inputRight, "top": -8});
            connectionDrag(input);
            inputRight += 24;
            parameterMap[input.attr("id")] = [proxy.attr("id"), f["inputs"][i]];
        }

        var output = $("<div style='bottom: -8px;' class='filterBubble filterBubbleOut' />").appendTo(proxy);
        connectionDrag(output);
        parameterMap[output.attr("id")] = [proxy.attr("id"), "result"];

        return proxy;
    }

    function listFilterProxyDrag(el)
    {
        el.drag("start", function(ev, dd) {
            var proxy = proxyWithParams(f);
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