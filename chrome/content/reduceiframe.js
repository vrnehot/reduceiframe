
"use strict";
//   Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
//   Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://reduceiframe/modules/utility.jsm");

     //nst LOAD_DOCUMENT_URI = Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI
const pref_BlockRefresh  = "accessibility.blockautorefresh"
const pref_StrictSchema  = "extensions.reduceiframe.stopJScriptSchema"
     //   nst CONSOLE_PREFERENCE = "extensions.reduceiframe.useConsole"
  //nst LOG_ALLOW_EVENT = "Javascript is allowed to run in further surfing. (event: '%s')"
  //nst LOG_DISALLOW  = "Javascript is disallowed for this page."

var gReduceIframe = null; // extra for gContextMenu from nsContextMenu 

//   START OVERLAY CODE chrome://browser/content/browser.xul

//   extra of gContextMenu of nsContextMenu.js
function menuReduceIframe(astrict, anurl)
{
    this.strict = astrict
    if(anurl) this._frameurl = anurl;
} //   prototype see below

menuReduceIframe.prototype = {
  _frameurl    : "about:blank",
  blank        : true,
  foronce      : true,
  strict       : false,
  
  setFrame : function(aframe) // like second construct
  {
     this._frameurl = aframe.location.href;
     this.blank = (this._frameurl.indexOf("about:blank") === 0);
     var thevalue = utilityRIframe.where(aframe);
     if(this.blank && (thevalue.length >> 1))
     {
          this._frameurl = thevalue;
          this.foronce = true;
     }
     return this._frameurl;
  },

//   oncommand="gReduceIframe.doCmd(gContextMenu, 'openFrame');"/>
  openFrame : function(aContextMenu)
  {
     if(this.strict) return false;
     if(this.foronce)
     try {
          this._openIntroFrame(aContextMenu.target.ownerDocument, "window");
     }
     catch (e) {
          Components.utils.reportError(e)
     }
     else return true;
     return false;
  },

//   oncommand="gReduceIframe.doCmd(gContextMenu, 'openFrameInTab');"/>
  openFrameInTab : function(aContextMenu)
  {
     if(this.strict) return false;
     if(this.foronce)
     try {
          urlSecurityCheck( this._frameurl,
                           aContextMenu.target.ownerDocument.nodePrincipal,
                           Components.interfaces.nsIScriptSecurityManager.DISALLOW_SCRIPT );
          this._openIntroFrame(aContextMenu.target.ownerDocument, "tab");
     }
     catch (e) {
          Components.utils.reportError(e)
     }
     else return true;
     return false;
  },
  
  doCmd : function(anobj, aperand)
  {
     if(aperand === "doCmd") return;
     let result = true;
     if(aperand in this)
          result = this[aperand](anobj);
     if(result) anobj[aperand]();
     return;
  },
  
//   oncommand="gReduceIframe.doCmd(gContextMenu, 'showOnlyThisFrame');"
  showOnlyThisFrame : function (aContextMenu)
  {
     let result = true;
     var thebrowser = aContextMenu.browser;
     if(thebrowser)
     try {
          urlSecurityCheck( this._frameurl,
                           thebrowser.contentPrincipal,
                           Components.interfaces.nsIScriptSecurityManager.DISALLOW_SCRIPT );
          result = false;
          thebrowser.loadURI(this._frameurl, null); // main charge
     }
     catch (e) {
          Components.utils.reportError(e)
     }
     return result;
  },

//	id="context-bookmarkframe" oncommand="gReduceIframe.sandboxLink(gContextMenu);"
  sandboxLink : function (aContextMenu) {
     try {
          var neowin = this._openExtraFrame(aContextMenu.target.ownerDocument);
          var thedocshell = neowin.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
               .getInterface(Components.interfaces.nsIWebNavigation)
               .QueryInterface(Components.interfaces.nsIDocShell);
               //   setSandbox :
          thedocshell.allowSubframes    = false;
          thedocshell.allowJavascript   = false;
          thedocshell.allowMetaRedirects= false;
          thedocshell.allowPlugins	= false;
     }
     catch (e) {
          Components.utils.reportError(e)
     }
  },
  
//  oncommand="gReduceIframe.reloadFrame(gContextMenu.target.ownerDocument);"
  reloadFrame : function(adoc)
  {
     if(this.foronce) adoc.location.href = this._frameurl;
          else adoc.location.reload();
  },
  
//   oncommand="gReduceIframe.eraseFrame(gContextMenu.target.ownerDocument);"
  eraseFrame : function(adoc)
  {
     if(adoc)
     try {
          var theframe = adoc.defaultView.frameElement;
          theframe.parentNode.removeChild(theframe);
     }
     catch (e) {
          Components.utils.reportError(e)
     }
  },

//   utility function, to open usual window as tab or detached
  _openIntroFrame : function (adoc, astyle)
  {
     var referrer = adoc.referrer;
     openLinkIn(this._frameurl, astyle,
          { charset: adoc.characterSet,
          referrerURI: referrer ? makeURI(referrer) : null });               
  },

//   open and return new window, original look in utilityOverlay.js call as openLinkIn
  _openExtraFrame : function (adocOrg)
  {
     var thewin = window || getTopWin(true);

     var sa = Cc["@mozilla.org/supports-array;1"].createInstance(Ci.nsISupportsArray);
     var wuri = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
          wuri.data = this._frameurl;

     let charset = null;
     if (adocOrg.characterSet) {
          charset = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
          charset.data = "charset=" + adocOrg.characterSet;
     }

     sa.AppendElement(wuri);
     sa.AppendElement(charset);
     //   sa.AppendElement(aReferrerURI); thedoc.referrer; ? documentURIObject
     return Services.ww.openWindow(thewin, getBrowserURL(), null, "chrome,dialog=no,all", sa);
  }
  
}	//	end of menuReduceIframe

//	menuitem id="context-openlinksandbox" oncommand="reduceIframe.sandboxLink(gContextMenu);" 

//   var gContextMenu 	from browser.js
//   menu id="frame" onpopupshowing="popReduceIframe(gContextMenu);" ...
function popReduceIframe(aContextMenu) //  return gReduceIframe
{     
     if(!(aContextMenu.target)) return null;
// dump("_dvk_dbg_,\t"); dump(LOG_SIGNATURE); dump("\n");
     var thedoc = aContextMenu.target.ownerDocument;
     if(!thedoc) return null; //  found gContextMenu then target document

     var thestrict = Services.prefs.getBoolPref(pref_StrictSchema);
     var theobj = new menuReduceIframe(thestrict);
          theobj.setFrame(thedoc); // main charge and return value
     var something = ((thedoc.documentURI.indexOf("about:") === 0) ? false : true) || (theobj.foronce);

     document.getElementById("context-viewframesource").setAttribute("disabled", theobj.blank);
     document.getElementById("context-saveframe").setAttribute("disabled", theobj.blank);
     document.getElementById("context-viewframeinfo").setAttribute("disabled", theobj.blank);

     document.getElementById("context-openframeintab").setAttribute("hidden", thestrict);
     document.getElementById("context-openframe").setAttribute("hidden", thestrict);
     if(!thestrict) document.getElementById("context-openframeintab").setAttribute("disabled", !(something));
     if(!thestrict) document.getElementById("context-openframe").setAttribute("disabled", !(something));

     // context-bookmarkframe is open in sandbox
     var thesandbox = document.getElementById("context-bookmarkframe");
     var thefirst = document.getElementById("context-showonlythisframe");
     if(thesandbox && thefirst)
     try {
          thesandbox.setAttribute("disabled", !(something));
          thefirst.parentNode.insertBefore(thesandbox, thefirst.nextSibling);
     } catch(e) { }
     
     // context-printframe is remove frame (possible only iframe)
     //   if(thetarget.tagName.toUpperCase() == "IFRAME")
     var thetarget = thedoc.defaultView.frameElement;
     if(thetarget)   // mutate print to erase
     if((thetarget.tagName) && (thetarget.parentNode))
          document.getElementById("context-printframe").removeAttribute("hidden");
     else thetarget = null;
     if(!thetarget) document.getElementById("context-printframe").setAttribute("hidden", "true");

     return theobj;
}

//   FINISH OVERLAY CODE chrome://browser/content/browser.xul

//   hereinafter, subsystem to erase the refresh position from http header, in re subdocument case.
var eraseRefresh = {
//   true when listen to "http-on-examine-response"
    _boolLively : false,

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
        if(this._boolLively)
           Services.obs.removeObserver(this, "http-on-examine-response");
        this._boolLively = false;
    },

    updateRegistery: function()
    {
        var thebool = Services.prefs.getBoolPref(pref_BlockRefresh);
        if(thebool) Services.obs.addObserver(this, "http-on-examine-response", false);
        else if(this._boolLively)
               Services.obs.removeObserver(this, "http-on-examine-response");
        this._boolLively = thebool;
    }
};

var reduceIframe = {

  startup: function() // Initialize the extension
  {
      dump("_dvk_dbg_, startup\n");
      eraseRefresh.updateRegistery();
      Services.prefs.addObserver(pref_BlockRefresh, this, false);

  //	load overlay for remove image and sandbox link
      if(document.loadOverlay)
      if(Services.prefs.getBoolPref("extensions.reduceiframe.removeImage"))
      {
	  document.getElementById("contentAreaContextMenu").addEventListener( "popupshowing",
	      function (e){
		  document.getElementById("context-removeimage").hidden = !(gContextMenu.onImage && gContextMenu.onLoadedImage);
		  document.getElementById("context-setDesktopBackground").hidden = true;
	      } );
      }

      if(document.loadOverlay)
      if(Services.prefs.getBoolPref("extensions.reduceiframe.sandboxLink"))
      {
	  document.getElementById("contentAreaContextMenu").addEventListener( "popupshowing",
	      function (e){
		  document.getElementById("context-openlinksandbox").hidden = !(gContextMenu.onLink);
	      }
	  );
      }

  },

  observe: function(asubject, atopic, adata)
  {
      if(atopic == "nsPref:changed")
      {
	  if(adata == pref_BlockRefresh)
	      eraseRefresh.updateRegistery();
      }
//	dump("_dvk_dbg_, subject:\t"); dump(asubject); dump("\n");
//      if(atopic == "xul-overlay-merged")	
  },

  shutdown: function()
  {
      Services.prefs.removeObserver(pref_BlockRefresh, this);
      eraseRefresh.unregister();
      dump("_dvk_dbg_, shutdown\n");
  },

  handleEvent: function( evt )
  {
      if(evt.type == "DOMContentLoaded")
      {
        return;
      }
        // load/unload the extension
      window.removeEventListener(evt.type, this, false);

      if (evt.type == "load")
      {
        this.startup();
//            window.addEventListener("DOMContentLoaded", this, true);
      }
      else
      {
//            window.addEventListener("DOMContentLoaded", this, true);
        this.shutdown();
      }
  }

};

 dump("_dvk_dbg,\tcontent listing is loaded.\n");

   window.addEventListener("load", reduceIframe, false);
   window.addEventListener("unload", reduceIframe, false);
