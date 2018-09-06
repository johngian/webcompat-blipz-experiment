const portToBGScript = (function() {
  let port;

  function connect() {
    port = browser.runtime.connect({name: "pageActionModalPort"});
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


function onMessage(update) {

  initializeModal();

  if (update === "showFeedbackModal") {
    showModal();
  };
  if (update === "hideFeedbackModal") {
    hideModal();
  };
};

function initializeModal() {
  var elem = document.querySelector("iframe#feedbackModal");

  if (!elem) {

    elem = document.createElement("iframe");
    elem.id = "feedbackModal";
    elem.src = browser.extension.getURL("blank.html");
    elem.style.background = "black";
    elem.style.opacity = "0.5";
    elem.style.zIndex = "99999999999";
    elem.style.position = "fixed";
    elem.style.display = "none";
    elem.style.border = "none";
    elem.style.top = "0";
    elem.style.bottom = "0";
    elem.style.left = "0";
    elem.style.right = "0";
    elem.style.width = "100%";
    elem.style.height = "100%";

    document.body.appendChild(elem);
  }

  return elem;
};

function removeModal() {
  var elem = document.querySelector("iframe#feedbackModal");
  elem.parentNode.removeChild(elem);
};

function hideModal() {
  var elem = document.querySelector("iframe#feedbackModal");
  elem.style.display = 'none';
};

function showModal() {
  var elem = document.querySelector("iframe#feedbackModal");
  elem.style.display = '';
};

initializeModal();
