# Introduction #
This extension for the firefox browser reduces some influences of the subdocuments that contained within the top document, such as IFRAME.
### Details ###
This add-on controls loading of content of IFRAME elements (and FRAME). The typical regime:
  * rejects a content that is designed by an author of html page.
  * The virtual content will be a link to a frame's address or,
  * if a case for browsers that do not support FRAME elements is provided it will be used.
  * The next set of the protocols are always rejected: **data**, **ftp**, **mailto**, **news**.
You can reload a frame via the context menu or the link to get a designed content.

&lt;BR/&gt;


There are couple options of policy rules: **only disallow javascript for frame** and **rejects only cross-site conversions**. If first mode above is checked, the icon at the frame's item of the context menu has looked like **"X"** instead of **"o"**, it indicates that javascript is disallowed.

&lt;BR/&gt;


Some modifications of the frame's context menu:
  * mentioned icon to indicate can or not executing script
  * the **Bookmark** and the **Print Frame** items are removed
  * the **Erase IFRAME** item is inserted
  * the **White List** item is opening the dialog and this list takes effect in conjugation with the **"stops only cross-site conversions"** checkbox of the options page.