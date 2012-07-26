
var EXPORTED_SYMBOLS = ["utilityRIframe"]

Components.utils.import("resource://gre/modules/Services.jsm");

const logSIGNATURE  = "Subdocument content policy component."
const logRefresh    = "The refresh position have been removed from the http header."
const rdf_em_id     = "reduceiframe@mozdev.org"

var utilityRIframe = {
  msgRefresh : logRefresh,
  SIGNATURE : logSIGNATURE,
  id        : rdf_em_id,

  report : function(awin, auri, areport, avalue)
  {
    awin = awin.top;
    if(Services.prefs.getBoolPref("extensions.reduceiframe.useConsole"))
    try {
        awin.console.info(logSIGNATURE);
        awin.console.group("uri: ", auri);
        try {
            if(avalue) awin.console.info(areport, avalue)
                else awin.console.info(areport);
        }
        finally { awin.console.groupEnd() }
     }
     catch(e) { }
  },
  
  //    in: document, target uri
  //    out: false if "about:blank" and first time
  verify : function(adoc, atarget)
  {
    if(adoc.documentURI != "about:blank") return true;

    var thelem = adoc.getElementById("idReduceIframe");
    if(thelem)
        if(thelem.title == atarget)
            return true;

    return false;
  },

  append : function(adoc, atarget)
  {
    var thelem = adoc.getElementById("idReduceIframe");
    if(!thelem)
    {
        thelem = adoc.createElement("COMMENT");
        thelem.setAttribute("id", "idReduceIframe");
        adoc.body.appendChild(thelem);
    }
    thelem.setAttribute("title", atarget);
  },
  
  where : function(adoc)
  {
    var thelem = adoc.getElementById("idReduceIframe");
    if(thelem) return thelem.title || ""
        else return "";
  }

}
