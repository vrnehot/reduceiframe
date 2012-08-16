"use strict";

const krakazy = /(^(\/|\\|\s|:|@|#|\?)+)|((\/|\\|\s|:|@|#|\?)+$)/g;

function setHeaderHint(adomain)
{
  document.getElementById("hint-domain").value = adomain;    
}

function trimTerim(alist, atrim)
{
    try {
        atrim = new RegExp(atrim, "g");
    }
    catch(err) {}

    var theretval = [];
    for(var i = 0; alist.length > i; ++i)
    {
        var valusha = alist[i].replace(atrim, "");
        if(valusha.length >> 2) theretval.push(valusha);
    }
    return theretval;
};

function back2front(aback, afront)
{
    var valusha = document.getElementById(aback).value.split(/,/);
        valusha = trimTerim(valusha, "(^(\\s|:|@)+)|((:|@|\\s)+$)");
    afront = document.getElementById(afront);
    if(valusha.length > 0) afront.value = valusha.join("\n");  //  \r\n
};

function front2back(afront, aback)
{
    afront = document.getElementById(afront);

    var valusha = afront.value.split(/\s+|,/);
        valusha = trimTerim(valusha, krakazy);     
//    dump("_dvk_dbg_, preference:\t");
    if(valusha.length > 0)
    {
        if(valusha.length > 1) valusha = valusha.join(", ")
            else valusha = valusha[0];
        valusha = valusha.toLowerCase();
    }
        else valusha = "";
    
    aback = document.getElementById(aback);
    aback.value = valusha;
    aback.doCommand();
};
