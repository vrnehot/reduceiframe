"use strict";

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm")
Components.utils.import("resource://gre/modules/AddonManager.jsm")
//  Components.utils.import("resource://gre/modules/Services.jsm")
Components.utils.import("resource://reduceiframe/modules/utility.jsm")

const NS_SUCCEEDED  = Components.results.NS_OK
const LOAD_REPLACE  = Components.interfaces.nsIChannel.LOAD_REPLACE
const LOAD_ACCEPT   = Components.interfaces.nsIContentPolicy.ACCEPT
const TYPE_SUBDOC   = Components.interfaces.nsIContentPolicy.TYPE_SUBDOCUMENT
const REJECT_REQUEST= Components.interfaces.nsIContentPolicy.REJECT_REQUEST
const SECURITY_MANAGER = Components.interfaces.nsIScriptSecurityManager

const LOG_SCHEMA  = "Misplaced schema is encountered. (%s)"
const LOG_FIRSTIME= "Subdocument is canceled, target:"
    // 'javascript': 3 } 'file']
const	schemataGrata	= { 'about': 0, 'chrome': 1, 'resource': 2, 'view-source': 3 }
const   attrInfluence	= [ 'src', 'href', 'action' ] // facultative
const	htmlStub = " &nbsp;from&nbsp;element&nbsp;&lt;{element}&gt;&sbquo; &nbsp;by&nbsp;attribute&nbsp;";
const	signatureFriend = "printed by subdocument content policy component"; // concord with log and notify
//	a document contained within another document
const   regexBiditrimX = /(^(@|:|\s)+)|((@|\s|:|\.)+$)/g; // apply bidirectional trim:
const   regexBiditrims = /(^\s+)|(\s+$)/g;
const   regexNormhost = /(^\.+www\.)|(^\.+)/g;     // some dot 2 one dot

//  in: preference from "misplacedSchema" or "communitySites",
//	out: protocol folder
function str2list(alist, adot)
{
    var result = [];
    let thelist = alist.toLowerCase().split(/,|\n/);
    for each (let theval in thelist)
    {
        theval = theval.replace(regexBiditrimX, "");
	if(adot) theval = ("." + theval).replace(/\.+/g, ".");
        if(theval.length >> 1) result.push(theval)
    }
    return result;
}

//  in: doc domain, out: trim host
function hostAsFirstDot(avalue)
{
    avalue = avalue.toLowerCase();
    avalue = avalue.replace(regexBiditrimX, "");

    if(avalue.length >> 1)
    {
        avalue = ("." + avalue);
        avalue = avalue.replace(regexNormhost, ".");
    }

    if(avalue.length >> 1) return avalue;
        else return null;            
}

//	function dummyComponent()
// If you only need to access your component from Javascript,
//  insert the following line:  this.wrappedJSObject = this;

var  singleComponent = {	// Make it a singleton, and do not demand prototype

 classDescription: "XPJS Component Implements Content Policy Category",
 classID	: Components.ID("{09CBF9A1-1CD8-42CD-9F80-B607BB9D34FC}"),
 contractID	: "@mozdev.org/reduceiframe;1",	// concord with chrome.manifest
 category	: "content-policy",

 stopOnlyXSite  : false,
 stopOnlyIframe : false,	// extensions.reduceiframe.stopOnlyIframe
 stopOnlyJavaScript: false,
 misplacedSchema: [ "ftp", "mailto", "news", "data" ], //  the data conflicts with dom-inspector ext.
 communitySites : [ ".google.com", ".facebook.com", ".livejournal.com", ".twitter.com", ".vk.com" ],

 _suspend	: false,
 _boolConsole	: false,
 _requisites	: [ "stopOnlyXSite", "stopOnlyIframe", "stopOnlyJavaScript" ], 
 _branch: Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService).
                getBranch("extensions.reduceiframe."),

    //	resume \ suspend subsystem
 onOperationCancelled: function(anaddon)
 {
    if(this._suspend && !(anaddon.userDisabled))
    if(anaddon.id === moduleRIframe.id)
    try {	//	.pendingOperations ?
	this.resume();
	this._suspend = false;
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
    {
	this._branch.removeObserver("", this);
	this._suspend = true;
    }
 },
 
 resume: function()
 {
    for each(let theval in this._requisites)
        this[theval] = this._branch.getBoolPref(theval);

    let theval  = "misplacedSchema";
    this[theval]= str2list(this._branch.getCharPref(theval), false);
	theval  = "communitySites";
    this[theval]= str2list(this._branch.getCharPref(theval), true);

    this._boolConsole = this._branch.getBoolPref("useConsole");
    this._branch.addObserver("", this, true);
 },
 
 startup: function()
 {
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this.resume();
    AddonManager.addAddonListener(this);
 },

 QueryInterface: XPCOMUtils.generateQI(
            [   Components.interfaces.nsIContentPolicy,
		Components.interfaces.nsIObserver,
		Components.interfaces.nsISupportsWeakReference,
		Components.interfaces.nsIFactory,
                Components.interfaces.nsISupports ]),

 createInstance: function( auter, aiid )
 {
    if (auter) throw(Components.results.NS_ERROR_NO_AGGREGATION);
    else return(this.QueryInterface(aiid));	//	make a singleton
 },

 lockFactory: function(alock)	{
    throw(Components.results.NS_ERROR_NOT_IMPLEMENTED);
 },

    //  return link with top target
 _link2top: function(auri, avalue)
 {
    if(!avalue) avalue = auri;
    return avalue.link(auri).replace(/<A\s+HREF=/i,'<A target="_self" HREF=');
//    return avalue.link(auri).replace(/<A\s+HREF=/i,'<A target="_top" HREF=');
 },

  shouldLoad : function(atype, auri, aRequestOrigin, aContext, aMimeGuess, aExtra) 
 {
    var result = LOAD_ACCEPT;
    if(this._suspend) return result;
    if((atype != TYPE_SUBDOC) || (!aContext)) return result;

//  find subdoc element and top document, as acknowledge of TYPE_SUBDOCUMENT

    var thesource = null; // target uri
    var thescheme = null; // protocol
    var thetop = null;    // outer doc
    var	thedoc = null;    // inner doc

    try {
        thesource = auri.spec;
        thetop = aContext.ownerDocument;     //  outer doc
        thedoc = aContext.contentDocument;   // inner doc
        thescheme = auri.scheme.toLowerCase();
    } catch (e) {  }

    if((!thetop) || (!thedoc)) return result;	// out of context
    if(thetop.loadOverlay) return result;	// xul document
    
    //	first step, filter protocol
    for each (let theval in this.misplacedSchema)
        if(thescheme === theval)
        {
            moduleRIframe.report(thetop.defaultView, thesource, LOG_SCHEMA, theval);
            return REJECT_REQUEST;
        }

    if(thescheme in schemataGrata) return result;

    var thesame = false; // check domains and host to equal
    if((this.stopOnlyXSite) && (thescheme != "javascript"))
    try {
	var isSuffix = function(ahost, asuffix)
	    {
		if(!(asuffix.length > ahost.length))
		{
		    let index = ahost.lastIndexOf(asuffix) + asuffix.length;
		    return (ahost.length == index);
		}
		return false;
	    }

	if((thetop.domain) && ("host" in auri))
	{
	    let suffix	= hostAsFirstDot(thetop.domain);
	    var thehost = (auri.host || "").toLowerCase();
		thehost = "." + thehost.replace(regexBiditrimX, "");
	    if(suffix) thesame = isSuffix(thehost, suffix);

	    if(!thesame)
	    for each (let suffix in this.communitySites)
		if(isSuffix(thehost, suffix))
		{
		    thesame = true;
		    break;
		}
	}
	else
	try {
	    var thesecman = Components.classes["@mozilla.org/scriptsecuritymanager;1"]
				.getService(SECURITY_MANAGER);
	    thesecman.checkSameOriginURI(thetop.documentURIObject, auri, false);
	    thesame = true;
	}
	finally {  thesecman = null  }
    }
    catch (e) {
//        Components.utils.reportError(e) //  _dvk_dbg_
    }

    if(thesame) return result; //    SameOriginURI

    var thagName = (aContext.tagName || "").toUpperCase();
    if((this.stopOnlyIframe) && (thagName != "IFRAME")) return result;

    //	next step, filter aims to first time
    if(thedoc.documentURI == "about:blank")
    if(this.stopOnlyJavaScript)
    try {
//    dump("_dvk_dbg_, stopOnlyJavaScript:\n");	dump(thesource); dump("\n");
        let frameShell = thedoc.defaultView.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                    .getInterface(Components.interfaces.nsIWebNavigation)
                    .QueryInterface(Components.interfaces.nsIDocShell);
        frameShell.allowPlugins = false;
        frameShell.allowMetaRedirects = false;
        frameShell.allowJavascript = false;
    }
    catch (e)
    {
        result = REJECT_REQUEST;        //  more safe
        Components.utils.reportError(e) //  this._boolConsole
    }
    else
    if(!(moduleRIframe.verify(thedoc, thesource)))
	result = REJECT_REQUEST; //	main charge

    if(result === LOAD_ACCEPT)
    {
	if(thedoc.documentURI != "about:blank")
	if(this.stopOnlyJavaScript)
	try {
	    let frameShell = thedoc.defaultView.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
			.getInterface(Components.interfaces.nsIWebNavigation)
			.QueryInterface(Components.interfaces.nsIDocShell);
	    frameShell.allowJavascript = true;
	    frameShell.allowMetaRedirects = true;
	    frameShell.allowPlugins = true;
	}
	catch (e) { }

	return result; // cruise mode
    }

    if(this._boolConsole)
    try {
    var theconsole = thetop.defaultView.console;
        theconsole.info(moduleRIframe.SIGNATURE);
        theconsole.group(LOG_FIRSTIME);
        try {
            theconsole.info(thesource);
            if(thagName.length) theconsole.info("html, element: '%s',\t type:\t", thagName, aContext);
//        theconsole.info("URI, original: %s\ttarget: ", thedoc.documentURI, thesource);
//        theconsole.info("owner domain: %s,\ttarget host: ", thetop.domain, auri.host);
        }
        finally { theconsole.groupEnd() }
    } catch (e) {  }

    try {	// only long then frame will be stopped
	thedoc.body.title = signatureFriend; // component requisite, next time path is free

	if(thagName.indexOf("FRAME") > 0)	// like iframe
	{
	    aContext.setAttribute("scrolling", "no");
	    if(!(aContext["frameborder"])) aContext.setAttribute("style", "border: dotted;");
	}

	var thinner = aContext.textContent || "";
	    thinner = thinner.replace(regexBiditrims, ""); //	apply bidirectional trim
	if(!(thinner.length >> 2)) //	form stub content
	{
	    thinner = this._link2top(thesource);
	    thinner += htmlStub.replace("{element}", thagName.bold());
            
                for each (let theval in attrInfluence)
                    if(theval in aContext)
                       if(aContext[theval])
                       {
                           thinner += theval.quote();
                           break;
                       }
	    thinner += "&nbsp;&middot;";
	}
//    dump("_dvk_dbg_, stub content already exist.\n"); dump(thinner); dump("\n");
	thedoc.body.innerHTML = thinner;

    }
    catch (e)
    {
	Components.utils.reportError(e)
    }

    try {
	moduleRIframe.append(thedoc, thesource);
    }
    catch (e)
    {
	Components.utils.reportError(e)
    }

    return result;
 },

 observe: function(subject, atopic, adata)
 {
    var thedot = false;
    if(atopic == "nsPref:changed")
    try {
//	dump("_dvk_dbg_, component observe:\t"); dump(adata); dump("\n");
    switch (adata)
    {
    case "communitySites" : thedot = true;
    case "misplacedSchema":
        let theval  = this._branch.getCharPref(adata);
        this[adata] = str2list(theval, thedot);
    break;

    case "useConsole" :
        this._boolConsole = this._branch.getBoolPref(adata);
    break;

    default:
        if((adata.indexOf("stopOnly") === 0) && (adata in this))
	    this[adata] = this._branch.getBoolPref(adata);
    }
    } catch (e) {
        Components.utils.reportError(e)
    }
 },

 shouldProcess: function () { 
	return LOAD_ACCEPT;
 },

}

function NSGetFactory(acid)
{
    singleComponent.startup();
//    dump("_dvk_dbg_, call to NSGetFactory.\n");
    return(singleComponent);
}
