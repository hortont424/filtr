function loadFilters(filters)
{
    function editorFilterDrag(el)
    {
        el.drag(function(ev, dd) {
            $(this).css({
                top: dd.offsetY,
                left: dd.offsetX
            });
        }, {relative: true, handle: ".dragHandle"});
    }

    function proxyWithName(name)
    {
        return $("<div class='filterNode'><div class='dragHandle'>" + name + "</div><div style='position: absolute; right: 5px; top: 5px;' class='filterBubble filterBubbleIn' /><div style='position: absolute; right: 5px; bottom: 5px;' class='filterBubble filterBubbleOut' /></div>");
    }

    function listFilterProxyDrag(el)
    {
        el.drag("start", function(ev, dd) {
            var proxy = proxyWithName(f["name"]);
            $("#editor").append(proxy);
            return proxy;
        }).drag(function(ev, dd) {
            $(dd.proxy).css({
                top: dd.offsetY,
                left: dd.offsetX
            });
        }).drag("end", function(ev, dd){
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