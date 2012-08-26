"use strict";
//   Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
//   Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://reduceiframe/modules/utility.jsm")
Components.utils.import("resource://reduceiframe/modules/refresh.jsm")
//	Components.utils.import("resource://gre/modules/AddonManager.jsm");  
Components.utils.import("chrome://reduceiframe/locale/utility.jsm")

  //nst pref_StrictSchema  = "extensions.reduceiframe.stopJScriptSchema"
     //   nst CONSOLE_PREFERENCE = "extensions.reduceiframe.useConsole"
  //nst LOG_ALLOW_EVENT = "Javascript is allowed to run in further surfing. (event: '%s')"
  //nst LOG_DISALLOW  = "Javascript is disallowed for this page."

var gReduceIframe = null; // extra for gContextMenu from nsContextMenu 

//   START OVERLAY CODE chrome://browser/content/browser.xul

//   extra of gContextMenu of nsContextMenu.js
function menuReduceIframe()
  {	} //   prototype see below

menuReduceIframe.prototype = {
  _frameurl	: "about:blank",
  blank		: true,
  foronce	: true,
  sandbox	: false,

  setFrame : function(aframe) // like second construct
  {
     this._frameurl = aframe.location.href;
     this.blank = (this._frameurl.indexOf("about:blank") === 0);
     var thevalue = moduleRIframe.where(aframe);
     if(this.blank && (thevalue.length >> 1))
     {
          this._frameurl = thevalue;
          this.foronce = true;
     }

     return this._frameurl;
  },

  getVirtualUrl : function(adoc)
  {
     if(this.foronce) return this._frameurl
      else return adoc.domain;
  },

//   oncommand="gReduceIframe.doCmd(gContextMenu, 'openFrame');"/>
  openFrame : function(aContextMenu)
  {
    var retval = false;	// stop propagate
    try {
	if(this.sandbox) this.sandboxLink(aContextMenu)
	else
	  if(this.foronce)
	      this._openIntroFrame(aContextMenu.target.ownerDocument, "window");
	  else retval = true;
    }
    catch (e) {
        Components.utils.reportError(e)
    }
    return retval;
  },

//   oncommand="gReduceIframe.doCmd(gContextMenu, 'openFrameInTab');"/>
  openFrameInTab : function(aContextMenu)
  {
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
  sandboxLink : function (aContextMenu)
  {
      var neowin = this._openExtraFrame(aContextMenu.target.ownerDocument);
      var thedocshell = neowin.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
	   .getInterface(Components.interfaces.nsIWebNavigation)
	   .QueryInterface(Components.interfaces.nsIDocShell);
	   //   setSandbox :thedocshell.allowSubframes    = false;
      thedocshell.allowJavascript   = false;
      thedocshell.allowMetaRedirects= false;
      thedocshell.allowPlugins	= false;
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
    //	getBrowserURL(): "chrome://browser/content/browser.xul"
     return Services.ww.openWindow(thewin, getBrowserURL(), null, "chrome,dialog=no,all", sa);
  }
  
}	//	end of menuReduceIframe
//   FINISH OVERLAY CODE chrome://browser/content/browser.xul

//	var reduceIframe = {
menuReduceIframe.main = {
  suspend: false,
  dlg	 : null,

  //menuitem id="context-bookmarkframe" value="chrome://reduceiframe/content/dlg.xul"
  openDlg: function(amenuitem, adoc)
  {
    const placeholder = ",{attr}={value}";
    const position = { screenX: "left", screenY: "top",
	    outerWidth: "outerWidth", outerHeight: "outerHeight" };
    var	thattr = "chrome,titlebar,dependent,resizable,close,centerscreen";

    let thurl = adoc.domain;
    if(gReduceIframe) thurl = gReduceIframe.getVirtualUrl(adoc);
      thurl = thurl.replace(/(#|\?).*$/, "").toLowerCase(); // cut hash and query
      thurl = thurl.replace(/^.*:\/\/+/, "");	// trim prefix ://

    var theshadow = null;
    if(this.dlg) // dlg exists but another frame
      if(this.dlg.closed) this.dlg = null
      else if(!(this.dlg.arguments) || (this.dlg.arguments[0] != thurl))
    {
	var summary = "";	// thattr += ",top=" + this.dlg.screenY;
	for (let index in position)
	{
	    let theval = placeholder.replace("{attr}", position[index]);
	    summary += theval.replace("{value}", this.dlg[index]);
	}
	thattr = thattr.replace(",centerscreen", summary);
	
	theshadow = this.dlg;
	this.dlg = null; // ! close() then !
    }

    if(this.dlg) this.dlg.focus()
      else {
	  let thename = amenuitem.label + Date.now();
	  this.dlg = window.openDialog( amenuitem.value, // url
				       thename,	// quasy name
				       thattr,	// attribute
				    thurl, theshadow); // strong args
      }
  },

//   var gContextMenu 	from browser.js
//   menu id="frame" onpopupshowing="popReduceIframe(gContextMenu);" ...
  popupshow: function(aContextMenu) //  return gReduceIframe
  {     
     if(!(aContextMenu.target)) return null;
// dump("_dvk_dbg_,\t"); dump(LOG_SIGNATURE); dump("\n");
     var thedoc = aContextMenu.target.ownerDocument;
     if(!thedoc) return null; //  found gContextMenu then target document

     var theobj = new menuReduceIframe();
          theobj.setFrame(thedoc); // main charge and return value
     var something = ((thedoc.documentURI.indexOf("about:") === 0) ? false : true) || (theobj.foronce);

     try {
      document.getElementById("context-viewframesource").setAttribute("disabled", theobj.blank);
      document.getElementById("context-saveframe").setAttribute("disabled", theobj.blank);
      document.getElementById("context-viewframeinfo").setAttribute("disabled", theobj.blank);
      document.getElementById("context-openframeintab").setAttribute("disabled", !(something));
      document.getElementById("context-openframe").setAttribute("disabled", !(something));
      let theval = Services.prefs.getBoolPref("extensions.reduceiframe.stopOnlyXSite");
      document.getElementById("context-bookmarkframe").setAttribute("disabled", !(theval));
     } catch(e) { }

     try {	// New Window <-> Sandbox
	let index = Services.prefs.getIntPref("extensions.reduceiframe.menuSandbox");
	  if(index) {
	    theobj.sandbox = true;
	    index = 1;
	  }
	let thenode = document.getElementById("context-openframe");
	  if(thenode.value != index)
	  {
	      thenode.setAttribute("label", localizeRIframe.label[index]);
	      thenode.setAttribute("accesskey", localizeRIframe.key[index]);
	      thenode.setAttribute("value", index);
	  }
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
  },
  
    //	resume \ suspend subsystem
  onOperationCancelled: function(anaddon)
  {
      if(this.suspend && !(anaddon.userDisabled))
      if(anaddon.id === moduleRIframe.id)
      try {	//	.pendingOperations ?
  //    dump("_dvk_dbg_, onOperationCancelled:\t"); dump(anaddon.id); dump("\n");
	  this.startup();
	  this.suspend = false;
      }
      catch (e)
      {
	  Components.utils.reportError(e)
      }
  },
  
    //	suspend \ resume subsystem
  onDisabling: function(anaddon, aneeds)
  {
      if(anaddon.id === moduleRIframe.id)
      if(aneeds)  // the pending operation is interested
      try {	
	  this.shutdown(true);
	  this.suspend = true;
      }
      catch (e)
      {
	  Components.utils.reportError(e)
      }
  },

  onMenushow: function (event)
  {
    const menu2script = {	//	overlay.css
	    'false' : "menu-iconic stop-script",
	    'true'  : "menu-iconic allow-script", }

    if(gContextMenu)	// want only contentAreaContextMenu
    if(gContextMenu.inFrame)
    if(event.currentTarget === event.target)
    try {
//      dump("_dvk_dbg_, popupshowing.\n"); //	dump(thedoc.webNavigation); dump("\n\n");
	var frameShell = gContextMenu.target.ownerDocument.defaultView;
	frameShell = frameShell.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
		      .getInterface(Components.interfaces.nsIWebNavigation)
		      .QueryInterface(Components.interfaces.nsIDocShell);
  
	document.getElementById("frame").setAttribute("class",
		      menu2script[frameShell.canExecuteScripts]);
    }
    catch (e) {
	Components.utils.reportError(e)
    }
  },

  //	for .utils.getWeakReference(
  QueryInterface: XPCOMUtils.generateQI([
                        Components.interfaces.nsISupports,
                        Components.interfaces.nsIObserver,
                        Components.interfaces.nsISupportsWeakReference   ]),

  startup: function() // Initialize the extension
  {
      moduleRIframe.refresh.update();
      Services.prefs.addObserver(moduleRIframe.refresh.preference, this, true);
      AddonManager.addAddonListener(this);
//dump("_dvk_dbg_, rediceiframe, startup.\n");
      let thelement = document.getElementById("contentAreaContextMenu");
      thelement.addEventListener("popupshowing", this.onMenushow);
      window.addEventListener("close", this);	// this.dlg = null
  },

  observe: function(asubject, atopic, adata)
  {
      if(atopic === "nsPref:changed")
	  if(adata == moduleRIframe.refresh.preference)
	      moduleRIframe.refresh.update();
  },

  shutdown: function(asuspend)
  {
      if(!asuspend) AddonManager.removeAddonListener(this);
      Services.prefs.removeObserver(moduleRIframe.refresh.preference, this);
      moduleRIframe.refresh.unregister();
//dump("_dvk_dbg_, rediceiframe, shutdown.\n");
  },

  handleEvent: function( evt )
  {
        // load/unload the extension
      evt.currentTarget.removeEventListener(evt.type, this, false);
      if (evt.type == "load") this.startup()
      else
	if (evt.type == "close") this.dlg = null
	  else this.shutdown();
  }

};

  window.addEventListener("load", menuReduceIframe.main, false);
  window.addEventListener("unload", menuReduceIframe.main, false);
