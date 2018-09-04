/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals browser */

const gState = {};

const gIssueTypeLabels = {
  "": "placeholderIssueType",
  "desktopNotMobile": "issueLabelDesktopNotMobile",
  "siteUnusable": "issueLabelSiteUnusable",
  "brokenDesign": "issueLabelBrokenDesign",
  "playbackFailure": "issueLabelPlaybackFailure",
  "other": "issueLabelOther",
};

const portToBGScript = (function() {
  let port;

  function connect() {
    port = browser.runtime.connect({name: "pageActionPopupPort"});
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(e => {
      port = undefined;
    });
  }

  connect();

  async function send(message) {
    if (port) {
      message.tabId = gState.tabId;
      return port.postMessage(message);
    }
    console.trace();
    return Promise.reject("Background script has disconnected");
  }

  return {send};
}());

document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", handleClick);

  for (const [selector, msg] of Object.entries({
    "#initialPrompt > h1.introduction": "titleInitialPromptIntroduction",
    "#initialPrompt > p.introduction": "textInitialPromptIntroduction",
    "#initialPrompt > a": "linkInitialPrompt",
    "#initialPrompt > label": "labelNeverShowAgain",
    "#initialPrompt > button.siteWorks": "promptWorks",
    "#initialPrompt > button.siteBroken": "promptBroken",
    "#initialPrompt > p.privacyPolicy": "privacyPolicy",
    "#thankYou > h1": "titleThankYou",
    "#thankYouFeedback > h1": "titleThankYouFeedback",
    "#thankYouFeedback > p": "textThankYouFeedback",
    "#thankYouFeedback > a": "labelLearnMore",
    ".screenshot > p": "textScreenshotOfIssue",
    "#feedbackForm > h2": "titleFeedbackForm",
    "#feedbackForm > p": "textFeedbackForm",
    "#feedbackForm > a": "linkShowFeedbackDetails",
    "#feedbackDetails > h2": "titleFeedbackDetails",
    "#feedbackDetails > p": "textFeedbackDetails",
    "[data-detail='url'] > th": "detailLabel_url",
    "[data-detail='type'] > th": "detailLabel_type",
    "[data-detail='description'] > th": "detailLabel_description",
    "[data-detail='channel'] > th": "detailLabel_channel",
    "[data-detail='appVersion'] > th": "detailLabel_appVersion",
    "[data-detail='platform'] > th": "detailLabel_platform",
    "[data-detail='buildID'] > th": "detailLabel_buildID",
    "[data-detail='uiVariant'] > th": "detailLabel_experimentBranch",
    "button[data-action='ok']": "buttonOK",
    "button[data-action='submit']": "buttonSubmit",
    "button[data-action='cancel']": "buttonCancel",
  })) {
    const txt = browser.i18n.getMessage(msg);
    for (const node of document.querySelectorAll(selector)) {
      node.appendChild(document.createTextNode(txt));
    }
  }

  for (const [value, msgId] of Object.entries(gIssueTypeLabels)) {
    document.querySelector(`option[value="${value}"]`).innerText =
      browser.i18n.getMessage(msgId);
  }

  for (const [name, msgId] of Object.entries({
    "type": "placeholderIssueType",
    "description": "placeholderDescription",
  })) {
    const input = document.querySelector(`[name=${name}]`);
    input.placeholder = browser.i18n.getMessage(msgId);

    input.addEventListener("change", e => {
      const message = {};
      message[input.name] = input.value;
      gState[name] = input.value;
      portToBGScript.send(message);
    });
  }

  for (const name of ["neverShowAgain"]) {
    const input = document.querySelector(`[name="${name}"]`);

    input.addEventListener("change", e => {
      const message = {};
      message[input.name] = input.checked;
      portToBGScript.send(message);
    });
  }

  autosizeTextArea(document.querySelector("[name=description]"));
  autosizeTextArea(document.querySelector("[data-detail=description]"));
});

function autosizeTextArea(el) {
  function resize() {
    el.style.height = "auto";
    el.style.padding = "0";
    const popup = document.scrollingElement;
    const popupKidHeights = Array.map.call(null, popup.childNodes, n => n.clientHeight);
    const heightOfRest = popupKidHeights.reduce((a, c) => a + (c || 0), 0) - el.clientHeight;
    const maxHeight = 588 - heightOfRest; // 588px seems to be the max-height of the popup
    el.style.height = Math.min(maxHeight, el.scrollHeight) + "px";
  }
  if (!el.getAttribute("data-ready")) {
    el.setAttribute("data-ready", 1);
    el.addEventListener("keydown", resize);
    el.addEventListener("keypress", resize);
    el.addEventListener("keyup", resize);
    el.addEventListener("compositionstart", resize);
    el.addEventListener("compositionupdate", resize);
    el.addEventListener("compositionend", resize);
  }
  resize();
}

function onMessage(update) {
  if (update === "closePopup") {
    window.close();
    return;
  }

  if (update.uiVariant && gState.uiVariant !== update.uiVariant) {
    if (gState.uiVariant) {
      document.documentElement.classList.remove(gState.uiVariant);
    }
    document.documentElement.classList.add(update.uiVariant);
  }

  Object.assign(gState, update);

  if (update.slide) {
    document.documentElement.setAttribute("data-slide", update.slide);
    for (const section of document.querySelectorAll("section")) {
      if (section.id !== update.slide) {
        section.classList.remove("active");
      } else {
        section.classList.add("active");
      }
    }
  }

  for (const name of ["type", "description"]) {
    if (gState[name]) {
      document.querySelector(`[name=${name}]`).value = gState[name];
    }
  }

  if (gState.screenshot) {
    showScreenshot(gState.screenshot);
  } else {
    hideScreenshot();
  }

  if (gState.slide === "feedbackDetails") {
    const elem = document.querySelector("#feedbackDetails");

    // Update each of the values in the table to match
    // what we will send if "submit" is clicked now.
    elem.querySelectorAll("[data-detail]").forEach(tr => {
      const detail = tr.getAttribute("data-detail");
      if (gState[detail]) {
        tr.style.display = "";
        let value = gState[detail];
        if (detail === "type") {
          value = browser.i18n.getMessage(gIssueTypeLabels[value]);
        }
        tr.querySelector("td").innerText = value;
      } else {
        tr.style.display = "none";
      }
    });
  }

  autosizeTextArea(document.querySelector("[name=description]"));
  autosizeTextArea(document.querySelector("[data-detail=description]"));
}

async function hideScreenshot() {
  document.querySelectorAll(".takeScreenshot").forEach(elem => {
    elem.style.display = "";
  });
  document.querySelectorAll(".screenshot").forEach(elem => {
    elem.style.display = "none";
  });
  document.querySelectorAll(".screenshot > img").forEach(img => {
    img.src = "";
    img.style.display = "";
  });
}

function showScreenshot(dataUrl) {
  document.querySelectorAll(".takeScreenshot").forEach(elem => {
    elem.style.display = "none";
  });
  document.querySelectorAll(".screenshot").forEach(elem => {
    elem.style.display = "";
  });
  document.querySelectorAll(".screenshot > img").forEach(img => {
    img.src = dataUrl;
    img.style.display = "inline-block";
  });
}

function handleClick(e) {
  if (e.which !== 1) {
    return;
  }

  const exit = e.target.getAttribute("data-exit");
  if (exit) {
    portToBGScript.send({command: "leavingPageAction", exit});
  }

  if (e.target.matches(".screenshot > button")) {
    e.preventDefault();
    hideScreenshot();
    portToBGScript.send({command: "removeScreenshot"});
    return;
  }

  if (e.target.matches(".screenshot > img")) {
    e.preventDefault();
    portToBGScript.send({command: "showScreenshot"});
    return;
  }

  if (e.target.matches(".takeScreenshot")) {
    e.preventDefault();
    portToBGScript.send({command: "requestScreenshot"});
    return;
  }

  const action = e.target.getAttribute("data-action");
  if (action) {
    e.preventDefault();
    const message = {command: action};
    if (action === "submit" || action === "showFeedbackDetails") {
      const form = document.querySelector("form");
      if (!form.checkValidity()) {
        // force the first invalid element to be highlighted.
        form.querySelector(":invalid").value = "";
        return;
      }
      for (const field of form.querySelectorAll("[name]")) {
        message[field.name] = field.value;
      }
    }
    portToBGScript.send(message);
  }
}
