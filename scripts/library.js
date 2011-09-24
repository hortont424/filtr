var liveNodes = [];
var outgoingNoodles = {}; // filterBubble[id] -> noodle-element
var currentID = 0;

function removeNoodle(id)
{
    if(id in outgoingNoodles)
    {
        outgoingNoodles[id].remove();
    }

    $("#" + id).removeClass("filterBubbleConnected");
}

function newID()
{
    currentID++;
    return "id" + currentID;
}

function updateNoodles()
{
    for(id in outgoingNoodles)
    {
        var editorOffset = $("#editor").offset();
        var noodleOffset = $("#" + id).offset();
        outgoingNoodles[id].css({
            left: noodleOffset.left - editorOffset.left + 7 + "px",
            top: noodleOffset.top - editorOffset.top + 7 + "px"
        });

        // need to keep rotation/destination distance working too
    }
}

function loadFilters(filters)
{
    function editorFilterDrag(el)
    {
        el.drag(function(ev, dd) {
            $(this).css({
                top: dd.offsetY,
                left: dd.offsetX
            });
            updateNoodles();
        }, {relative: true, handle: ".dragHandle"});
    }

    function proxyWithName(name)
    {
        var proxy = $("<div class='filterNode'><div class='dragHandle'>" + name + "</div></div>");

        // eventually these need to be dynamic based on the filter
        var input = $("<div style='position: absolute; right: 5px; top: 5px;' class='filterBubble' />").appendTo(proxy);
        var output = $("<div style='position: absolute; right: 5px; bottom: 5px;' class='filterBubble' />").appendTo(proxy);

        connectionDrag(input);
        connectionDrag(output);

        return proxy;
    }

    function connectionDrag(el)
    {
        el.attr("id", newID());
        el.drag("start", function(ev, dd) {
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
            var editorOffset = $("#editor").offset();
            $(dd.proxy).css({
                height: Math.sqrt(dd.deltaY * dd.deltaY + dd.deltaX * dd.deltaX),
                webkitTransform: "rotate(" + (Math.atan2(dd.deltaY, dd.deltaX) - Math.PI/2) + "rad)",
            });
        }).drag("end", function(ev, dd) {
            var id = el.attr("id");
            removeNoodle(id);
        });
    }

    function listFilterProxyDrag(el)
    {
        el.drag("start", function(ev, dd) {
            var proxy = proxyWithName(f["name"]);
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
                left: parseInt($(dd.proxy).css("left")) - editorOffset.left + "px",
                top: parseInt($(dd.proxy).css("top")) - editorOffset.top + "px"
            });

            editorFilterDrag($(dd.proxy));
            $(dd.proxy).addClass("filterNodeLanded");
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