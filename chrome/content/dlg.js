"use strict";

const krakazy = /(^(\/|\\|\s|:|@|#|\?)+)|((\/|\\|\s|:|@|#|\?)+$)/g;

function closeShadow(evt)
{
    window.removeEventListener("activate", closeShadow, false);
    if(window.arguments[1]) window.arguments[1].close();
}

function trimTerim(alist, atrim)
{
    try {
        atrim = new RegExp(atrim, "g");
    }
    catch(err) {}

    var theretval = [];
    for(let i = 0; alist.length > i; ++i)
    {
        let valusha = alist[i].replace(atrim, "");
        if(valusha.length >> 2)
        {
            let theval = valusha.replace(/^\.|\.$/g, "");
            let thetest = [ theval, ("." + theval), (theval + "."), ("." + theval + ".") ]
                .every( function(avalue) { return ((theretval.indexOf(avalue) + 1) === 0) } );
            if(thetest) theretval.push(valusha);
        }
    }
    return theretval;
};

function dlgLoad()
{
    const btn2tiptext = { extra1: "buttonlabelhelp", extra2: "buttonlabeldisclosure" }
    try {
        var thedlg = document.getElementById("pref-dlg");
        for (let index in btn2tiptext)
        {
            let theval = thedlg.getAttribute(btn2tiptext[index]);
            thedlg.getButton(index).tooltipText = theval;
        }
    }
    catch(err) {
        Components.utils.reportError(err)
    }

    back2front("back-list", "front-list");    
}

function back2front(aback, afront)
{
    var valusha = document.getElementById(aback).value.split(/,/);
        valusha = trimTerim(valusha, "(^(\\s|:|@)+)|((:|@|\\s)+$)");
    afront = document.getElementById(afront);
    if(valusha.length > 0) afront.value = valusha.join("\n");  //  \r\n
};

function front2back(afront, aback)
{
    let valusha = document.getElementById(afront).value;
        valusha = getInput(valusha);    
    aback = document.getElementById(aback);
    aback.value = valusha;
    aback.doCommand();
};

function getInput(avalue)
{
    let valusha = avalue.replace(/\.+/g, ".");
        valusha = valusha.split(/\s+|,/);
        valusha = trimTerim(valusha, krakazy);     
//    dump("_dvk_dbg_, preference:\t");
    if(valusha.length > 0)
    {
        if(valusha.length > 1) valusha = valusha.join(", ")
            else valusha = valusha[0];
        valusha = valusha.toLowerCase();
    }
        else valusha = "";
    return valusha;
}

function dlgApply(afront)
{
    try {
        let valusha = document.getElementById(afront).value;
            valusha = getInput(valusha);
        document.getElementById("pref-list").valueFromPreferences = valusha;
//      front2back("front-list", "back-list");
    }
    catch(err) {
        Components.utils.reportError(err)
    }

    back2front("back-list", "front-list");
};
