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
  let isDownloadImagesChecked = document.getElementById("checkbox-input").checked
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
      getPDAssets(pageIDs, xml, fileName, isDownloadImagesChecked);
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

function getAssetsByClasificationFolder(folderID, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='content']`;
  var assets = [];
  if (xml.evaluate) {
    var nodes = xml.evaluate(xpath, xml, null, XPathResult.ANY_TYPE, null);
    var nextElement = nodes.iterateNext();
    while (nextElement) {
      assets.push(nextElement);
      nextElement = nodes.iterateNext();
    }
  } else if (window.ActiveXObject) {
    xml.setProperty("SelectionLanguage", "XPath");
    nodes = xml.selectNodes(xpath);
    assets = nodes && nodes.toArray();
  }
  return assets.filter((asset) => isInFolder(asset, folderID));
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
    result = Array.from(nodes);
  }
  return result;
}

function getParentFolderId(folder) {
  var parentTag = Array.from(folder.getElementsByTagName("parent"))[0];
  return parentTag && parentTag.innerHTML;
}

function getSubFolders(folderId, xml) {
  var folders = evaluateXpath(
    "/*[local-name()='library']/*[local-name()='folder']",
    xml
  );

  console.log("test... ", Array.from(folders).length);

  return folders
    .filter((folder) => {
      console.log(getParentFolderId(folder));
      return getParentFolderId(folder) === folderId;
    })
    .map((folder) => {
      return folder.getAttribute("folder-id");
    });
}

function getAllFolderIds(folderIds, xml) {
  var allFolderIds = [];
  while (folderIds.length) {
    var currentFolderId = folderIds.pop();
    allFolderIds.push(currentFolderId);
    folderIds = folderIds.concat(getSubFolders(currentFolderId, xml));
  }
  return allFolderIds;
}

function getFolder(id, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='folder'][@folder-id="${id}"]`;
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

function getPDAssets(pageIDs, xml, fileName, isDownloadImagesChecked) {
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

  pageIDs = getAllFolderIds(pageIDs, xml);

  pageIDs.forEach((pageID) => {
    var folder = getFolder(pageID, xml);
    library.appendChild(document.createTextNode("\n\n    "));
    library.appendChild(folder);
  });

  pageIDs.forEach((pageID) => {
    var assets = getAssetsByClasificationFolder(pageID, xml);
    assets.forEach((asset) => {
      library.appendChild(document.createTextNode("\n\n    "));
      library.appendChild(asset);
    });
  });
  library.appendChild(document.createTextNode("\n\n"));

  if (pageFound) {
    if (isDownloadImagesChecked) {
      let images = getImagePaths(library.outerHTML);
      console.log(images, "image here")
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

  // console.log("imagePaths", imagePaths);
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
