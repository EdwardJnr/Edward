// Places product photos into the catalogue's image frames.
// Each image frame is named with its Item No. Name photos the same way
// (e.g. 900671.jpg, "WB271 WHITE.png"); replace "/" in an Item No with "-".
// Run from InDesign: Window > Utilities > Scripts, then double-click this file.
#target indesign
(function () {
    var doc = app.activeDocument;
    var folder = Folder.selectDialog("Choose the folder of product photos");
    if (!folder) return;
    var exts = ["jpg", "jpeg", "png", "tif", "tiff", "psd", "ai", "eps", "pdf"];
    var placed = 0, missing = [];
    var items = doc.allPageItems;
    for (var i = 0; i < items.length; i++) {
        var f = items[i];
        if (f.constructor.name !== "Rectangle" || !f.name || f.name === "") continue;
        var base = f.name.replace(/\//g, "-");
        var file = null;
        for (var e = 0; e < exts.length && !file; e++) {
            var c = File(folder.fsName + "/" + base + "." + exts[e]);
            if (c.exists) file = c;
            var u = File(folder.fsName + "/" + base + "." + exts[e].toUpperCase());
            if (!file && u.exists) file = u;
        }
        if (!file) { missing.push(f.name); continue; }
        f.place(file);
        f.fit(FitOptions.PROPORTIONALLY);
        f.fit(FitOptions.CENTER_CONTENT);
        f.fillColor = doc.swatches.itemByName("None");
        placed++;
    }
    alert("Placed " + placed + " images.\nNo photo found for " + missing.length + " items" +
          (missing.length ? ":\n" + missing.slice(0, 40).join(", ") + (missing.length > 40 ? " …" : "") : "."));
})();
