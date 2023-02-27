const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
form.addEventListener("submit", handleUploadedFile, false);

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  event.preventDefault();
  const textArea = document.getElementById("pageids-textarea");
  const attributesTextArea = document.getElementById("attributeids-textarea");
  const pageIDs = textArea.value
    .trim()
    .split(",")
    .map((pageID) => {
      return pageID.trim().toLowerCase();
    });
  const attributeIDs =
    (attributesTextArea.value.trim() &&
      attributesTextArea.value
        .trim()
        .split(",")
        .map((attributeID) => {
          return attributeID.trim();
        })) ||
    null;
  const library =
    inputElement.files && inputElement.files.length && inputElement.files[0];
  const fileName = library.name;
  document.getElementById("app").classList.add("loading");
  getXMLDoc(library).then((xml) => {
    if (xml && xml instanceof XMLDocument) {
      getPDAssets(pageIDs, attributeIDs, xml, fileName);
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
  var xpath = `/*[local-name()='library']/*[local-name()='content'][@content-id="${id}"]`;
  var result;
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    console.log(xpath, nextElement);
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

function getRelatedAssets(asset) {
  var relatedAssets = [];
  var contentLinks = asset.getElementsByTagName("content-links");
  Array.from(contentLinks).forEach((element) => {
    relatedAssets = relatedAssets.concat(
      Array.from(element.getElementsByTagName("content-link")).map(
        (contentLink) => {
          return contentLink.getAttribute("content-id");
        }
      )
    );
  });
  return relatedAssets;
}

function getProducts(productIDs, attributeIDs, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='content']`;
  var products = [];
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      products.push(nextElement);
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    products = nodes && nodes.toArray();
  }
  console.log("content assets: ", products.length);
  console.log("content asset IDs: ", productIDs && productIDs.length);
  if (productIDs && productIDs.length && productIDs[0]) {
    products = products.filter((node) => {
      return productIDs.includes(node.getAttribute("content-id").toLowerCase());
    });
  }
  products = products.map(filterProductAttributes.bind(null, attributeIDs));
  return products;
}

function filterProductAttributes(attributeIDs, product) {
  console.log("attributeIDs: ", attributeIDs);
  if (!attributeIDs || !attributeIDs.length) {
    return product;
  }
  var newProduct = product.cloneNode(true);
  newProduct.innerHTML = "";
  newProduct.appendChild(document.createTextNode("\n    "));
  var customAttributeIDs = [];
  // var attrFound = false;
  attributeIDs.forEach((id) => {
    var attrs = product.getElementsByTagName(id);
    if (attrs && attrs.length) {
      Array.from(attrs).forEach((attr) => {
        newProduct.appendChild(document.createTextNode("    "));
        newProduct.appendChild(attr);
        newProduct.appendChild(document.createTextNode("\n    "));
      });
      // attrFound = true;
    } else {
      customAttributeIDs.push(id);
    }
  });
  // if (attrFound) {
  //   newProduct.appendChild(document.createTextNode("\n        "));
  // }
  console.log("asset ID:", product.getAttribute("content-id"));
  var customAttributes = product.getElementsByTagName("custom-attributes");
  var newCustomAttrs =
    customAttributes.length && customAttributes[0].cloneNode(true);
  newCustomAttrs.innerHTML = "";
  customAttributeIDs.forEach((id) => {
    var customAttributeFound = false;
    Array.from(
      (customAttributes.length &&
        customAttributes[0].getElementsByTagName("custom-attribute")) ||
        []
    ).forEach((element) => {
      var elementId = element.getAttribute("attribute-id");
      if (elementId === id) {
        customAttributeFound = true;
        newCustomAttrs.appendChild(document.createTextNode("\n            "));
        newCustomAttrs.appendChild(element);
      }
    });
    if (customAttributeFound) {
      newCustomAttrs.appendChild(document.createTextNode("\n        "));
      newProduct.appendChild(document.createTextNode("\n        "));
      newProduct.appendChild(newCustomAttrs);
      newProduct.appendChild(document.createTextNode("\n    "));
    }
  });
  return newProduct;
}

function isInFolder(asset, folderID) {
  var classificationFolder = Array.from(
    asset.getElementsByTagName("classification-link")
  );
  var folders = Array.from(asset.getElementsByTagName("folder-link"));
  folders = classificationFolder.concat(folders);

  return !!folders.filter((node) => {
    return node.getAttribute("folder-id") === folderID;
  }).length;
}

function getPDAssets(pageIDs, attributeIDs, xml, fileName) {
  const xmlEncoding = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const libraryNode = xml.getElementsByTagName("library")[0];
  if (!libraryNode) {
    addMessage(
      `"library" node was not found in file "${fileName}". Please verify xml structure.`,
      "error"
    );
    document.getElementById("app").classList.remove("loading");
    return;
  }
  const library = libraryNode.cloneNode(true);
  library.innerHTML = "";
  let pageFound = true;
  var products = getProducts(pageIDs, attributeIDs, xml);
  console.log("122222: ", products.length);
  products.forEach((product) => {
    library.appendChild(document.createTextNode("\n\n    "));
    library.appendChild(product);
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
  element.innerText = "Download";

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
