const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
const checkBox = document.getElementById("checkbox-input");
const baseUrlInput = document.getElementById("baseurl-input");

form.addEventListener("submit", handleUploadedFile, false);

checkBox.addEventListener(
  "click",
  function () {
    if (checkBox.checked) {
      document.getElementById("baseurl-input").style.display = "block";
      document.getElementById("baseurl-input").setAttribute("required", "");
    } else {
      document.getElementById("baseurl-input").style.display = "none";
      document.getElementById("baseurl-input").removeAttribute("required");
    }
  },
  false
);

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  document.getElementById("logs").innerHTML = "";
  event.preventDefault();
  let isDownloadImagesChecked =
  document.getElementById("checkbox-input").checked;
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
      getPDAssets(pageIDs, attributeIDs, xml, fileName, isDownloadImagesChecked);
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

function getPDAssets(pageIDs, attributeIDs, xml, fileName, isDownloadImagesChecked) {
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
    if (isDownloadImagesChecked) {
      let images = getImagePaths(library.outerHTML);
      // console.log(images, "image here")
      if (images.length == 0) {
        addMessage("No image path found in filtered XML File.", "error");
        document.getElementById("app").classList.remove("loading");
      } else {
        getImageAssets(images, fileName.split(".")[0]);
      }
    }
    download(fileName, xmlEncoding + library.outerHTML);
    addMessage(`Library xml is successfully filtered.`, "success");
  } else {
    addMessage("No pages found.", "error");
  }
  if (!isDownloadImagesChecked || !pageFound) {
    document.getElementById("app").classList.remove("loading");
  }
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

function cleanImagePath(imgURL) {
  let cleanPath = imgURL.split("&quot;");
  return cleanPath.filter((val) => {
    return (
      (val.startsWith("https://") || val.startsWith("http://")) &&
      val.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi)
    );
  });
}

function getImagePaths(filteredFile) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(filteredFile, "text/xml");

  let imagePaths = [];
  let child = xmlDoc.childNodes;
  child.forEach((element) => {
    let dataContentText = element.textContent;
    imagePaths = dataContentText.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi);
  });

  if (imagePaths) {
    //checks and refilters extracted image paths for &quot; - image links that starts with https:// (image path/link was extracted with unnecessary texts)
    imagePaths.map((path, i) => {
      if (path.includes("&quot;")) {
        path = cleanImagePath(path);
        if (path.length > 0) {
          path.forEach((val, i) => {
            imagePaths.push(val);
          });
        }
      }
    });

    //returns a set of the extracted image path/link (no duplicates)
    return [
      ...new Set(
        imagePaths.filter((val) => {
          return (
            val.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi) &&
            !val.includes("&quot;")
          );
        })
      ),
    ];
  }
  return []
}

async function fetchImage(imageURL) {
  return await fetch(imageURL, {
    //uncomment mode to try with no-cors
    // mode: 'no-cors',
    method: "get",
  });
}

function createLog(messages){
  const logFile = new Blob(messages, {type: "text/plain;charset=utf=8"})
  const logURL = URL.createObjectURL(logFile)
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    logURL
  );
  element.setAttribute("id", "downloadLog");
  element.setAttribute("download", "log.txt");
  element.setAttribute("target", "_blank");

  element.innerHTML = "Download Log File Here"

  document.getElementById("logs").appendChild(element);
}

async function getImageAssets(imagePaths, xmlFilename) {
  // console.log(imagePaths, "paths reals");
  let count = 0;
  let countImageFailedFetch = 0;
  let counterCORSDisabled = 0;
  let logMessages = ["Failed Image Download Logs\n", "--------------------------\n\n"]

  let zip = new JSZip();
  let zipFilename = `images_${xmlFilename}.zip`;

  const baseURL = baseUrlInput.value;
  const baseUrlEndsWithSlash = baseURL.endsWith("/");

  try {
    imagePaths.forEach(async function (imgURL, i) {
      let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
      let isLinkComplete = imgURL.startsWith("https://") || imgURL.startsWith("http://");
      // let filetype = filename.split('.').pop();

      //checks if user input baseURL ends with / or not
      // if not, it adds a / in front of the image url that doesn't start with / || if yes, it removes the / from the image url that starts with /
      if (baseUrlEndsWithSlash && !isLinkComplete) {
        if (imgURL.startsWith("/")) {
          imgURL = imgURL.substring(1);
        }
      } else if (!baseUrlEndsWithSlash && !isLinkComplete) {
        if (!imgURL.startsWith("/")) {
          imgURL = "/" + imgURL;
        }
      }

      const fetchResponse = fetchImage(
        imgURL.startsWith("https://") || imgURL.startsWith("http://") ? imgURL : baseURL + imgURL
      ).then(async (response) => {
        if (response.status == 200) {
          const imageBlob = await response.blob();
          const path = imgURL.substring(0, imgURL.lastIndexOf("/"));

          //store images in different folder (according sa path)
          var img = zip.folder(
            imgURL.startsWith("/")
              ? `images${path}`
              : path.includes("https://") || imgURL.startsWith("http://")
              ? path.replace(/https?:\/\//g, "images/")
              : `images/${path}`
          );

          // loading a file and add it in a zip file
          img.file(filename, imageBlob, { binary: true });
          count++;
        } else {
          //count how many images that can't be downloaded
          const imageLink = imgURL.startsWith("https://") || imgURL.startsWith("http://") ? imgURL : baseURL + imgURL
          countImageFailedFetch++;
          logMessages.push(`Image with filename: "${filename}" cannot be downloaded. Please make sure that this link: ${imageLink} is accessible\n`)
          //uncomment here if error message should be printed for each file that cannot be downloaded
          // addMessage(
          //   `Image "${filename}" is not found. Skipping..`,
          //   "warning"
          // );
        }
        if (count == 0 && i == imagePaths.length - 1) {
          addMessage(
            `Images cannot be downloaded. Please verify your base URL link.`,
            "error"
          );
          document.getElementById("app").classList.remove("loading");
        } else if (
          count != 0 &&
          count + countImageFailedFetch == imagePaths.length
        ) {
          zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, zipFilename);
            addMessage(
              `${count}/${imagePaths.length} images in filtered xml file was successfully downloaded.`,
              "success"
            );
            if (countImageFailedFetch > 0) {
              //comment this if displaying warning messages for each file (that cannot be downloaded) is better
              //call function to create the log file
              createLog(logMessages)
              addMessage(
                `An error occured. Failed to download ${countImageFailedFetch} images.`,
                "warning"
              );
            }
            document.getElementById("app").classList.remove("loading");
          });
        }
      }).catch(() => {
        //can be removed if cors issue is fixed
        counterCORSDisabled++;
        if(counterCORSDisabled === imagePaths.length){
          document.getElementById("app").classList.remove("loading");
          addMessage(
            `Images cannot be downloaded. Make sure that the CORS Extension is enabled.`,
            "error"
          );
        }
      });
    });
  } catch (error) {
    console.log(error)
  }
}
