//   hereinafter, subsystem to erase the refresh position from http header, 
//      in redirect subdocument case.

var EXPORTED_SYMBOLS = ["eraseRefresh"]

Components.utils.import("resource://gre/modules/Services.jsm")
Components.utils.import("resource://reduceiframe/modules/utility.jsm");
//nst LOAD_DOCUMENT_URI = Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI
//  pref_BlockRefresh  = "accessibility.blockautorefresh"

//   hereinafter, subsystem to erase the refresh position from http header, in re subdocument case.
var eraseRefresh = {
//    _boolLively : false,
    preference  : "accessibility.blockautorefresh",
    httpResponse: function (achan)
    {        
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

        if(thecode) utilityRIframe.report(thewindow, thesource, utilityRIframe.msgRefresh);

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
        Services.obs.removeObserver(this, "http-on-examine-response");
    },

    update: function()
    {
        if(Services.prefs.getBoolPref(this.preference))
             Services.obs.addObserver(this, "http-on-examine-response", false);
        else Services.obs.removeObserver(this, "http-on-examine-response");
    }
}
