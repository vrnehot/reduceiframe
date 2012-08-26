"use strict";
//   hereinafter, subsystem to erase the refresh position from http header, 
//      in redirect subdocument case.

//  var EXPORTED_SYMBOLS = ["eraseRefresh"]
var EXPORTED_SYMBOLS = ["moduleRIframe"]

Components.utils.import("resource://gre/modules/Services.jsm")
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm")
Components.utils.import("resource://reduceiframe/modules/utility.jsm")

if ("undefined" == typeof(moduleRIframe))
{   //  it should be defined by an import line above.
    var moduleRIframe = { }
}   

//   hereinafter, subsystem to erase the refresh position from http header, in re subdocument case.
moduleRIframe.refresh = {

    preference  : "accessibility.blockautorefresh",

    //	for .utils.getWeakReference(
    QueryInterface: XPCOMUtils.generateQI([
                        Components.interfaces.nsISupports,
                        Components.interfaces.nsIObserver,
                        Components.interfaces.nsISupportsWeakReference   ]),

    httpResponse: function (achan)
    {
//    dump("_dvk_dbg_, module:    http-on-examine-response.\n");
	var thecode = 0;
        var thewindow = null;
        var thesource = null;
        try {
            thesource = achan.URI.spec;
            var thecallbacks = achan.notificationCallbacks || achan.loadGroup.notificationCallbacks;
            var thenRequestor = thecallbacks.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
            if(thenRequestor) thewindow = thenRequestor.getInterface(Components.interfaces.nsIDOMWindow);    
            thecode = achan.responseStatus;
	} catch (e) {}

        if(!(thewindow)) return;   //   some filters
        if((thecode < 200) || (400 < thecode)) return;
//        if(!(achan.loadFlags & LOAD_DOCUMENT_URI)) return;
        if(thewindow === thewindow.top) return; // needs sub document

        try { //     main charge
            if(achan.getResponseHeader("Refresh"))
               achan.setResponseHeader("Refresh", null, false);
            else thecode = 0;
	} catch (e) { thecode = 0; }

    if(thecode) moduleRIframe.report(thewindow, thesource, moduleRIframe.msgRefresh);

        return;
    },

    observe: function(asubject, atopic, data)
    {
        if(asubject)
        if(atopic === "http-on-examine-response")
        {
          var thechannel = asubject.QueryInterface(Components.interfaces.nsIHttpChannel);
          if(thechannel) this.httpResponse(thechannel);
        }
    },

    unregister: function()
    {
        try {
            Services.obs.removeObserver(this, "http-on-examine-response");
        } catch (e) { }
    },

    update: function()
    {
        if(Services.prefs.getBoolPref(this.preference))
            Services.obs.addObserver(this, "http-on-examine-response", true);
        else this.unregister();
    }
}
