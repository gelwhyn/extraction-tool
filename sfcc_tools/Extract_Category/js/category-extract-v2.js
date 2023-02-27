const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
var allCats = [];
var allAssignments = [];
var products = [];
form.addEventListener("submit", handleUploadedFile, false);

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  event.preventDefault();
  const textArea = document.getElementById("pageids-textarea");
  const pageIDs = textArea.value
    .trim()
    .split(",")
    .map((pageID) => {
      return pageID.trim();
    });
  const library =
    inputElement.files && inputElement.files.length && inputElement.files[0];
  const fileName = library.name;
  document.getElementById("app").classList.add("loading");
  getXMLDoc(library).then((xml) => {
    if (xml && xml instanceof XMLDocument) {
      getPDAssets(pageIDs, xml, fileName);
    } else {
      addMessage(`File "${fileName}" can not be parsed.`, "error");
    }
  });
}

function getXMLDoc(inputFile) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = () => {
      fileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };
    fileReader.onload = () => {
      var fileText = fileReader.result;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(fileText, "text/xml");
      resolve(xmlDoc);
    };
    fileReader.readAsText(inputFile);
  });
}

function getAsset(id, xml) {
  var xpath = `/*[local-name()='catalog']/*[local-name()='category'][@category-id="${id}"]`;
  var result;
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      result = nextElement;
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    result = nodes && nodes[0];
  }
  return result;
}

function evaluateXpath(xpath, xml) {
  var result = [];
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      result.push(nextElement);
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    result = nodes;
  }
  return result;
}

function getAssignments(category, xml) {
  var id = getCategoryID(category);
  var xpath = `/*[local-name()='catalog']/*[local-name()='category-assignment'][@category-id="${id}"]`;
  var assignments = evaluateXpath(xpath, xml);

  return assignments;
}

function getParent(category) {
  var parent = category.getElementsByTagName("parent");
  var parentID =
    parent && Array.from(parent).length && Array.from(parent)[0].innerHTML;
  return parentID;
}

function getRelatedAssets(asset, xml) {
  var categoryId = getCategoryID(asset);

  return evaluateXpath(
    "/*[local-name()='catalog']/*[local-name()='category']",
    xml
  ).filter(function (cat) {
    return getParent(cat) === categoryId;
  });
}

function getCategoryID(asset) {
  var catId = asset.getAttribute("category-id");
  return catId;
}

function getPDAssets(pageIDs, xml, fileName) {
  const xmlEncoding = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const libraryNode = xml.getElementsByTagName("catalog")[0];
  if (!libraryNode) {
    addMessage(
      `"library" node was not found in file "${fileName}". Please verify xml structure.`,
      "error"
    );
    document.getElementById("app").classList.remove("loading");
    return;
  }
  const library = libraryNode.cloneNode(true);
  var assignments = [];
  library.innerHTML = "";
  let pageFound = false;
  pageIDs.forEach((pageID) => {
    let root = getAsset(pageID, xml);
    if (root) {
      let assets = [root];
      pageFound = true;
      while (assets.length) {
        let asset = assets.pop();
        let relatedAssets = getRelatedAssets(asset, xml);
        library.appendChild(document.createTextNode("\n\n    "));
        library.appendChild(asset);
        assignments = assignments.concat(getAssignments(asset, xml));
        relatedAssets.forEach((rasset) => {
          if (rasset) {
            assets.push(rasset);
          } else {
            addMessage(
              `One of related asset is missed for page "${pageID}"`,
              "error"
            );
          }
        });
      }
      assignments.forEach(function (assignment) {
        library.appendChild(document.createTextNode("\n\n    "));
        library.appendChild(assignment);
      });

      library.appendChild(document.createTextNode("\n\n    "));
      library.appendChild(document.createTextNode(products.join(",")));
    } else {
      addMessage(`Page "${pageID}" is not found. Skipping..`, "warning");
    }
  });
  library.appendChild(document.createTextNode("\n\n"));

  if (pageFound) {
    download(fileName, xmlEncoding + library.outerHTML);
    addMessage(`Library xml is successfully filtered.`, "success");
  } else {
    addMessage("No pages found.", "error");
  }
  document.getElementById("app").classList.remove("loading");
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/xml;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.setAttribute("target", "_blank");

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function addMessage(message, type) {
  var cssClass = "";
  switch (type) {
    case "error":
      cssClass = "error-msg";
      break;
    case "warning":
      cssClass = "warning-msg";
      break;
    case "info":
      cssClass = "info-msg";
      break;
    case "success":
      cssClass = "success-msg";
      break;
    default:
      cssClass = "success-msg";
      break;
  }
  var notification = document.createElement("div");
  notification.classList.add(cssClass);
  notification.innerHTML = message;
  document.getElementById("info-messages").appendChild(notification);
}
