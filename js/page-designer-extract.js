//imports
//import {JSZip} from 'jszip'
//import { JSZip } from "jszip.js";

const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");

form.addEventListener("submit", handleUploadedFile, false);

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  event.preventDefault();
  const isDownloadImagesChecked = document.getElementById(
    "download-images-checkbox"
  ).checked;
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
  document.getElementById("trial-messages").innerText = library.name;
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

function getPDAssets(pageIDs, xml, fileName) {
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
        // console.log(library, "libraryaSSET")
        // console.log(Object.keys(asset), "keys")
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
    getImageAssets(getImagePaths(library.outerHTML));
    //generateZIP()
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

  console.log(filename, "FILENAME");

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

function getImagePaths(filteredFile) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(filteredFile, "text/xml");

  var xpath = `/*[local-name()='library']/*[local-name()='content']/*[local-name()='data']`;
  var result;
  let imagePaths = [];
  if (xmlDoc.evaluate) {
    var nodes = xmlDoc.evaluate(
      xpath,
      xmlDoc,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    var nextElement = nodes.iterateNext();

    while (nextElement) {
      result = nextElement;
      let dataTagContent = result.childNodes;

      for (const dataContent of dataTagContent) {
        let dataContentText = dataContent.textContent;

        //check if node(text) has the image, ctaImage, or imageMobile value - data node contains an image path
        if (
          dataContentText.includes(`"ctaImage" : {`) ||
          dataContentText.includes(`"imageMobile" : {`) ||
          dataContentText.includes(`"image" : {`)
        ) {
          const keys = ["ctaImage", "imageMobile", "image"];
          //convert data in text to an object - easier to get the path
          let dataObject = JSON.parse(dataContentText);

          //store image path and metadata in imagePaths
          keys.map((key) => {
            if (key in dataObject && dataObject[key] !== null) {
              imagePaths.push(dataObject[key]);
            }
          });
        }
      }
      nextElement = nodes.iterateNext();
    }
  }
  return imagePaths;
}

async function getImageAssets(imagePaths) {
  var count = 0;
  var zip = new JSZip();
  var img = zip.folder("images");
  const baseURL =
    "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/BDCR_STG/on/demandware.static/-/Sites-NGArmani-Library/default";

  for (let value of imagePaths) {
    // console.log(value, "val")
    let urlPath = value.path;
    console.log(urlPath, "urlPath")

    let filename = value.path.substring(value.path.lastIndexOf("/") + 1);

    //UNCOMMENT HERE!!
    var zipFilename = "images_bundle1.zip";
    // we will download these images in zip file
    var image = await fetch(baseURL + urlPath, {
      //mode: 'no-cors',
      method: "GET",
      headers: {
        //'Content-Type': 'image/jpeg',
        //'Accept': 'image/*'
      },
    });
    console.log(
      "https://edge.disstg.commercecloud.salesforce.com/dw/image/v2/BDCR_STG/on/demandware.static/-/Sites-NGArmani-Library/default" +
        urlPath,
      "url here"
    );
    var imageBlog = await image.blob();
    // loading a file and add it in a zip file
    img.file(filename, imageBlog, { binary: true });
    count++;
    console.log(count, "count");
    console.log(imagePaths.length, "length");

    if (count == imagePaths.length) {
      console.log("entered here");
      zip.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, zipFilename);
      });
    }
  }
}