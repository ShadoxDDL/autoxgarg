// ==UserScript==
// @name         AutoX - prywatna kopia ShadoxDDL
// @namespace    https://github.com/ShadoxDDL/autoxgarg
// @version      1.0.0
// @description  AutoX ładowany z własnej kopii na GitHub Pages
// @author       Priw8 / kopia ShadoxDDL
// @match        https://*.margonem.pl/*
// @exclude      https://www.margonem.pl/*
// @match        https://*.margonem.com/*
// @exclude      https://www.margonem.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    const SCRIPT_URL = "https://shadoxddl.github.io/autoxgarg/AutoX.js";
    const scripts = window.GARGONEM_PLUGINS ?? (window.GARGONEM_PLUGINS = []);
    scripts.push(SCRIPT_URL);
})();
