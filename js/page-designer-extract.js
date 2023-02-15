const inputElement = document.getElementById("library-input");
const form = document.getElementById("form-pd");
const checkBox = document.getElementById("checkbox-input");
const baseUrlInput = document.getElementById("baseurl-input");

form.addEventListener("submit", handleUploadedFile, false);

checkBox.addEventListener("click", function(){
  if(checkBox.checked){
    document.getElementById("baseurl-input").style.display = 'block';
    document.getElementById("baseurl-input").setAttribute("required", "");
  }else{
    document.getElementById("baseurl-input").style.display = 'none';
    document.getElementById("baseurl-input").removeAttribute("required");
  }

}, false)

function handleUploadedFile(event) {
  document.getElementById("info-messages").innerHTML = "";
  event.preventDefault();
  const isDownloadImagesChecked = document.getElementById("checkbox-input").checked;

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
    //console.log(isDownloadImagesChecked, "checker")
    if(isDownloadImagesChecked){
      getImageAssets(getImagePaths(library.outerHTML));
    }
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

  //element.click();

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

  let imagePaths = [];
  let child = xmlDoc.childNodes
  child.forEach(element => {
    console.log(element)
    let dataContentText = element.textContent;
    imagePaths = (dataContentText.match(/[^"'<>\n\t\s]+\.(?:png|jpe?g|gif)\b/gi));
  });

  console.log(imagePaths, "paths")

  return imagePaths;
}

async function fetchImage(imageURL, filename, filetype){
  await fetch(imageURL, {
    mode: 'no-cors',
    method: "get",
    // headers: {
    //   'Content-Type': 'image/jpeg',
    // //   'Accept': 'image/*'
    // },
  }).then(response => {
    // const imageBlob = new Blob([response], {
    //   type: "image/" + filetype
    // })
    // console.log(imageBlob, "imageblob")
    return response;
    // const imageBlob = new Blob([response], {
    //   type: "image/" + filetype
    // })
    // console.log(imageBlob, "inside fetimg")
    // return imageBlob;
    // await response.blob()
    // .then(imageBlob => {
    //   console.log(Blob(imageBlob), "blob")
    //   return imageBlob;
    // }).catch(error => console.log(error, "error"))
    //console.log(await response.blob(), "res")
  }).catch(error => console.log(error, "error"));
}

async function getImageBlob(imageFetched, filetype){
  // await imageFetched.blob()
  //   .then(imageBlob => {
  //     return imageBlob;
  //   }).catch(error => console.log(error, "error "))
  const imageBlob = new Blob([imageFetched], {
    type: "image/" + filetype
  })
  return imageBlob;
}

async function getImageAssets(imagePaths) {
  var count = 0;
  var zip = new JSZip();
  var img = zip.folder("images");
  const baseURL = baseUrlInput.value
  let imageBlobArray = [];

  //console.log(baseURL, "bassseee")

//   imagePaths.forEach(async function(imagePath){
//     let filename = imagePath.substring(imagePath.lastIndexOf("/") + 1);
//     let fileExt = filename.split('.').pop();
//     const imageURL = `${baseURL}${imagePath}`

//     await fetchImage(imageURL, filename, fileExt).then(val => console.log(val, "hi"));
//     console.log(image, "imageee")
//     //   let imageFile = new File([image], filename, {type: fileExt});
//     //   console.log(imageFile, "imageFile")
//     //   img.file(filename, imageFile)

//     // if(image){
//     //   let imageBlob = image.blob();
//     //   console.log(imageBlob)
//     // }
//     //whole(imageURL, filename)
//     // var image = await fetch(imgURL);
//     // var imageBlog = await image.blob();


//     // await fetch(`${baseURL}${imagePath}`, {
//     //   mode: 'no-cors',
//     //   method: "get",
//     //   // headers: {
//     //   //   'Content-Type': 'image/jpeg',
//     //   // //   'Accept': 'image/*'
//     //   // },
//     // }).then(async response => {
//     //   console.log(await response.blob(), "res")
//     // }).catch(error => console.log(error, "error ", error.status));
//     console.log(
//       baseURL +
//        imagePath,
//       "url here"
//     );
//     // console.log(count, "count");
//   })
// console.log(imageBlobArray, "array")
//   if(imageBlobArray.length == imagePaths.length){
//     imageBlobArray.map((imageBlob, i) => {
//       let filename = imagePaths[i].substring(imagePaths[i].lastIndexOf("/") + 1);
//       img.file(imageBlob, filename)
//       count++;
//       console.log(count, "count");
//     })
//   }

  for (let imagePath of imagePaths) {

    let filename = imagePath.substring(imagePath.lastIndexOf("/") + 1);
    let fileExt = filename.split('.').pop();

    //UNCOMMENT HERE!!
    var zipFilename = "images_bundle1.zip";
    // we will download these images in zip file
    // var image = await fetch(document.getElementById("image"));
    var image = await fetchImage(baseURL + imagePath, filename, fileExt)
    var imageBlob = await getImageBlob(image, fileExt)
    // var image = await fetch(baseURL + imagePath, {
    //   mode: 'no-cors',
    //   method: "get",
    //   headers: {
    //     // 'Content-Type': 'image/jpeg',
    //   //   'Accept': 'image/*'
    //   },
    // }).catch(error => console.log(error, "error"));
    
    console.log(
      baseURL +
       imagePath,
      "url here"
    );
 
      console.log(image, "image fetch")
      // const imageBlob = new Blob([image], {
      //   type: "image/" + fileExt
      // })
      console.log(imageBlob, "blob")
      // var imageBlob = await image.blob().then((result) => {
      //   console.log(result, "res")
      //   return result
      // })


    // console.log(imageBlob, "ImageBlob here")
    // var imageFile = new File([imageBlob], filename, {type: fileExt});

    // .then(img => {
    //   var element = document.createElement("img");
    //   element.setAttribute(
    //     "src",
    //     URL.createObjectURL(img)
    //   );
    //   console.log("created blob")
    // }).catch(error => console.log(error, "error in blob"));
    // loading a file and add it in a zip file
    img.file(filename, imageBlob);
    count++;
    // console.log(img.file(filename, imageFile), "Image File from jsZIP here")
    // console.log(imageFile, "Image File here")
    console.log(count, "count");
  //   // console.log(imagePaths.length, "length");

    if (count == imagePaths.length) {
      console.log("entered here");
      zip.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, zipFilename);
      });
    }
  }
}