
const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
const checkBox = document.getElementById("checkbox-input");
const baseUrlInput = document.getElementById("baseurl-input");
let allProducts = [];
const allProductIDs = [];

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

function getMaterProducts(productIDs, xml) {
  var xpath = `/*[local-name()='catalog']/*[local-name()='product']`;
  var products = evaluateXpath(xpath, xml);
  var masterProducts = [];
  var variantIDs = [];

  if (productIDs && productIDs.length && productIDs[0]) {
    console.log(productIDs, products.length);
    masterProducts = products.filter((node) => {
      return productIDs.includes(node.getAttribute("product-id"));
    });

    masterProducts.forEach(function (product) {
      Array.from(product.getElementsByTagName("variations") || []).forEach(
        (variation) => {
          Array.from(variation.getElementsByTagName("variants") || []).forEach(
            (variations) => {
              console.log("1222222222");
              Array.from(
                variations.getElementsByTagName("variant") || []
              ).forEach((variant) => {
                console.log("Variant", variant.getAttribute("product-id"));
                if (variant.getAttribute("product-id")) {
                  variantIDs.push(variant.getAttribute("product-id"));
                }
              });
            }
          );
        }
      );
    });
    console.log("variations", variantIDs);
    allProducts = masterProducts.concat(
      products.filter((node) => {
        return variantIDs.includes(node.getAttribute("product-id"));
      })
    );
  }
  return allProducts;
}

function getPDAssets(pageIDs, xml, fileName, isDownloadImagesChecked) {
  const xmlEncoding = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const libraryNode = xml.getElementsByTagName("catalog")[0];
  if (!libraryNode) {
    addMessage(
      `"catalog" node was not found in file "${fileName}". Please verify xml structure.`,
      "error"
    );
    document.getElementById("app").classList.remove("loading");
    return;
  }
  const library = libraryNode.cloneNode(true);
  library.innerHTML = "";
  let pageFound = true;

  var products = getMaterProducts(pageIDs, xml);

  products.forEach((product) => {
    library.appendChild(document.createTextNode("\n\n    "));
    library.appendChild(product);
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
    addMessage(`Catalog xml is successfully filtered.`, "success");
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
  let imagePaths = filteredFile.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi);

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

async function getImageAssets(imagePaths, xmlFilename) {
  // console.log(imagePaths, "paths reals");
  let count = 0;
  let countImageFailedFetch = 0;

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
          countImageFailedFetch++;
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
              addMessage(
                `An error occured. Failed to download ${countImageFailedFetch} images.`,
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
