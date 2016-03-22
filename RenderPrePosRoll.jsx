var validprops = ["title", "subtitle", "persons", "id", "position", "license", "abstract", "description", "slug"];
var PreRoll = null;  //Title Precomp
var PostRoll = null;  //Speaker Precomp
var events = [];
var templateBackup = {};
var comps = [];
var maxlength = {
    title: 57,
    subtitle: 65,
    deflt: 50
};
var posShift = {
    title: [{
        name: '$subtitle',
        x: 0,
        y: 80
    }]
}
var onlyone = false;
var outTmplt = "XDCAM HD 1080p25";
var videoSuffix = ".mxf";

for (var i=1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem) {
        if (item.name == "PreRoll") PreRoll = item;
        if (item.name == "PostRoll") PostRoll = item;
    }
}

if (PreRoll == null) {
    alert ("Unable to find PreRoll comp", "ERROR", true);
} else {
    loadSchedule();
    var outdir = null
    if ($.getenv("OUTPUTDIR") !== null) {
        outdir =  new Folder($.getenv("OUTPUTDIR"));
    } else {
        outdir =  Folder.selectDialog ("Preroll Output Dir");
    }
    if ( outdir == null && !(outdir instanceof Folder) ) {
        alert("no output directory selected", "ERROR", true);
    } else {
        renderPreRuns(outdir.absoluteURI);
    }
}

function loadSchedule() {
    var sfile = null, schedule = null;
    if ($.getenv("SCHEDULEXML") !== null) {
        sfile = new File($.getenv("SCHEDULEXML"));
    } else {
        sfile = File.openDialog (prompt, "Frab schedule.xml:*.xml", false);
    }
    if (sfile == null) {
        alert("no schedule.xml file selected", "ERROR", true);
        return false;
    } else {
        if (!sfile.open("r")) {
            alert("no schedule.xml file selected", "ERROR", true);
            return false;
        } else {
            sfile.encoding = 'UTF-8';
            schedule = XML(sfile.read());
            if ("conference" in schedule && "title" in schedule.conference && "day" in schedule) {
                //$.writeln("Loaded frab schedule.xml for \"" + schedule.conference.title + "\" !");
                for (var i=0; i < schedule.day.length(); i++) {
                    //$.writeln("Loading Day: " + schedule.day[i].@index);
                    if ("room" in schedule.day.child(i)) {
                        for(var ii=0; ii < schedule.day[i].room.length(); ii++) {
                             //$.writeln("Loading Room: " + schedule.day[i].room[ii].@name);
                            if ("@name" in schedule.day[i].room[ii] && "event" in schedule.day[i].room[ii]) {
                                for (var iii=0; iii < schedule.day[i].room[ii].event.length(); iii++) {
                                    if ("title" in schedule.day[i].room[ii].event[iii]) {
                                        var event = schedule.day[i].room[ii].event[iii];
                                        var e = {
                                            id: event.@id.toString(),
                                            guid: event.@guid.toString(),
                                        };
                                        for (var iprop in validprops) {
                                            var prop = validprops[iprop];
                                            if (event.child(prop) != "" || event[prop].length() > 1) {
                                                if (prop == "persons") {
                                                    e[prop] = [];
                                                    for (var iprsns = 0; iprsns < event[prop].length(); iprsns++) {
                                                        e[prop].push(event[prop].child(iprsns).toString());
                                                    }
                                                } else {
                                                    e[prop] = event[prop].toString();
                                                }
                                            }
                                        }
                                        
                                        events.push(e);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    //schedule parsed
    //$.writeln("Loaded " + events.length + " events from schedule.xml");
    return events;
}

function renderPreRuns(outpath) {
    //$.writeln("Starting Batch Render outputdir: " + outpath);
    //disable all elements currently in the renerqueue
    for (var i = 1; i <= app.project.renderQueue.items; i++) {
        if (app.project.renderQueue.item(i).status !== RQItemStatus.DONE) {
            app.project.renderQueue.item(i).render = false;
        }
    }
    for (var i in events) {
        if ( "id" in events[i] && "persons" in events[i] ) {
            var event = events[i];
            var outfile = new File(outpath + "/" + event.id + videoSuffix);
            if (outfile.exists) {
                //$.writeln("Event " + event.id  + " allready rendered skipping ...");
                continue;
            }
            //$.writeln("Rendering event " + event.id);
            template(event);
            var rqi = app.project.renderQueue.items.add(PreRoll);
            rqi.render = true;
            rqi.applyTemplate("Best Settings");
            rqi.outputModule(1).applyTemplate(outTmplt);
            if (rqi.numOutputModels < 1) {
            }    
            rqi.outputModule(1).file = outfile;
            app.project.renderQueue.render();
            templateRestore();
            if (onlyone) break;
        }
    }
}

function template(event) {
    if ( event == null || !( "title" in event && "persons" in event ) ) {
        alert("Invalid event object passed, cannot run template engine", "ERROR", true);
        return false;
    }
    
    for (var ic=1; ic <= app.project.numItems; ic++) {
        var item = app.project.item(ic);
        if (item instanceof CompItem) {
            for (var il=1; il <= item.numLayers; il++) {
                var layer = item.layer(il);
                if (layer instanceof TextLayer && layer.name.substr(0,1) == '$') {
                    var prop = layer.name.substr(1).toLowerCase();
                    if ( isValidprop(prop) ) {
                        //create backup object for comp if it doesnt exist.
                        if (typeof templateBackup[item.name] == "undefined") templateBackup[item.name] = {};
                        //create backup object for layer if it doesnt exist.
                        if (typeof templateBackup[item.name][layer.name] == "undefined") templateBackup[item.name][layer.name] = {};
                        
                        var textDoc =  layer.property("Source Text").value;
                        //create backup for text if it doesnt exist.
                        if (typeof templateBackup[item.name][layer.name].txt == "undefined") {
                            templateBackup[item.name][layer.name].txt = textDoc;
                        }
                        var newText = new TextDocument("");
                        if ( typeof event[prop] == "string") {
                            var mlen = (typeof maxlength[prop] == "undefined") ? maxlength.deflt : maxlength[prop];
                            if (event[prop].length <= mlen) {
                                newText.text = event[prop];
                            } else {
                                var txt = event[prop];
                                var mtxt =  "";
                                while (txt.length > mlen) {
                                    newlineloop:
                                    for (var ti = 0; ti <= mlen; ti++) {
                                        if (txt.charAt(mlen-ti) == " ") {
                                            mtxt += txt.substr(0,mlen-ti) + "\n";
                                            txt = txt.substr(mlen-ti+1);
                                            break newlineloop;
                                        } else if (false && txt.length > (mlen+ti) && txt.charAt(mlen+ti) == " ") {
                                            mtxt += txt.substr(0,mlen+ti) + "\n";
                                            txt = txt.substr(mlen+ti+1);
                                            break newlineloop;
                                        }
                                    }
                                    if (typeof posShift[prop] == "object" && posShift[prop] instanceof Array && posShift[prop].length > 0) {
                                        pshiftloop:
                                        for (var ipos in posShift[prop]) {
                                            if ('name' in posShift[prop][ipos]) {
                                                var tgt = null;
                                                tgtloop:
                                                for (var itl=1; itl <= item.numLayers; itl++) {
                                                    if (item.layer(itl).name == posShift[prop][ipos].name) {
                                                        tgt = item.layer(itl);
                                                        break tgtloop;
                                                    }
                                                }
                                                if (tgt === null) continue pshiftloop;
                                                var x = (typeof posShift[prop][ipos].x == 'number') ? posShift[prop][ipos].x : 0;
                                                var y = (typeof posShift[prop][ipos].y == 'number') ? posShift[prop][ipos].y : 0;
                                                var z = (typeof posShift[prop][ipos].z == 'number') ? posShift[prop][ipos].z : 0;
                                                //create backup object for layer if it doesnt exist.
                                                if (typeof templateBackup[item.name][tgt.name] == "undefined") templateBackup[item.name][tgt.name] = {};
                                                // save position of target element
                                                if (typeof templateBackup[item.name][tgt.name].position== "undefined") {
                                                    templateBackup[item.name][tgt.name].position = tgt.property("position").value;
                                                }
                                                x += tgt.property("position").value[0];
                                                y += tgt.property("position").value[1];
                                                z += tgt.property("position").value[2];
                                                x = tgt.property("position").setValue([x, y, z]);
                                            }
                                        }
                                    }
                                }
                                mtxt += txt;
                                newText.text = mtxt;
                            }
                        } else if ( typeof event[prop] == "object" && "join" in event[prop]) {
                            newText.text = event[prop].join(', ');
                        }
                        layer.property("Source Text").setValue(newText);
                   }
                }
            }
        }
    }
}

function templateRestore() {
    for (var ic=1; ic <= app.project.numItems; ic++) {
        var item = app.project.item(ic);
        if (item instanceof CompItem && typeof templateBackup[item.name] !== "undefined" && templateBackup[item.name] !== null) {
            for (var lname in templateBackup[item.name]) {
                if (templateBackup[item.name][lname] !== null && typeof templateBackup[item.name][lname] === "object" ) {
                    var tgt = null;
                    for (var itl=1; itl <= item.numLayers; itl++) {
                        if (item.layer(itl).name == lname) {
                            tgt = item.layer(itl);
                            break;
                        }
                    }
                    if (tgt === null) continue;
                    if ("txt" in templateBackup[item.name][lname]) {
                        tgt.property("Source Text").setValue(templateBackup[item.name][lname].txt);
                    }
                    if ("position" in templateBackup[item.name][lname]) {
                        tgt.property("position").setValue(templateBackup[item.name][lname].position);
                    }
                    templateBackup[item.name][lname] = null;
                }
            }
            templateBackup[item.name] = null;
        }
    }
    templateBackup = {};
}
        

function isValidprop(prop) {    
    for (var i in validprops) {
        if (prop === validprops[i]) {
            return true
        }
    }
    return false;
}