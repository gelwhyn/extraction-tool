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
  event.preventDefault();
  let isDownloadImagesChecked =
    document.getElementById("checkbox-input").checked;

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

function getAsset(id, xml) {
  var xpath = `/*[local-name()='library']/*[local-name()='content'][@content-id="${id}"]`;
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
  let pageFound = false;
  pageIDs.forEach((pageID) => {
    let root = getAsset(pageID, xml);
    if (root) {
      let ids = [pageID];
      let assets = [root];
      pageFound = true;
      while (assets.length) {
        let asset = assets.pop();
        let relatedAssets = getRelatedAssets(asset);
        library.appendChild(document.createTextNode("\n\n    "));
        library.appendChild(asset);
        relatedAssets.forEach((id) => {
          let currentAsset = getAsset(id, xml);
          if (currentAsset) {
            assets.push(getAsset(id, xml));
            ids.push(id);
          } else {
            addMessage(
              `One of related asset "${id}" is missed for page "${pageID}"`,
              "error"
            );
          }
        });
      }
    } else {
      addMessage(`Page "${pageID}" is not found. Skipping..`, "warning");
    }
  });
  library.appendChild(document.createTextNode("\n\n"));

  if (pageFound) {
    if (isDownloadImagesChecked) {
      document.getElementById("app").classList.add("loading");
      let images = getImagePaths(library.outerHTML);
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
      val.startsWith("https://") &&
      val.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi)
    );
  });
}

function getImagePaths(filteredFile) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(filteredFile, "text/xml");
  const baseURL = baseUrlInput.value;

  let imagePaths = [];
  let child = xmlDoc.childNodes;
  child.forEach((element) => {
    // console.log(element)
    let dataContentText = element.textContent;
    imagePaths = dataContentText.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi);
  });

  //for checking! uncomment
  imagePaths.map((path, i) => {
    if (path.includes("&quot;")) {
      path = cleanImagePath(path);
      if (path.length > 0) {
        path.forEach((val, i) => {
          if (val.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi)) {
            imagePaths.push(val);
          }
        });
      }
    }
  });
  // console.log(imagePaths, "paths")

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

async function fetchImage(imageURL) {
  return await fetch(imageURL, {
    //uncomment mode to try with no-cors
    // mode: 'no-cors',
    method: "get",
    // headers: {
    //   'Content-Type': 'image/jpeg',
    // //   'Accept': 'image/*'
    // },
  });
}

async function getImageAssets(imagePaths, xmlFilename) {
  console.log(imagePaths, "paths reals");
  let count = 0;
  let countImageFailedFetch = 0;

  let zip = new JSZip();
  let img = zip.folder("images");
  let zipFilename = `images_${xmlFilename}.zip`;

  const baseURL = baseUrlInput.value;
  const baseUrlEndsWithSlash = baseURL.endsWith("/");

  try {
    imagePaths.forEach(async function (imgURL, i) {
      let filename = imgURL.substring(imgURL.lastIndexOf("/") + 1);
      // let path = imgURL.split("/");

      let isLinkComplete = imgURL.startsWith("https://");
      //let filetype = filename.split('.').pop();
      //comment this when trying links that are already publicly accessible
      //checks if user input baseURL ends with / or not
      // if not, it adds a / in front of the image url that doesn't start with /
      // if yes, it removes the / from the image url that starts with /

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
        imgURL.startsWith("https://") ? imgURL : baseURL + imgURL
      ).then(async (response) => {
        if (response.status == 200) {
          const imageBlob = await response.blob();
          const path = imgURL.substring(0, imgURL.lastIndexOf("/"));
          
          //images in different folder (according sa path) -- to be tested pa po
          var img = zip.folder(imgURL.startsWith("/") ? `images/${path}` : `images/${path}`)

          // var img = zip.folder("images");
          // loading a file and add it in a zip file
          img.file(filename, imageBlob, { binary: true });
          count++;
        } else {
          //count how many images that can't be downloaded
          countImageFailedFetch++;
          //uncomment here if error message should be printed for each file that cannot be downloaded
          // addMessage(
          //   `Image "${filename}" is not found. Skipping..`,
          //   "warning"
          // );
        }
        if (count == 0 && i == imagePaths.length - 1) {
          console.log(count, i, imagePaths.length);
          addMessage(
            `Images cannot be downloaded. Please verify your base URL link.`,
            "error"
          );
          document.getElementById("app").classList.remove("loading");
        } else if (
          count + countImageFailedFetch == imagePaths.length &&
          count != 0
        ) {
          zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, zipFilename);
            addMessage(
              `${count}/${imagePaths.length} images in filtered xml file was successfully downloaded.`,
              "success"
            );
            if (countImageFailedFetch > 0) {
              //comment this if displaying warning messages for each file (that cannot be downloaded) is better
              addMessage(
                `Failed to download ${countImageFailedFetch} images.`,
                "warning"
              );
            }
            document.getElementById("app").classList.remove("loading");
          });
        }
      });
    });
  } catch (error) {
    addMessage(
      `Images cannot be downloaded. Please verify your base URL link.`,
      "error"
    );
  }
}
