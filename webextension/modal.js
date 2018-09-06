function initializeModal() {
  var elem = document.createElement("iframe");
  elem.id = "feedbackModal";
  elem.src = browser.extension.getURL("blank.html");

  elem.style.background = "black";
  elem.style.opacity = "0.5";
  elem.style.zIndex = "99999999999";
  elem.style.position = "fixed";
  elem.style.border = "none";
  elem.style.top = "0";
  elem.style.bottom = "0";
  elem.style.left = "0";
  elem.style.right = "0";
  elem.style.width = "100%";
  elem.style.height = "100%";

  document.body.appendChild(elem);

  return elem;
}

function removeModal() {
  document.querySelector("iframe#feedbackModal");
  return elem.parentNode.removeChild(elem);
}

initializeModal();
